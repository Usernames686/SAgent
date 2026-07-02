#!/usr/bin/env python3
"""
sAgent 全自动远程部署脚本
1. 上传源代码（排除 node_modules/.next/dist 等大文件）
2. 在服务器上安装依赖 + 构建
3. 配置 systemd 服务 + Caddy 反向代理
4. 启动并验证
"""
import paramiko, sys, io, os, time, stat

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '150.158.153.254'
USER = 'root'
PASS = os.environ.get('SAGENT_SSH_PASSWORD', '')
REMOTE_BASE = '/opt/sagent'
LOCAL_BASE = r'D:\atmow\sagent'

# 需要排除的目录/文件
EXCLUDES = {
    'node_modules', '.next', 'dist', '.git', '__pycache__',
    '.cache', '.turbo', 'coverage', '.DS_Store', 'Thumbs.db',
    'data',  # SQLite 数据库不在本地上传
}

# 需要保留的服务器文件（不覆盖）
KEEP_FILES = {
    'apps/api/data/sagent.db',       # 用户数据库
    'apps/api/.env.production',      # 生产环境配置
}

def should_upload(rel_path):
    """判断是否需要上传该文件"""
    parts = rel_path.replace('\\', '/').split('/')
    for part in parts:
        if part in EXCLUDES:
            return False
    # 不覆盖保留文件
    for kf in KEEP_FILES:
        if rel_path.replace('\\', '/') == kf:
            return False
    return True

def collect_files():
    """收集需要上传的文件列表"""
    files = []
    skip_exts = {'.pyc', '.pyo', '.log', '.db', '.sqlite'}
    for root, dirs, filenames in os.walk(LOCAL_BASE):
        # 过滤排除的目录
        rel_root = os.path.relpath(root, LOCAL_BASE)
        dirs[:] = [d for d in dirs if should_upload(os.path.join(rel_root, d))]
        
        for fn in filenames:
            if fn in EXCLUDES:
                continue
            ext = os.path.splitext(fn)[1].lower()
            if ext in skip_exts:
                continue
            rel = os.path.join(rel_root, fn)
            if should_upload(rel):
                files.append(rel)
    return files

def upload_files(ssh, sftp, files):
    """上传文件到服务器"""
    # 先用 mkdir -p 一次性创建所有需要的远程目录
    remote_dirs = set()
    for rel in files:
        remote_path = REMOTE_BASE + '/' + rel.replace('\\', '/')
        remote_dir = os.path.dirname(remote_path)
        remote_dirs.add(remote_dir)
    
    print(f'  创建 {len(remote_dirs)} 个远程目录...')
    for d in sorted(remote_dirs):
        ssh.exec_command(f'mkdir -p "{d}"')
    time.sleep(3)  # 等待目录创建完成
    
    total = len(files)
    for i, rel in enumerate(files, 1):
        local_path = os.path.join(LOCAL_BASE, rel)
        remote_path = REMOTE_BASE + '/' + rel.replace('\\', '/')
        
        # 上传文件
        try:
            sftp.put(local_path, remote_path)
        except Exception as e:
            print(f'  [WARN] 上传失败 {rel}: {e}')
        
        if i % 50 == 0 or i == total:
            print(f'  上传进度: {i}/{total}')

def run_remote(ssh, cmd, timeout=120):
    """在服务器执行命令并实时输出"""
    print(f'  > {cmd[:80]}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        # 只打印最后几行
        lines = out.split('\n')
        if len(lines) > 5:
            print(f'    ... ({len(lines)} lines)')
            for l in lines[-5:]:
                print(f'    {l}')
        else:
            for l in lines:
                print(f'    {l}')
    if err and exit_code != 0:
        lines = err.split('\n')
        for l in lines[-3:]:
            print(f'    [ERR] {l}')
    return exit_code, out, err

def main():
    print('=' * 60)
    print('sAgent 全自动远程部署')
    print('=' * 60)
    if not PASS:
        raise RuntimeError('请先设置 SAGENT_SSH_PASSWORD 环境变量')

    # 1. 收集文件
    print('\n[1/5] 收集本地文件...')
    files = collect_files()
    print(f'  共 {len(files)} 个文件需要上传')
    
    # 2. 连接服务器
    print('\n[2/5] 连接服务器...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    print('  SSH 连接成功')
    
    sftp = ssh.open_sftp()
    
    # 3. 上传文件
    print('\n[3/5] 上传文件...')
    upload_files(ssh, sftp, files)
    print('  上传完成!')
    
    sftp.close()
    
    # 4. 服务器端构建
    print('\n[4/5] 服务器端安装依赖和构建...')
    
    # 安装依赖
    print('\n  === 安装 pnpm 依赖 ===')
    run_remote(ssh, f'cd {REMOTE_BASE} && pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1', timeout=300)
    
    # 构建 API
    print('\n  === 构建 API (NestJS) ===')
    run_remote(ssh, f'cd {REMOTE_BASE}/apps/api && npx nest build 2>&1', timeout=120)
    
    # 构建 Web
    print('\n  === 构建 Web (Next.js) ===')
    # 需要设置环境变量让 next build 能通过
    run_remote(ssh, f'cd {REMOTE_BASE}/apps/web && NEXT_PUBLIC_API_URL=/api/v1 npx next build 2>&1', timeout=300)
    
    # 5. 配置服务并启动
    print('\n[5/5] 配置服务并启动...')
    
    # 写入 systemd 服务文件 - API
    api_svc = """[Unit]
Description=sAgent API Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sagent/apps/api
ExecStart=/usr/bin/node dist/main
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/sagent/apps/api/.env.production

[Install]
WantedBy=multi-user.target
"""
    
    # 写入 systemd 服务文件 - Web
    web_svc = """[Unit]
Description=sAgent Web Server
After=network.target sagent-api.service

[Service]
Type=simple
WorkingDirectory=/opt/sagent/apps/web
ExecStart=/usr/bin/npx next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
"""
    
    # 写入 Caddy 配置（修复 handle_path -> handle 保留 /api 前缀）
    caddyfile = """:80 {
    reverse_proxy localhost:4000

    handle /api/* {
        reverse_proxy localhost:4001
    }

    handle /docs* {
        reverse_proxy localhost:4001
    }
}
"""
    
    sftp = ssh.open_sftp()
    
    with sftp.open('/etc/systemd/system/sagent-api.service', 'w') as f:
        f.write(api_svc)
    print('  写入 sagent-api.service')
    
    with sftp.open('/etc/systemd/system/sagent-web.service', 'w') as f:
        f.write(web_svc)
    print('  写入 sagent-web.service')
    
    with sftp.open('/etc/caddy/Caddyfile', 'w') as f:
        f.write(caddyfile)
    print('  写入 Caddyfile')
    
    # 确保 .env.production 存在
    try:
        sftp.stat(f'{REMOTE_BASE}/apps/api/.env.production')
        print('  .env.production 已存在，保留')
    except FileNotFoundError:
        env_prod = """PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://150.158.153.254

DB_TYPE=better-sqlite3
DB_DATABASE=./data/sagent.db

JWT_SECRET={os.environ.get("JWT_SECRET", "change-me-in-production")}
JWT_REFRESH_SECRET={os.environ.get("JWT_REFRESH_SECRET", "change-me-in-production")}

LLM_API_KEY={os.environ.get("LLM_API_KEY", "")}
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
LLM_TIMEOUT_MS=60000
LLM_MAX_TOKENS=4096
VIBE_LLM_TIMEOUT_MS=60000
VIBE_REVIEW_TIMEOUT_MS=12000
"""
        with sftp.open(f'{REMOTE_BASE}/apps/api/.env.production', 'w') as f:
            f.write(env_prod)
        print('  创建 .env.production')
    
    sftp.close()
    
    # 重载 systemd + 重启服务
    print('\n  === 重启服务 ===')
    run_remote(ssh, 'systemctl daemon-reload')
    time.sleep(2)
    
    # 先确保 data 目录存在
    run_remote(ssh, f'mkdir -p {REMOTE_BASE}/apps/api/data')
    
    # 重启 API
    run_remote(ssh, 'systemctl restart sagent-api')
    time.sleep(5)
    _, out, _ = run_remote(ssh, 'systemctl is-active sagent-api')
    print(f'  sagent-api: {out}')
    
    # 重启 Web
    run_remote(ssh, 'systemctl restart sagent-web')
    time.sleep(8)
    _, out, _ = run_remote(ssh, 'systemctl is-active sagent-web')
    print(f'  sagent-web: {out}')
    
    # 重启 Caddy
    run_remote(ssh, 'caddy validate --config /etc/caddy/Caddyfile 2>&1')
    run_remote(ssh, 'systemctl restart caddy')
    time.sleep(3)
    _, out, _ = run_remote(ssh, 'systemctl is-active caddy')
    print(f'  caddy: {out}')
    
    # 6. 验证
    print('\n' + '=' * 60)
    print('验证部署结果')
    print('=' * 60)
    
    tests = [
        ('API 直接访问', 'curl -s http://localhost:4001/api/v1/health | head -c 150'),
        ('Web 直接访问', 'curl -sI http://localhost:4000/ | head -1'),
        ('Caddy 首页', 'curl -sI http://localhost:80/ | head -1'),
        ('Caddy API 代理', 'curl -s http://localhost:80/api/v1/health | head -c 150'),
        ('Swagger 文档', 'curl -sI http://localhost:80/docs | head -1'),
    ]
    
    all_ok = True
    for name, cmd in tests:
        _, out, _ = run_remote(ssh, cmd, timeout=15)
        status = '✅' if ('200' in out or 'ok' in out.lower() or 'success' in out.lower()) else '❌'
        if status == '❌':
            all_ok = False
        print(f'  {status} {name}: {out[:100]}')
    
    print('\n' + '=' * 60)
    if all_ok:
        print('🎉 部署成功！访问 http://150.158.153.254 即可使用')
    else:
        print('⚠️ 部分服务异常，请检查上方日志')
    print('=' * 60)
    
    ssh.close()

if __name__ == '__main__':
    main()
