import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }
  let payload: any;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return res.status(401).json({ error: "Token không hợp lệ" });
  }
  try {
    // Xác minh user CÒN tồn tại (token cũ sau khi reset DB sẽ bị vô hiệu, tránh lỗi khoá ngoại khi tạo dự án)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: "Tài khoản không tồn tại — hãy đăng nhập lại" });
    req.userId = user.id;
    req.role = user.role;
    next();
  } catch {
    return res.status(500).json({ error: "Lỗi xác thực" });
  }
}
