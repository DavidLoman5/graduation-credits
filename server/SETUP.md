# 雲端同步：自架 API 部署步驟

架構：

```
GitHub Pages（前端）──HTTPS──▶ Tailscale Funnel ──▶ Ubuntu：Node API（127.0.0.1:8787）＋ SQLite
```

GitHub Pages 是 HTTPS，瀏覽器不允許它呼叫 `http://` 的 API，所以 API 一定要有 HTTPS。
Tailscale Funnel 免費、不用買網域、不用在路由器開 port，適合放在家裡內網的 server。

---

## 1. 建立 Google OAuth 用戶端 ID

1. 打開 <https://console.cloud.google.com/>，建立一個專案（名稱隨意）。
2. 左側「API 和服務」→「OAuth 同意畫面」：User Type 選「外部」，填應用程式名稱與你的 email，其他可先留空。
   發布狀態改成「正式版」，否則只有測試使用者名單上的人能登入（只要基本登入，不需送審）。
3. 「憑證」→「建立憑證」→「OAuth 用戶端 ID」→ 類型選「網頁應用程式」。
4. 「已授權的 JavaScript 來源」加入：
   - `https://davidloman5.github.io`
   - `http://localhost:5173`（本機開發用）
   - `http://localhost`（Google 按鈕在 localhost 開發時需要）
5. 建立後複製「用戶端 ID」（`xxxx.apps.googleusercontent.com`）。這個不是秘密，可以公開。

## 2. 在 Ubuntu 上跑 API

```bash
# 安裝 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git

# 取得程式
cd ~
git clone https://github.com/DavidLoman5/graduation-credits.git
cd graduation-credits/server
npm ci --omit=dev

# 設定
cp .env.example .env
openssl rand -hex 32        # 把輸出貼到 .env 的 JWT_SECRET
nano .env                   # 填 GOOGLE_CLIENT_ID、JWT_SECRET

# 先手動試跑，看到 listening 就 Ctrl+C
npm start
```

### 設成開機自動啟動（systemd）

```bash
nano graduation-api.service   # 把 User 和兩個路徑裡的 ubuntu 改成你的帳號（whoami 可查）
sudo cp graduation-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now graduation-api
systemctl status graduation-api      # 看是否 active (running)
curl http://127.0.0.1:8787/api/health  # 應回 {"ok":true}
```

看 log：`journalctl -u graduation-api -f`

## 3. 用 Tailscale Funnel 對外提供 HTTPS

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up          # 會給一個網址，用瀏覽器登入 Tailscale 帳號
```

到 <https://login.tailscale.com/admin/dns> 開啟 **MagicDNS** 和 **HTTPS Certificates**。

```bash
sudo tailscale funnel --bg 8787
tailscale funnel status    # 顯示對外網址，例如 https://myserver.tail1234.ts.net
```

第一次執行若提示需要啟用 Funnel，照它給的連結在後台允許即可。
用手機行動網路（不在家裡 Wi-Fi）開 `https://<你的網址>/api/health`，看到 `{"ok":true}` 就成功。

## 4. 讓 GitHub Pages 的前端知道 API 在哪

GitHub repo → **Settings → Secrets and variables → Actions → Variables** 分頁 → **New repository variable**：

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://myserver.tail1234.ts.net`（第 3 步的網址，結尾不要斜線） |
| `VITE_GOOGLE_CLIENT_ID` | 第 1 步的用戶端 ID |

設好後到 **Actions** 分頁手動重跑「Deploy to GitHub Pages」（或 push 一次），網站右上角就會出現 Google 登入按鈕。

## 5. 本機開發

```bash
# 終端機 1：API（server/.env 要填好）
cd server && npm install && npm start

# 終端機 2：前端
# 在專案根目錄建 .env.local（已被 .gitignore 忽略）：
#   VITE_API_URL=http://localhost:8787
#   VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
npm run dev
```

## 6. 備份

資料全部在 `server/data.db`（加上 WAL 檔）。每天備份一次：

```bash
sudo apt install -y sqlite3
crontab -e
# 加入這行（每天 3:00，保留在 ~/backups）
0 3 * * * mkdir -p ~/backups && sqlite3 ~/graduation-credits/server/data.db ".backup '$HOME/backups/grad-$(date +\%F).db'"
```

## 更新程式

```bash
cd ~/graduation-credits && git pull
cd server && npm ci --omit=dev
sudo systemctl restart graduation-api
```

## 同步行為說明

- 未登入：跟原本一樣，只存在這個瀏覽器。
- 登入時：雲端沒資料 → 上傳這台裝置的資料；雲端有資料且本機是空的 → 直接載入；
  兩邊都有且不同 → 跳出確認，讓你選要用哪一份。
- 登入後每次修改，約 1 秒後自動上傳。登入有效 30 天。
- 伺服器連不上時畫面會顯示「無法連線」，資料仍存在本機，下次修改時會再嘗試上傳。
