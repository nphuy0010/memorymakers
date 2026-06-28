import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();
router.use(requireAuth, requireAdmin);

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());

// Danh sách user
router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, phoneVerified: u.phoneVerified })));
});

// Tạo tài khoản mới (admin thêm account — Customer hoặc Admin)
router.post("/users", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password) return res.status(400).json({ error: "Nhập đủ tên, email, SĐT, mật khẩu" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
  if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ error: "Email đã tồn tại" });
  const hash = await bcrypt.hash(password, 10);
  const u = await prisma.user.create({
    data: { name, email, phone, password: hash, role: role === "ADMIN" ? "ADMIN" : "CUSTOMER", phoneVerified: true },
  });
  res.json({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, phoneVerified: u.phoneVerified });
});

// Xoá tài khoản (không tự xoá chính mình)
router.delete("/users/:id", async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "Không thể xoá tài khoản của chính mình" });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Cấp/đổi quyền: ADMIN <-> CUSTOMER (giữ để tương thích, UI mới không dùng)
router.patch("/users/:id/role", async (req: AuthRequest, res) => {
  const { role } = req.body;
  if (!["ADMIN", "CUSTOMER"].includes(role)) return res.status(400).json({ error: "Role không hợp lệ" });
  if (req.params.id === req.userId && role !== "ADMIN") {
    return res.status(400).json({ error: "Không thể tự hạ quyền của chính mình" });
  }
  const u = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  res.json({ id: u.id, role: u.role });
});

// Tất cả đơn hàng (project đã mua trở lên, gồm cả đã hủy để quản lý)
router.get("/orders", async (_req, res) => {
  const orders = await prisma.project.findMany({
    where: { status: { in: ["PURCHASED", "SHIPPING", "DELIVERED", "CANCELLED"] } },
    include: { template: true, user: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json(orders.map((o) => ({
    id: o.id, title: o.title, status: o.status, amount: o.amount, mode: o.mode, option: o.option,
    tracking: o.tracking || "", customer: o.user.name, phone: o.user.phone,
    address: o.address ? JSON.parse(o.address) : null, createdAt: o.createdAt,
  })));
});

// Cập nhật đơn: đổi trạng thái và/hoặc nhập mã vận đơn
const ORDER_STATUSES = ["PURCHASED", "SHIPPING", "DELIVERED", "CANCELLED"];
router.patch("/orders/:id", async (req, res) => {
  const { status, tracking } = req.body;
  const data: any = {};
  if (status !== undefined) {
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    data.status = status;
  }
  if (tracking !== undefined) data.tracking = String(tracking);
  if (!Object.keys(data).length) return res.status(400).json({ error: "Không có gì để cập nhật" });
  const o = await prisma.project.update({ where: { id: req.params.id }, data });
  res.json({ id: o.id, status: o.status, tracking: o.tracking });
});

// Thống kê doanh thu
router.get("/stats", async (_req, res) => {
  const paid = await prisma.project.findMany({ where: { amount: { not: null } } });
  const revenue = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const byOption: Record<string, number> = {};
  for (const p of paid) byOption[p.option || "?"] = (byOption[p.option || "?"] || 0) + (p.amount || 0);
  res.json({ totalOrders: paid.length, revenue, byOption });
});

export default router;
