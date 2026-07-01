// Cài đặt 1 lần: copy file env mẫu (nếu thiếu) -> cài backend (tự prisma generate) -> tạo DB -> seed admin -> cài frontend.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const run = (cmd, cwd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { cwd: cwd || root, stdio: "inherit" }); };
const copyIfMissing = (from, to) => {
  const f = path.join(root, from), t = path.join(root, to);
  if (fs.existsSync(f) && !fs.existsSync(t)) { fs.copyFileSync(f, t); console.log(`✔ Tạo ${to} từ ${from}`); }
};

console.log("=== Memory Makers · Cài đặt tự động ===");
copyIfMissing("backend/.env.example", "backend/.env");
copyIfMissing("frontend/.env.local.example", "frontend/.env.local");

run("npm install", path.join(root, "backend"));   // có postinstall -> prisma generate

// Kiểm tra DATABASE_URL đã là Postgres thật chưa (không còn placeholder)
const envPath = path.join(root, "backend", ".env");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
if (/ep-xxx|user:password@/.test(env) || !/DATABASE_URL\s*=\s*["']?postgres/i.test(env)) {
  console.log("\n⚠️  CHƯA cấu hình DATABASE_URL PostgreSQL trong backend/.env");
  console.log("   → Tạo DB miễn phí ở https://neon.tech, copy connection string dán vào backend/.env (DATABASE_URL)");
  console.log("   → (Tuỳ chọn) điền CLOUDINARY_* để lưu ảnh trên Cloudinary");
  console.log("   Sau đó chạy lại:  npm run setup\n");
  process.exit(1);
}

run("npm run db:push", path.join(root, "backend")); // tạo bảng trên Postgres
run("npm run seed", path.join(root, "backend"));    // tạo tài khoản admin
run("npm install", path.join(root, "frontend"));

console.log("\n✅ Xong! Chạy cả 2 server bằng:  npm run dev");
console.log("   Backend:  http://localhost:5000   ·   Frontend: http://localhost:3000");
console.log("   Đăng nhập admin: owner@memorymakers.com / ChangeMe123!  (đổi trong backend/.env)\n");
