import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { computeAmount, canCustomerDelete } from "../lib/business";
import { validate, projectCreateSchema, projectUpdateSchema, orderSchema, reviewSchema } from "../lib/validate";
import { destroyByUrl } from "./upload.routes";

const router = Router();

// Template lồng trong dự án đến từ Prisma dạng THÔ: pages/keywords... còn là chuỗi JSON.
// Không parse -> buildPages() ở frontend nhận chuỗi thay vì mảng -> dựng ra trang rỗng
// -> flipbook & ảnh bìa dự án TRẮNG TRƠN. Parse tại đây cho mọi API trả về dự án.
function formatTemplate(t: any) {
  if (!t) return t;
  const j = (v: any, fb: any) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };
  return {
    ...t,
    pages: j(t.pages, []),
    keywords: j(t.keywords, []),
    demoPages: j(t.demoPages, []),
    demoPhotos: j(t.demoPhotos, []),
    productSize: j(t.productSize, null),
  };
}

function format(p: any) {
  return {
    ...p,
    photos: JSON.parse(p.photos || "[]"),
    layout: p.layout ? JSON.parse(p.layout) : null,
    address: p.address ? JSON.parse(p.address) : null,
    ...(p.template ? { template: formatTemplate(p.template) } : {}),
  };
}

const PRICE_KEY: Record<string, "priceSoft" | "priceHard" | "priceFan" | "priceDigital"> = {
  soft: "priceSoft", hard: "priceHard", fan: "priceFan", digital: "priceDigital",
};

// Danh sách dự án của user (đã thiết kế / đã mua / ...). KHÔNG có dự án ảo.
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await prisma.project.findMany({
      where: { userId: req.userId },
      include: { template: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(list.map(format));
  } catch (e: any) {
    console.error("projects error:", e?.message);
    res.json([]);
  }
});

/* ===== KHO ẢNH CỦA NGƯỜI DÙNG — dùng chung cho MỌI dự án của chính họ =====
   Lưu ở User.photoPool (JSON [{url, at}]), chỉ giữ ảnh trong 24 giờ.
   Tách bạch theo tài khoản: khách A không bao giờ thấy ảnh của khách B. */
const POOL_TTL = 24 * 60 * 60 * 1000;

async function readPool(userId: string): Promise<{ url: string; at: number }[]> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { photoPool: true } });
  let arr: any[] = [];
  try { arr = JSON.parse((u as any)?.photoPool || "[]"); } catch {}
  const cutoff = Date.now() - POOL_TTL;
  return arr.filter((it: any) => it && typeof it.url === "string" && Number(it.at) > cutoff)
            .map((it: any) => ({ url: it.url, at: Number(it.at) }));
}
async function writePool(userId: string, list: { url: string; at: number }[]) {
  await prisma.user.update({ where: { id: userId }, data: { photoPool: JSON.stringify(list.slice(0, 200)) } });
}

// Lấy kho ảnh (mới nhất trước, đã lọc quá 24h)
router.get("/my-photos", requireAuth, async (req: AuthRequest, res) => {
  const pool = await readPool(req.userId!);
  res.json({ photos: pool.sort((a, b) => b.at - a.at).map((p) => p.url) });
});

// Thêm ảnh vừa tải lên vào kho (cộng dồn, tự bỏ trùng)
router.post("/my-photos", requireAuth, async (req: AuthRequest, res) => {
  const urls: string[] = Array.isArray(req.body?.urls) ? req.body.urls : [];
  const clean = urls.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 50);
  if (!clean.length) return res.json({ ok: true });
  const pool = await readPool(req.userId!);
  const have = new Set(pool.map((p) => p.url));
  const now = Date.now();
  for (const u of clean) if (!have.has(u)) { pool.unshift({ url: u, at: now }); have.add(u); }
  await writePool(req.userId!, pool);
  res.json({ ok: true, total: pool.length });
});

// Xoá 1 ảnh khỏi kho — chỉ ảnh của chính mình; xoá file nếu không còn nơi nào dùng
router.post("/my-photos/remove", requireAuth, async (req: AuthRequest, res) => {
  const url = String(req.body?.url || "").split("?")[0];
  if (!url) return res.status(400).json({ error: "Thiếu URL" });
  const pool = await readPool(req.userId!);
  await writePool(req.userId!, pool.filter((p) => p.url.split("?")[0] !== url));

  // Chỉ xoá file khi không còn đơn đã thanh toán / template nào dùng ảnh này
  const PAID = ["PURCHASED", "SHIPPING", "DELIVERED"];
  let fileDeleted = false;
  const usedPaid = await prisma.project.count({ where: { status: { in: PAID }, photos: { contains: url } } });
  if (!usedPaid) {
    const inTpl = await prisma.template.count({ where: { OR: [{ pages: { contains: url } }, { demoPages: { contains: url } }, { demoPhotos: { contains: url } }] } });
    if (!inTpl) fileDeleted = await destroyByUrl(url);
  }
  res.json({ ok: true, fileDeleted });
});

// Lấy 1 dự án của chính user (để khôi phục thiết kế khi tiếp tục)
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { template: true } });
  if (!p) return res.status(404).json({ error: "Không tìm thấy dự án" });
  res.json(format(p));
});

// DỮ LIỆU FLIPBOOK của 1 đơn — CHỈ mở khi đơn đã ở trạng thái Đang giao / Đã giao.
// Kiểm tra ở BACKEND (không tin frontend): trạng thái chưa đủ -> 403, không trả dữ liệu trang.
const FLIPBOOK_ALLOWED = ["SHIPPING", "DELIVERED"];
router.get("/:id/flipbook", requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { template: true } });
  if (!p) return res.status(404).json({ error: "Không tìm thấy dự án" });
  if (!FLIPBOOK_ALLOWED.includes(p.status)) {
    return res.status(403).json({ error: "Chưa được phép xem. Đơn cần ở trạng thái Đang giao hoặc Đã giao." });
  }
  const f = format(p);
  res.json({ template: f.template, layout: f.layout, status: p.status });
});

// Tạo dự án — chỉ gọi khi người dùng đã chèn ảnh / thiết kế thật.
router.post("/", requireAuth, validate(projectCreateSchema), async (req: AuthRequest, res) => {
  const { templateId, photos, title, layout } = req.body;
  const tpl = await prisma.template.findUnique({ where: { id: templateId } });
  if (!tpl) return res.status(404).json({ error: "Template không tồn tại" });
  const p = await prisma.project.create({
    data: {
      userId: req.userId!,
      templateId,
      title: title || tpl.title,
      status: "DESIGNING",
      photos: JSON.stringify(photos || []),
      layout: layout ? JSON.stringify(layout) : null,
    },
    include: { template: true },
  });
  res.json(format(p));
});

// Cập nhật thiết kế / trạng thái
router.put("/:id", requireAuth, validate(projectUpdateSchema), async (req: AuthRequest, res) => {
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Không tìm thấy dự án" });
  const { photos, status, title, layout } = req.body;
  const data: any = {};
  if (photos !== undefined) data.photos = JSON.stringify(photos);
  if (layout !== undefined) data.layout = layout ? JSON.stringify(layout) : null;
  if (status !== undefined) data.status = status;
  if (title !== undefined) data.title = title;
  const p = await prisma.project.update({ where: { id: req.params.id }, data, include: { template: true } });
  res.json(format(p));
});

// Đặt hàng: tính giá theo option (giá CHỈ lộ ở bước này), set trạng thái.
router.post("/:id/order", requireAuth, validate(orderSchema), async (req: AuthRequest, res) => {
  const { mode, option, address } = req.body;
  const project = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { template: true } });
  if (!project) return res.status(404).json({ error: "Không tìm thấy dự án" });

  // TIỀN LUÔN TÍNH PHÍA SERVER từ bảng giá template (đã validate option)
  const amount = computeAmount(mode, option, project.template as any);
  // Khách bấm "đã thanh toán" -> lưu đơn ở trạng thái ĐANG XỬ LÝ (PURCHASED).
  // Admin kiểm tra thanh toán rồi tự chuyển sang Đang giao / Đã giao.
  const status = "PURCHASED";

  const p = await prisma.project.update({
    where: { id: project.id },
    data: { mode, option: mode === "digital" ? "digital" : option, amount, status, address: address ? JSON.stringify(address) : null },
    include: { template: true },
  });
  res.json(format(p));
});

router.post("/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Không tìm thấy dự án" });
  const p = await prisma.project.update({ where: { id: req.params.id }, data: { status: "CANCELLED" }, include: { template: true } });
  res.json(format(p));
});

// Đánh giá đơn đã giao: sao (1-5) + nhận xét
router.post("/:id/review", requireAuth, validate(reviewSchema), async (req: AuthRequest, res) => {
  const { rating, review } = req.body;
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Không tìm thấy dự án" });
  const r = Math.max(1, Math.min(5, parseInt(rating) || 5));
  const p = await prisma.project.update({ where: { id: req.params.id }, data: { rating: r, review: (review || "").slice(0, 1000) }, include: { template: true } });
  res.json(format(p));
});

// Xóa dự án của CHÍNH mình — cho phép nháp/đã hủy; KHÔNG cho xóa đơn đã thanh toán (giữ lịch sử đơn).
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Không tìm thấy dự án" });
  if (!canCustomerDelete(existing.status)) {
    return res.status(400).json({ error: "Không thể xóa đơn đã thanh toán" });
  }
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
