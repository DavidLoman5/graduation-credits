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
export async function preprocess(file, { maxWidth = 2000, window = null, bias = 12 } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const img = ctx.getImageData(0, 0, w, h);
  const out = binarize(img.data, w, h, window ?? Math.max(15, Math.round(w / 40)), bias);
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return canvas;
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

/** 跑 Tesseract。onProgress(0–1) 只在辨識階段更新；onStatus(文字) 回報載入階段。 */
export async function recognize(canvas, { onProgress, onStatus } = {}) {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker(LANG, 1, {
    ...(LANG_PATH ? { langPath: LANG_PATH } : {}),
    logger: (m) => {
      if (m.status === "recognizing text") onProgress?.(m.progress ?? 0);
      else if (m.status) onStatus?.(m.status);
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
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

/** 照片 → 文字：前處理 → 辨識 → 清理 */
export async function ocrImage(file, handlers = {}) {
  handlers.onStatus?.("preprocessing");
  const canvas = await preprocess(file);
  const raw = await recognize(canvas, handlers);
  return cleanOcrText(raw);
}

/** tesseract.js 的 status 字串 → 中文 */
export function statusLabel(status) {
  if (status === "preprocessing") return "處理照片…";
  if (/loading tesseract core|initializing tesseract/.test(status)) return "載入辨識引擎…";
  if (/loading language|initializing api/.test(status)) return "下載辨識模型（第一次較久）…";
  if (status === "recognizing text") return "辨識中";
  return "準備中…";
}
