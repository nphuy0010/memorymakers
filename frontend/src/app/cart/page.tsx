"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, Trash2, ShoppingBag, Package } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useAuth } from "@/store/useAuth";
import { api } from "@/lib/api";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/types";

const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "₫";
const OPTION_LABEL: Record<string, string> = { soft: "Bìa thường", hard: "Bìa cứng", fan: "Gấp quạt", digital: "Bản digital" };
const ORDER_STATUSES = ["PURCHASED", "SHIPPING", "DELIVERED", "CANCELLED"]; // đơn đã đặt — hiển thị ở Giỏ hàng

export default function CartPage() {
  const router = useRouter();
  const { items, remove, hydrated } = useCart();
  const { user, hydrate } = useAuth() as any;
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { hydrate && hydrate(); }, [hydrate]);
  // ĐƠN ĐÃ ĐẶT (đang xử lý / đang giao / đã giao / đã hủy) — lấy từ server, không xóa được, chỉ xem trạng thái
  useEffect(() => {
    if (!user) { setOrders([]); return; }
    api.projects().then((ps: any[]) => setOrders(ps.filter((p) => ORDER_STATUSES.includes(p.status)))).catch(() => {});
  }, [user]);

  const pending = items.filter((i) => i.designStatus === "pending");
  const total = items.reduce((s, i) => s + (i.price || 0), 0);
  const blocked = pending.length > 0;

  if (hydrated && !items.length && !orders.length) {
    return (
      <div className="mm-page" style={{ background: "#F5EFE6" }}>
        <div className="max-w-[900px] mx-auto px-5 md:px-8 py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white grid place-items-center border border-line"><ShoppingBag size={26} className="text-brass" /></div>
          <div className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold mb-2">Giỏ hàng</div>
          <h1 className="font-serif text-3xl md:text-4xl text-ink font-bold mb-2">Giỏ hàng của bạn</h1>
          <p className="font-sans text-sub mb-5">Giỏ đang trống. Chọn một mẫu ưng ý để bắt đầu.</p>
          <Link href="/templates" className="inline-flex items-center gap-1.5 bg-brass text-white rounded-full px-5 py-2.5 font-sans font-semibold"><Sparkles size={15} /> Xem kho mẫu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mm-page" style={{ background: "#F5EFE6" }}>
      <div className="max-w-[980px] mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold mb-2">Giỏ hàng</div>
        <h1 className="font-serif text-3xl md:text-[38px] leading-tight text-ink font-bold mb-4">Giỏ hàng của bạn</h1>

        {items.length > 0 && (<>
        {/* Banner cảnh báo: chỉ hiện khi còn item pending */}
        {blocked && (
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5 border" style={{ background: "#FEF3E7", borderColor: "#E9B384" }}>
            <ShieldCheck size={20} className="shrink-0 mt-0.5" style={{ color: "#C57B34" }} />
            <div className="font-sans text-[14px] leading-relaxed" style={{ color: "#7A4A18" }}>
              Bạn cần thiết kế ảnh cho <b>{pending.length} mẫu</b> trước khi thanh toán — tránh đặt nhầm khi chưa có ảnh.
            </div>
          </div>
        )}

        {/* Danh sách item */}
        <div className="space-y-3 mb-5">
          {items.map((it) => {
            const isPending = it.designStatus === "pending";
            return (
              <article key={it.id} className="bg-white rounded-2xl border border-line p-3.5 md:p-4 flex gap-3 md:gap-4 items-center">
                {/* Bìa */}
                <div className="w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden bg-cream shrink-0 border border-line">
                  {it.cover ? <img src={it.cover} alt={it.title} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-brass"><ShoppingBag size={18} /></div>}
                </div>
                {/* Thông tin */}
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[16px] md:text-lg text-ink font-bold leading-tight truncate">{it.title}</div>
                  <div className="font-sans text-[13px] mt-1" style={{ color: isPending ? "#C57B34" : "#6B8E4E" }}>
                    {OPTION_LABEL[it.option] || "Bìa thường"} <span className="opacity-60">·</span> {isPending ? "chưa thiết kế ảnh" : "đã thiết kế"}
                  </div>
                  {isPending && (
                    <button onClick={() => router.push(`/design/${it.templateId}`)}
                      className="mm-btn mt-2.5 inline-flex items-center gap-1.5 bg-brass text-white rounded-full px-3.5 py-1.5 font-sans text-[12.5px] font-semibold">
                      <Sparkles size={13} /> Thiết kế ảnh ngay
                    </button>
                  )}
                </div>
                {/* Giá + xóa */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="font-serif text-[15px] md:text-base text-ink font-bold">{vnd(it.price)}</div>
                  <button onClick={() => remove(it.id)} title="Xoá khỏi giỏ"
                    className="w-8 h-8 grid place-items-center rounded-full border border-line hover:bg-cream text-sub hover:text-[#B05A4A]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Tổng kết */}
        <div className="rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ background: "#EFE6D5" }}>
          <div>
            <div className="font-sans text-[13px] text-sub">Tổng cộng ({items.length} sản phẩm)</div>
            <div className="font-serif text-2xl md:text-[30px] text-ink font-bold">{vnd(total)}</div>
          </div>
          {blocked ? (
            <button disabled className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-sans font-semibold cursor-not-allowed"
              style={{ background: "#D9CFB9", color: "#8B7F65" }}>
              Cần thiết kế ảnh trước
            </button>
          ) : (
            <button onClick={() => router.push("/account")}
              className="mm-btn w-full md:w-auto inline-flex items-center justify-center gap-2 bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold">
              Thanh toán
            </button>
          )}
        </div>
        </>)}

        {/* ĐƠN HÀNG CỦA BẠN: đang xử lý / đang giao / đã giao / đã hủy — hiển thị TRẠNG THÁI thay nút xóa */}
        {orders.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-brass" />
              <h2 className="font-serif text-xl md:text-2xl text-ink font-bold">Đơn hàng của bạn</h2>
            </div>
            <div className="space-y-3">
              {orders.map((p) => (
                <article key={p.id} className="bg-white rounded-2xl border border-line p-3.5 md:p-4 flex gap-3 md:gap-4 items-center">
                  <div className="w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden bg-cream shrink-0 border border-line">
                    {(p.template?.coverImage || p.template?.demoImage)
                      ? <img src={p.template.coverImage || p.template.demoImage} alt={p.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full grid place-items-center text-brass"><Package size={18} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-[16px] md:text-lg text-ink font-bold leading-tight truncate">{p.title}</div>
                    <div className="font-sans text-[13px] text-sub mt-1">
                      {OPTION_LABEL[p.option] || (p.mode === "digital" ? "Bản digital" : "Bản in")}
                      {p.tracking && !p.tracking.startsWith("DEMO") ? <> <span className="opacity-60">·</span> Mã: {p.tracking}</> : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="font-serif text-[15px] md:text-base text-ink font-bold">{vnd(p.amount || 0)}</div>
                    {/* TRẠNG THÁI ĐƠN thay cho nút xóa */}
                    <span className="text-white rounded-full px-3 py-1 font-sans text-[12px] font-semibold whitespace-nowrap" style={{ background: STATUS_COLOR[p.status as keyof typeof STATUS_COLOR] }}>
                      {STATUS_LABEL[p.status as keyof typeof STATUS_LABEL]}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
