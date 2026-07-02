import type { Slot } from "./types";

/* ===================== MODULE TỰ DÒ KHUNG ẢNH =====================
   Phân tích pixel mỗi trang để tìm vùng "trời xanh + đồi cỏ" (placeholder ảnh)
   và tạo khung chèn ảnh (toạ độ %). Chạy hoàn toàn bằng canvas trong trình duyệt.
   Dùng khi admin upload ảnh trang template. */

function morph(arr: Uint8Array, w: number, h: number, dilate: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          const s = nx >= 0 && ny >= 0 && nx < w && ny < h ? arr[ny * w + nx] : 0;
          if (dilate) { if (s) v = 1; } else { if (!s) v = 0; }
        }
      out[y * w + x] = v;
    }
  return out;
}

/** Dò khung ảnh trên 1 trang. Nhận dataURL hoặc URL ảnh, trả về mảng Slot (toạ độ %). */
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
        // closing (nối vùng do mây trắng) — KHÔNG co thêm để khung sát mép placeholder (không hở)
        let closed = morph(morph(place, w, h, true), w, h, false);
        const lbl = new Int32Array(N), stack: number[] = [], slots: Slot[] = [];
        let cur = 0;
        for (let p = 0; p < N; p++) {
          if (!closed[p] || lbl[p]) continue;
          cur++;
          let area = 0, skc = 0, grc = 0, minx = w, maxx = 0, miny = h, maxy = 0;
          stack.push(p); lbl[p] = cur;
          while (stack.length) {
            const q = stack.pop()!, qx = q % w, qy = (q / w) | 0;
            area++; if (sky[q]) skc++; if (grass[q]) grc++;
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
          if (area < N * 0.008) continue;
          if (skc / area < 0.08 || grc / area < 0.05) continue;
          const bw = maxx - minx + 1, bh = maxy - miny + 1;
          // Đoán hình dạng: tỉ lệ lấp đầy (area/bbox). Hình tròn/ellipse ~ π/4 ≈ 0.785; hình chữ nhật ~ 1.
          const fill = area / (bw * bh);
          const aspect = bw / bh;
          const isCircle = fill >= 0.68 && fill <= 0.88 && aspect >= 0.8 && aspect <= 1.25;
          slots.push({
            x: +((minx / w) * 100).toFixed(1),
            y: +((miny / h) * 100).toFixed(1),
            w: +((bw / w) * 100).toFixed(1),
            h: +((bh / h) * 100).toFixed(1),
            shape: isCircle ? "circle" : "rect",
          });
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
