/* Triển khai schema bằng PRISMA MIGRATE (có lịch sử, rollback được).
   DB cũ tạo bằng `db push` (chưa có bảng _prisma_migrations) -> tự "baseline":
   đánh dấu 0_init đã áp dụng rồi deploy tiếp. */
const { execSync } = require("child_process");
const run = (cmd) => execSync(cmd, { stdio: "pipe" }).toString();
try {
  console.log(run("npx prisma migrate deploy"));
} catch (e) {
  const out = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
  if (out.includes("P3005")) { // schema không rỗng -> baseline
    console.log("DB có sẵn (tạo bằng db push) -> baseline 0_init rồi deploy lại…");
    console.log(run("npx prisma migrate resolve --applied 0_init"));
    console.log(run("npx prisma migrate deploy"));
  } else {
    console.error(out);
    process.exit(1);
  }
}
