"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, User as UserIcon, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/store/useAuth";

interface Row { id: string; name: string; email: string; phone?: string; role: "ADMIN" | "CUSTOMER"; phoneVerified: boolean; }

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", role: "CUSTOMER" as "CUSTOMER" | "ADMIN" });
  const [err, setErr] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);
  const doGrant = async () => {
    setGranting(true);
    try { const u = await api.grantAdmin(grantEmail.trim()); setUsers(us => [u, ...us]); setGrantEmail(""); alert("Đã cấp quyền Admin cho " + u.email + " ✓"); }
    catch (e: any) { alert(e?.message || "Không cấp được quyền"); }
    finally { setGranting(false); }
  };
  const [saving, setSaving] = useState(false);

  const load = () => api.adminUsers().then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr("");
    if (!f.name || !f.email || !f.phone || !f.password) return setErr("Nhập đủ tên, email, SĐT, mật khẩu.");
    if (f.password !== (f.password2 || "")) return setErr("Mật khẩu nhập lại không khớp.");
    if (f.password !== (f.password2 || "")) return setErr("Mật khẩu nhập lại không khớp.");
    setSaving(true);
    try {
      await api.adminCreateUser(f);
      setF({ name: "", email: "", phone: "", password: "", role: "CUSTOMER" });
      setOpen(false); load();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };
  const removeUser = async (id: string) => { if (!confirm("Xoá tài khoản này?")) return; await api.adminDeleteUser(id).catch((e: any) => alert(e.message)); load(); };

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-serif text-lg text-ink font-bold">Tài khoản</h3>
          <button onClick={() => { setOpen(o => !o); setErr(""); }} className="bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold flex items-center gap-1.5"><Plus size={15} /> Thêm account</button>
        </div>
        <p className="font-sans text-sm text-sub mb-2">Chỉ hiển thị các tài khoản <b>Admin</b>. Tài khoản khách hàng không hiển thị ở đây để bảo vệ dữ liệu cá nhân — mật khẩu luôn được băm (bcrypt), dữ liệu lưu trong database được mã hoá khi lưu trữ.</p>
        {/* CẤP QUYỀN ADMIN bằng email chính xác — không cần lộ danh sách khách */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <input className="p-2.5 rounded-lg border border-line font-sans text-sm outline-none flex-1 min-w-[220px]" placeholder="Nhập email tài khoản cần cấp quyền Admin" value={grantEmail} onChange={e => setGrantEmail(e.target.value)} />
          <button onClick={doGrant} disabled={granting || !grantEmail.trim()} className="bg-ink text-paper rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-50">{granting ? "Đang cấp…" : "Cấp quyền Admin"}</button>
        </div>

        {open && (
          <div className="bg-cream border border-line rounded-xl p-4 mb-4">
            <div className="grid md:grid-cols-2 gap-3">
              <input className="p-2.5 rounded-lg border border-line font-sans text-sm outline-none" placeholder="Họ và tên" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} />
              <input className="p-2.5 rounded-lg border border-line font-sans text-sm outline-none" placeholder="Số điện thoại" value={f.phone} onChange={e => setF(s => ({ ...s, phone: e.target.value }))} />
              <input className="p-2.5 rounded-lg border border-line font-sans text-sm outline-none" placeholder="Email" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
              <input className="p-2.5 rounded-lg border border-line font-sans text-sm outline-none" type="password" placeholder="Mật khẩu" value={f.password} onChange={e => setF(s => ({ ...s, password: e.target.value }))} />
              <input className="p-2.5 rounded-lg border border-line font-sans text-sm outline-none" type="password" placeholder="Nhập lại mật khẩu" value={f.password2 || ""} onChange={e => setF(s => ({ ...s, password2: e.target.value }))} />
            </div>
            <div className="flex items-center gap-4 flex-wrap mt-3">
              <div className="flex items-center gap-2">
                <span className="font-sans text-sm text-sub">Loại tài khoản:</span>
                {(["CUSTOMER", "ADMIN"] as const).map(k => (
                  <button key={k} onClick={() => setF(s => ({ ...s, role: k }))} className={`font-sans text-[13px] rounded-full px-3.5 py-1.5 border ${f.role === k ? "border-brass bg-white font-bold" : "border-line bg-white"}`}>{k === "ADMIN" ? "Admin" : "Customer"}</button>
                ))}
              </div>
              <button onClick={add} disabled={saving} className="ml-auto bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Tạo tài khoản</button>
            </div>
            {err && <div className="font-sans text-[13px] text-[#B05A4A] mt-2.5">{err}</div>}
          </div>
        )}

        <table className="w-full">
          <thead><tr>{["Tên", "Email", "SĐT", "Loại", ""].map(h => <th key={h} className="text-left font-sans text-xs uppercase tracking-wide text-sub pb-2.5 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-line">
                <td className="py-3 font-sans text-sm text-ink">{u.name}{user?.id === u.id && <span className="text-brass"> (bạn)</span>}</td>
                <td className="py-3 font-sans text-sm text-ink">{u.email}</td>
                <td className="py-3 font-sans text-sm text-sub">{u.phone || "—"} {u.phoneVerified && <span title="Đã xác thực SĐT">✓</span>}</td>
                <td className="py-3">
                  <span className={`font-sans text-xs rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 ${u.role === "ADMIN" ? "bg-brass text-white" : "bg-cream text-ink"}`}>
                    {u.role === "ADMIN" ? <ShieldCheck size={13} /> : <UserIcon size={13} />}{u.role === "ADMIN" ? "Admin" : "Customer"}
                  </span>
                </td>
                <td className="py-3">
                  {u.id !== user?.id
                    ? <button onClick={() => removeUser(u.id)} className="font-sans text-[12.5px] text-[#B05A4A] flex items-center gap-1"><Trash2 size={13} /> Xoá</button>
                    : <span className="font-sans text-xs text-sub">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
