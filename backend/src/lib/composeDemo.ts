/* GHÉP ẢNH DEMO PHÍA SERVER (sharp) — idempotent, không phụ thuộc trình duyệt admin.
   Với mỗi trang template: lấy ảnh nền + điền ảnh kho vào từng khung (cover-crop "attention"
   = smart-crop tự né cắt mặt/vùng nổi bật), hỗ trợ khung XOAY -> xuất ảnh phẳng, upload, lưu demoPages. */
import sharp from "sharp";
import { prisma } from "./prisma";
import { saveBuffer } from "../routes/upload.routes";

async function fetchBuf(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Tải ảnh lỗi " + r.status + ": " + url.slice(0, 80));
  return Buffer.from(await r.arrayBuffer());
}

type Slot = { x: number; y: number; w: number; h: number; rot?: number };
// Admin tinh chỉnh preview: gán ảnh theo ô (assignments[g]) + vị trí/zoom (edits[g])
export type DemoOverrides = {
  assignments?: Record<number, string | undefined> | (string | undefined)[];
  edits?: Record<number, { ox?: number; oy?: number; scale?: number }>;
};
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export async function composeTemplateDemo(templateId: string, pool: string[], overrides?: DemoOverrides): Promise<{ ok: boolean; pages: number }> {
  const t = await prisma.template.findUnique({ where: { id: templateId } });
  if (!t || (!pool.length && !overrides?.assignments)) return { ok: false, pages: 0 };
  const pages: { image: string; slots: Slot[] }[] = JSON.parse(t.pages || "[]");
  if (!pages.length) return { ok: false, pages: 0 };

  // XÁO thứ tự ảnh THEO TỪNG MẪU (seed = id mẫu): mỗi template một cách xếp khác nhau,
  // nhưng chạy lại vẫn ra đúng thứ tự đó (idempotent).
  let seed = 0;
  for (let i = 0; i < templateId.length; i++) seed = (seed * 31 + templateId.charCodeAt(i)) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }

  const cache = new Map<string, Buffer>(); // ảnh kho tải 1 lần
  const composed: string[] = [];
  let g = 0;

  for (const pg of pages) {
    const base = sharp(await fetchBuf(pg.image));
    const meta = await base.metadata();
    const W = meta.width || 2000, H = meta.height || 1300;
    const overlays: { input: Buffer; left: number; top: number }[] = [];

    for (const s of pg.slots || []) {
      const ov: any = overrides?.assignments;
      const gIdx = g; g++;
      const url: string | undefined = (ov && ov[gIdx]) || (shuffled.length ? shuffled[gIdx % shuffled.length] : undefined);
      if (!url) continue;
      if (!cache.has(url)) cache.set(url, await fetchBuf(url));
      const dw = Math.max(2, Math.round((s.w / 100) * W));
      const dh = Math.max(2, Math.round((s.h / 100) * H));
      const e = overrides?.edits?.[gIdx];
      let img: any;
      if (e && (e.ox !== undefined || e.oy !== undefined || (e.scale && e.scale > 1))) {
        // ADMIN đã chỉnh tay -> crop theo đúng điểm nhìn + zoom admin đặt
        const m = await sharp(cache.get(url)!).metadata();
        const iw = m.width || 1000, ih = m.height || 1000;
        const zoom = Math.max(1, e.scale || 1);
        const sc = Math.max(dw / iw, dh / ih) * zoom;
        const rw = Math.max(dw, Math.round(iw * sc)), rh = Math.max(dh, Math.round(ih * sc));
        const left = clampN(Math.round(((e.ox ?? 50) / 100) * rw - dw / 2), 0, rw - dw);
        const top = clampN(Math.round(((e.oy ?? 38) / 100) * rh - dh / 2), 0, rh - dh);
        img = sharp(cache.get(url)!).resize(rw, rh).extract({ left, top, width: dw, height: dh });
      } else {
        // mặc định: cover-crop 'attention' (smart-crop né cắt mặt)
        img = sharp(cache.get(url)!).resize(dw, dh, { fit: "cover", position: sharp.strategy.attention });
      }
      let left = Math.round((s.x / 100) * W), top = Math.round((s.y / 100) * H);
      if (s.rot) {
        const buf = await img.png().toBuffer();
        const rotated = await sharp(buf).rotate(s.rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
        const rm = await sharp(rotated).metadata();
        // xoay quanh TÂM khung: bù phần nở ra sau khi xoay
        left = Math.round(left + dw / 2 - (rm.width || dw) / 2);
        top = Math.round(top + dh / 2 - (rm.height || dh) / 2);
        overlays.push({ input: rotated, left, top });
      } else {
        overlays.push({ input: await img.jpeg({ quality: 90 }).toBuffer(), left, top });
      }
    }

    const out = await base.composite(overlays).jpeg({ quality: 88 }).toBuffer();
    composed.push(await saveBuffer(out, "image/jpeg", `demo-${t.id}-${composed.length}.jpg`));
  }

  await prisma.template.update({ where: { id: templateId }, data: { demoPages: JSON.stringify(composed), demoImage: composed[0] || null } });
  return { ok: true, pages: composed.length };
}

export async function getDemoPool(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: "demoPool" } });
  return row ? JSON.parse(row.value) : [];
}
