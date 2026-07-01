import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

// Thư mục lưu file khi KHÔNG dùng Cloudinary (local dev)
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Có cấu hình Cloudinary không? (CLOUDINARY_URL hoặc 3 biến rời)
const CLOUD_ON = !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
let cloudinary: any = null;
if (CLOUD_ON) {
  // require động để local không cần cài nếu không dùng
  cloudinary = require("cloudinary").v2;
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  console.log("🖼️  Upload dùng Cloudinary");
} else {
  console.log("🖼️  Upload lưu vào đĩa:", UPLOAD_DIR);
}

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "video/mp4", "video/webm"];
// Dùng memoryStorage: giữ buffer để đẩy lên Cloudinary hoặc ghi ra đĩa
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Định dạng không hỗ trợ (chỉ ảnh PNG/JPG/WEBP/GIF hoặc video MP4/WEBM)"));
  },
});

function diskUrl(req: any, filename: string) {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
}

// Lưu 1 file -> trả URL (Cloudinary hoặc đĩa)
async function saveFile(req: any, file: Express.Multer.File): Promise<string> {
  if (CLOUD_ON) {
    const isVideo = file.mimetype.startsWith("video");
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const r = await cloudinary.uploader.upload(dataUri, { folder: "memory-makers", resource_type: isVideo ? "video" : "image" });
    return r.secure_url as string;
  }
  const ext = path.extname(file.originalname).toLowerCase() || ".png";
  const name = crypto.randomBytes(8).toString("hex") + "-" + Date.now() + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return diskUrl(req, name);
}

// 1 file -> { url }
router.post("/", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Không có file" });
    const url = await saveFile(req, req.file);
    res.json({ url, name: req.file.originalname });
  } catch (e: any) { res.status(500).json({ error: e?.message || "Lỗi upload" }); }
});

// nhiều file -> { urls: [] }
router.post("/multi", requireAuth, requireAdmin, upload.array("files", 40), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ error: "Không có file" });
    const urls = [];
    for (const f of files) urls.push(await saveFile(req, f));
    res.json({ urls });
  } catch (e: any) { res.status(500).json({ error: e?.message || "Lỗi upload" }); }
});

// Lỗi multer (file quá lớn / sai định dạng)
router.use((err: any, _req: any, res: any, _next: any) => {
  res.status(400).json({ error: err.message || "Lỗi upload" });
});

export default router;
