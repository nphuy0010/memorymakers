import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { computeAmount, canCustomerDelete } from "../lib/business";
import { validate, projectCreateSchema, projectUpdateSchema, orderSchema, reviewSchema } from "../lib/validate";

const router = Router();

function format(p: any) {
  return { ...p, photos: JSON.parse(p.photos || "[]"), layout: p.layout ? JSON.parse(p.layout) : null, address: p.address ? JSON.parse(p.address) : null };
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

// Lấy 1 dự án của chính user (để khôi phục thiết kế khi tiếp tục)
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { template: true } });
  if (!p) return res.status(404).json({ error: "Không tìm thấy dự án" });
  res.json(format(p));
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
