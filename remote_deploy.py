"""sAgent 远程部署脚本 - 自动 SSH + SCP 上传 + 部署"""
import paramiko
import os
import sys
import time
import stat
import io

# 修复 Windows GBK 编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "150.158.153.254"
USER = "root"
PASS = os.environ.get("SAGENT_SSH_PASSWORD", "")
REMOTE_DIR = "/opt/sagent"
LOCAL_DIR = r"D:\atmow\sagent"

# 需要排除的目录
EXCLUDE_DIRS = {"node_modules", ".next", "dist", ".git", ".agents", ".atomcode", "__pycache__"}

def ssh_connect():
    """建立 SSH 连接"""
    if not PASS:
        raise RuntimeError("请先设置 SAGENT_SSH_PASSWORD 环境变量")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"[SSH] 连接 {USER}@{HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    print("[SSH] 连接成功！")
    return client

def ssh_exec(client, cmd, timeout=300):
    """执行远程命令"""
    print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        for line in out.split("\n")[:20]:
            print(f"    {line}")
        if len(out.split("\n")) > 20:
            print(f"    ... ({len(out.split(chr(10)))} lines total)")
    if err and exit_code != 0:
        for line in err.split("\n")[:5]:
            print(f"    [ERR] {line}")
    return exit_code, out, err

def upload_dir(sftp, local_path, remote_path):
    """递归上传目录"""
    for item in os.listdir(local_path):
        if item in EXCLUDE_DIRS:
            continue
        if item.startswith(".") and item not in {".env", ".env.local", ".env.production"}:
            continue
            
        local_item = os.path.join(local_path, item)
        remote_item = remote_path + "/" + item
        
        if os.path.isdir(local_item):
            try:
                sftp.stat(remote_item)
            except FileNotFoundError:
                sftp.mkdir(remote_item)
            upload_dir(sftp, local_item, remote_item)
        elif os.path.isfile(local_item):
            # 跳过大文件
            size = os.path.getsize(local_item)
            if size > 5 * 1024 * 1024:  # > 5MB
                print(f"    [SKIP] {item} ({size/1024/1024:.1f} MB)")
                continue
            print(f"    [UP] {item}")
            sftp.put(local_item, remote_item)

def main():
    client = ssh_connect()
    
    # ═══ Step 1: 检查服务器环境 ═══
    print("\n[1/9] 检查服务器环境...")
    ssh_exec(client, "uname -a")
    ssh_exec(client, "cat /etc/os-release | head -3")
    
    # ═══ Step 5: 安装项目依赖 ═══
    print("\n[5/9] 安装项目依赖...")
    ssh_exec(client, f"cd {REMOTE_DIR} && pnpm install --frozen-lockfile 2>/dev/null || pnpm install", timeout=300)
    
    # ═══ Step 6: 构建项目 ═══
    print("\n[6/9] 构建项目...")
    ssh_exec(client, f"cd {REMOTE_DIR}/apps/api && npx nest build", timeout=120)
    ssh_exec(client, f"cd {REMOTE_DIR}/apps/web && npx next build", timeout=300)
    
    # ═══ Step 7: 配置环境变量 ═══
    print("\n[7/9] 配置环境变量...")
    
    api_env = f"""PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://{HOST}

# Database
DB_TYPE=better-sqlite3
DB_DATABASE=./data/sagent.db

# JWT
JWT_SECRET={os.environ.get("JWT_SECRET", "change-me-in-production")}
JWT_REFRESH_SECRET={os.environ.get("JWT_REFRESH_SECRET", "change-me-in-production")}

# LLM
LLM_API_KEY={os.environ.get("LLM_API_KEY", "")}
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
LLM_TIMEOUT_MS=60000
LLM_MAX_TOKENS=4096
VIBE_LLM_TIMEOUT_MS=60000
VIBE_REVIEW_TIMEOUT_MS=12000
"""
    # 通过 SFTP 写入 .env.production
    sftp = client.open_sftp()
    with sftp.open(REMOTE_DIR + "/apps/api/.env.production", "w") as f:
        f.write(api_env)
    
    web_env = "NEXT_PUBLIC_API_URL=/api/v1\n"
    with sftp.open(REMOTE_DIR + "/apps/web/.env.production", "w") as f:
        f.write(web_env)
    sftp.close()
    
    # ═══ Step 8: 配置 systemd 服务 ═══
    print("\n[8/9] 配置 systemd 服务...")
    
    api_service = f"""[Unit]
Description=sAgent API Server
After=network.target

[Service]
Type=simple
WorkingDirectory={REMOTE_DIR}/apps/api
ExecStart=/usr/bin/node dist/main
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile={REMOTE_DIR}/apps/api/.env.production

[Install]
WantedBy=multi-user.target
"""
    
    web_service = f"""[Unit]
Description=sAgent Web Server
After=network.target sagent-api.service

[Service]
Type=simple
WorkingDirectory={REMOTE_DIR}/apps/web
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
"""
    
    sftp = client.open_sftp()
    with sftp.open("/etc/systemd/system/sagent-api.service", "w") as f:
        f.write(api_service)
    with sftp.open("/etc/systemd/system/sagent-web.service", "w") as f:
        f.write(web_service)
    sftp.close()
    
    # ═══ Step 9: 安装 Caddy + 启动服务 ═══
    print("\n[9/9] 安装 Caddy 反向代理 & 启动服务...")
    
    # 安装 Caddy
    code, _, _ = ssh_exec(client, "caddy version 2>/dev/null")
    if code != 0:
        ssh_exec(client, "dnf install -y 'dnf-command(copr)' 2>/dev/null || true")
        ssh_exec(client, "dnf copr enable -y @caddy/caddy 2>/dev/null || true")
        ssh_exec(client, "dnf install -y caddy 2>/dev/null || (curl -fsSL 'https://caddyserver.com/api/download?os=linux&arch=amd64' -o /usr/bin/caddy && chmod +x /usr/bin/caddy)", timeout=60)
    
    # 配置 Caddyfile
    caddyfile = f""":80 {{
    reverse_proxy localhost:4000

    handle_path /api/* {{
        reverse_proxy localhost:4001
    }}

    handle /docs* {{
        reverse_proxy localhost:4001
    }}
}}
"""
    sftp = client.open_sftp()
    with sftp.open("/etc/caddy/Caddyfile", "w") as f:
        f.write(caddyfile)
    sftp.close()
    
    # 启动所有服务
    ssh_exec(client, "systemctl daemon-reload")
    ssh_exec(client, "systemctl enable sagent-api sagent-web caddy")
    ssh_exec(client, "systemctl restart sagent-api")
    time.sleep(3)
    ssh_exec(client, "systemctl restart sagent-web")
    ssh_exec(client, "systemctl restart caddy")
    time.sleep(3)
    
    # 检查状态
    print("\n══════════════════════════════════════")
    print("  部署结果：")
    print("══════════════════════════════════════")
    
    for svc in ["sagent-api", "sagent-web", "caddy"]:
        code, out, _ = ssh_exec(client, f"systemctl is-active {svc}")
        status = "✅ 运行中" if code == 0 else "❌ 失败"
        print(f"  {svc}: {status}")
    
    # 测试 HTTP 访问
    print("\n  测试 HTTP 访问...")
    code, out, _ = ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/")
    print(f"  前端 (localhost:4000): HTTP {out}")
    code, out, _ = ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/v1/health 2>/dev/null || echo 'N/A'")
    print(f"  API  (localhost:4001): HTTP {out}")
    code, out, _ = ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/")
    print(f"  Caddy (localhost:80): HTTP {out}")
    
    print(f"\n  🌐 外部访问：http://{HOST}")
    print(f"  📖 API 文档：http://{HOST}/docs")
    
    # 防火墙放行
    print("\n  配置防火墙...")
    ssh_exec(client, "firewall-cmd --permanent --add-service=http 2>/dev/null || true")
    ssh_exec(client, "firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true")
    ssh_exec(client, "firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true")
    ssh_exec(client, "firewall-cmd --reload 2>/dev/null || true")
    ssh_exec(client, "iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true")
    ssh_exec(client, "iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true")
    
    client.close()
    print("\n✅ 部署完成！")

if __name__ == "__main__":
    main()
