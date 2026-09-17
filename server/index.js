import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

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

app.use(cors({ origin: ALLOWED_ORIGIN.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "1mb" }));

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
  const data = req.body?.data;
  if (!data || typeof data !== "object" || !Array.isArray(data.courses)) {
    return res.status(400).json({ error: "資料格式不正確" });
  }
  const { year, courses, gates, target } = data;
  const updatedAt = Date.now();
  putData.run(req.sub, JSON.stringify({ year, courses, gates, target }), updatedAt);
  res.json({ updatedAt });
});

app.listen(Number(PORT), HOST, () => {
  console.log(`graduation-credits API listening on http://${HOST}:${PORT}`);
});
