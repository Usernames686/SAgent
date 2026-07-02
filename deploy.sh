#!/bin/bash
# ═══════════════════════════════════════════════════════════
# sAgent 一键部署脚本 — TencentOS Server 4
# 使用方式：ssh root@150.158.153.254 然后运行此脚本
# ═══════════════════════════════════════════════════════════
set -e

# ── 配置区 ──
APP_DIR="/opt/sagent"
NODE_VERSION="20"
DOMAIN="web.tabbit.com"          # 改成你的域名，不用域名就留空
API_PORT=3001
WEB_PORT=3000
CADDY_PORT=80                    # 有域名时 Caddy 自动签 HTTPS(443)

# JWT 密钥（生产环境务必修改！）
JWT_SECRET="sagent-prod-secret-$(openssl rand -hex 16)"
JWT_REFRESH_SECRET="sagent-prod-refresh-$(openssl rand -hex 16)"

echo "=========================================="
echo "  sAgent 部署脚本 - TencentOS Server 4"
echo "=========================================="

# ── 1. 系统更新 & 基础依赖 ──
echo ""
echo "[1/8] 安装系统依赖..."
dnf update -y
dnf install -y git curl wget tar gcc-c++ make python3

# ── 2. 安装 Node.js 20 ──
echo ""
echo "[2/8] 安装 Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
    dnf install -y nodejs
fi
node -v
npm -v

# 安装 pnpm
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi
pnpm -v

# ── 3. 安装 Caddy（反向代理 + 自动 HTTPS）──
echo ""
echo "[3/8] 安装 Caddy..."
if ! command -v caddy &> /dev/null; then
    dnf install -y 'dnf-command(copr)'
    dnf copr enable -y @caddy/caddy
    dnf install -y caddy
fi
caddy version

# ── 4. 上传/克隆代码 ──
echo ""
echo "[4/8] 准备项目文件..."
if [ ! -d "$APP_DIR" ]; then
    mkdir -p $APP_DIR
    echo "  ⚠️  请将本地项目上传到服务器："
    echo "  在本地执行："
    echo "  scp -r D:\\atmoW\\sAgent root@150.158.153.254:/opt/sagent"
    echo ""
    echo "  或者如果代码在 Git 仓库："
    echo "  git clone <你的仓库地址> $APP_DIR"
    exit 1
fi

cd $APP_DIR

# ── 5. 安装依赖 & 构建 ──
echo ""
echo "[5/8] 安装依赖..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo ""
echo "[6/8] 构建项目..."

# 构建 API
cd $APP_DIR/apps/api
pnpm build

# 构建 Web
cd $APP_DIR/apps/web
pnpm build

# ── 6. 配置环境变量 ──
echo ""
echo "[7/8] 配置环境变量..."

# API 生产配置
cat > $APP_DIR/apps/api/.env.production <<EOF
PORT=${API_PORT}
NODE_ENV=production
CORS_ORIGIN=http://${DOMAIN:-localhost}

# Database (SQLite — 无需额外安装)
DB_TYPE=better-sqlite3
DB_DATABASE=./data/sagent.db

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# LLM / DeepSeek
LLM_API_KEY=${LLM_API_KEY:-}
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
LLM_TIMEOUT_MS=60000
LLM_MAX_TOKENS=4096
VIBE_LLM_TIMEOUT_MS=60000
VIBE_REVIEW_TIMEOUT_MS=12000
EOF

# Web 生产配置 — API 通过 Caddy 反代，用相对路径
cat > $APP_DIR/apps/web/.env.production <<EOF
NEXT_PUBLIC_API_URL=/api/v1
EOF

# ── 7. 配置 systemd 服务 ──
echo ""
echo "[8/8] 配置系统服务..."

# API 服务
cat > /etc/systemd/system/sagent-api.service <<EOF
[Unit]
Description=sAgent API Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/apps/api
ExecStart=$(which node) dist/main
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/apps/api/.env.production

[Install]
WantedBy=multi-user.target
EOF

# Web 服务
cat > /etc/systemd/system/sagent-web.service <<EOF
[Unit]
Description=sAgent Web Server
After=network.target sagent-api.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/apps/web
ExecStart=$(which node) node_modules/.bin/next start -p ${WEB_PORT}
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# ── 8. 配置 Caddy 反向代理 ──
echo ""
echo "配置 Caddy..."

if [ -n "$DOMAIN" ]; then
    cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
    # 前端
    reverse_proxy localhost:${WEB_PORT}

    # API 反代 — 前端通过 /api/v1 访问
    handle_path /api/* {
        reverse_proxy localhost:${API_PORT}
    }

    # Swagger 文档（可选，生产环境可删）
    handle /docs* {
        reverse_proxy localhost:${API_PORT}
    }

    log {
        output file /var/log/caddy/sagent.log
    }
}
EOF
else
    # 无域名，直接监听 80 端口
    cat > /etc/caddy/Caddyfile <<EOF
:80 {
    reverse_proxy localhost:${WEB_PORT}

    handle_path /api/* {
        reverse_proxy localhost:${API_PORT}
    }

    handle /docs* {
        reverse_proxy localhost:${API_PORT}
    }
}
EOF
fi

# ── 启动一切 ──
echo ""
echo "启动服务..."
systemctl daemon-reload
systemctl enable sagent-api sagent-web caddy
systemctl restart sagent-api
sleep 3
systemctl restart sagent-web
systemctl restart caddy

# ── 检查状态 ──
echo ""
echo "=========================================="
echo "  部署完成！服务状态："
echo "=========================================="
systemctl is-active sagent-api  && echo "  ✅ API  运行中 (端口 ${API_PORT})" || echo "  ❌ API  启动失败"
systemctl is-active sagent-web  && echo "  ✅ Web  运行中 (端口 ${WEB_PORT})" || echo "  ❌ Web  启动失败"
systemctl is-active caddy       && echo "  ✅ Caddy 运行中 (端口 80/443)" || echo "  ❌ Caddy 启动失败"

echo ""
echo "访问地址："
if [ -n "$DOMAIN" ]; then
    echo "  🌐 http://${DOMAIN}  (Caddy 会自动签 HTTPS)"
else
    echo "  🌐 http://150.158.153.254"
fi
echo ""
echo "API 文档：http://${DOMAIN:-150.158.153.254}/docs"
echo ""
echo "常用命令："
echo "  查看日志：journalctl -u sagent-api -f"
echo "  重启服务：systemctl restart sagent-api sagent-web"
echo "  查看状态：systemctl status sagent-api sagent-web"
