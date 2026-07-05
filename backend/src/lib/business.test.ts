import { describe, it, expect } from "vitest";
import { computeAmount, aggregateStats, canCustomerDelete, isPaid } from "./business";

const PRICES = { priceDigital: 150000, priceSoft: 290000, priceHard: 450000, priceFan: 520000 };

describe("computeAmount — tiền LUÔN tính server-side", () => {
  it("digital", () => expect(computeAmount("digital", undefined, PRICES)).toBe(150000));
  it("bìa cứng", () => expect(computeAmount("physical", "hard", PRICES)).toBe(450000));
  it("gấp quạt", () => expect(computeAmount("physical", "fan", PRICES)).toBe(520000));
  it("option lạ -> 400", () => expect(() => computeAmount("physical", "hack" as any, PRICES)).toThrow());
  it("physical mà chọn digital -> 400", () => expect(() => computeAmount("physical", "digital", PRICES)).toThrow());
  it("giá <= 0 -> lỗi", () => expect(() => computeAmount("digital", undefined, { ...PRICES, priceDigital: 0 })).toThrow());
});

describe("aggregateStats — hủy/xóa tự trừ doanh thu", () => {
  const rows = [
    { status: "DELIVERED", amount: 450000, option: "hard" },
    { status: "SHIPPING", amount: 520000, option: "fan" },
    { status: "CANCELLED", amount: 450000, option: "hard" }, // KHÔNG được tính
    { status: "DESIGNED", amount: null, option: null },       // chưa mua
  ];
  const s = aggregateStats(rows);
  it("chỉ đếm đơn đã thanh toán", () => expect(s.totalOrders).toBe(2));
  it("doanh thu đúng", () => expect(s.revenue).toBe(970000));
  it("theo option đúng", () => expect(s.byOption).toEqual({ hard: 450000, fan: 520000 }));
});

describe("quyền xóa của khách", () => {
  it("nháp/hủy xóa được", () => { expect(canCustomerDelete("DESIGNING")).toBe(true); expect(canCustomerDelete("CANCELLED")).toBe(true); });
  it("đơn đã thanh toán KHÔNG xóa được", () => { expect(canCustomerDelete("PURCHASED")).toBe(false); expect(canCustomerDelete("DELIVERED")).toBe(false); });
  it("isPaid", () => expect(isPaid("SHIPPING")).toBe(true));
});
