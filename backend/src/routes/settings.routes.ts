import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { validate, demoPoolSchema } from "../lib/validate";

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

export default router;
