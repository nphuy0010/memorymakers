import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { validate, demoPoolSchema } from "../lib/validate";
import { z } from "zod";

const router = Router();

const DEFAULT_ABOUT = {
  headline: "Mỗi cuốn sách là một lần được sống lại khoảnh khắc.",
  mission: "Memory Makers giúp biến những kỷ niệm trong điện thoại thành một vật phẩm có thể chạm vào. Sứ mệnh: lưu giữ câu chuyện của bạn bằng thiết kế tử tế và công nghệ AI thân thiện.",
  story: "Bắt đầu từ một nhóm bạn mê chụp ảnh, Memory Makers ra đời để biến ảnh thành sách — dễ dàng, nhanh chóng và đẹp.",
  values: "• Mẫu thiết kế sẵn, AI chỉ điền ảnh.\n• Bảo vệ hình ảnh khách trước khi thanh toán.\n• In ấn chất lượng cao, giao tận nơi.",
  instagram: "@memorymakers",
  tiktok: "TikTok @memorymakers",
  hotline: "Hotline 09xx xxx xxx",
};

router.get("/about", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "about" } });
  res.json(row ? JSON.parse(row.value) : DEFAULT_ABOUT);
});

router.put("/about", requireAuth, requireAdmin, async (req, res) => {
  const value = JSON.stringify(req.body);
  await prisma.setting.upsert({ where: { key: "about" }, update: { value }, create: { key: "about", value } });
  res.json(req.body);
});

// KHO ẢNH DEMO CHUNG (áp dụng cho mọi template)
router.get("/demo-pool", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "demoPool" } });
  res.json(row ? JSON.parse(row.value) : []);
});
router.put("/demo-pool", requireAuth, requireAdmin, validate(demoPoolSchema), async (req, res) => {
  const value = JSON.stringify(req.body?.photos || []);
  await prisma.setting.upsert({ where: { key: "demoPool" }, update: { value }, create: { key: "demoPool", value } });
  res.json(JSON.parse(value));
});

// KHO STICKER (admin quản lý, khách dùng để decor)
router.get("/stickers", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "stickers" } });
  res.json(row ? JSON.parse(row.value) : []);
});
router.put("/stickers", requireAuth, requireAdmin, validate(demoPoolSchema), async (req, res) => {
  const value = JSON.stringify(req.body?.photos || []);
  await prisma.setting.upsert({ where: { key: "stickers" }, update: { value }, create: { key: "stickers", value } });
  res.json(JSON.parse(value));
});

// VIDEO TRANG CHỦ (hero): admin upload -> hiển thị thay cụm bìa mẫu; null -> hiển thị bìa như cũ
const heroSchema = z.object({ url: z.string().max(2000).refine((u) => !u.startsWith("data:"), "Không nhận base64").nullable() });
router.get("/hero-video", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "heroVideo" } });
  res.json({ url: row ? JSON.parse(row.value) : null });
});
router.put("/hero-video", requireAuth, requireAdmin, validate(heroSchema), async (req, res) => {
  const value = JSON.stringify(req.body.url || null);
  await prisma.setting.upsert({ where: { key: "heroVideo" }, update: { value }, create: { key: "heroVideo", value } });
  res.json({ url: req.body.url || null });
});

// CHÍNH SÁCH (5 mục như bản gốc) — admin chỉnh nội dung, khách bấm xem popup
const DEFAULT_POLICIES = [
  { id: "muahang", title: "Chính sách mua hàng", content: "Khách chọn mẫu, thiết kế và thanh toán trực tuyến. Đơn hàng được xác nhận ngay sau khi thanh toán thành công." },
  { id: "thanhtoan", title: "Chính sách thanh toán", content: "Hỗ trợ thanh toán qua MoMo. Số tiền hiển thị rõ trước khi xác nhận, không phát sinh phụ phí." },
  { id: "doitra", title: "Chính sách đổi trả", content: "Sản phẩm in lỗi do Memory Makers được in lại miễn phí trong 7 ngày. Vui lòng giữ ảnh/video sản phẩm khi nhận hàng." },
  { id: "vanchuyen", title: "Chính sách vận chuyển", content: "Giao hàng toàn quốc 3–5 ngày làm việc sau khi in xong. Phí vận chuyển báo trước khi đặt." },
  { id: "baomat", title: "Chính sách bảo mật", content: "Ảnh và thông tin cá nhân của khách chỉ dùng để sản xuất photobook, không chia sẻ cho bên thứ ba. Mật khẩu được băm, dữ liệu mã hoá khi lưu trữ." },
];
const policiesSchema = z.object({ policies: z.array(z.object({ id: z.string().min(1).max(40), title: z.string().trim().min(1).max(120), content: z.string().max(5000) })).max(12) });
router.get("/policies", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "policies" } });
  res.json(row ? JSON.parse(row.value) : DEFAULT_POLICIES);
});
router.put("/policies", requireAuth, requireAdmin, validate(policiesSchema), async (req, res) => {
  const value = JSON.stringify(req.body.policies);
  await prisma.setting.upsert({ where: { key: "policies" }, update: { value }, create: { key: "policies", value } });
  res.json(JSON.parse(value));
});

export default router;
