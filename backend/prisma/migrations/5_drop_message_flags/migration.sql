-- Bỏ tính năng xoá/thu hồi từng tin (chỉ giữ xoá cả đoạn qua hiddenForUser/hiddenForAdmin)
ALTER TABLE "Message" DROP COLUMN IF EXISTS "recalled";
ALTER TABLE "Message" DROP COLUMN IF EXISTS "deletedForSender";
