import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.routes";
import templateRoutes from "./routes/template.routes";
import projectRoutes from "./routes/project.routes";
import adminRoutes from "./routes/admin.routes";
import settingsRoutes from "./routes/settings.routes";
import uploadRoutes, { UPLOAD_DIR } from "./routes/upload.routes";
import messageRoutes from "./routes/message.routes";
import paymentRoutes from "./routes/payment.routes";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma";

// Sentry (bật khi có SENTRY_DSN) — bắt lỗi production thay vì "chờ user báo"
let Sentry: any = null;
if (process.env.SENTRY_DSN) {
  Sentry = require("@sentry/node");
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "2mb" })); // ảnh đi qua /api/upload (multipart) — JSON chỉ còn metadata/URL
app.set("trust proxy", 1); // sau proxy Render -> rate-limit đọc đúng IP

// RATE LIMIT: chặn brute-force & spam
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, message: { error: "Thử lại sau 15 phút (quá nhiều yêu cầu)" } });
const uploadLimiter = rateLimit({ windowMs: 15 * 60_000, max: 120, standardHeaders: true, message: { error: "Upload quá nhanh — thử lại sau" } });
const globalLimiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, message: { error: "Quá nhiều yêu cầu" } });
app.use("/api/", globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/upload", uploadLimiter);

// Phục vụ file tĩnh đã upload (ảnh template, ảnh từng trang, video preview…)
// crossOrigin để <img>/<video> tải được từ origin khác.
app.use("/uploads", express.static(UPLOAD_DIR, {
  setHeaders: (res) => res.setHeader("Access-Control-Allow-Origin", "*"),
}));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);

// Bắt mọi lỗi route -> trả JSON 500 (KHÔNG để rớt request / treo server)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API error:", err?.message || err);
  if (Sentry) Sentry.captureException(err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: err?.message || "Lỗi máy chủ" });
});

// Không cho lỗi bất đồng bộ làm SẬP tiến trình (giữ server luôn sống ở dev)
process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

// Tự tạo/đảm bảo tài khoản admin chính khi khởi động (tiện khi deploy — không cần chạy seed thủ công)
async function ensureOwner() {
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const email = (process.env.OWNER_EMAIL || "owner@memorymakers.com").trim();
    const pass = (process.env.OWNER_PASSWORD || "ChangeMe123!").trim();
    const hash = await bcrypt.hash(pass, 10);
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", password: hash, phoneVerified: true },
      create: { name: process.env.OWNER_NAME || "Chủ shop", email, password: hash, phone: process.env.OWNER_PHONE || "0900000000", phoneVerified: true, role: "ADMIN" },
    });
    console.log(`👤 Admin sẵn sàng: ${email}`);
  } catch (e: any) { console.error("ensureOwner lỗi:", e?.message); }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await ensureOwner();
  console.log(`🚀 Backend chạy tại http://localhost:${PORT}`);
});
