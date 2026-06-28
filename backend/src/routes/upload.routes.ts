import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

// Thư mục lưu file upload (tạo nếu chưa có)
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const name = crypto.randomBytes(8).toString("hex") + "-" + Date.now() + ext;
    cb(null, name);
  },
});

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "video/mp4", "video/webm"];
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB / file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Định dạng không hỗ trợ (chỉ ảnh PNG/JPG/WEBP/GIF hoặc video MP4/WEBM)"));
  },
});

function publicUrl(req: any, filename: string) {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
}

// 1 file -> { url }
router.post("/", requireAuth, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Không có file" });
  res.json({ url: publicUrl(req, req.file.filename), name: req.file.originalname });
});

// nhiều file (ảnh từng trang) -> { urls: [] }
router.post("/multi", requireAuth, requireAdmin, upload.array("files", 40), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: "Không có file" });
  res.json({ urls: files.map((f) => publicUrl(req, f.filename)) });
});

// Xử lý lỗi của multer (file quá lớn / sai định dạng) trả JSON rõ ràng
router.use((err: any, _req: any, res: any, _next: any) => {
  res.status(400).json({ error: err.message || "Lỗi upload" });
});

export default router;
