import { useState, useEffect, useRef, useCallback } from "react";
import { cloudEnabled, loadSession, loginWithGoogle, logout, fetchData, saveData, AuthError } from "./cloud.js";

/**
 * 登入後把 data 同步到雲端。
 * - 登入時：雲端沒資料 → 上傳本機；雲端有資料 → 套用（本機也有不同的資料時先問）
 * - 之後 data 一變動，1 秒後自動上傳；上傳一律排隊依序送出，避免舊資料後到蓋掉新的
 * status: "off" 未登入 | "loading" | "synced" | "saving" | "error"
 */
export function useCloudSync(data, apply) {
  const [session, setSession] = useState(() => (cloudEnabled ? loadSession() : null));
  const [status, setStatus] = useState("off");
  const ready = useRef(false);       // 初次載入完成前不上傳，避免蓋掉雲端
  const lastSynced = useRef(null);   // 已與雲端一致的 JSON，用來略過重複上傳
  const queue = useRef(Promise.resolve()); // 上傳串成鏈，保證送達順序
  const seq = useRef(0);             // 最新一次上傳的序號，只有它完成才算 synced
  const json = JSON.stringify(data);

  const signOut = useCallback(() => {
    logout();
    ready.current = false;
    lastSynced.current = null;
    setSession(null);
    setStatus("off");
  }, []);

  const fail = useCallback((err) => {
    if (err instanceof AuthError) signOut();
    else setStatus("error");
  }, [signOut]);

  const onCredential = useCallback(async (credential) => {
    setStatus("loading");
    try {
      setSession(await loginWithGoogle(credential));
    } catch (err) {
      fail(err);
    }
  }, [fail]);

  // 登入（或帶著舊 session 開啟頁面）後先拉雲端資料
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    ready.current = false;
    setStatus("loading");
    fetchData(session.token)
      .then(async ({ data: cloud }) => {
        if (cancelled) return;
        const local = JSON.parse(json);
        const cloudJson = cloud && JSON.stringify({ year: cloud.year, courses: cloud.courses, gates: cloud.gates, target: cloud.target });
        const useCloud = cloud && (
          cloudJson === json ||
          local.courses.length === 0 ||
          window.confirm("雲端已有儲存的資料，和這台裝置上的不同。\n\n確定：載入雲端資料（本機資料會被取代）\n取消：用本機資料覆蓋雲端")
        );
        if (useCloud) {
          apply(cloud);
          lastSynced.current = cloudJson;
        } else {
          await saveData(session.token, local);
          lastSynced.current = json;
        }
        ready.current = true;
        setStatus("synced");
      })
      .catch((err) => !cancelled && fail(err));
    return () => { cancelled = true; };
    // 只在 session 改變時執行；json 取的是當下的本機資料
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // 資料變動 → 延遲 1 秒後排入上傳佇列
  useEffect(() => {
    if (!session || !ready.current || json === lastSynced.current) return;
    setStatus("saving");
    const t = setTimeout(() => {
      const mySeq = ++seq.current;
      queue.current = queue.current
        .then(() => saveData(session.token, JSON.parse(json)))
        .then(() => {
          lastSynced.current = json;
          if (mySeq === seq.current) setStatus("synced");
        })
        .catch((err) => {
          if (mySeq === seq.current) fail(err);
        });
    }, 1000);
    return () => clearTimeout(t);
  }, [json, session, fail]);

  return { enabled: cloudEnabled, session, status, onCredential, signOut };
}
