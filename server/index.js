import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { validateData } from "./validate.js";

/* ================================================================== *
 * 設定：全部走環境變數，範例見 .env.example
 * ================================================================== */

const {
  GOOGLE_CLIENT_ID,
  JWT_SECRET,
  ALLOWED_ORIGIN = "http://localhost:5173",
  PORT = 8787,
  HOST = "127.0.0.1",
  DB_PATH = "./data.db",
} = process.env;

if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
  console.error("缺少 GOOGLE_CLIENT_ID 或 JWT_SECRET，請參考 .env.example");
  process.exit(1);
}

const SESSION_DAYS = 30;

/* ================================================================== *
 * 資料庫
 * ================================================================== */

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    sub        TEXT PRIMARY KEY,
    email      TEXT,
    name       TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_data (
    sub        TEXT PRIMARY KEY REFERENCES users(sub),
    json       TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const upsertUser = db.prepare(`
  INSERT INTO users (sub, email, name, created_at) VALUES (@sub, @email, @name, @now)
  ON CONFLICT(sub) DO UPDATE SET email = excluded.email, name = excluded.name
`);
const getData = db.prepare("SELECT json, updated_at FROM user_data WHERE sub = ?");
const putData = db.prepare(`
  INSERT INTO user_data (sub, json, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(sub) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
`);

/* ================================================================== *
 * App
 * ================================================================== */

const app = express();
const google = new OAuth2Client(GOOGLE_CLIENT_ID);

// 預設綁 127.0.0.1，前面一定有反向代理（Tailscale Funnel）；
// 只信任 loopback 來的 X-Forwarded-For，限流才拿得到真實 IP 又不會被偽造
app.set("trust proxy", "loopback");
app.disable("x-powered-by");

app.use(cors({ origin: ALLOWED_ORIGIN.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "1mb" }));

const limiter = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "請求太頻繁，請稍後再試" },
});
app.use("/api/", limiter(300));
app.use("/api/auth/", limiter(20));

// 驗證自簽的 session token，通過後把 Google 帳號 id 放在 req.sub
function auth(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
  if (!m) return res.status(401).json({ error: "未登入" });
  try {
    req.sub = jwt.verify(m[1], JWT_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: "登入已過期" });
  }
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

// 前端拿 Google 給的 ID token 來換本站的 session token
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body || {};
  if (typeof credential !== "string") return res.status(400).json({ error: "缺少 credential" });
  try {
    const ticket = await google.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const { sub, email, name } = ticket.getPayload();
    upsertUser.run({ sub, email: email ?? null, name: name ?? null, now: Date.now() });
    const token = jwt.sign({ sub }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
    res.json({ token, user: { email, name } });
  } catch {
    res.status(401).json({ error: "Google 登入驗證失敗" });
  }
});

app.get("/api/data", auth, (req, res) => {
  const row = getData.get(req.sub);
  res.json(row ? { data: JSON.parse(row.json), updatedAt: row.updated_at } : { data: null, updatedAt: null });
});

app.put("/api/data", auth, (req, res) => {
  const result = validateData(req.body?.data);
  if (!result.ok) return res.status(400).json({ error: `資料格式不正確：${result.error}` });
  const updatedAt = Date.now();
  try {
    putData.run(req.sub, JSON.stringify(result.data), updatedAt);
  } catch (err) {
    // token 有效但 users 裡沒這個人（資料庫被重建過）：請對方重新登入
    if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") return res.status(401).json({ error: "請重新登入" });
    throw err;
  }
  res.json({ updatedAt });
});

// express.json 解析失敗或 body 太大時給 JSON 回應，而不是 HTML 錯誤頁
app.use((err, req, res, _next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "資料太大" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON 格式錯誤" });
  console.error(err);
  res.status(500).json({ error: "伺服器錯誤" });
});

const server = app.listen(Number(PORT), HOST, () => {
  console.log(`graduation-credits API listening on http://${HOST}:${PORT}`);
});

// systemd stop / Ctrl+C：先停止收新連線，再關資料庫，讓 WAL 正常 checkpoint
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
