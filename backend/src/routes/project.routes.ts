import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

function format(p: any) {
  return { ...p, photos: JSON.parse(p.photos || "[]"), address: p.address ? JSON.parse(p.address) : null };
}

const PRICE_KEY: Record<string, "priceSoft" | "priceHard" | "priceFan" | "priceDigital"> = {
  soft: "priceSoft", hard: "priceHard", fan: "priceFan", digital: "priceDigital",
};

// Danh sách dự án của user (đã thiết kế / đã mua / ...). KHÔNG có dự án ảo.
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.project.findMany({
    where: { userId: req.userId },
    include: { template: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json(list.map(format));
});

// Tạo dự án — chỉ gọi khi người dùng đã chèn ảnh / thiết kế thật.
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { templateId, photos, title } = req.body;
  const tpl = await prisma.template.findUnique({ where: { id: templateId } });
  if (!tpl) return res.status(404).json({ error: "Template không tồn tại" });
  const p = await prisma.project.create({
    data: {
      userId: req.userId!,
      templateId,
      title: title || tpl.title,
      status: "DESIGNING",
      photos: JSON.stringify(photos || []),
    },
    include: { template: true },
  });
  res.json(format(p));
});

// Cập nhật thiết kế / trạng thái
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: "Không tìm thấy dự án" });
  const { photos, status, title } = req.body;
  const data: any = {};
  if (photos !== undefined) data.photos = JSON.stringify(photos);
  if (status !== undefined) data.status = status;
  if (title !== undefined) data.title = title;
  const p = await prisma.project.update({ where: { id: req.params.id }, data, include: { template: true } });
  res.json(format(p));
});

// Đặt hàng: tính giá theo option (giá CHỈ lộ ở bước này), set trạng thái.
router.post("/:id/order", requireAuth, async (req: AuthRequest, res) => {
  const { mode, option, address } = req.body; // mode: digital|physical; option: soft|hard|fan|digital
  const project = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { template: true } });
  if (!project) return res.status(404).json({ error: "Không tìm thấy dự án" });

  const key = PRICE_KEY[mode === "digital" ? "digital" : option];
  const amount = (project.template as any)[key] as number;
  const status = mode === "digital" ? "DELIVERED" : "SHIPPING";

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

export default router;
