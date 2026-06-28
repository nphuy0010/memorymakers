import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.role !== "ADMIN") {
    return res.status(403).json({ error: "Chỉ admin mới được phép" });
  }
  next();
}
