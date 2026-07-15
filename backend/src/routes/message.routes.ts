import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate, messageSchema } from "../lib/validate";

const router = Router();

// Khách xem hội thoại của mình.
// - Tin MÌNH gửi + deletedForSender -> ẨN (chỉ ẩn phía người gửi)
// - Tin recalled -> vẫn trả về, content rỗng + cờ recalled (client hiện "Tin nhắn đã được thu hồi")
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const msgs = await prisma.message.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "asc" } });
  const visible = msgs.filter((m: any) => !(m.deletedForSender && !m.fromAdmin)); // ẩn tin user tự "xoá phía tôi"
  await prisma.message.updateMany({ where: { userId: req.userId, fromAdmin: true, readByUser: false }, data: { readByUser: true } });
  res.json(visible.map((m: any) => ({ id: m.id, content: m.recalled ? "" : m.content, fromAdmin: m.fromAdmin, recalled: m.recalled, createdAt: m.createdAt })));
});

router.post("/", requireAuth, validate(messageSchema), async (req: AuthRequest, res) => {
  const m = await prisma.message.create({ data: { userId: req.userId!, content: req.body.content, fromAdmin: false, readByUser: true, readByAdmin: false } });
  res.json(m);
});

// XOÁ KIỂU MESSENGER — chỉ áp dụng cho tin CHÍNH MÌNH gửi:
//   mode=recall : thu hồi cả 2 phía (content bị xoá vĩnh viễn, hiện "đã thu hồi")
//   mode=self   : xoá ở phía tôi (đối phương vẫn thấy bình thường)
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const mode = String(req.query.mode || "self");
  const m = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!m) return res.status(404).json({ error: "Không tìm thấy tin nhắn" });
  const isAdmin = (req as any).role === "ADMIN";
  const isMine = isAdmin ? m.fromAdmin : (m.userId === req.userId && !m.fromAdmin);
  if (!isMine) return res.status(403).json({ error: "Chỉ thao tác được với tin nhắn do chính mình gửi" });

  if (mode === "recall") {
    await prisma.message.update({ where: { id: m.id }, data: { recalled: true, content: "" } });
    return res.json({ ok: true, recalled: true });
  }
  await prisma.message.update({ where: { id: m.id }, data: { deletedForSender: true } });
  res.json({ ok: true, deletedForSender: true });
});

export default router;
