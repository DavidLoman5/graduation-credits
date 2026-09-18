/**
 * 登入時雲端與本機資料不同的選擇對話框。
 * 一定要選一個，所以沒有關閉鈕、不處理 Esc。
 */
export default function ConflictDialog({ cloudCount, localCount, onResolve }) {
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title" aria-describedby="conflict-desc">
        <h2 id="conflict-title">雲端已有儲存的資料</h2>
        <p id="conflict-desc">
          雲端有 {cloudCount} 門課，這台裝置上有 {localCount} 門課，兩邊不一樣。要保留哪一份？
        </p>
        <p>選了之後另一份會被覆蓋。不確定的話可以先取消登入，把本機資料匯出備份。</p>
        <div className="dialogbtns">
          <button className="ghost" onClick={() => onResolve("local")}>用本機資料覆蓋雲端</button>
          <button className="primary" onClick={() => onResolve("cloud")} autoFocus>載入雲端資料</button>
        </div>
      </div>
    </div>
  );
}
