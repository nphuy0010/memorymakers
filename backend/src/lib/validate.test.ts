import { describe, it, expect } from "vitest";
import { registerSchema, orderSchema, projectUpdateSchema, pageSchema } from "./validate";

describe("zod chặn dữ liệu xấu", () => {
  it("email sai -> fail", () => expect(registerSchema.safeParse({ name: "A", email: "x", password: "123456", phone: "0900000000" }).success).toBe(false));
  it("mật khẩu ngắn -> fail", () => expect(registerSchema.safeParse({ name: "A", email: "a@b.com", password: "123", phone: "0900000000" }).success).toBe(false));
  it("đăng ký hợp lệ -> pass", () => expect(registerSchema.safeParse({ name: "A", email: "a@b.com", password: "123456", phone: "0900 000 000" }).success).toBe(true));
  it("order option lạ -> fail", () => expect(orderSchema.safeParse({ mode: "physical", option: "xxx" }).success).toBe(false));
  it("khách KHÔNG tự set PURCHASED", () => expect(projectUpdateSchema.safeParse({ status: "PURCHASED" }).success).toBe(false));
  it("CHẶN ảnh base64 trong pages", () => expect(pageSchema.safeParse({ image: "data:image/png;base64,AAAA", slots: [] }).success).toBe(false));
  it("URL thật -> pass", () => expect(pageSchema.safeParse({ image: "https://res.cloudinary.com/x/a.jpg", slots: [{ x: 1, y: 1, w: 10, h: 10 }] }).success).toBe(true));
});
