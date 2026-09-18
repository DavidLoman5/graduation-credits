import { useState, useEffect, useRef, useCallback } from "react";
import { cloudEnabled, loadSession, loginWithGoogle, logout, fetchData, saveData, AuthError } from "./cloud.js";

const toJson = (d) => JSON.stringify({ year: d.year, courses: d.courses, gates: d.gates, target: d.target });

/**
 * 登入後把 data 同步到雲端。
 * - 登入時：雲端沒資料 → 上傳本機；雲端有資料 → 套用；兩邊都有且不同 → 回傳 conflict 讓畫面問
 * - 之後 data 一變動，1 秒後自動上傳；上傳一律排隊依序送出，避免舊資料後到蓋掉新的
 * status: "off" 未登入 | "loading" | "conflict" | "synced" | "saving" | "error"
 */
export function useCloudSync(data, apply) {
  const [session, setSession] = useState(() => (cloudEnabled ? loadSession() : null));
  const [status, setStatus] = useState("off");
  const [conflict, setConflict] = useState(null); // { cloud, cloudJson }
  const ready = useRef(false);       // 初次載入完成前不上傳，避免蓋掉雲端
  const lastSynced = useRef(null);   // 已與雲端一致的 JSON，用來略過重複上傳
  const queue = useRef(Promise.resolve()); // 上傳串成鏈，保證送達順序
  const seq = useRef(0);             // 最新一次上傳的序號，只有它完成才算 synced
  const json = toJson(data);
  const latestJson = useRef(json);
  latestJson.current = json;

  const signOut = useCallback(() => {
    logout();
    ready.current = false;
    lastSynced.current = null;
    setConflict(null);
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
        const local = JSON.parse(latestJson.current);
        const cloudJson = cloud && toJson(cloud);
        if (cloud && cloudJson !== latestJson.current && local.courses.length > 0) {
          setConflict({ cloud, cloudJson });
          setStatus("conflict");
          return;
        }
        if (cloud) {
          apply(cloud);
          lastSynced.current = cloudJson;
        } else {
          await saveData(session.token, local);
          lastSynced.current = latestJson.current;
        }
        ready.current = true;
        setStatus("synced");
      })
      .catch((err) => !cancelled && fail(err));
    return () => { cancelled = true; };
    // 只在 session 改變時執行；apply 每次 render 都是新函數，但行為相同
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const resolveConflict = useCallback(async (choice) => {
    if (!conflict || !session) return;
    setConflict(null);
    setStatus("loading");
    try {
      if (choice === "cloud") {
        apply(conflict.cloud);
        lastSynced.current = conflict.cloudJson;
      } else {
        const local = latestJson.current;
        await saveData(session.token, JSON.parse(local));
        lastSynced.current = local;
      }
      ready.current = true;
      setStatus("synced");
    } catch (err) {
      fail(err);
    }
  }, [conflict, session, apply, fail]);

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

  return { enabled: cloudEnabled, session, status, conflict, resolveConflict, onCredential, signOut };
}
