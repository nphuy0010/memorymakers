import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate, messageSchema } from "../lib/validate";

const router = Router();

// Lấy cuộc trò chuyện của khách (với admin) + đánh dấu đã đọc các tin admin gửi
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.message.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "asc" } });
  await prisma.message.updateMany({ where: { userId: req.userId, fromAdmin: true, readByUser: false }, data: { readByUser: true } });
  res.json(list);
});

// Khách gửi tin -> admin nhận được (readByAdmin = false)
router.post("/", requireAuth, validate(messageSchema), async (req: AuthRequest, res) => {
  const content = (req.body?.content || "").trim();
  if (!content) return res.status(400).json({ error: "Nội dung trống" });
  const m = await prisma.message.create({
    data: { userId: req.userId!, content: content.slice(0, 2000), fromAdmin: false, readByAdmin: false, readByUser: true },
  });
  res.json(m);
});

// XÓA TIN NHẮN: mỗi bên chỉ xóa tin CỦA MÌNH gửi
// - Khách: chỉ xóa tin mình gửi (fromAdmin = false, đúng userId)
// - Admin: chỉ xóa tin do admin gửi (fromAdmin = true) — KHÔNG xóa được tin của khách
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const m = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!m) return res.status(404).json({ error: "Không tìm thấy tin nhắn" });
  const isAdmin = (req as any).role === "ADMIN";
  const canDelete = isAdmin ? m.fromAdmin : (m.userId === req.userId && !m.fromAdmin);
  if (!canDelete) return res.status(403).json({ error: "Chỉ xóa được tin nhắn do chính mình gửi" });
  await prisma.message.delete({ where: { id: m.id } });
  res.json({ ok: true });
});

export default router;
