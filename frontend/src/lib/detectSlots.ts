import type { Slot } from "./types";

/* ===================== MODULE TỰ DÒ KHUNG ẢNH (v3) =====================
   1) Tìm vùng "trời xanh + đồi cỏ" (placeholder) -> khối liên thông.
   2) MỖI KHỐI: quét 2 CHIỀU đối chiếu — quét TRÊN->XUỐNG (mật độ theo hàng) và
      TRÁI->PHẢI (mật độ theo cột). Nếu 2 chiều cùng xác nhận là 1 ô đặc -> tạo khung.
      Nếu phát hiện KHE (rãnh mật độ thấp) ở giữa -> đó là NHIỀU Ô LIỀN KỀ bị gộp
      -> cắt tại khe rồi QUÉT LẠI từng phần (đệ quy) tới khi 2 chiều khớp.
   3) Ô nghiêng: đo góc bằng moment (PCA) + kích thước theo trục nghiêng. */

// morph TÁCH 2 CHIỀU (ngang rồi dọc) — nhanh ~1.5x so với quét 3x3
function morph(arr: Uint8Array, w: number, h: number, dilate: boolean): Uint8Array {
  const mid = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const a = x > 0 ? arr[row + x - 1] : 0, b = arr[row + x], c = x < w - 1 ? arr[row + x + 1] : 0;
      mid[row + x] = dilate ? (a | b | c) : (a & b & c);
    }
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const a = y > 0 ? mid[row - w + x] : 0, b = mid[row + x], c = y < h - 1 ? mid[row + w + x] : 0;
      out[row + x] = dilate ? (a | b | c) : (a & b & c);
    }
  }
  return out;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Tìm các khe (rãnh mật độ thấp) nằm GIỮA vùng theo 1 chiều. Trả về vị trí cắt. */
function findGaps(profile: number[], span: number, minRun: number, thresh: number): number[] {
  const cuts: number[] = [];
  let runStart = -1;
  for (let i = 0; i < profile.length; i++) {
    const low = profile[i] <= thresh;
    if (low && runStart < 0) runStart = i;
    if ((!low || i === profile.length - 1) && runStart >= 0) {
      const runEnd = low ? i : i - 1;
      const runLen = runEnd - runStart + 1;
      // chỉ nhận khe ở GIỮA (không sát mép) và đủ dày
      if (runLen >= minRun && runStart > 1 && runEnd < profile.length - 2) {
        cuts.push(Math.round((runStart + runEnd) / 2));
      }
      runStart = -1;
    }
  }
  return cuts;
}

export function detectSlots(src: string): Promise<Slot[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const MAX = 240, scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d", { willReadFrequently: true } as any);
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data, N = w * h;
        const sky = new Uint8Array(N), grass = new Uint8Array(N), place = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
          const isSky = B >= 232 && G >= 205 && R >= 150 && B >= G && G > R;
          const isGrass = G > R && G > B && G - B > 30 && G > 110;
          sky[i] = isSky ? 1 : 0; grass[i] = isGrass ? 1 : 0; place[i] = isSky || isGrass ? 1 : 0;
        }
        const closed = morph(morph(place, w, h, true), w, h, false);

        const slots: Slot[] = [];
        const minArea = N * 0.006;

        // Tạo khung từ 1 vùng (đã xác nhận là 1 ô): đo góc nghiêng bằng PCA
        const emitSlot = (r: Rect) => {
          const px: number[] = [], py: number[] = [];
          let area = 0, skc = 0, grc = 0;
          for (let y = r.y0; y <= r.y1; y++)
            for (let x = r.x0; x <= r.x1; x++) {
              const q = y * w + x;
              if (!place[q]) continue;
              area++; if (sky[q]) skc++; if (grass[q]) grc++;
              px.push(x); py.push(y);
            }
          if (area < minArea) return;
          if (skc / area < 0.08 || grc / area < 0.05) return;
          let sx = 0, sy = 0;
          for (let k = 0; k < area; k++) { sx += px[k]; sy += py[k]; }
          const cx = sx / area, cy = sy / area;
          let mxx = 0, myy = 0, mxy = 0;
          for (let k = 0; k < area; k++) { const ax = px[k] - cx, ay = py[k] - cy; mxx += ax * ax; myy += ay * ay; mxy += ax * ay; }
          let deg = 0.5 * Math.atan2(2 * mxy, mxx - myy) * 180 / Math.PI;
          if (deg > 45) deg -= 90; else if (deg < -45) deg += 90;

          if (Math.abs(deg) < 0.7) { // <0.7° coi là nhiễu -> thẳng; nghiêng nhẹ (vd 1.05°) vẫn giữ đúng góc
            let minx = w, maxx = 0, miny = h, maxy = 0;
            for (let k = 0; k < area; k++) { if (px[k] < minx) minx = px[k]; if (px[k] > maxx) maxx = px[k]; if (py[k] < miny) miny = py[k]; if (py[k] > maxy) maxy = py[k]; }
            slots.push({ x: +((minx / w) * 100).toFixed(1), y: +((miny / h) * 100).toFixed(1), w: +(((maxx - minx + 1) / w) * 100).toFixed(1), h: +(((maxy - miny + 1) / h) * 100).toFixed(1), shape: "rect" });
          } else {
            const rad = deg * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
            let minU = 1e9, maxU = -1e9, minV = 1e9, maxV = -1e9;
            for (let k = 0; k < area; k++) {
              const ax = px[k] - cx, ay = py[k] - cy;
              const u = ax * cos + ay * sin, v = -ax * sin + ay * cos;
              if (u < minU) minU = u; if (u > maxU) maxU = u;
              if (v < minV) minV = v; if (v > maxV) maxV = v;
            }
            const wPct = ((maxU - minU + 1) / w) * 100, hPct = ((maxV - minV + 1) / h) * 100;
            slots.push({ x: +(((cx / w) * 100) - wPct / 2).toFixed(1), y: +(((cy / h) * 100) - hPct / 2).toFixed(1), w: +wPct.toFixed(1), h: +hPct.toFixed(1), shape: "rect", rot: Math.round(deg * 20) / 20 }); // làm tròn 0.05° — đủ mượt, không cần chính xác từng độ
          }
        };

        // QUÉT 2 CHIỀU ĐỐI CHIẾU (đệ quy): khớp cả 2 chiều -> tạo; có khe -> cắt & quét lại
        const scanRegion = (r: Rect, depth: number) => {
          const rw = r.x1 - r.x0 + 1, rh = r.y1 - r.y0 + 1;
          if (rw < 4 || rh < 4) return;

          // Quét TRÊN -> XUỐNG: mật độ theo từng hàng (dùng mask GỐC để khe hiện rõ)
          const rows: number[] = new Array(rh).fill(0);
          // Quét TRÁI -> PHẢI: mật độ theo từng cột
          const cols: number[] = new Array(rw).fill(0);
          for (let y = r.y0; y <= r.y1; y++)
            for (let x = r.x0; x <= r.x1; x++)
              if (place[y * w + x]) { rows[y - r.y0]++; cols[x - r.x0]++; }

          const rowGaps = findGaps(rows, rw, 1, Math.max(1, rw * 0.04));
          const colGaps = findGaps(cols, rh, 1, Math.max(1, rh * 0.04));

          // ĐỐI CHIẾU 2 KẾT QUẢ: cả 2 chiều đều không thấy khe -> là 1 ô -> tạo khung
          if ((rowGaps.length === 0 && colGaps.length === 0) || depth >= 4) { emitSlot(r); return; }

          // Không khớp -> có nhiều ô liền kề bị gộp -> CẮT tại khe rồi QUÉT LẠI từng phần
          if (rowGaps.length >= colGaps.length && rowGaps.length > 0) {
            let prev = r.y0;
            for (const g of rowGaps) { scanRegion({ x0: r.x0, y0: prev, x1: r.x1, y1: r.y0 + g }, depth + 1); prev = r.y0 + g + 1; }
            scanRegion({ x0: r.x0, y0: prev, x1: r.x1, y1: r.y1 }, depth + 1);
          } else {
            let prev = r.x0;
            for (const g of colGaps) { scanRegion({ x0: prev, y0: r.y0, x1: r.x0 + g, y1: r.y1 }, depth + 1); prev = r.x0 + g + 1; }
            scanRegion({ x0: prev, y0: r.y0, x1: r.x1, y1: r.y1 }, depth + 1);
          }
        };

        // Khối liên thông (trên mask đã closing) -> đưa vào quét 2 chiều
        const lbl = new Int32Array(N), stack: number[] = [];
        let cur = 0;
        for (let p = 0; p < N; p++) {
          if (!closed[p] || lbl[p]) continue;
          cur++;
          let area = 0, minx = w, maxx = 0, miny = h, maxy = 0;
          stack.push(p); lbl[p] = cur;
          while (stack.length) {
            const q = stack.pop()!, qx = q % w, qy = (q / w) | 0;
            area++;
            if (qx < minx) minx = qx; if (qx > maxx) maxx = qx;
            if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const nx = qx + dx, ny = qy + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const np = ny * w + nx;
                if (closed[np] && !lbl[np]) { lbl[np] = cur; stack.push(np); }
              }
          }
          if (area < minArea) continue;
          scanRegion({ x0: minx, y0: miny, x1: maxx, y1: maxy }, 0);
        }

        slots.sort((a, b) => a.y - b.y || a.x - b.x);
        resolve(slots);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}
