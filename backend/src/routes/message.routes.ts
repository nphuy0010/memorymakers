import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate, messageSchema } from "../lib/validate";

const router = Router();

// Khách xem hội thoại của mình — ẩn toàn bộ nếu khách đã "xoá đoạn chat phía tôi" (hiddenForUser)
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const msgs = await prisma.message.findMany({ where: { userId: req.userId, hiddenForUser: false }, orderBy: { createdAt: "asc" } });
  await prisma.message.updateMany({ where: { userId: req.userId, fromAdmin: true, readByUser: false }, data: { readByUser: true } });
  res.json(msgs.map((m: any) => ({ id: m.id, content: m.content, fromAdmin: m.fromAdmin, createdAt: m.createdAt })));
});

router.post("/", requireAuth, validate(messageSchema), async (req: AuthRequest, res) => {
  // Nhắn mới sau khi đã xoá đoạn -> tin mới hiddenForUser=false nên hội thoại tự "bắt đầu lại" bình thường
  const m = await prisma.message.create({ data: { userId: req.userId!, content: req.body.content, fromAdmin: false, readByUser: true, readByAdmin: false } });
  res.json(m);
});

// XOÁ CẢ ĐOẠN CHAT phía KHÁCH: ẩn mọi tin hiện có với khách; phía admin vẫn thấy đầy đủ
router.delete("/", requireAuth, async (req: AuthRequest, res) => {
  await prisma.message.updateMany({ where: { userId: req.userId }, data: { hiddenForUser: true } });
  res.json({ ok: true });
});

export default router;
