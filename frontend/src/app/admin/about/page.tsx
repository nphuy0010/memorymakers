"use client";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

export default function AdminAbout() {
  const [a, setA] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.about().then(setA).catch(() => {}); }, []);
  if (!a) return <AdminShell><div className="p-6 text-sub">Đang tải…</div></AdminShell>;

  const set = (k: string, v: string) => { setA((s: any) => ({ ...s, [k]: v })); setSaved(false); };
  const save = async () => { await api.saveAbout(a); setSaved(true); };

  const inp = "w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none mb-3";
  const field = (k: string, label: string, area = false) => (
    <div>
      <div className="font-sans text-sm text-sub mb-1.5">{label}</div>
      {area ? <textarea rows={4} className={inp} value={a[k] || ""} onChange={e => set(k, e.target.value)} />
            : <input className={inp} value={a[k] || ""} onChange={e => set(k, e.target.value)} />}
    </div>
  );

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-lg text-ink font-bold">Chỉnh sửa trang About Us</h3>
          <button onClick={save} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans font-semibold inline-flex items-center gap-2"><CheckCircle2 size={16} /> {saved ? "Đã lưu" : "Lưu thay đổi"}</button>
        </div>
        {field("headline", "Tiêu đề lớn")}
        {field("mission", "Sứ mệnh / mô tả shop", true)}
        {field("story", "Câu chuyện", true)}
        {field("values", "Giá trị", true)}
        <div className="grid grid-cols-3 gap-3">
          {field("instagram", "Instagram")}
          {field("tiktok", "TikTok")}
          {field("hotline", "Hotline")}
        </div>
      </div>
    </AdminShell>
  );
}
