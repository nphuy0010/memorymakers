# Backend Memory Makers — deploy Render / Railway / Fly / VPS
# Dùng PostgreSQL (Neon) + Cloudinary => KHÔNG cần volume, chạy được cả nền free.
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Chỉ dùng khi KHÔNG bật Cloudinary (fallback). Mount volume vào đây nếu muốn giữ ảnh.
ENV UPLOAD_DIR=/app/uploads
RUN mkdir -p /app/uploads

EXPOSE 5000
# Tự đẩy schema lên Postgres + tự tạo admin (ensureOwner) rồi chạy
CMD ["npm", "run", "start:prod"]
