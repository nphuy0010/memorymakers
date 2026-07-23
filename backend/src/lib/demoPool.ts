/* Kho ảnh demo dùng chung (chỉ đọc/ghi setting — KHÔNG xử lý ảnh).
   Việc ghép ảnh demo nay chạy bằng Canvas ở trình duyệt admin, backend chỉ lưu URL kết quả. */
import { prisma } from "./prisma";

export async function getDemoPool(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: "demoPool" } });
  try { return row ? JSON.parse(row.value) : []; } catch { return []; }
}
