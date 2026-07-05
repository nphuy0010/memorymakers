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

export async function composeTemplateDemo(templateId: string, pool: string[]): Promise<{ ok: boolean; pages: number }> {
  const t = await prisma.template.findUnique({ where: { id: templateId } });
  if (!t || !pool.length) return { ok: false, pages: 0 };
  const pages: { image: string; slots: Slot[] }[] = JSON.parse(t.pages || "[]");
  if (!pages.length) return { ok: false, pages: 0 };

  const cache = new Map<string, Buffer>(); // ảnh kho tải 1 lần
  const composed: string[] = [];
  let g = 0;

  for (const pg of pages) {
    const base = sharp(await fetchBuf(pg.image));
    const meta = await base.metadata();
    const W = meta.width || 2000, H = meta.height || 1300;
    const overlays: { input: Buffer; left: number; top: number }[] = [];

    for (const s of pg.slots || []) {
      const url = pool[g % pool.length]; g++;
      if (!cache.has(url)) cache.set(url, await fetchBuf(url));
      const dw = Math.max(2, Math.round((s.w / 100) * W));
      const dh = Math.max(2, Math.round((s.h / 100) * H));
      // cover-crop thông minh: 'attention' ưu tiên vùng nổi bật (mặt người) -> không cắt mất mặt
      let img = sharp(cache.get(url)!).resize(dw, dh, { fit: "cover", position: sharp.strategy.attention });
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
