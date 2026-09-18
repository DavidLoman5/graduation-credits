import { useState } from "react";

export default function DataBar({ data, year, onImport }) {
  const [error, setError] = useState("");

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `畢業學分-${year}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    // Firefox 若立刻 revoke 偶爾會下載失敗，延後釋放
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJSON = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        onImport(JSON.parse(fr.result));
        setError("");
      } catch {
        setError("這個檔案讀不出來，請確認是本工具匯出的 JSON。");
      }
    };
    fr.onerror = () => setError("檔案讀取失敗。");
    fr.readAsText(file);
  };

  return (
    <div className="databar">
      <button className="ghost" onClick={exportJSON}>匯出資料</button>
      <label className="ghost filelabel">
        匯入資料
        <input type="file" accept="application/json,.json" aria-label="選擇要匯入的 JSON 檔"
          onChange={(e) => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ""; }} />
      </label>
      {error
        ? <span className="dataerr" role="alert">{error}</span>
        : <span className="datahint">資料存在這台裝置的瀏覽器裡，換裝置請用匯出／匯入。</span>}
    </div>
  );
}
