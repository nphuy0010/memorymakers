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
  { id: "muahang", title: "Mua hàng & thiết kế", content: "Chọn mẫu → tải ảnh → AI điền vào khung → xem trước flipbook → đặt hàng. Bạn có thể lưu nháp và quay lại chỉnh sửa bất cứ lúc nào trong \"Dự án của tôi\"." },
  { id: "thanhtoan", title: "Thanh toán", content: "Hỗ trợ MoMo (quét QR) và COD (thanh toán khi nhận hàng, áp dụng cho bản in). Bản digital cần thanh toán online để mở khoá tải về ngay." },
  { id: "doitra", title: "Đổi trả & bảo hành in lỗi", content: "Nếu sản phẩm in bị lỗi do nhà in (lệch màu nặng, rách, sai nội dung đã duyệt), chúng tôi in lại miễn phí trong vòng 7 ngày kể từ khi nhận. Vui lòng quay video mở hộp để đối chiếu." },
  { id: "vanchuyen", title: "Vận chuyển", content: "Giao toàn quốc 2–5 ngày tuỳ khu vực. Miễn phí ship cho đơn từ 500.000₫. Đơn có mã vận đơn để theo dõi." },
  { id: "baomat", title: "Bảo mật hình ảnh", content: "Ảnh của bạn chỉ dùng để in đơn của bạn. Bản xem trước có watermark và cơ chế chống chụp màn hình trước khi thanh toán." },
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

// VIDEO HƯỚNG DẪN (nút ? nổi): admin dán URL YouTube/Vimeo/mp4; trống -> ẩn nút ? ở frontend
const helpSchema = z.object({ url: z.string().max(2000).refine((u) => !u.startsWith("data:"), "Không nhận base64").nullable() });
router.get("/help-video", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "helpVideo" } });
  res.json({ url: row ? JSON.parse(row.value) : null });
});
router.put("/help-video", requireAuth, requireAdmin, validate(helpSchema), async (req, res) => {
  const value = JSON.stringify(req.body.url || null);
  await prisma.setting.upsert({ where: { key: "helpVideo" }, update: { value }, create: { key: "helpVideo", value } });
  res.json({ url: req.body.url || null });
});

export default router;
