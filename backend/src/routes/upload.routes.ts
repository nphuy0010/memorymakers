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

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];
// Dùng memoryStorage: giữ buffer để đẩy lên Cloudinary hoặc ghi ra đĩa
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Định dạng không hỗ trợ (chỉ ảnh PNG/JPG/WEBP/GIF hoặc video MP4/WEBM/MOV)"));
  },
});

function diskUrl(req: any, filename: string) {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
}

// Upload buffer lên Cloudinary qua STREAM (không phồng base64 +33% RAM như dataURI) + TIMEOUT + RETRY.
// Mạng Render<->Cloudinary chập chờn hay gây treo -> Render cắt kết nối (ERR_CONNECTION_RESET).
function cloudUploadBuffer(buffer: Buffer, opts: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ ...opts, timeout: 60000 }, (err: any, r: any) => {
      if (err || !r?.secure_url) return reject(new Error(err?.message || "Cloudinary không trả kết quả"));
      resolve(r.secure_url as string);
    });
    stream.end(buffer);
  });
}
async function cloudUpload(buffer: Buffer, opts: any): Promise<string> {
  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await cloudUploadBuffer(buffer, opts); }
    catch (e: any) {
      lastErr = e;
      const msg = (e?.message || "") + (e?.http_code || "");
      if (attempt < 3 && /ETIMEDOUT|ECONNRESET|EAI_AGAIN|timeout|499|5\d\d/i.test(msg)) { await new Promise((s) => setTimeout(s, attempt * 2000)); continue; }
      break;
    }
  }
  throw new Error("Tải ảnh lên Cloudinary thất bại: " + (lastErr?.message || "lỗi mạng").slice(0, 120));
}

// Lưu 1 file -> trả URL (Cloudinary hoặc đĩa)
async function saveFile(req: any, file: Express.Multer.File): Promise<string> {
  if (CLOUD_ON) {
    const isVideo = file.mimetype.startsWith("video");
    return cloudUpload(file.buffer, { folder: "memory-makers", resource_type: isVideo ? "video" : "image" });
  }
  const ext = path.extname(file.originalname).toLowerCase() || ".png";
  const name = crypto.randomBytes(8).toString("hex") + "-" + Date.now() + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return diskUrl(req, name);
}

/** Lưu buffer bất kỳ -> URL (Cloudinary hoặc đĩa) — dùng cho ghép demo server-side. */
export async function saveBuffer(buf: Buffer, mime: string, name: string): Promise<string> {
  if (CLOUD_ON) {
    return cloudUpload(buf, { folder: "memory-makers/demo" });
  }
  const safe = Date.now() + "-" + name.replace(/[^a-z0-9.-]/gi, "");
  fs.writeFileSync(path.join(UPLOAD_DIR, safe), buf);
  const base = process.env.PUBLIC_URL || "http://localhost:" + (process.env.PORT || 5000);
  return `${base}/uploads/${safe}`;
}

// 1 file -> { url }
router.post("/", requireAuth, upload.single("file"), async (req: any, res) => {
  // ảnh: mọi user đã đăng nhập; video: chỉ admin
  if (req.file && req.file.mimetype.startsWith("video") && req.role !== "ADMIN") {
    return res.status(403).json({ error: "Chỉ admin được upload video" });
  }
  try {
    if (!req.file) return res.status(400).json({ error: "Không có file" });
    if (!CLOUD_ON) {
      // Đĩa Render là EPHEMERAL (mất khi service ngủ/restart) -> ảnh sẽ chết. Bắt buộc dùng Cloudinary trên production.
      console.warn("⚠️ Upload nhưng CHƯA cấu hình Cloudinary — ảnh lưu vào đĩa tạm, sẽ mất khi Render restart. Hãy set CLOUDINARY_URL trên Render.");
    }
    const url = await saveFile(req, req.file);
    res.json({ url, name: req.file.originalname });
  } catch (e: any) {
    console.error("Upload lỗi:", e?.message);
    res.status(500).json({ error: e?.message || "Lỗi upload" });
  }
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

/** XOÁ ẢNH trên Cloudinary theo URL (dọn rác khi xoá dự án/template).
 *  Chỉ xoá ảnh do hệ thống upload lên Cloudinary; URL khác (đĩa, ngoài) bỏ qua an toàn.
 *  KHÔNG bao giờ ném lỗi — dọn rác thất bại không được làm hỏng thao tác xoá chính. */
export async function destroyByUrl(url: string): Promise<boolean> {
  try {
    if (!CLOUD_ON || !cloudinary || typeof url !== "string") return false;
    if (!url.includes("res.cloudinary.com")) return false;
    const m = url.match(/\/upload\/(?:[^/]+\/)*?v\d+\/(.+)$/) || url.match(/\/upload\/(.+)$/);
    if (!m) return false;
    const publicId = m[1].replace(/\.[a-z0-9]+$/i, "");        // bỏ đuôi file
    if (!publicId || publicId.length > 300) return false;
    const isVideo = /\/video\/upload\//.test(url);
    await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? "video" : "image", timeout: 20000 });
    return true;
  } catch (e: any) {
    console.warn("destroyByUrl bỏ qua:", e?.message);
    return false;
  }
}

/** Xoá nhiều URL, chạy tuần tự để không dồn kết nối. Trả về số ảnh đã xoá. */
export async function destroyMany(urls: (string | null | undefined)[]): Promise<number> {
  let n = 0;
  for (const u of urls) if (u && await destroyByUrl(u)) n++;
  return n;
}
