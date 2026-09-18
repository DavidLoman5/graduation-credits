import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "../cloud.js";

const GSI_SRC = "https://accounts.google.com/gsi/client";

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", resolve);
    s.addEventListener("error", reject);
  });
}

const STATUS_TEXT = {
  loading: "同步中…",
  saving: "儲存中…",
  synced: "已同步",
  error: "無法連線，資料暫存在本機",
};

export default function AuthBar({ session, status, onCredential, signOut }) {
  const btn = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    if (session) return;
    let alive = true;
    loadGsi()
      .then(() => {
        if (!alive || !btn.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => cb.current(r.credential),
        });
        window.google.accounts.id.renderButton(btn.current, {
          theme: "outline", size: "medium", text: "signin", shape: "pill", locale: "zh-TW",
        });
      })
      .catch(() => { /* 載不到 Google 腳本（被擋或離線）：不顯示按鈕 */ });
    return () => { alive = false; };
  }, [session]);

  if (!session) {
    return (
      <div className="authbar">
        <div ref={btn} />
        {status === "loading" && <span className="syncstate">登入中…</span>}
        {status === "error" && <span className="syncstate err">登入失敗，請稍後再試</span>}
      </div>
    );
  }

  return (
    <div className="authbar">
      <span className="who" title={session.user?.email}>{session.user?.name || session.user?.email}</span>
      <span className={"syncstate" + (status === "error" ? " err" : "")}>{STATUS_TEXT[status]}</span>
      <button className="linkbtn" onClick={signOut}>登出</button>
    </div>
  );
}
