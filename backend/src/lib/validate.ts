/* VALIDATE ĐẦU VÀO bằng zod — chặn dữ liệu méo/quá cỡ trước khi vào DB. */
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

const url = z.string().max(2000); // URL ảnh (Cloudinary/disk) — KHÔNG nhận base64 dài
const noDataUrl = url.refine((s) => !s.startsWith("data:"), "Không nhận ảnh base64 — hãy upload qua /api/upload");

export const slotSchema = z.object({
  x: z.number().min(-20).max(120), y: z.number().min(-20).max(120),
  w: z.number().min(0.5).max(120), h: z.number().min(0.5).max(120),
  shape: z.enum(["rect", "circle"]).optional(), rot: z.number().min(-180).max(180).optional(),
});
export const pageSchema = z.object({ image: noDataUrl, slots: z.array(slotSchema).max(40) });

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(100),
  phone: z.string().trim().min(8).max(20).regex(/^[0-9+ ]+$/, "SĐT chỉ gồm số"),
});
export const loginSchema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(100) });
export const verifySchema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().trim().email().optional(),
  code: z.string().trim().length(6, "Mã OTP gồm 6 số"),
}).refine((v) => v.userId || v.email, { message: "Thiếu userId hoặc email" });

export const projectCreateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().max(200).optional(),
  photos: z.array(noDataUrl).max(200).optional(),
  layout: z.any().optional(),
});
export const projectUpdateSchema = z.object({
  photos: z.array(noDataUrl).max(200).optional(),
  layout: z.any().optional(),
  title: z.string().max(200).optional(),
  status: z.enum(["DESIGNING", "DESIGNED"]).optional(), // khách KHÔNG tự set trạng thái thanh toán
});
export const orderSchema = z.object({
  mode: z.enum(["digital", "physical"]),
  option: z.enum(["soft", "hard", "fan", "digital"]).optional(),
  address: z.object({ name: z.string().min(1).max(120), phone: z.string().min(8).max(20), address: z.string().min(1).max(500) }).nullish(),
});
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), review: z.string().max(2000).optional() });

export const templateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  keywords: z.array(z.string().max(60)).max(30).optional(),
  category: z.string().max(100).optional(),
  pages: z.array(pageSchema).max(60).optional(),
  pageCount: z.number().int().min(0).max(200).optional(),
  canvaLink: z.string().max(1000).optional(),
  coverImage: noDataUrl.nullish(), demoImage: noDataUrl.nullish(), blankImage: noDataUrl.nullish(),
  demoPhotos: z.array(noDataUrl).max(60).optional(),
  demoPages: z.array(noDataUrl).max(60).optional(),
  featured: z.boolean().optional(),
  prices: z.any().optional(),
  priceDigital: z.number().int().min(0).optional(), priceSoft: z.number().int().min(0).optional(),
  priceHard: z.number().int().min(0).optional(), priceFan: z.number().int().min(0).optional(),
  previewGif: noDataUrl.nullish(), previewVideo: noDataUrl.nullish(),
}).passthrough();

export const messageSchema = z.object({ content: z.string().trim().min(1).max(3000) });
export const demoPoolSchema = z.object({ photos: z.array(noDataUrl).max(100) });

export const meSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(8).max(20).regex(/^[0-9+ ]+$/, "SĐT chỉ gồm số").optional(),
  avatar: noDataUrl.nullable().optional(),
  password: z.string().min(6).max(100).optional(),
});

/** Middleware: validate req.body theo schema; sai -> 400 kèm lý do rõ. */
export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return res.status(400).json({ error: "Dữ liệu không hợp lệ — " + msg });
    }
    req.body = r.data;
    next();
  };
}
