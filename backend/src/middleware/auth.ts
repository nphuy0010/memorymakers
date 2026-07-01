import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}

// Cache user hợp lệ 60s -> không phải truy vấn DB ở MỌI request (giảm độ trễ rõ rệt)
const cache = new Map<string, { role: string; exp: number }>();

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
  const now = Date.now();
  const hit = cache.get(payload.userId);
  if (hit && hit.exp > now) {
    req.userId = payload.userId;
    req.role = hit.role;
    return next();
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) { cache.delete(payload.userId); return res.status(401).json({ error: "Tài khoản không tồn tại — hãy đăng nhập lại" }); }
    cache.set(user.id, { role: user.role, exp: now + 60_000 });
    req.userId = user.id;
    req.role = user.role;
    next();
  } catch {
    return res.status(500).json({ error: "Lỗi xác thực" });
  }
}
