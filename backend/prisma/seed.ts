import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const KW = ["du lịch", "sinh nhật", "cưới", "gia đình", "tốt nghiệp", "tình yêu", "bạn bè", "kỷ niệm"];
const TITLES = ["Hành trình tuổi 20", "Mùa hè rực nắng", "Chuyện chúng mình", "Tốt nghiệp 2026", "Gia đình bé nhỏ", "Sinh nhật ngọt ngào"];

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  // ----- Tài khoản admin chính (của bạn) -----
  const ownerEmail = process.env.OWNER_EMAIL || "owner@memorymakers.com";
  const ownerPass = process.env.OWNER_PASSWORD || "ChangeMe123!";
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { role: "ADMIN" },
    create: {
      name: process.env.OWNER_NAME || "Chủ shop",
      email: ownerEmail,
      password: await bcrypt.hash(ownerPass, 10),
      phone: process.env.OWNER_PHONE || "0900000000",
      phoneVerified: true,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin: ${ownerEmail} / ${ownerPass}`);

  // Không seed mẫu ảo nữa — admin tự thêm mẫu thật qua /admin/templates.
  console.log("ℹ️  Chưa có template. Hãy đăng nhập admin và thêm mẫu thật ở /admin/templates.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
