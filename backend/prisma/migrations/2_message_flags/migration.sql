-- Xoá tin nhắn kiểu Messenger: thu hồi (2 phía) / xoá phía tôi (chỉ người gửi)
ALTER TABLE "Message" ADD COLUMN "recalled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "deletedForSender" BOOLEAN NOT NULL DEFAULT false;
