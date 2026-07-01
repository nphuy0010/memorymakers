import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function format(t: any) {
  const { priceDigital, priceSoft, priceHard, priceFan, keywords, pages, _count, ...rest } = t;
  return {
    ...rest,
    keywords: JSON.parse(keywords || "[]"),
    pages: JSON.parse(pages || "[]"),
    uses: _count?.projects ?? 0, // số lượt người dùng đã dùng mẫu
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
  let list = all.map(format);
  // Số sao thực = trung bình các lượt đánh giá đã có
  try {
    const grp = await prisma.project.groupBy({ by: ["templateId"], where: { rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } });
    const rmap: Record<string, any> = {};
    for (const g of grp) rmap[g.templateId] = { ratingAvg: g._avg.rating, ratingCount: g._count.rating };
    list = list.map((t) => ({ ...t, ratingAvg: rmap[t.id]?.ratingAvg ?? null, ratingCount: rmap[t.id]?.ratingCount ?? 0 }));
  } catch { list = list.map((t) => ({ ...t, ratingAvg: null, ratingCount: 0 })); }
  if (q) {
    list = list.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.keywords.some((k: string) => k.toLowerCase().includes(q))
    );
  }
  res.json(list);
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
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { title, description, keywords, slots, prices, featured, imageType, image,
    category, pages, pageCount, previewGif, previewVideo, canvaLink,
    coverImage, demoImage, blankImage } = req.body;
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
    coverImage, demoImage, blankImage } = req.body;
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (keywords !== undefined) data.keywords = JSON.stringify(keywords);
  if (category !== undefined) data.category = category;
  if (canvaLink !== undefined) data.canvaLink = canvaLink;
  if (slots !== undefined) { data.slots = slots; data.pageCount = Math.ceil(slots / 2); }
  if (pageCount !== undefined) data.pageCount = pageCount;
  if (pages !== undefined) data.pages = JSON.stringify(pages);
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
  res.json(format(t));
});

// "Xoá" template = XOÁ MỀM (ẩn khỏi catalog) để KHÔNG làm mất đơn hàng đã tham chiếu mẫu này.
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const orders = await prisma.project.count({ where: { templateId: req.params.id } });
  if (orders > 0) {
    await prisma.template.update({ where: { id: req.params.id }, data: { archived: true } });
    return res.json({ ok: true, archived: true });
  }
  // Chưa có đơn nào -> xoá hẳn cho gọn.
  await prisma.template.delete({ where: { id: req.params.id } });
  res.json({ ok: true, archived: false });
});

export default router;
