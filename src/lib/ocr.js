/* ================================================================== *
 * 成績單照片 OCR：瀏覽器端 Tesseract.js
 * 只在使用者選照片時才動態載入 tesseract.js（約 1.4 MB）與語言檔。
 * ================================================================== */

/** 語言檔來源；null 表示用 tesseract.js 預設（jsdelivr 的 4.0.0_best_int） */
export const LANG_PATH = null;
export const LANG = "chi_tra";

/**
 * 影像前處理：修正 EXIF 旋轉、縮到 maxWidth 內、灰階、自適應二值化。
 * 自適應二值化用積分影像算局部平均，能把浮水印與陰影壓掉。
 * 回傳 canvas（tesseract 可直接吃）。
 */
export async function preprocess(file, { targetWidth = 2400, window = null, bias = 12, binarizeImage = false, removeLines = true } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  // 手機照片的字通常太小，放大到 targetWidth 讓字高有 30px 以上；太大的縮小
  const scale = targetWidth / bitmap.width;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  const win = window ?? Math.max(15, Math.round(w / 40));
  const out = binarizeImage ? binarize(img.data, w, h, win, bias) : grayscale(img.data);
  if (removeLines) eraseHorizontalLines(out, w, h, win, bias);
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return canvas;
}

/** 轉灰階（保留灰階讓 Tesseract 自己二值化，對手機照片效果比硬二值化好） */
export function grayscale(rgba) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let j = 0; j < rgba.length; j += 4) {
    const g = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
    out[j] = out[j + 1] = out[j + 2] = g;
    out[j + 3] = 255;
  }
  return out;
}

/**
 * 抹掉長的水平線（表格框線、學期標題的底線）：底線會讓 Tesseract 讀不出整行字。
 * 先用局部平均找出「比周圍暗」的像素，再找每一列裡連續 ≥ minLen 的暗像素段，連同上下各一列塗白。
 * 直接修改傳入的 rgba。
 */
export function eraseHorizontalLines(rgba, w, h, win, bias, minLen = Math.round(w / 12)) {
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = rgba[j];
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += gray[(y - 1) * w + (x - 1)];
      integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + row;
    }
  }
  const r = Math.floor(win / 2);
  const dark = (x, y) => {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
    const mean = (integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1]
      - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    return gray[y * w + x] < mean - bias;
  };
  const paint = (x, y) => {
    if (y < 0 || y >= h) return;
    const j = (y * w + x) * 4;
    rgba[j] = rgba[j + 1] = rgba[j + 2] = 255;
  };
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && dark(x, y)) { run++; continue; }
      if (run >= minLen) for (let k = x - run; k < x; k++) { paint(k, y - 1); paint(k, y); paint(k, y + 1); }
      run = 0;
    }
  }
}

/** 灰階 + 自適應閾值（局部平均 − bias）。純函數，方便測試。 */
export function binarize(rgba, w, h, win, bias) {
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
  }
  // 積分影像
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += gray[(y - 1) * w + (x - 1)];
      integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + row;
    }
  }
  const r = Math.floor(win / 2);
  const out = new Uint8ClampedArray(rgba.length);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const area = (x1 - x0) * (y1 - y0);
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1]
        - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      const v = gray[y * w + x] < sum / area - bias ? 0 : 255;
      const j = (y * w + x) * 4;
      out[j] = out[j + 1] = out[j + 2] = v;
      out[j + 3] = 255;
    }
  }
  return out;
}

/**
 * 跑 Tesseract，回傳所有辨識出的字（含座標）。
 * 成績表的課名欄和學分欄距離很遠，Tesseract 的版面分析會把它們切成不同區塊、
 * 打亂行的對應；所以不用它的文字輸出，改拿每個字的 bbox 自己依 y 重組列。
 * onProgress(0–1) 只在辨識階段更新；onStatus(文字) 回報載入階段。
 */
export async function createOcrWorker({ onProgress, onStatus } = {}) {
  const { createWorker } = await import("tesseract.js");
  return createWorker(LANG, 1, {
    ...(LANG_PATH ? { langPath: LANG_PATH } : {}),
    logger: (m) => {
      if (m.status === "recognizing text") onProgress?.(m.progress ?? 0);
      else if (m.status) onStatus?.(m.status);
    },
  });
}

export async function recognizeWords(canvas, { onProgress, onStatus, psm = "auto", worker = null } = {}) {
  const { PSM } = await import("tesseract.js");
  const own = !worker;
  if (own) worker = await createOcrWorker({ onProgress, onStatus });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: psm === "block" ? PSM.SINGLE_BLOCK : psm === "line" ? PSM.SINGLE_LINE : PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
    const words = [], slopes = [], tLines = [];
    for (const b of data.blocks || []) for (const pg of b.paragraphs) for (const ln of pg.lines) {
      const bl = ln.baseline;
      if (bl && bl.x1 - bl.x0 > canvas.width * 0.12) slopes.push({ slope: (bl.y1 - bl.y0) / (bl.x1 - bl.x0), len: bl.x1 - bl.x0 });
      const lw = [];
      for (const w of ln.words) {
        if (!w.text.trim()) continue;
        const word = { text: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1, confidence: w.confidence };
        words.push(word);
        lw.push(word);
      }
      if (lw.length) tLines.push({ words: lw, x0: ln.bbox.x0, x1: ln.bbox.x1, y0: ln.bbox.y0, y1: ln.bbox.y1, confidence: ln.confidence });
    }
    return { words, slopes, tLines, text: data.text };
  } finally {
    if (own) await worker.terminate();
  }
}

/**
 * 把字依座標重組成列（純函數）：y 中心相近的字同一列，列內依 x 排序，字之間用空白接。
 * 容差用字高的中位數 × ratio。
 */
export function medianSlope(slopes) {
  if (!slopes?.length) return 0;
  const sorted = [...slopes].sort((a, b) => a.slope - b.slope);
  return sorted[Math.floor(sorted.length / 2)].slope;
}

export function groupLines(words, { ratio = 0.6, minConfidence = 0, slope = 0 } = {}) {
  // 照片歪的時候右邊的字會比左邊高：用基線斜率把 y 扶正再分列
  const ws = words.filter((w) => w.confidence >= minConfidence)
    .map((w) => ({ ...w, cy: (w.y0 + w.y1) / 2 - slope * (w.x0 + w.x1) / 2, h: w.y1 - w.y0 }));
  if (!ws.length) return [];
  const heights = ws.map((w) => w.h).sort((a, b) => a - b);
  const tol = Math.max(4, heights[Math.floor(heights.length / 2)] * ratio);
  ws.sort((a, b) => a.cy - b.cy);
  const lines = [];
  for (const w of ws) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(w.cy - last.cy) <= tol) {
      last.words.push(w);
      last.cy = (last.cy * (last.words.length - 1) + w.cy) / last.words.length;
    } else {
      lines.push({ cy: w.cy, words: [w] });
    }
  }
  return lines.map((l) => ({
    cy: l.cy,
    x0: Math.min(...l.words.map((w) => w.x0)),
    x1: Math.max(...l.words.map((w) => w.x1)),
    y0: Math.min(...l.words.map((w) => w.y0)),
    y1: Math.max(...l.words.map((w) => w.y1)),
    h: l.words.map((w) => w.h).sort((a, b) => a - b)[Math.floor(l.words.length / 2)],
    text: l.words.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(" "),
  }));
}

export function linesFromWords(words, opts) {
  return groupLines(words, opts).map((l) => l.text);
}

/**
 * 找出列與列之間異常大的空隙（Tesseract 的版面分析常把粗體、底線的學期標題整行丟掉），
 * 回傳要補辨識的區間 [{ index, y0, y1 }]，index 是要插在哪一列之後。
 */
export function findGaps(lines, { factor = 1.7, maxGaps = 10 } = {}) {
  if (lines.length < 3) return [];
  const diffs = lines.slice(1).map((l, i) => l.cy - lines[i].cy).filter((d) => d > 0).sort((a, b) => a - b);
  const spacing = diffs[Math.floor(diffs.length / 2)];
  const heights = lines.map((l) => l.h).sort((a, b) => a - b);
  const lineH = heights[Math.floor(heights.length / 2)];
  // 文字欄的右邊界：只裁到這裡，右半頁的浮水印會干擾局部辨識
  const rights = lines.map((l) => l.x1).sort((a, b) => a - b);
  const columnRight = rights[Math.floor(rights.length * 0.9)] + lineH;
  const gaps = [];
  for (let i = 0; i < lines.length - 1 && gaps.length < maxGaps; i++) {
    const a = lines[i], b = lines[i + 1];
    if (b.cy - a.cy < spacing * factor) continue;
    // 上下各多留半行，免得粗體字的邊緣被切掉
    const y0 = Math.max(0, a.y1 - lineH * 0.5), y1 = b.y0 + lineH * 0.5;
    if (b.y0 - a.y1 >= lineH * 0.6) gaps.push({ index: i, x0: 0, x1: columnRight, y0, y1 });
  }
  return gaps;
}

/* 補辨識出來的列只接受這些：學期標題、學術倫理、有課別碼的課程列；其餘多半是浮水印雜字 */
const GAP_KEEP_RE = /學\s*年\s*度|倫\s*理|^[必選核語體服通自輔研軍]\s/;

/** 把空隙裁下來放大兩倍再辨識，回傳補上的列（座標已換算回整張圖） */
async function recognizeGap(canvas, gap, worker, slope) {
  const scale = 2;
  const gw = Math.min(canvas.width, Math.round(gap.x1)) - gap.x0;
  const gh = gap.y1 - gap.y0;
  const crop = document.createElement("canvas");
  crop.width = gw * scale;
  crop.height = Math.round(gh * scale);
  const ctx = crop.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, crop.width, crop.height);
  ctx.drawImage(canvas, gap.x0, gap.y0, gw, gh, 0, 0, crop.width, crop.height);
  const { tLines } = await recognizeWords(crop, { worker, psm: "block" });
  // 粗體字常被讀成兩條幾乎重疊的行；直接用 Tesseract 的行，不把字混在一起重排
  const lines = tLines
    .map((l) => ({
      ...l,
      x0: l.x0 / scale + gap.x0, x1: l.x1 / scale + gap.x0,
      y0: l.y0 / scale + gap.y0, y1: l.y1 / scale + gap.y0,
      text: l.words.map((w) => w.text).join(" "),
    }))
    .filter((l) => GAP_KEEP_RE.test(l.text));
  const kept = [];
  for (const l of lines.sort((a, b) => b.confidence - a.confidence)) {
    const overlap = kept.some((k) => Math.min(l.y1, k.y1) - Math.max(l.y0, k.y0) > 0.5 * Math.min(l.y1 - l.y0, k.y1 - k.y0));
    if (!overlap) kept.push(l);
  }
  return kept.map((l) => {
    const h = l.y1 - l.y0;
    return { cy: (l.y0 + l.y1) / 2 - slope * (l.x0 + l.x1) / 2, x0: l.x0, x1: l.x1, y0: l.y0, y1: l.y1, h, text: l.text };
  });
}

const CJK = "\\u4e00-\\u9fff";
const CODES = "必選核語體服通自輔研軍";

/**
 * OCR 文字清理（純函數）：
 * - 全形數字／括號／小數點轉半形；`( 一 )` → `(一)`
 * - `4,00`、`4．00` → `4.00`；數字位置的 O/o → 0
 * - 中文字之間的空白去掉，但課別碼後面的空白保留
 * - 沒有中文也沒有數字的雜訊列丟掉
 */
export function cleanOcrText(text) {
  const lines = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    let t = raw
      // 表格線常被讀成 | 「 」 丨 [ ]
      .replace(/[|｜「」丨[\]]+/g, " ")
      .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/（/g, "(").replace(/）/g, ")")
      .replace(/[．。]/g, (m, i, s) => (/\d/.test(s[i - 1] || "") && /\d/.test(s[i + 1] || "") ? "." : m))
      .replace(/(\d),(\d{2})\b/g, "$1.$2")
      // 小數點掉了：獨立的 300 / 000 / 250 其實是 3.00 / 0.00 / 2.50
      .replace(/(?<=\s|^)(\d)(00|50)(?=\s|$)/g, "$1.$2")
      // 學分欄的 O/o 其實是 0：O.OO、2.0O
      .replace(/(?<=\s|^)[0-9Oo]\.[0-9Oo]{2}\b/g, (m) => m.replace(/[Oo]/g, "0"))
      .replace(/\(\s*([一二三四五六七八九十])\s*\)/g, "($1)")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) continue;

    // 學期標題：OCR 會在數字和中文之間插空白，整列去空白
    if (/\d{3} ?學年度/.test(t)) t = t.replace(/\s+/g, "");

    // 課別碼後的空白先保護起來，再去掉中文字之間的空白
    const cm = t.match(new RegExp(`^([${CODES}]) `));
    const head = cm ? cm[1] + " " : "";
    let body = cm ? t.slice(2) : t;
    body = body.replace(new RegExp(`(?<=[${CJK}()：:])\\s+(?=[${CJK}()：:#])`, "g"), "");
    t = head + body;

    if (!new RegExp(`[${CJK}\\d]`).test(t)) continue; // 純雜訊
    lines.push(t);
  }
  return lines.join("\n");
}

/** 照片 → 文字：前處理 → 辨識 → 依座標重組列 → 清理 */
export async function ocrImage(file, handlers = {}, opts = {}) {
  handlers.onStatus?.("preprocessing");
  const canvas = await preprocess(file, opts);
  const worker = await createOcrWorker(handlers);
  try {
    const { words, slopes } = await recognizeWords(canvas, { worker, psm: opts.psm });
    const slope = opts.slope ?? medianSlope(slopes);
    let lines = groupLines(words, { minConfidence: 30, ...opts, slope });
    if (opts.fillGaps !== false) {
      // 版面分析漏掉的列（學期標題、學術倫理）：對空隙補辨識
      const extra = [];
      for (const gap of findGaps(lines)) extra.push(...(await recognizeGap(canvas, gap, worker, slope)));
      // 裁的框和相鄰列有重疊，重複讀到的列丟掉
      const tol = lines.map((l) => l.h).sort((a, b) => a - b)[Math.floor(lines.length / 2)] * 0.6;
      const fresh = extra.filter((e) => !lines.some((l) => Math.abs(l.cy - e.cy) <= tol));
      if (fresh.length) lines = [...lines, ...fresh].sort((a, b) => a.cy - b.cy);
    }
    return cleanOcrText(lines.map((l) => l.text).join("\n"));
  } finally {
    await worker.terminate();
  }
}

/** tesseract.js 的 status 字串 → 中文 */
export function statusLabel(status) {
  if (status === "preprocessing") return "處理照片…";
  if (/loading tesseract core|initializing tesseract/.test(status)) return "載入辨識引擎…";
  if (/loading language|initializing api/.test(status)) return "下載辨識模型（第一次較久）…";
  if (status === "recognizing text") return "辨識中";
  return "準備中…";
}
