import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { validate, registerSchema, loginSchema, verifySchema, meSchema, forgotSchema, resetSchema } from "../lib/validate";
import { signToken } from "../lib/jwt";
import { createOtp, sendOtpSms, verifyOtp, isDev } from "../lib/otp";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

function publicUser(u: any) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, phoneVerified: u.phoneVerified, role: u.role, avatar: u.avatar || null };
}
// Kiểm tra email hợp lệ
function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());
}

// 1) Đăng ký: tạo user (chưa verify), gửi OTP tới SĐT để chống lừa đảo
router.post("/register", validate(registerSchema), async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: "Thiếu thông tin (tên, email, mật khẩu, SĐT)" });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.phoneVerified) return res.status(409).json({ error: "Email đã được đăng ký" });

  // Email tồn tại nhưng CHƯA xác thực (đăng ký dở dang) -> cho đăng ký lại: cập nhật thông tin + cấp OTP mới
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name, password: await bcrypt.hash(password, 10), phone } })
    : await prisma.user.create({
        data: { name, email, password: await bcrypt.hash(password, 10), phone, phoneVerified: false, role: "CUSTOMER" },
      });
  const code = await createOtp(user.id, "PHONE_VERIFY");
  await sendOtpSms(phone, code);

  return res.json({
    userId: user.id,
    message: "Đã gửi mã OTP tới số điện thoại của bạn",
    ...(isDev() ? { devOtp: code } : {}), // chỉ dev mới trả OTP
  });
});

// 2) Xác thực OTP SĐT -> hoàn tất đăng ký, trả JWT
router.post("/verify-phone", validate(verifySchema), async (req, res) => {
  const { userId, code } = req.body;
  const ok = await verifyOtp(userId, code, "PHONE_VERIFY");
  if (!ok) return res.status(400).json({ error: "OTP sai hoặc đã hết hạn" });

  const user = await prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } });
  const token = signToken({ userId: user.id, role: user.role });
  return res.json({ token, user: publicUser(user) });
});

// Gửi lại OTP
router.post("/resend-otp", async (req, res) => {
  const { userId } = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.phone) return res.status(404).json({ error: "Không tìm thấy người dùng" });
  const code = await createOtp(user.id, "PHONE_VERIFY");
  await sendOtpSms(user.phone, code);
  return res.json({ message: "Đã gửi lại OTP", ...(isDev() ? { devOtp: code } : {}) });
});

// 3) Đăng nhập
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
  }
  if (!user.phoneVerified) {
    // Buộc verify SĐT trước khi vào (chống tài khoản ảo / lừa đảo)
    const code = await createOtp(user.id, "PHONE_VERIFY");
    await sendOtpSms(user.phone || "", code);
    return res.status(403).json({ error: "Cần xác thực SĐT", needPhoneVerify: true, userId: user.id, ...(isDev() ? { devOtp: code } : {}) });
  }
  const token = signToken({ userId: user.id, role: user.role });
  return res.json({ token, user: publicUser(user) });
});

// 4) Lấy thông tin hiện tại
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Không tìm thấy" });
  return res.json({ user: publicUser(user) });
});

// Cập nhật hồ sơ cá nhân: tên, SĐT, ảnh đại diện, mật khẩu mới (tùy chọn)
router.put("/me", requireAuth, validate(meSchema), async (req: AuthRequest, res) => {
  const { name, phone, avatar, password, oldPassword } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (avatar !== undefined) data.avatar = avatar;
  if (password) {
    // ĐỔI MẬT KHẨU: bắt buộc xác minh mật khẩu CŨ trước
    if (!oldPassword) return res.status(400).json({ error: "Nhập mật khẩu cũ để đổi mật khẩu" });
    const cur = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!cur || !(await bcrypt.compare(oldPassword, cur.password))) return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
    data.password = await bcrypt.hash(password, 10);
  }
  const user = await prisma.user.update({ where: { id: req.userId! }, data });
  res.json(publicUser(user));
});

// QUÊN MẬT KHẨU: nhập EMAIL hoặc SĐT — kiểm tra tồn tại rồi gửi OTP về SĐT
router.post("/forgot-password", validate(forgotSchema), async (req, res) => {
  const id = String(req.body.identifier).trim();
  const byEmail = id.includes("@");
  const user = byEmail
    ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
    : await prisma.user.findFirst({ where: { phone: id.replace(/\s+/g, "") } });
  if (!user) return res.status(404).json({ error: byEmail ? "Không tìm thấy tài khoản với email này" : "Không tìm thấy tài khoản với số điện thoại này" });
  if (!user.phone) return res.status(400).json({ error: "Tài khoản chưa có SĐT để nhận OTP" });
  const code = await createOtp(user.id, "RESET");
  await sendOtpSms(user.phone, code);
  const phoneHint = user.phone.slice(0, 3) + "****" + user.phone.slice(-3);
  return res.json({ userId: user.id, phoneHint, ...(isDev() ? { devOtp: code } : {}) });
});

// ĐẶT LẠI MẬT KHẨU bằng OTP -> đăng nhập luôn
router.post("/reset-password", validate(resetSchema), async (req, res) => {
  const { userId, code, newPassword } = req.body;
  const ok = await verifyOtp(userId, code, "RESET");
  if (!ok) return res.status(400).json({ error: "OTP sai hoặc đã hết hạn" });
  const user = await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10), phoneVerified: true } });
  const token = signToken({ userId: user.id, role: user.role });
  return res.json({ token, user: publicUser(user) });
});

export default router;
