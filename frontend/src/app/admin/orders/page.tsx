"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

const STATUS: Record<string, { label: string; color: string }> = {
  PURCHASED: { label: "Đang xử lý", color: "#7E9CC4" },
  SHIPPING: { label: "Đang giao", color: "#C79BB0" },
  DELIVERED: { label: "Đã giao", color: "#9CA98C" },
  CANCELLED: { label: "Đã hủy", color: "#B0A89C" },
};
const STAGES = ["PURCHASED", "SHIPPING", "DELIVERED", "CANCELLED"];
const OPT_LABEL: Record<string, string> = { soft: "Bìa thường", hard: "Bìa cứng", fan: "Gấp quạt", digital: "Digital" };
const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "₫";

type Order = { id: string; title: string; status: string; amount: number; mode: string; option: string; tracking: string; customer: string; phone: string; address: { name?: string; phone?: string; address?: string } | null; };

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState("all");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string>("");

  const load = () => { setLoading(true); api.adminOrders().then((d: Order[]) => setOrders(d)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    STAGES.forEach(s => c[s] = orders.filter(o => o.status === s).length);
    return c;
  }, [orders]);

  const list = useMemo(() => orders.filter(o => {
    if (fStatus !== "all" && o.status !== fStatus) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [o.id, o.title, o.customer, o.phone, o.tracking].some(x => (x || "").toLowerCase().includes(s));
  }), [orders, fStatus, q]);

  const patch = async (id: string, body: { status?: string; tracking?: string }) => {
    setOrders(os => os.map(o => o.id === id ? { ...o, ...body } : o)); // cập nhật lạc quan
    setSaving(id);
    try { await api.adminUpdateOrder(id, body); } catch (e: any) { alert(e.message); load(); }
    finally { setSaving(""); }
  };

  const exportCsv = () => {
    const head = ["Mã đơn", "Khách", "SĐT", "Mẫu", "Loại", "Số tiền", "Trạng thái", "Mã vận đơn", "Địa chỉ"];
    const rows = list.map(o => [o.id, o.customer, o.phone, o.title, o.mode === "digital" ? "Digital" : (OPT_LABEL[o.option] || ""), o.amount || 0, STATUS[o.status]?.label || o.status, o.tracking || "", o.address?.address || ""]);
    const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [head, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `don-hang-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const th = "text-left font-sans text-[11px] tracking-wide uppercase text-sub pb-2.5 px-2 font-bold";
  const td = "py-3 px-2 font-sans text-sm text-ink align-top";

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-ink font-bold">Quản lý đơn hàng ({orders.length})</h3>
          <button onClick={exportCsv} disabled={!list.length} className="flex items-center gap-2 bg-cream text-ink rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-40"><Download size={15} /> Xuất CSV</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[["all", "Tất cả"], ...STAGES.map(s => [s, STATUS[s].label])].map(([k, l]) => (
            <button key={k} onClick={() => setFStatus(k)} className={`font-sans text-[12.5px] px-3 py-1.5 rounded-full border ${fStatus === k ? "bg-ink text-paper border-ink" : "border-line text-ink"}`}>{l} ({counts[k] || 0})</button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 bg-white border border-line rounded-full px-3 py-1.5 min-w-[240px]">
            <Search size={15} className="text-sub" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm mã đơn / khách / SĐT / mã vận đơn" className="border-none outline-none font-sans text-sm flex-1 bg-transparent" />
          </div>
        </div>

        {loading ? <div className="py-10 text-center text-sub"><Loader2 className="animate-spin inline" /></div>
          : list.length === 0 ? <div className="py-10 text-center font-sans text-sub">Không có đơn phù hợp.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[860px]">
                <thead><tr>{["Mã đơn", "Khách hàng", "Mẫu", "Loại", "Số tiền", "Trạng thái", "Mã vận đơn", "Địa chỉ"].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{list.map(o => (
                  <tr key={o.id} className="border-t border-line">
                    <td className={td + " font-mono text-xs"}>{o.id.slice(0, 8)}… {saving === o.id && <Loader2 size={11} className="animate-spin inline ml-1" />}</td>
                    <td className={td}><div className="font-semibold">{o.customer}</div><div className="text-xs text-sub">{o.phone}</div></td>
                    <td className={td}>{o.title}</td>
                    <td className={td}>{o.mode === "digital" ? "Digital" : OPT_LABEL[o.option]}</td>
                    <td className={td + " font-bold text-brass"}>{vnd(o.amount)}</td>
                    <td className={td}>
                      <select value={o.status} onChange={e => patch(o.id, { status: e.target.value })}
                        className="font-sans text-[12.5px] px-2 py-1.5 rounded-lg border bg-white font-semibold cursor-pointer"
                        style={{ borderColor: STATUS[o.status]?.color, color: STATUS[o.status]?.color }}>
                        {STAGES.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                      </select>
                    </td>
                    <td className={td}>
                      {o.mode === "digital" ? <span className="text-sub">—</span>
                        : <input defaultValue={o.tracking || ""} onBlur={e => { if (e.target.value !== (o.tracking || "")) patch(o.id, { tracking: e.target.value }); }} placeholder="Nhập mã…" className="w-[130px] font-sans text-[12.5px] px-2 py-1.5 rounded-lg border border-line outline-none" />}
                    </td>
                    <td className={td + " max-w-[180px] text-[12.5px] text-sub"}>{o.address?.address || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
      </div>
    </AdminShell>
  );
}
