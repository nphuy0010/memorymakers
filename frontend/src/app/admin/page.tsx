"use client";
import { useEffect, useState } from "react";
import { Wallet, ListOrdered, Package, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";
import { vnd, CATS } from "@/lib/types";

export default function AdminHome() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
    api.adminOrders().then(setOrders).catch(() => {});
    api.templates().then(setTemplates).catch(() => {});
  }, []);

  const cards = [
    ["Tổng đơn", stats?.totalOrders ?? 0, ListOrdered],
    ["Doanh thu", stats ? vnd(stats.revenue) : "—", TrendingUp],
    ["Template", templates.length, Package],
    ["Đơn đang xử lý", orders.filter(o => o.status === "SHIPPING").length, Wallet],
  ] as const;

  return (
    <AdminShell>
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {cards.map(([l, v, Icon]) => (
          <div key={l} className="bg-white rounded-2xl p-4 border border-line">
            <Icon size={18} className="text-brass" />
            <div className="font-serif text-xl text-ink font-bold mt-2">{v}</div>
            <div className="font-sans text-xs text-sub">{l}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-line p-5 mb-6">
        <h3 className="font-serif text-lg text-ink font-bold mb-4">Doanh thu theo option</h3>
        {CATS.map(c => {
          const rev = stats?.byOption?.[c.id] || 0;
          const max = Math.max(...Object.values(stats?.byOption || { x: 1 }) as number[], 1);
          return (
            <div key={c.id} className="mb-3.5">
              <div className="flex justify-between font-sans text-sm text-ink mb-1.5"><span>{c.label}</span><b>{vnd(rev)}</b></div>
              <div className="h-3 bg-cream rounded-full"><div className="h-full bg-brass rounded-full" style={{ width: `${(rev / max) * 100}%` }} /></div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-line p-5">
        <h3 className="font-serif text-lg text-ink font-bold mb-4">Đơn hàng</h3>
        {orders.length === 0 ? <div className="font-sans text-sm text-sub py-4">Chưa có đơn nào.</div> : (
          <table className="w-full">
            <thead><tr>{["Khách hàng", "Sản phẩm", "Số tiền", "Trạng thái", "Địa chỉ"].map(h => <th key={h} className="text-left font-sans text-xs uppercase tracking-wide text-sub pb-2.5 font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-line">
                  <td className="py-3 font-sans text-sm text-ink">{o.customer}</td>
                  <td className="py-3 font-sans text-sm text-ink">{CATS.find(c => c.id === o.option)?.label || o.option}</td>
                  <td className="py-3 font-sans text-sm text-ink">{o.amount ? vnd(o.amount) : "—"}</td>
                  <td className="py-3 font-sans text-sm text-ink">{o.status}</td>
                  <td className="py-3 font-sans text-sm text-sub">{o.address?.address || "Digital"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
