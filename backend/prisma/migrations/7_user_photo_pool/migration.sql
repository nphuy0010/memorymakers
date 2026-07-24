-- Kho ảnh dùng chung cho mọi dự án của một người dùng (ảnh tạm, TTL 24h)
ALTER TABLE "User" ADD COLUMN "photoPool" TEXT;
