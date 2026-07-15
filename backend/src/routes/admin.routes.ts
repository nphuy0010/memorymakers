import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { aggregateStats } from "../lib/business";
import { composeTemplateDemo, getDemoPool } from "../lib/composeDemo";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

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
      if (m.fromAdmin && m.deletedForSender) continue; // admin đã "xóa ở phía tôi" -> ẩn khỏi admin (khách vẫn thấy)
      const u = byUser[m.userId] || (byUser[m.userId] = { userId: m.userId, name: m.user?.name, email: m.user?.email, phone: m.user?.phone, messages: [], unread: 0, lastAt: m.createdAt });
      u.messages.push({ id: m.id, content: m.recalled ? "" : m.content, fromAdmin: m.fromAdmin, recalled: !!m.recalled, createdAt: m.createdAt });
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
router.post("/templates/:id/apply-demo", async (req, res) => {
  const pool = await getDemoPool();
  try {
    const r = await composeTemplateDemo(req.params.id, pool, { assignments: req.body?.assignments, edits: req.body?.edits });
    if (!r.ok) return res.status(400).json({ error: "Không ghép được (mẫu chưa có trang hoặc chưa có ảnh)" });
    res.json(r);
  } catch (e: any) {
    console.error("apply-demo one:", e?.message); // log kỹ thuật cho debug
    res.status(500).json({ error: "Đang xử lý ảnh gặp trục trặc, vui lòng thử lại." });
  }
});

// Ghép ảnh demo (server-side, sharp) cho TẤT CẢ template từ kho ảnh chung
router.post("/apply-demo", async (_req, res) => {
  const pool = await getDemoPool();
  if (!pool.length) return res.status(400).json({ error: "Kho ảnh demo trống" });
  const templates = await prisma.template.findMany({ where: { archived: false }, select: { id: true, title: true } });
  const results: any[] = [];
  for (const t of templates) {
    try { const r = await composeTemplateDemo(t.id, pool); results.push({ id: t.id, title: t.title, ...r }); }
    catch (e: any) { results.push({ id: t.id, title: t.title, ok: false, error: e?.message }); }
  }
  res.json({ done: true, results });
});

// ============ XỬ LÝ LẠI TEMPLATE CŨ: cắt đôi slide + remap khung ============
// Template cũ = pages chưa có `type` trên bất kỳ trang nào. Slide 1: trái=bìa SAU, phải=bìa TRƯỚC.
function clampSlotSrv(s: any) {
  let x = Math.max(-20, Math.min(119, s.x)), y = Math.max(-20, Math.min(119, s.y));
  let w = Math.max(0.5, Math.min(120, s.w)), h = Math.max(0.5, Math.min(120, s.h));
  if (x + w > 120) w = Math.max(0.5, 120 - x);
  if (y + h > 120) h = Math.max(0.5, 120 - y);
  return { ...s, x, y, w, h };
}
router.post("/templates/resplit", async (_req, res) => {
  const sharp = require("sharp");
  let cloud: any = null;
  try { cloud = require("cloudinary").v2; } catch {}
  if (!cloud || !process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(400).json({ error: "Cần cấu hình Cloudinary để xử lý lại template cũ" });
  }
  const fetchBuf = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error("fetch " + r.status); return Buffer.from(await r.arrayBuffer()); };
  const upload = async (buf: Buffer) => {
    const dataUri = "data:image/jpeg;base64," + buf.toString("base64");
    const r = await cloud.uploader.upload(dataUri, { folder: "memory-makers/pages" });
    return r.secure_url as string;
  };
  const all = await prisma.template.findMany({ where: { archived: false } });
  let processed = 0, skipped = 0; const errors: string[] = [];
  for (const t of all) {
    try {
      const pages: any[] = Array.isArray(t.pages) ? (t.pages as any[]) : [];
      if (!pages.length || pages.some((p) => p.type)) { skipped++; continue; } // đã split hoặc rỗng
      const front: any[] = [], middle: any[] = [], back: any[] = [];
      for (let pi = 0; pi < pages.length; pi++) {
        const pg = pages[pi];
        const buf = await fetchBuf(pg.image);
        const meta = await sharp(buf).metadata();
        const W = meta.width || 1000, H = meta.height || 1000;
        const half = Math.floor(W / 2);
        const [lBuf, rBuf] = await Promise.all([
          sharp(buf).extract({ left: 0, top: 0, width: half, height: H }).jpeg({ quality: 90 }).toBuffer(),
          sharp(buf).extract({ left: half, top: 0, width: W - half, height: H }).jpeg({ quality: 90 }).toBuffer(),
        ]);
        const [lUrl, rUrl] = await Promise.all([upload(lBuf), upload(rBuf)]);
        // REMAP khung: tọa độ % ảnh gốc -> % nửa ảnh (nhân đôi trục ngang); khung chắn giữa gán theo TÂM
        const lSlots: any[] = [], rSlots: any[] = [];
        for (const sl of pg.slots || []) {
          const center = sl.x + sl.w / 2;
          if (center < 50) lSlots.push(clampSlotSrv({ ...sl, x: sl.x * 2, w: sl.w * 2 }));
          else rSlots.push(clampSlotSrv({ ...sl, x: (sl.x - 50) * 2, w: sl.w * 2 }));
        }
        const isCover = pi === 0;
        const pgL = { image: lUrl, slots: lSlots, type: isCover ? "back_cover" : "inner_page" };
        const pgR = { image: rUrl, slots: rSlots, type: isCover ? "front_cover" : "inner_page" };
        if (isCover) { front.unshift(pgR); back.push(pgL); }
        else middle.push(pgL, pgR);
      }
      const newPages = [...front, ...middle, ...back];
      const totalSlots = newPages.reduce((n, p) => n + (p.slots?.length || 0), 0);
      await prisma.template.update({
        where: { id: t.id },
        data: {
          pages: newPages, pageCount: newPages.length, slots: totalSlots,
          coverImage: newPages[0]?.image || t.coverImage,
          demoImage: null, demoPages: [], // bố cục đổi -> ảnh ghép cũ sai, cần áp kho demo lại
        },
      });
      processed++;
    } catch (e: any) { errors.push(`${t.title}: ${e?.message || "lỗi"}`); }
  }
  res.json({ processed, skipped, errors });
});

export default router;
