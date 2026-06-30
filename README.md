# Memory Makers — AI Photobook Studio

Web bán photobook: khách chọn mẫu thiết kế sẵn → AI điền ảnh vào các ô có sẵn → chọn bản digital/vật lý → thanh toán MoMo. Có khu quản trị (admin) quản lý template, đơn hàng, doanh thu, người dùng & phân quyền, nội dung About.

## Cấu trúc

```
memory-makers/
├── backend/     # Express + Prisma + SQLite (API, auth OTP, RBAC, lưu dữ liệu)
└── frontend/    # Next.js 15 (App Router) — chia folder theo từng trang
```

### Frontend — mỗi trang một folder (App Router)
```
frontend/src/app/
├── page.tsx              Trang chủ (carousel mẫu nổi bật, không hiện giá)
├── templates/            Danh sách mẫu + tìm kiếm
├── preview/[id]/         Xem bản DEMO của mẫu
├── design/[id]/          Thiết kế (AI điền ảnh) + quy trình đặt hàng
├── about/                Về chúng tôi
├── login/                Đăng nhập / Đăng ký + xác thực OTP
├── account/              Dự án của tôi (theo trạng thái)
└── admin/                Khu quản trị
    ├── page.tsx          Tổng quan (doanh thu, đơn hàng)
    ├── templates/        Thêm/Quản lý template (demo / trống)
    ├── users/            Phân quyền Admin / Customer
    └── about/            Sửa nội dung About
```

## Chạy dự án (local)

> ⚠️ **Hầu hết lỗi "Failed to fetch" / `ERR_CONNECTION_REFUSED` ở `:5000` là do BACKEND CHƯA CHẠY.** Phải bật cả 2 server: backend (5000) + frontend (3000).

### Cách nhanh nhất — 1 lệnh (khuyên dùng)
```bash
# tại thư mục gốc memory-makers/
npm install        # lấy 'concurrently'
npm run setup      # tự: copy .env, cài backend (tự prisma generate), tạo DB, seed admin, cài frontend
npm run dev        # chạy ĐỒNG THỜI backend (:5000) + frontend (:3000)
```
Đăng nhập admin: **owner@memorymakers.com** / **ChangeMe123!** (đổi trong `backend/.env`).

> Nếu trước đó từng xoá template và bị lỗi dữ liệu, chạy `npm run db:reset` rồi `npm run setup` lại để làm sạch DB.

### Hoặc chạy thủ công 2 cửa sổ terminal

**1. Backend** (cửa sổ 1)
```bash
cd backend
cp .env.example .env          # chỉnh JWT_SECRET, OWNER_EMAIL/PASSWORD nếu muốn
npm install                   # tự chạy prisma generate
npm run db:push               # tạo bảng trong SQLite
npm run seed                  # tạo tài khoản admin
npm run dev                   # http://localhost:5000  (để NGUYÊN cửa sổ này)
```

**2. Frontend** (cửa sổ 2)
```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                        # http://localhost:3000
```

## Tài khoản admin của bạn
Mặc định (đổi trong `backend/.env`):
- Email: **owner@memorymakers.com**
- Mật khẩu: **ChangeMe123!**

Đăng nhập → vào **Admin → Tài khoản** để thêm/xoá tài khoản. Xoá template là **xoá mềm** (ẩn khỏi catalog) nên **đơn hàng cũ vẫn được giữ**.


## Tính năng chính
- AI **chỉ điền ảnh** người dùng vào mẫu admin upload (không tự tạo layout).
- Tìm kiếm gõ tới đâu lọc tới đó; Enter mở trang kết quả đầy đủ.
- Chatbot gợi ý mẫu theo prompt (giống thanh tìm kiếm).
- Đăng ký + **xác thực OTP số điện thoại** (chống tài khoản ảo / lừa đảo).
- Phân quyền **ADMIN / CUSTOMER** (RBAC).
- Mỗi mẫu có 2 nút **Dùng mẫu** + **Xem preview**; preview hiển thị ảnh demo admin gửi.
- Admin upload template dạng **trống** (chèn ảnh) hoặc **demo** (preview); đặt giá 4 option.
- **Không hiển thị giá** ở mẫu — giá chỉ lộ sau khi thiết kế xong và chọn option.
- "Dự án của tôi" chỉ lưu dự án người dùng **thật sự đã thiết kế** (không tạo dự án ảo).
- Chống chụp màn hình / tải khi chưa thanh toán (watermark, ẩn khi mất focus, chặn PrintScreen).

## ⚠️ Lưu ý sản xuất (chưa làm thật trong scaffold)
- **SMS OTP**: dev in OTP ra console & trả `devOtp` trong response. Production cần tích hợp Twilio (điền credentials, đặt `SMS_ENABLED=true` trong `.env`, hoàn thiện `src/lib/otp.ts`).
- **Thanh toán MoMo**: đang mô phỏng (nút "Tôi đã thanh toán"). Production cần tích hợp MoMo SDK + webhook xác nhận, chỉ mở khoá ảnh full sau khi server xác nhận.
- **Chống chụp màn hình**: web không thể chặn tuyệt đối (camera ngoài, công cụ OS). Cần thêm: phục vụ ảnh độ phân giải thấp + watermark động gắn ID người dùng khi chưa trả tiền, ảnh full chỉ trả sau khi thanh toán.
- **Lưu ảnh**: hiện lưu base64 trong DB (nặng). Production nên upload lên object storage (S3/R2) và lưu URL.
- **Database**: dev dùng SQLite. Production đổi `provider` trong `schema.prisma` sang `postgresql`.

---

## Cập nhật: Flipbook 3D + dữ liệu trang (page images)

**Frontend**
- `src/components/Flipbook.tsx` — flipbook 2 trang/spread, lật trang cong có bóng đổ (CSS 3D), nút **Open Flipbook** (toàn màn hình) và thanh `‹ Pages a-b / N ›`. Dựng từ `template.pages[]` (ảnh trang thật); nếu chưa có ảnh thì hiển thị trang placeholder để vẫn xem được hiệu ứng.
- `src/app/preview/[id]/page.tsx` và `src/app/template/[slug]/page.tsx` — trang chi tiết mẫu có tab **GIF / Video / Flipbook**, badge danh mục/số trang/đánh giá, giá "từ …", link Canva.

**Backend**
- `Template` có thêm: `category`, `pageCount`, `pages` (JSON mảng URL ảnh trang), `previewGif`, `previewVideo`, `canvaLink`, `coverImage`.
- API: `GET /api/templates/slug/:slug`; `POST`/`PUT` nhận `pages`, `previewGif`, `previewVideo`, `canvaLink`, `category`.

**Áp dụng schema mới (SQLite dev):**
```bash
cd backend
npx prisma generate
npx prisma db push      # thêm cột mới vào DB hiện có (hoặc: npx prisma migrate dev -n add_flipbook_fields)
npx prisma db seed      # nếu muốn seed lại
```

> Ghi chú: upload ảnh từng trang nên đẩy qua object storage (S3/Cloudinary) và lưu URL vào `pages[]`; lưu base64 thẳng vào DB chỉ nên dùng cho demo. Trang admin upload `pages[]`/GIF/MP4 có thể mở rộng từ form template hiện có (API đã sẵn sàng).

---

## Bản demo all-in-one (single-file) — `/prototype`

Toàn bộ code mới nhất của UX (AI Builder 3 khung, **flipbook lật trang 3D + Open Flipbook**, giỏ hàng, **Mua ngay**, thanh toán **Online/COD**, kho mẫu, đăng nhập + OTP demo, khu Admin) được gói trong **một file** tại:

```
frontend/src/prototype/MemoryMakers.jsx
```

Đã gắn sẵn route chạy được:

```
/prototype     ->  frontend/src/app/prototype/page.tsx
```

Chạy: `cd frontend && npm install && npm run dev` rồi mở `http://localhost:3000/prototype`.
Header/Footer/Chatbot toàn cục được ẩn ở route này (qua `components/SiteChrome.tsx`) vì bản demo tự render giao diện riêng.

> Lưu ý: `/prototype` chạy **độc lập trong bộ nhớ trình duyệt** (không gọi backend) — đăng nhập/OTP/MoMo/COD/giỏ hàng đều mô phỏng, mất khi tải lại trang. Đây là bản để xem nhanh & demo trọn vẹn luồng. Bản chạy thật có dữ liệu lâu dài dùng các trang Next + API backend như mô tả ở trên. Admin demo trong `/prototype`: `admin@memorymakers.com` / `admin123`.

---

## Chạy FULL (backend + DB + frontend) — và sửa lỗi "upload ảnh không hiển thị"

### Nguyên nhân lỗi cũ
Ảnh được gửi dạng **base64 nhét trong JSON** rồi lưu thẳng vào DB. Cách này dễ vượt giới hạn body, nặng DB, và thẻ marketplace lại đọc `coverImage` (đang trống) nên **ảnh không hiện**.

### Cách sửa (đã áp dụng)
- Backend có endpoint **upload file thật**: `POST /api/upload` (1 file) và `POST /api/upload/multi` (nhiều ảnh trang) bằng **multer**, lưu vào `backend/uploads/`, phục vụ tĩnh tại `/uploads/...` và trả về **URL tuyệt đối**.
- Trang Admin → Thêm template giờ **tải file lên server, lấy URL** rồi lưu (ảnh bìa / mẫu trống / demo / GIF / video / nhiều ảnh trang cho Flipbook). Ảnh hiển thị ngay vì là URL thật.
- `TemplateCover` ưu tiên `coverImage` → `demoImage` → `blankImage`.

### Các bước chạy

**1) Backend**
```bash
cd backend
cp .env.example .env          # sửa OWNER_*, JWT_SECRET, PUBLIC_URL nếu cần
npm install
npx prisma generate           # lần đầu cần internet để tải prisma engine
npm run db:push               # tạo bảng trong SQLite (dev.db)
 npm run seed                  # tạo admin chính + vài template mẫu
npm run dev                   # http://localhost:5000
```
Tài khoản admin lấy từ `.env` (`OWNER_EMAIL` / `OWNER_PASSWORD`, mặc định `owner@memorymakers.com` / `ChangeMe123!`).

**2) Frontend**
```bash
cd frontend
# (tuỳ chọn) tạo .env.local nếu backend không chạy ở cổng 5000:
# echo 'NEXT_PUBLIC_API_URL=http://localhost:5000' > .env.local
npm install
npm run dev                   # http://localhost:3000
```

**3) Thêm template thật**: đăng nhập admin → `/admin/templates` → tải ảnh bìa + (tuỳ chọn) ảnh từng trang để dựng Flipbook → điền danh mục/giá/từ khoá → **Thêm template**. Mẫu xuất hiện ngay ở `/templates` và `/preview/[id]`.

> Lưu ý production: nên upload lên object storage (S3 / Cloudinary) thay vì ổ đĩa server, và đổi `DATABASE_URL` sang PostgreSQL. `PUBLIC_URL` phải là domain thật của backend để link ảnh đúng.

## Admin nâng cao (mới)
- Thêm cột **tracking** (mã vận đơn) vào Project → chạy lại `npm run db:push` ở backend.
- Trang `/admin/orders`: lọc theo trạng thái, tìm kiếm, đổi trạng thái, nhập mã vận đơn, **Xuất CSV**.
