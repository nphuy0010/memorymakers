-- Xoá CẢ ĐOẠN chat theo từng phía (thay cho xoá từng tin)
ALTER TABLE "Message" ADD COLUMN "hiddenForUser" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "hiddenForAdmin" BOOLEAN NOT NULL DEFAULT false;
