import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { aggregateStats } from "../lib/business";
import { getDemoPool } from "../lib/demoPool";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { destroyMany } from "./upload.routes";

const router = Router();
router.use(requireAuth, requireAdmin);

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());

// Danh sách user
// CHỈ liệt kê tài khoản ADMIN — dữ liệu khách hàng không hiển thị ra giao diện quản trị
// (mật khẩu luôn băm bcrypt; dữ liệu trong database được mã hoá khi lưu trữ bởi nhà cung cấp DB)
router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "desc" } });
  res.json(users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, phoneVerified: u.phoneVerified })));
});

// Cấp quyền Admin bằng EMAIL chính xác (không cần lộ danh sách khách)
router.post("/users/grant-admin", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Nhập email hợp lệ" });
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) return res.status(404).json({ error: "Không tìm thấy tài khoản với email này" });
  if (u.role === "ADMIN") return res.status(400).json({ error: "Tài khoản này đã là Admin" });
  const up = await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
  res.json({ id: up.id, name: up.name, email: up.email, phone: up.phone, role: up.role, phoneVerified: up.phoneVerified });
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
router.get("/orders", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50")) || 50));
    const where = { status: { in: ["PURCHASED", "SHIPPING", "DELIVERED"] } } as any;
    const total = await prisma.project.count({ where });
    res.setHeader("X-Total-Count", String(total));
    const orders = await prisma.project.findMany({
      where,
      include: { template: true, user: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit, take: limit,
    });
    res.json(orders.map((o: any) => ({
      id: o.id, title: o.title, status: o.status, amount: o.amount, mode: o.mode, option: o.option,
      tracking: o.tracking || "", customer: o.user?.name, phone: o.user?.phone, email: o.user?.email,
      template: o.template?.title || o.title,
      // dữ liệu để admin XEM/IN mẫu khách đã đặt
      photos: JSON.parse(o.photos || "[]"),
      layout: o.layout ? JSON.parse(o.layout) : null,
      pages: o.template ? JSON.parse((o.template as any).pages || "[]") : [],
      slots: (o.template as any)?.slots || 0,
      address: o.address ? JSON.parse(o.address) : null, createdAt: o.createdAt,
    })));
  } catch (e: any) {
    console.error("orders error:", e?.message);
    res.json([]);
  }
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
  // Chỉ tính đơn ĐÃ THANH TOÁN (khớp với danh sách đơn) -> hủy/xóa đơn thì số đơn & doanh thu tự giảm
  const paid = await prisma.project.findMany({ where: { status: { in: ["PURCHASED", "SHIPPING", "DELIVERED"] } }, select: { status: true, amount: true, option: true } });
  res.json(aggregateStats(paid));
});

// ----- TIN NHẮN: admin nhận & trả lời -----
// Danh sách hội thoại (gộp theo khách) + số tin chưa đọc
router.get("/messages", async (_req, res) => {
  try {
    const msgs = await prisma.message.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } });
    const byUser: Record<string, any> = {};
    for (const m of msgs) {
      if (m.hiddenForAdmin) continue; // admin đã "xoá đoạn chat phía tôi" -> ẩn khỏi admin (khách vẫn thấy)
      const u = byUser[m.userId] || (byUser[m.userId] = { userId: m.userId, name: m.user?.name, email: m.user?.email, phone: m.user?.phone, messages: [], unread: 0, lastAt: m.createdAt });
      u.messages.push({ id: m.id, content: m.content, fromAdmin: m.fromAdmin, createdAt: m.createdAt });
      u.lastAt = m.createdAt;
      if (!m.fromAdmin && !m.readByAdmin) u.unread++;
    }
    const list = Object.values(byUser).sort((a: any, b: any) => +new Date(b.lastAt) - +new Date(a.lastAt));
    res.json(list);
  } catch (e: any) { console.error("admin messages:", e?.message); res.json([]); }
});

// Tổng tin chưa đọc (nốt đỏ cho admin)
router.get("/messages/unread", async (_req, res) => {
  try { res.json({ count: await prisma.message.count({ where: { fromAdmin: false, readByAdmin: false } }) }); }
  catch { res.json({ count: 0 }); }
});

// Admin mở 1 hội thoại -> đánh dấu đã đọc
router.post("/messages/:userId/read", async (req, res) => {
  await prisma.message.updateMany({ where: { userId: req.params.userId, fromAdmin: false, readByAdmin: false }, data: { readByAdmin: true } });
  res.json({ ok: true });
});

// Admin trả lời khách
router.post("/messages", async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !(content || "").trim()) return res.status(400).json({ error: "Thiếu nội dung" });
  const m = await prisma.message.create({
    data: { userId, content: String(content).slice(0, 2000), fromAdmin: true, readByAdmin: true, readByUser: false },
  });
  res.json(m);
});

// ADMIN CHỈNH PREVIEW 1 mẫu: nhận ảnh gán từng ô + vị trí/zoom -> ghép lại đúng như admin xếp
// LƯU KẾT QUẢ GHÉP (nhẹ — KHÔNG xử lý ảnh): frontend ghép bằng Canvas rồi gửi danh sách URL lên đây.
// Thay cho route ghép bằng sharp cũ (hay làm hết RAM 512MB của Render free -> process bị kill).
router.post("/save-demo-result", async (req, res) => {
  const templateId = String(req.body?.templateId || "");
  const pages = req.body?.pages;
  if (!templateId) return res.status(400).json({ error: "Thiếu templateId" });
  if (!Array.isArray(pages) || !pages.length) return res.status(400).json({ error: "Thiếu danh sách ảnh đã ghép" });
  const urls = pages
    .filter((u: any) => typeof u === "string" && /^https?:\/\//.test(u) && !u.startsWith("data:"))
    .slice(0, 60);
  if (!urls.length) return res.status(400).json({ error: "Danh sách ảnh không hợp lệ" });
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!t) return res.status(404).json({ error: "Không tìm thấy template" });
  await prisma.template.update({
    where: { id: templateId },
    data: { demoPages: JSON.stringify(urls), demoImage: urls[0] },
  });
  res.json({ ok: true, pages: urls.length });
});

// Route ghép bằng sharp CŨ — đã gỡ. Giữ lại phản hồi hướng dẫn phòng khi frontend cũ còn gọi.
router.post("/templates/:id/apply-demo", (_req, res) => {
  res.status(410).json({ error: "Route này đã được thay thế. Vui lòng cập nhật (tải lại trang bằng Ctrl+F5)." });
});

// Route ghép hàng loạt bằng sharp CŨ — đã gỡ (frontend nay tự ghép bằng Canvas).
router.post("/apply-demo", (_req, res) => {
  res.status(410).json({ error: "Route này đã được thay thế. Vui lòng cập nhật (tải lại trang bằng Ctrl+F5)." });
});

// DỌN DỰ ÁN MỒ CÔI: dự án trỏ tới mẫu ĐÃ NGỪNG (archived) mà CHƯA thanh toán -> xoá + dọn ảnh.
// Dự án đã thanh toán luôn được giữ (phục vụ in ấn & lịch sử đơn).
router.post("/cleanup-orphans", async (_req, res) => {
  const PAID = ["PURCHASED", "SHIPPING", "DELIVERED"];
  const rows = await prisma.project.findMany({
    where: { template: { archived: true } },
    select: { id: true, status: true, photos: true },
  });
  const removable = rows.filter((p: { status: string }) => !PAID.includes(p.status));
  const kept = rows.length - removable.length;

  const photoUrls: string[] = [];
  for (const p of removable) {
    try { const arr = JSON.parse((p as any).photos || "[]"); if (Array.isArray(arr)) photoUrls.push(...arr.filter((u: any) => typeof u === "string")); } catch {}
  }
  if (removable.length) {
    await prisma.project.deleteMany({ where: { id: { in: removable.map((p: { id: string }) => p.id) } } });
  }
  const cleanedImages = await destroyMany(photoUrls);
  res.json({ ok: true, deleted: removable.length, keptPaid: kept, cleanedImages });
});

// KIỂM TRA TRƯỚC KHI GHÉP: liệt kê template đủ/thiếu dữ liệu (không tải ảnh nặng, chỉ check nhanh cấu trúc + HEAD ảnh trang đầu)
router.post("/apply-demo/check", async (_req, res) => {
  const pool = await getDemoPool();
  const templates = await prisma.template.findMany({ where: { archived: false }, select: { id: true, title: true, pages: true } });
  const ready: { id: string; title: string }[] = [];
  const invalid: { id: string; title: string; reason: string; hint: string }[] = [];
  for (const t of templates) {
    let pages: any[] = [];
    try { pages = JSON.parse((t.pages as any) || "[]"); } catch {}
    if (!pages.length) { invalid.push({ id: t.id, title: t.title, reason: "Mẫu chưa có trang nào", hint: "Vào Sửa mẫu, tải slide lên cho mẫu này." }); continue; }
    const totalSlots = pages.reduce((n: number, p: any) => n + (p.slots?.length || 0), 0);
    if (!totalSlots) { invalid.push({ id: t.id, title: t.title, reason: "Mẫu chưa có khung ảnh nào", hint: "Vào Chỉnh khung, thêm khung cho mẫu này." }); continue; }
    const noImg = pages.find((p: any) => !p.image || !/^https?:\/\//.test(p.image));
    if (noImg) { invalid.push({ id: t.id, title: t.title, reason: "Có trang thiếu ảnh hoặc URL ảnh hỏng", hint: "Ảnh có thể đã mất (đĩa Render cũ) — tải lại slide cho mẫu này." }); continue; }
    // HEAD ảnh trang đầu để phát hiện 404/ảnh chết trên Cloudinary
    try {
      const r = await fetch(pages[0].image, { method: "HEAD", signal: AbortSignal.timeout(8000) });
      if (!r.ok) { invalid.push({ id: t.id, title: t.title, reason: `Ảnh trang đầu trả về ${r.status}`, hint: "Ảnh không truy cập được — tải lại slide cho mẫu này." }); continue; }
    } catch {
      invalid.push({ id: t.id, title: t.title, reason: "Không truy cập được ảnh trang đầu", hint: "Ảnh có thể đã bị xoá/hết hạn — tải lại slide." }); continue;
    }
    ready.push({ id: t.id, title: t.title });
  }
  res.json({ poolEmpty: !pool.length, ready, invalid });
});

// (Đã gỡ chức năng "xử lý lại template cũ / cắt đôi lại" theo yêu cầu — mọi template dùng trực tiếp pages hiện có.)

// XOÁ CẢ ĐOẠN CHAT với 1 khách (chỉ admin):
//   mode=self -> ẩn phía admin (khách vẫn thấy) · mode=both -> xoá hẳn cả 2 phía (không hoàn tác)
router.post("/messages/:userId/delete-conversation", async (req, res) => {
  const mode = String(req.body?.mode || "self");
  if (mode === "both") {
    await prisma.message.deleteMany({ where: { userId: req.params.userId } });
    return res.json({ ok: true, mode });
  }
  await prisma.message.updateMany({ where: { userId: req.params.userId } , data: { hiddenForAdmin: true } });
  res.json({ ok: true, mode });
});

export default router;
