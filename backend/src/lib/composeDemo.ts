/* GHÉP ẢNH DEMO PHÍA SERVER (sharp) — idempotent, không phụ thuộc trình duyệt admin.
   Với mỗi trang template: lấy ảnh nền + điền ảnh kho vào từng khung (cover-crop "attention"
   = smart-crop tự né cắt mặt/vùng nổi bật), hỗ trợ khung XOAY -> xuất ảnh phẳng, upload, lưu demoPages. */
import sharp from "sharp";
import { prisma } from "./prisma";
import { saveBuffer } from "../routes/upload.routes";

// PREVIEW không cần bản in: với URL Cloudinary, tải bản đã resize 1600px q_auto (nhẹ + nhanh hơn nhiều lần)
function cdnResize(url: string, w = 1600): string {
  const i = url.indexOf("/upload/");
  if (!url.includes("res.cloudinary.com") || i < 0 || url.includes("/upload/w_")) return url;
  return url.slice(0, i + 8) + `w_${w},q_auto/` + url.slice(i + 8);
}
async function fetchBuf(url: string): Promise<Buffer> {
  if (!url || !/^https?:\/\//i.test(url)) throw new Error(`URL ảnh không hợp lệ: "${(url || "").slice(0, 60) || "(rỗng)"}"`);
  // RETRY 3 lần (mạng Render<->Cloudinary chập chờn: ETIMEDOUT/ECONNRESET) + timeout 30s + bung nguyên nhân thật
  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error("Tải ảnh lỗi HTTP " + r.status + " (ảnh có thể đã mất trên máy chủ): " + url.slice(0, 90));
      return Buffer.from(await r.arrayBuffer());
    } catch (e: any) {
      lastErr = e;
      const code = (e?.cause?.code || "") + " " + (e?.message || "");
      if (attempt < 3 && /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|timeout|aborted/i.test(code)) { await new Promise((z) => setTimeout(z, attempt * 1500)); continue; }
      break;
    }
  }
  const cause = lastErr?.cause?.message || lastErr?.cause?.code || lastErr?.message || "không rõ";
  throw new Error(`Không tải được ảnh (${cause}): ${url.slice(0, 90)}`);
}

type Slot = { x: number; y: number; w: number; h: number; rot?: number };
// Admin tinh chỉnh preview: gán ảnh theo ô (assignments[g]) + vị trí/zoom (edits[g])
export type DemoOverrides = {
  assignments?: Record<number, string | undefined> | (string | undefined)[];
  edits?: Record<number, { ox?: number; oy?: number; scale?: number }>;
};
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export async function composeTemplateDemo(templateId: string, pool: string[], overrides?: DemoOverrides): Promise<{ ok: boolean; pages: number; reason?: string }> {
  const t = await prisma.template.findUnique({ where: { id: templateId } });
  if (!t) return { ok: false, pages: 0, reason: "Không tìm thấy template (có thể đã bị xoá)" };
  if (!pool.length && !overrides?.assignments) return { ok: false, pages: 0, reason: "Kho ảnh demo trống — thêm ảnh vào kho trước" };
  const pages: { image: string; slots: Slot[] }[] = JSON.parse(t.pages || "[]");
  if (!pages.length) return { ok: false, pages: 0, reason: "Mẫu chưa có trang nào — vào Sửa mẫu tải slide lên trước" };
  const totalSlots = pages.reduce((n, p) => n + (p.slots?.length || 0), 0);
  if (!totalSlots) return { ok: false, pages: 0, reason: "Mẫu chưa có khung ảnh nào — vào Chỉnh khung thêm khung trước" };

  // XÁO thứ tự ảnh THEO TỪNG MẪU (seed = id mẫu): mỗi template một cách xếp khác nhau,
  // nhưng chạy lại vẫn ra đúng thứ tự đó (idempotent).
  let seed = 0;
  for (let i = 0; i < templateId.length; i++) seed = (seed * 31 + templateId.charCodeAt(i)) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }

  const cache = new Map<string, Promise<Buffer>>(); // ảnh kho: 1 URL chỉ fetch 1 lần kể cả khi các trang chạy song song
  const getBuf = (url: string) => { let p = cache.get(url); if (!p) { p = fetchBuf(cdnResize(url)); cache.set(url, p); } return p; };
  // XỬ LÝ CÁC TRANG SONG SONG: g (chỉ số ô toàn cục) tính trước theo offset từng trang để không race
  const gOffsets: number[] = [];
  { let acc = 0; for (const pg of pages) { gOffsets.push(acc); acc += (pg.slots || []).length; } }

  // ÉP overlay vừa trong base trước khi composite (sharp yêu cầu overlay ≤ base):
  //  - left/top âm -> cắt phần tràn trái/trên, đặt lại 0
  //  - tràn phải/dưới -> cắt bớt bề rộng/cao
  //  - không còn phần nhìn thấy -> bỏ overlay (trả null)
  const fitOverlay = async (buf: Buffer, left: number, top: number, baseW: number, baseH: number) => {
    const m = await sharp(buf).metadata();
    const w = m.width || 1, h = m.height || 1;
    let cutL = 0, cutT = 0;
    if (left < 0) { cutL = -left; left = 0; }
    if (top < 0) { cutT = -top; top = 0; }
    const visW = Math.min(w - cutL, baseW - left);
    const visH = Math.min(h - cutT, baseH - top);
    if (visW <= 0 || visH <= 0) return null;
    const input = (cutL || cutT || visW < w || visH < h)
      ? await sharp(buf).extract({ left: cutL, top: cutT, width: visW, height: visH }).toBuffer()
      : buf;
    return { input, left, top };
  };

  const composed: string[] = await Promise.all(pages.map(async (pg, pi) => {
    const base = sharp(await fetchBuf(cdnResize(pg.image)));
    const meta = await base.metadata();
    const W = meta.width || 2000, H = meta.height || 1300;

    // CÁC Ô TRONG TRANG CHẠY SONG SONG — kết quả giữ thứ tự lớp theo chỉ số ô
    const slotResults = await Promise.all((pg.slots || []).map(async (s, si) => {
      const ov: any = overrides?.assignments;
      const gIdx = gOffsets[pi] + si;
      const url: string | undefined = (ov && ov[gIdx]) || (shuffled.length ? shuffled[gIdx % shuffled.length] : undefined);
      if (!url) return null;
      const srcBuf = await getBuf(url);
      const dw = Math.max(2, Math.round((s.w / 100) * W));
      const dh = Math.max(2, Math.round((s.h / 100) * H));
      const e = overrides?.edits?.[gIdx];
      let img: any;
      try {
        if (e) {
          // KHỚP PIXEL với công thức hiển thị client (objectPosition + translate theo zoom) -> WYSIWYG
          const m = await sharp(srcBuf).metadata();
          const iw = m.width || 1000, ih = m.height || 1000;
          const s0 = Math.max(dw / iw, dh / ih);
          const cw = Math.max(dw, Math.round(iw * s0)), ch = Math.max(dh, Math.round(ih * s0));
          const sc = Math.max(1, Math.min(4, e.scale || 1));
          const ox = clampN(e.ox ?? 50, 0, 100), oy = clampN(e.oy ?? 38, 0, 100);
          const cropX = ((cw - dw) * ox) / 100, cropY = ((ch - dh) * oy) / 100;
          const tx = (((50 - ox) * (sc - 1)) / 100) * dw, ty = (((50 - oy) * (sc - 1)) / 100) * dh;
          // PHÒNG THỦ extract: resize ra buffer thật rồi mới cắt; mọi biên đều min/clamp theo kích thước thật
          const rbuf = await sharp(srcBuf).resize(cw, ch, { fit: "fill" }).toBuffer();
          const rm = await sharp(rbuf).metadata();
          const RW = rm.width || cw, RH = rm.height || ch;
          const srcW = clampN(Math.round(dw / sc), 1, RW), srcH = clampN(Math.round(dh / sc), 1, RH);
          const left = clampN(Math.round(cropX + dw / 2 - (dw / 2 + tx) / sc), 0, RW - srcW);
          const top = clampN(Math.round(cropY + dh / 2 - (dh / 2 + ty) / sc), 0, RH - srcH);
          img = sharp(rbuf).extract({ left, top, width: srcW, height: srcH }).resize(dw, dh);
        } else {
          // mặc định: cover-crop 'attention' (smart-crop né cắt mặt)
          img = sharp(srcBuf).resize(dw, dh, { fit: "cover", position: sharp.strategy.attention });
        }
      } catch (err: any) {
        // 1 ô lỗi -> KHÔNG đánh sập cả mẫu: rơi về crop mặc định
        console.warn(`compose slot ${gIdx} lỗi (${err?.message}) -> dùng crop mặc định`);
        img = sharp(srcBuf).resize(dw, dh, { fit: "cover", position: sharp.strategy.attention });
      }
      let left = Math.round((s.x / 100) * W), top = Math.round((s.y / 100) * H);
      try {
        if (s.rot) {
          const buf = await img.png().toBuffer();
          const rotated = await sharp(buf).rotate(s.rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
          const rm = await sharp(rotated).metadata();
          // xoay quanh TÂM khung: bù phần nở ra sau khi xoay
          left = Math.round(left + dw / 2 - (rm.width || dw) / 2);
          top = Math.round(top + dh / 2 - (rm.height || dh) / 2);
          return await fitOverlay(rotated, left, top, W, H);
        } else {
          return await fitOverlay(await img.jpeg({ quality: 85 }).toBuffer(), left, top, W, H);
        }
      } catch (err: any) {
        // log kích thước để debug thay vì đánh sập cả mẫu
        console.warn(`compose overlay slot ${gIdx} lỗi: ${err?.message} | base=${W}x${H} slot=${dw}x${dh}@${left},${top}`);
        return null;
      }
    }));
    const overlays = slotResults.filter(Boolean) as { input: Buffer; left: number; top: number }[];

    const out = await base.composite(overlays).jpeg({ quality: 88 }).toBuffer();
    return await saveBuffer(out, "image/jpeg", `demo-${t.id}-${pi}.jpg`);
  }));

  await prisma.template.update({ where: { id: templateId }, data: { demoPages: JSON.stringify(composed), demoImage: composed[0] || null } });
  return { ok: true, pages: composed.length };
}

export async function getDemoPool(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: "demoPool" } });
  return row ? JSON.parse(row.value) : [];
}
