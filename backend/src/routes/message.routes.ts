import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Lấy cuộc trò chuyện của khách (với admin) + đánh dấu đã đọc các tin admin gửi
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.message.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "asc" } });
  await prisma.message.updateMany({ where: { userId: req.userId, fromAdmin: true, readByUser: false }, data: { readByUser: true } });
  res.json(list);
});

// Khách gửi tin -> admin nhận được (readByAdmin = false)
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const content = (req.body?.content || "").trim();
  if (!content) return res.status(400).json({ error: "Nội dung trống" });
  const m = await prisma.message.create({
    data: { userId: req.userId!, content: content.slice(0, 2000), fromAdmin: false, readByAdmin: false, readByUser: true },
  });
  res.json(m);
});

export default router;
