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

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "30mb" })); // vẫn nhận dataURL nếu cần; upload chính dùng /api/upload

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend chạy tại http://localhost:${PORT}`));
