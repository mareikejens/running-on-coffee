// Bag-photo processing: downscale, then cut the background away so the bag
// floats free. Fully on-device (the app is offline-first), no ML model —
// a flood fill from the photo's edges removes everything within a color
// tolerance of the border, which works well for the intended use: the bag
// shot against a plain counter or wall. The tolerance is user-adjustable.
//
// Pipeline: estimate border color → flood-fill background from the edges →
// keep only the largest remaining shape (drops floating specks) → feather
// the alpha edge → crop to content. Output is a PNG with transparency.

// Decode + downscale a captured file once; sliders re-run the cheap steps
// from this cached ImageData. Drawing an <img> applies EXIF orientation.
export async function loadSource(file, maxDim) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function distSq(data, i, r, g, b) {
  const dr = data[i] - r;
  const dg = data[i + 1] - g;
  const db = data[i + 2] - b;
  return dr * dr + dg * dg + db * db;
}

// Average border color in two passes: the second pass ignores border pixels
// far from the first average, so a bag poking past the frame edge doesn't
// skew the estimate.
function estimateBackground(src) {
  const { width: w, height: h, data } = src;
  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);

  let r = 0, g = 0, b = 0;
  for (const p of border) {
    r += data[p * 4]; g += data[p * 4 + 1]; b += data[p * 4 + 2];
  }
  r /= border.length; g /= border.length; b /= border.length;

  let r2 = 0, g2 = 0, b2 = 0, n = 0;
  for (const p of border) {
    if (distSq(data, p * 4, r, g, b) < 80 * 80) {
      r2 += data[p * 4]; g2 += data[p * 4 + 1]; b2 += data[p * 4 + 2]; n++;
    }
  }
  return n > 0 ? [r2 / n, g2 / n, b2 / n] : [r, g, b];
}

// Flood fill from every border pixel: everything connected to the frame edge
// within `tol` color distance of the background estimate becomes transparent.
function floodBackground(src, bg, tol) {
  const { width: w, height: h, data } = src;
  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const tolSq = tol * tol;
  const [r, g, b] = bg;

  const trySeed = (p) => {
    if (!isBg[p] && distSq(data, p * 4, r, g, b) < tolSq) {
      isBg[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) { trySeed(x); trySeed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { trySeed(y * w); trySeed(y * w + w - 1); }

  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    if (x > 0) trySeed(p - 1);
    if (x < w - 1) trySeed(p + 1);
    if (p >= w) trySeed(p - w);
    if (p < w * (h - 1)) trySeed(p + w);
  }
  return isBg;
}

// Keep only the largest connected foreground shape — stray specks of counter
// texture or shadow that survived the fill get dropped, which is most of the
// difference between "cut out" and "cut out badly".
function keepLargestShape(isBg, w, h) {
  const label = new Int32Array(w * h); // 0 = unvisited
  const queue = new Int32Array(w * h);
  let bestLabel = 0, bestSize = 0, nextLabel = 1;

  for (let start = 0; start < w * h; start++) {
    if (isBg[start] || label[start]) continue;
    const current = nextLabel++;
    let size = 0, head = 0, tail = 0;
    label[start] = current;
    queue[tail++] = start;
    while (head < tail) {
      const p = queue[head++];
      size++;
      const x = p % w;
      if (x > 0 && !isBg[p - 1] && !label[p - 1]) { label[p - 1] = current; queue[tail++] = p - 1; }
      if (x < w - 1 && !isBg[p + 1] && !label[p + 1]) { label[p + 1] = current; queue[tail++] = p + 1; }
      if (p >= w && !isBg[p - w] && !label[p - w]) { label[p - w] = current; queue[tail++] = p - w; }
      if (p < w * (h - 1) && !isBg[p + w] && !label[p + w]) { label[p + w] = current; queue[tail++] = p + w; }
    }
    if (size > bestSize) { bestSize = size; bestLabel = current; }
  }

  if (bestLabel === 0) return false; // nothing left — caller falls back
  for (let p = 0; p < w * h; p++) {
    if (!isBg[p] && label[p] !== bestLabel) isBg[p] = 1;
  }
  return true;
}

// 3×3 box blur on the alpha mask (separable, two 1D passes) — softens the
// hard flood-fill silhouette into a clean anti-aliased edge.
function featherAlpha(alpha, w, h) {
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const a = alpha[p];
      const l = x > 0 ? alpha[p - 1] : a;
      const r = x < w - 1 ? alpha[p + 1] : a;
      tmp[p] = (l + a + r) / 3;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const u = y > 0 ? tmp[p - w] : tmp[p];
      const d = y < h - 1 ? tmp[p + w] : tmp[p];
      alpha[p] = Math.round((u + tmp[p] + d) / 3);
    }
  }
}

// slider value (0–100) → flood-fill color distance
export function trimToTolerance(trim) {
  return 14 + trim * 1.15;
}

// The cut-out: returns a cropped canvas with a transparent background, or
// null when the fill swallowed the whole photo (tolerance too high).
export function renderCutout(src, trim) {
  const { width: w, height: h } = src;
  const bg = estimateBackground(src);
  const isBg = floodBackground(src, bg, trimToTolerance(trim));
  if (!keepLargestShape(isBg, w, h)) return null;

  const alpha = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) alpha[p] = isBg[p] ? 0 : 255;
  featherAlpha(alpha, w, h);

  // Bounding box of visible pixels, padded a touch so shadows can breathe.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = Math.round(Math.max(w, h) * 0.03);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);

  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  for (let p = 0; p < w * h; p++) out.data[p * 4 + 3] = alpha[p];

  const canvas = document.createElement('canvas');
  canvas.width = x1 - x0 + 1;
  canvas.height = y1 - y0 + 1;
  canvas.getContext('2d').putImageData(out, -x0, -y0);
  return canvas;
}

// "Keep photo" mode: just the downscaled shot, no transparency.
export function renderOriginal(src) {
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  canvas.getContext('2d').putImageData(src, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      type,
      quality,
    );
  });
}
