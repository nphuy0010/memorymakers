# Triển khai Memory Makers (FREE, bền vững)

Stack: **PostgreSQL (Neon, free)** + **Cloudinary (ảnh, free)** → backend không cần ổ đĩa, deploy được trên nền free.
- **Frontend (Next.js)** → Vercel
- **Backend (Express + Prisma)** → Render (free) hoặc Railway

---

## Bước 1 — Tạo Database (Neon, ~2 phút)
1. Vào https://neon.tech → đăng ký → **Create project**.
2. Copy **Connection string** (dạng `postgresql://user:pass@ep-xxx.aws.neon.tech/dbname?sslmode=require`).
3. Giữ lại chuỗi này — sẽ dán vào biến `DATABASE_URL`.

## Bước 2 — Tạo kho ảnh (Cloudinary, ~2 phút)
1. Vào https://cloudinary.com → đăng ký → mở **Dashboard**.
2. Copy 3 giá trị: **Cloud name**, **API Key**, **API Secret**.

## Bước 3 — Đưa code lên GitHub
```bash
git init && git add . && git commit -m "memory makers"
git branch -M main
git remote add origin https://github.com/<ban>/memory-makers.git
git push -u origin main
```

## Bước 4 — Deploy BACKEND (Render, free)
1. https://render.com → **New → Web Service** → chọn repo.
2. **Root Directory** = `backend` · **Runtime** = Docker (tự nhận `Dockerfile`).
3. **Environment** → thêm biến:
   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | chuỗi Neon ở Bước 1 |
   | `JWT_SECRET` | chuỗi ngẫu nhiên dài |
   | `CLOUDINARY_CLOUD_NAME` | từ Cloudinary |
   | `CLOUDINARY_API_KEY` | từ Cloudinary |
   | `CLOUDINARY_API_SECRET` | từ Cloudinary |
   | `FRONTEND_ORIGIN` | tạm `https://localhost` (sửa ở Bước 6) |
   | `OWNER_EMAIL` | email admin của bạn |
   | `OWNER_PASSWORD` | mật khẩu admin (đổi!) |
4. Create → chờ build. Khởi động sẽ tự đẩy schema lên Postgres + tự tạo admin.
5. Kiểm tra `https://<backend>.onrender.com/api/health` → `{"ok":true}`.

> Dùng Railway thay Render cũng được: New Project → Deploy repo → Root `backend` → thêm biến y hệt → Generate Domain.

## Bước 5 — Deploy FRONTEND (Vercel)
1. https://vercel.com → **Add New → Project** → chọn repo.
2. **Root Directory** = `frontend`.
3. Environment: `NEXT_PUBLIC_API_URL` = URL backend (vd `https://<backend>.onrender.com`).
4. Deploy → nhận domain, vd `https://memory-makers.vercel.app`.

## Bước 6 — Nối 2 bên (CORS)
1. Quay lại backend (Render/Railway) → sửa `FRONTEND_ORIGIN` = domain Vercel (không có `/` cuối) → redeploy.
2. Mở web Vercel → đăng nhập admin → thêm template (ảnh lên Cloudinary) → thử đặt đơn → kiểm tra admin nhận đơn & tin nhắn.

---

## Chạy local với stack mới
Local giờ cũng dùng Postgres (Neon) — có thể tạo 1 project Neon riêng cho dev.
```bash
# điền DATABASE_URL (Neon) + CLOUDINARY_* vào backend/.env trước
npm install
npm run setup     # cài + tạo bảng trên Postgres + tạo admin
npm run dev
```
> Nếu để trống CLOUDINARY_* khi chạy local → ảnh sẽ lưu tạm vào đĩa (`backend/uploads`). Production nên điền Cloudinary.

## Sự cố thường gặp
- **CORS bị chặn**: `FRONTEND_ORIGIN` phải trùng đúng domain Vercel.
- **P1001 / can't reach database**: sai `DATABASE_URL` hoặc thiếu `?sslmode=require`.
- **Ảnh không upload được**: kiểm tra 3 biến `CLOUDINARY_*`.
- **Render free “ngủ”** sau 15 phút không truy cập → lần gọi đầu chậm ~30s (bình thường).
