/* GHÉP ẢNH DEMO BẰNG CANVAS NGAY TRÊN TRÌNH DUYỆT.
   Trước đây việc này chạy ở backend bằng sharp -> Render free (512MB RAM) hay bị kill process.
   Nay chuyển hẳn sang frontend: browser vẽ canvas -> upload ảnh kết quả -> backend chỉ lưu URL.
   Công thức vẽ dùng CHUNG với imgStyle (CSS) và drawCover (xuất PDF) -> khớp pixel, WYSIWYG. */
import { FILTERS } from "./pages";
import { api } from "./api";

export type ComposeSlot = { x: number; y: number; w: number; h: number; rot?: number; shape?: string };
export type ComposePage = { image: string; slots?: ComposeSlot[] };
export type ComposeEdit = { ox?: number; oy?: number; scale?: number; rot?: number; filter?: string };
export type ComposeOverrides = {
  assignments?: Record<number, string | undefined> | (string | undefined)[];
  edits?: Record<number, ComposeEdit>;
};

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const MAX_W = 1600; // đủ nét cho preview, nhẹ RAM cho cả máy yếu

/** Ảnh Cloudinary: lấy bản đã resize (nhẹ + nhanh). URL khác giữ nguyên. */
export function cdnResize(url: string, w = MAX_W): string {
  const i = url.indexOf("/upload/");
  if (!url.includes("res.cloudinary.com") || i < 0 || url.includes("/upload/w_")) return url;
  return url.slice(0, i + 8) + `w_${w},q_auto/` + url.slice(i + 8);
}

/** Canvas bị "tainted" nếu vẽ ảnh cross-origin thiếu CORS header -> không export được.
 *  Cloudinary có sẵn CORS; nguồn khác thì proxy qua Cloudinary fetch để mượn CORS. */
function corsSafe(url: string): string {
  if (url.includes("res.cloudinary.com")) return cdnResize(url);
  if (CLOUD && /^https?:\/\//.test(url)) {
    return `https://res.cloudinary.com/${CLOUD}/image/fetch/w_${MAX_W},q_auto/${encodeURIComponent(url)}`;
  }
  return url;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Không tải được ảnh: " + url.slice(0, 80)));
    im.src = corsSafe(url);
  });
}

/** Vẽ ảnh vào khung theo ĐÚNG chỉnh sửa (cover + pan ox/oy + zoom + xoay + filter). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number, e?: ComposeEdit) {
  const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
  const sc = e?.scale ?? 1, oxP = e?.ox ?? 50, oyP = e?.oy ?? 38;
  const s0 = Math.max(dw / iw, dh / ih);          // object-fit: cover
  const cw = iw * s0, ch = ih * s0;
  const cropX = (cw - dw) * (oxP / 100);          // object-position
  const cropY = (ch - dh) * (oyP / 100);
  const tx = ((50 - oxP) * (sc - 1) / 100) * dw;  // pan thật theo mức zoom
  const ty = ((50 - oyP) * (sc - 1) / 100) * dh;
  const srcW = dw / sc, srcH = dh / sc;
  const visX = Math.max(0, Math.min(cw - srcW, cropX + dw / 2 - (dw / 2 + tx) / sc));
  const visY = Math.max(0, Math.min(ch - srcH, cropY + dh / 2 - (dh / 2 + ty) / sc));
  ctx.drawImage(img, visX / s0, visY / s0, srcW / s0, srcH / s0, dx, dy, dw, dh);
}

/** Xáo ảnh theo TỪNG MẪU (seed = id mẫu) — trùng thuật toán với bản server cũ nên
 *  chạy lại vẫn ra đúng cách xếp đó (idempotent). */
export function seededShuffle(pool: string[], seedStr: string): string[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Ghép 1 trang -> Blob JPEG. */
export async function composePageToBlob(
  page: ComposePage,
  gOffset: number,
  pickUrl: (gIdx: number) => string | undefined,
  edits?: Record<number, ComposeEdit>,
): Promise<Blob> {
  const base = await loadImage(page.image);
  const scale = Math.min(1, MAX_W / (base.naturalWidth || MAX_W));
  const W = Math.max(2, Math.round((base.naturalWidth || MAX_W) * scale));
  const H = Math.max(2, Math.round((base.naturalHeight || MAX_W) * scale));

  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(base, 0, 0, W, H);

  const slots = page.slots || [];
  for (let si = 0; si < slots.length; si++) {
    const s = slots[si];
    const url = pickUrl(gOffset + si);
    if (!url) continue;
    const dx = (s.x / 100) * W, dy = (s.y / 100) * H;
    const dw = Math.max(2, (s.w / 100) * W), dh = Math.max(2, (s.h / 100) * H);
    try {
      const im = await loadImage(url);
      ctx.save();
      try { ctx.filter = FILTERS[edits?.[gOffset + si]?.filter || "none"] || "none"; } catch {}
      // khung xoay: xoay quanh tâm khung
      if (s.rot) { ctx.translate(dx + dw / 2, dy + dh / 2); ctx.rotate((s.rot * Math.PI) / 180); ctx.translate(-(dx + dw / 2), -(dy + dh / 2)); }
      // khung tròn: cắt theo hình elip
      if (s.shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
        ctx.clip();
      }
      drawCover(ctx, im, dx, dy, dw, dh, edits?.[gOffset + si]);
      ctx.restore();
    } catch (err: any) {
      console.warn(`Bỏ qua khung ${gOffset + si}:`, err?.message); // 1 ô lỗi không làm hỏng cả trang
    }
  }
  return await new Promise<Blob>((resolve, reject) =>
    cv.toBlob((b) => (b ? resolve(b) : reject(new Error("Không xuất được ảnh từ canvas"))), "image/jpeg", 0.88));
}

/** Upload ảnh kết quả: ưu tiên gửi thẳng Cloudinary (nếu đã cấu hình preset),
 *  không thì đi qua backend (chỉ chuyển tiếp file, không xử lý nặng). */
export async function uploadBlob(blob: Blob, name: string): Promise<string> {
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (CLOUD && preset) {
    const fd = new FormData();
    fd.append("file", blob);
    fd.append("upload_preset", preset);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.secure_url) throw new Error(data?.error?.message || "Upload Cloudinary thất bại");
    return data.secure_url as string;
  }
  const { url } = await api.uploadFile(new File([blob], name, { type: "image/jpeg" }));
  return url;
}

/** Ghép TOÀN BỘ trang của 1 mẫu -> trả về danh sách URL ảnh demo. */
export async function composeTemplateDemo(
  templateId: string,
  pages: ComposePage[],
  pool: string[],
  overrides?: ComposeOverrides,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  if (!pages.length) throw new Error("Mẫu chưa có trang nào — vào Sửa mẫu tải slide lên trước");
  const totalSlots = pages.reduce((n, p) => n + (p.slots?.length || 0), 0);
  if (!totalSlots) throw new Error("Mẫu chưa có khung ảnh nào — vào Chỉnh khung thêm khung trước");
  const assigns: any = overrides?.assignments;
  if (!pool.length && !assigns) throw new Error("Kho ảnh demo trống — thêm ảnh vào kho trước");

  const shuffled = seededShuffle(pool, templateId);
  const pickUrl = (g: number) => (assigns && assigns[g]) || (shuffled.length ? shuffled[g % shuffled.length] : undefined);

  const gOffsets: number[] = [];
  { let acc = 0; for (const p of pages) { gOffsets.push(acc); acc += (p.slots || []).length; } }

  const urls: string[] = [];
  for (let pi = 0; pi < pages.length; pi++) {
    onProgress?.(pi, pages.length);
    const blob = await composePageToBlob(pages[pi], gOffsets[pi], pickUrl, overrides?.edits);
    urls.push(await uploadBlob(blob, `demo-${templateId}-${pi}.jpg`));
  }
  onProgress?.(pages.length, pages.length);
  return urls;
}
