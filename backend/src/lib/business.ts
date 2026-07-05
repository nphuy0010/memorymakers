/* LOGIC NGHIỆP VỤ THUẦN (không phụ thuộc DB) — để test được và tái dùng. */

export type PriceTable = { priceDigital: number; priceSoft: number; priceHard: number; priceFan: number };
export const PAID_STATUSES = ["PURCHASED", "SHIPPING", "DELIVERED"] as const;
export const OPTIONS = ["soft", "hard", "fan", "digital"] as const;
export type OrderOption = (typeof OPTIONS)[number];

/** Tính tiền phía SERVER từ bảng giá template — không bao giờ tin số client gửi lên. */
export function computeAmount(mode: string, option: string | undefined, prices: PriceTable): number {
  const opt: OrderOption = mode === "digital" ? "digital" : (option as OrderOption);
  if (!OPTIONS.includes(opt)) throw Object.assign(new Error("Option không hợp lệ"), { status: 400 });
  if (mode !== "digital" && opt === "digital") throw Object.assign(new Error("Bản in phải chọn loại bìa"), { status: 400 });
  const map: Record<OrderOption, number> = { digital: prices.priceDigital, soft: prices.priceSoft, hard: prices.priceHard, fan: prices.priceFan };
  const amount = map[opt];
  if (!Number.isInteger(amount) || amount <= 0) throw Object.assign(new Error("Giá không hợp lệ"), { status: 500 });
  return amount;
}

export function isPaid(status: string): boolean {
  return (PAID_STATUSES as readonly string[]).includes(status);
}

/** Khách chỉ xoá được dự án CHƯA thanh toán (giữ lịch sử đơn). */
export function canCustomerDelete(status: string): boolean {
  return !isPaid(status);
}

/** Thống kê doanh thu — chỉ đếm đơn ĐÃ thanh toán, hủy/xoá tự trừ. */
export function aggregateStats(projects: { status: string; amount: number | null; option: string | null }[]) {
  const paid = projects.filter((p) => isPaid(p.status));
  const revenue = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const byOption: Record<string, number> = {};
  for (const p of paid) byOption[p.option || "?"] = (byOption[p.option || "?"] || 0) + (p.amount || 0);
  return { totalOrders: paid.length, revenue, byOption };
}
