#!/usr/bin/env bash
# 在 Ubuntu server 上一鍵安裝／更新 API。可重複執行。
# 用法：GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com bash install.sh
set -euo pipefail

REPO=https://github.com/DavidLoman5/graduation-credits.git
BRANCH=${BRANCH:-main}
DIR="$HOME/graduation-credits"
PORT=8787

# Node.js 22
if ! node -v 2>/dev/null | grep -qE '^v(2[2-9]|[3-9][0-9])'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v git >/dev/null || sudo apt-get install -y git

# 程式碼
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$BRANCH" && git -C "$DIR" checkout "$BRANCH" && git -C "$DIR" pull --ff-only
else
  git clone -b "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/server"
npm ci --omit=dev

# .env：只在不存在時建立，避免換掉 JWT_SECRET 讓所有人被登出
if [ ! -f .env ]; then
  : "${GOOGLE_CLIENT_ID:?請帶 GOOGLE_CLIENT_ID 環境變數}"
  sed -e "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" \
      -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" \
      .env.example > .env
  chmod 600 .env
fi

# systemd
sed -e "s|^User=.*|User=$USER|" \
    -e "s|/home/ubuntu/graduation-credits|$DIR|g" \
    -e "s|^ExecStart=.*|ExecStart=$(command -v node) index.js|" \
    graduation-api.service | sudo tee /etc/systemd/system/graduation-api.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable graduation-api
sudo systemctl restart graduation-api
sleep 2
curl -fsS "http://127.0.0.1:$PORT/api/health" && echo "  ← API 正常"

# Tailscale Funnel
if command -v tailscale >/dev/null; then
  sudo tailscale funnel --bg "$PORT" || echo "Funnel 未啟用：照上面的連結到 Tailscale 後台允許後再執行一次"
  tailscale funnel status || true
else
  echo "尚未安裝 Tailscale：curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up"
fi
