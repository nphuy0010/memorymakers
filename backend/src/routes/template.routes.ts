import { Router } from "express";
import { prisma } from "../lib/prisma";

import { validate, templateSchema } from "../lib/validate";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { destroyMany } from "./upload.routes";

const router = Router();

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Bản ĐẦY ĐỦ (có pages) — dùng khi xem 1 mẫu / thiết kế
function format(t: any) {
  const { priceDigital, priceSoft, priceHard, priceFan, keywords, pages, demoPhotos, demoPages, _count, ...rest } = t;
  return {
    ...rest,
    keywords: JSON.parse(keywords || "[]"),
    pages: JSON.parse(pages || "[]"),
    productSize: (() => { try { return t.productSize ? JSON.parse(t.productSize) : null; } catch { return null; } })(),
    demoPhotos: JSON.parse(demoPhotos || "[]"),
    demoPages: JSON.parse(demoPages || "[]"),
    uses: _count?.projects ?? 0,
    prices: { digital: priceDigital, soft: priceSoft, hard: priceHard, fan: priceFan },
  };
}

// Bản NHẸ (KHÔNG kèm pages/demoPages) — dùng cho DANH SÁCH: tải nhanh hơn nhiều
function formatLight(t: any) {
  const { priceDigital, priceSoft, priceHard, priceFan, keywords, pages, demoPhotos, demoPages, _count, ...rest } = t;
  return {
    ...rest,
    keywords: JSON.parse(keywords || "[]"),
    pageCount: rest.pageCount ?? JSON.parse(pages || "[]").length,
    uses: _count?.projects ?? 0,
    prices: { digital: priceDigital, soft: priceSoft, hard: priceHard, fan: priceFan },
  };
}

// GET /api/templates?q=...  — trả TẤT CẢ mẫu, SẮP THEO LƯỢT DÙNG (nhiều người dùng nhất lên đầu)
router.get("/", async (req, res) => {
  const q = ((req.query.q as string) || "").toLowerCase().trim();
  let all;
  try {
    all = await prisma.template.findMany({
      where: { archived: false },
      include: { _count: { select: { projects: true } } },
      orderBy: [{ projects: { _count: "desc" } }, { featured: "desc" }, { createdAt: "desc" }],
    });
  } catch (e: any) {
    // DB chưa cập nhật cột archived -> fallback (vẫn trả mẫu) + nhắc chạy db:push
    console.error("templates fallback:", e?.message);
    all = await prisma.template.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  let list = all.map(formatLight);
  // Số sao thực = trung bình các lượt đánh giá đã có
  try {
    const grp = await prisma.project.groupBy({ by: ["templateId"], where: { rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } });
    const rmap: Record<string, any> = {};
    for (const g of grp) rmap[g.templateId] = { ratingAvg: g._avg.rating, ratingCount: g._count.rating };
    list = list.map((t: any) => ({ ...t, ratingAvg: rmap[t.id]?.ratingAvg ?? null, ratingCount: rmap[t.id]?.ratingCount ?? 0 }));
  } catch { list = list.map((t: any) => ({ ...t, ratingAvg: null, ratingCount: 0 })); }
  if (q) {
    list = list.filter(
      (t: any) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.keywords.some((k: string) => k.toLowerCase().includes(q))
    );
  }
  // PHÂN TRANG: mặc định 60/mẫu một trang; client đọc tổng qua header X-Total-Count
  const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "60")) || 60));
  res.setHeader("X-Total-Count", String(list.length));
  res.json(list.slice((page - 1) * limit, page * limit));
});

async function withRating(t: any) {
  try {
    const agg = await prisma.project.aggregate({ where: { templateId: t.id, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } });
    return { ...format(t), ratingAvg: agg._avg.rating, ratingCount: agg._count.rating };
  } catch { return { ...format(t), ratingAvg: null, ratingCount: 0 }; }
}

router.get("/slug/:slug", async (req, res) => {
  const t = await prisma.template.findUnique({ where: { slug: req.params.slug } });
  if (!t) return res.status(404).json({ error: "Không tìm thấy template" });
  res.json(await withRating(t));
});

// Đánh giá công khai của 1 mẫu (mọi người xem được)
router.get("/:id/reviews", async (req, res) => {
  try {
    const rows = await prisma.project.findMany({
      where: { templateId: req.params.id, rating: { not: null } },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" }, take: 100,
    });
    res.json(rows.map((r: any) => ({ rating: r.rating, review: r.review || "", name: r.user?.name || "Khách", createdAt: r.updatedAt })));
  } catch { res.json([]); }
});

router.get("/:id", async (req, res) => {
  const t = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: "Không tìm thấy template" });
  res.json(await withRating(t));
});

// POST /api/templates (admin) — tạo template.
// body: { title, description, keywords[], slots, prices{}, featured,
//         imageType: "DEMO"|"BLANK", image: dataUrl }
router.post("/", requireAuth, requireAdmin, validate(templateSchema), async (req, res) => {
  const { title, description, keywords, slots, prices, featured, imageType, image,
    category, pages, pageCount, previewGif, previewVideo, canvaLink,
    coverImage, demoImage, blankImage, demoPhotos, demoPages } = req.body;
  if (!title) return res.status(400).json({ error: "Thiếu tên template" });
  const nSlots = slots || 4;
  const t = await prisma.template.create({
    data: {
      slug: slugify(title) + "-" + Date.now().toString(36),
      title,
      description: description || "",
      keywords: JSON.stringify(keywords || []),
      category: category || "",
      slots: nSlots,
      pageCount: pageCount ?? Math.ceil(nSlots / 2),
      pages: JSON.stringify(pages || []),
      productSize: req.body.productSize ? JSON.stringify(req.body.productSize) : null,
      demoPhotos: JSON.stringify(demoPhotos || []),
      demoPages: JSON.stringify(demoPages || []),
      canvaLink: canvaLink || "",
      featured: !!featured,
      // Ưu tiên URL trực tiếp (từ /api/upload); vẫn nhận imageType+image (tương thích cũ).
      demoImage: demoImage ?? (imageType === "DEMO" ? image : null),
      blankImage: blankImage ?? (imageType === "BLANK" ? image : null),
      coverImage: coverImage ?? (imageType === "COVER" ? image : null),
      previewGif: previewGif ?? (imageType === "GIF" ? image : null),
      previewVideo: previewVideo || null,
      priceDigital: prices?.digital ?? 150000,
      priceSoft: prices?.soft ?? 290000,
      priceHard: prices?.hard ?? 450000,
      priceFan: prices?.fan ?? 520000,
    },
  });
  res.json(format(t));
});

// PUT /api/templates/:id (admin) — cập nhật. Có thể bổ sung ảnh demo/blank.
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { title, description, keywords, slots, prices, featured, imageType, image,
    category, pages, pageCount, previewGif, previewVideo, canvaLink,
    coverImage, demoImage, blankImage, demoPhotos, demoPages } = req.body;
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (keywords !== undefined) data.keywords = JSON.stringify(keywords);
  if (category !== undefined) data.category = category;
  if (canvaLink !== undefined) data.canvaLink = canvaLink;
  if (slots !== undefined) { data.slots = slots; data.pageCount = Math.ceil(slots / 2); }
  if (pageCount !== undefined) data.pageCount = pageCount;
  if (pages !== undefined) data.pages = JSON.stringify(pages);
  if (req.body.productSize !== undefined) data.productSize = req.body.productSize ? JSON.stringify(req.body.productSize) : null;
  if (demoPhotos !== undefined) data.demoPhotos = JSON.stringify(demoPhotos);
  if (demoPages !== undefined) data.demoPages = JSON.stringify(demoPages);
  if (previewGif !== undefined) data.previewGif = previewGif;
  if (previewVideo !== undefined) data.previewVideo = previewVideo;
  if (coverImage !== undefined) data.coverImage = coverImage;
  if (demoImage !== undefined) data.demoImage = demoImage;
  if (blankImage !== undefined) data.blankImage = blankImage;
  if (featured !== undefined) data.featured = featured;
  if (prices) { data.priceDigital = prices.digital; data.priceSoft = prices.soft; data.priceHard = prices.hard; data.priceFan = prices.fan; }
  // tương thích cũ: imageType + image
  if (imageType === "DEMO" && image) data.demoImage = image;
  if (imageType === "BLANK" && image) data.blankImage = image;
  if (imageType === "COVER" && image) data.coverImage = image;
  if (imageType === "GIF" && image) data.previewGif = image;
  const t = await prisma.template.update({ where: { id: req.params.id }, data });
  // Ảnh demo nay được ghép ở TRÌNH DUYỆT (Admin -> Kho ảnh demo -> "Áp dụng cho tất cả template"),
  // không ghép ở server nữa để backend khỏi tốn RAM.
  res.json(format(t));
});

// Trạng thái coi là ĐÃ THANH TOÁN -> tuyệt đối GIỮ LẠI để phục vụ in ấn & lịch sử đơn
const PAID_STATUSES = ["PURCHASED", "SHIPPING", "DELIVERED"];

// XEM TRƯỚC ẢNH HƯỞNG trước khi xoá — để admin confirm với con số cụ thể
router.get("/:id/usage", requireAuth, requireAdmin, async (req, res) => {
  const all = await prisma.project.findMany({ where: { templateId: req.params.id }, select: { status: true } });
  const paid = all.filter((p: { status: string }) => PAID_STATUSES.includes(p.status)).length;
  res.json({ total: all.length, paid, unpaid: all.length - paid });
});

// "Xoá" template: XOÁ các dự án CHƯA thanh toán (kèm ảnh khách trên Cloudinary),
// GIỮ dự án ĐÃ thanh toán. Còn dự án đã thanh toán -> xoá mềm (archived) để không mất lịch sử đơn;
// không còn dự án nào -> xoá hẳn template + ảnh của template.
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const tpl = await prisma.template.findUnique({ where: { id } });
  if (!tpl) return res.status(404).json({ error: "Không tìm thấy template" });

  const projects = await prisma.project.findMany({ where: { templateId: id }, select: { id: true, status: true, photos: true } });
  const unpaid = projects.filter((p: { status: string }) => !PAID_STATUSES.includes(p.status));
  const paidCount = projects.length - unpaid.length;

  // 1) Gom ảnh khách của các dự án sắp xoá (dọn rác Cloudinary SAU khi xoá DB thành công)
  const photoUrls: string[] = [];
  for (const p of unpaid) {
    try { const arr = JSON.parse((p as any).photos || "[]"); if (Array.isArray(arr)) photoUrls.push(...arr.filter((u: any) => typeof u === "string")); } catch {}
  }

  // 2) Xoá dự án chưa thanh toán
  if (unpaid.length) {
    await prisma.project.deleteMany({ where: { id: { in: unpaid.map((p: { id: string }) => p.id) } } });
  }

  // 3) Còn dự án đã thanh toán -> chỉ xoá mềm (KHÔNG xoá ảnh template vì đơn cũ còn cần để in)
  if (paidCount > 0) {
    await prisma.template.update({ where: { id }, data: { archived: true } });
    const cleaned = await destroyMany(photoUrls);
    return res.json({ ok: true, archived: true, deletedProjects: unpaid.length, keptPaid: paidCount, cleanedImages: cleaned });
  }

  // 4) Không còn dự án nào -> xoá hẳn template + dọn ảnh của template
  await prisma.template.delete({ where: { id } });
  const tplImages: string[] = [tpl.blankImage, tpl.demoImage, tpl.coverImage, tpl.previewGif, tpl.previewVideo].filter(Boolean) as string[];
  for (const key of ["pages", "demoPages", "demoPhotos"]) {
    try {
      const arr = JSON.parse((tpl as any)[key] || "[]");
      if (Array.isArray(arr)) {
        for (const it of arr) {
          if (typeof it === "string") tplImages.push(it);
          else if (it && typeof it.image === "string") tplImages.push(it.image); // pages: [{ image, slots }]
        }
      }
    } catch {}
  }
  const cleaned = await destroyMany([...photoUrls, ...tplImages]);
  res.json({ ok: true, archived: false, deletedProjects: unpaid.length, keptPaid: 0, cleanedImages: cleaned });
});

export default router;
