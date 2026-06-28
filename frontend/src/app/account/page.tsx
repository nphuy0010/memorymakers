"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Truck, Star, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import TemplateCover from "@/components/TemplateCover";
import { STATUS_LABEL, STATUS_COLOR, vnd, CATS, type Project, type ProjectStatus } from "@/lib/types";

const TABS: (ProjectStatus | "ALL")[] = ["ALL", "DESIGNING", "DESIGNED", "PURCHASED", "SHIPPING", "DELIVERED", "CANCELLED"];

export default function AccountPage() {
  const router = useRouter();
  const { user, hydrate } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tab, setTab] = useState<ProjectStatus | "ALL">("ALL");

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mm_token")) { router.push("/login"); return; }
    api.projects().then(setProjects).catch(() => {});
  }, [router]);

  const list = tab === "ALL" ? projects : projects.filter(p => p.status === tab);
  const cancel = async (p: Project) => { await api.cancelProject(p.id); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, status: "CANCELLED" } : x)); };

  return (
    <div className="max-w-[1100px] mx-auto px-5 pt-9 pb-16">
      <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Tài khoản{user ? ` · ${user.name}` : ""}</span>
      <h1 className="font-serif text-3xl text-ink font-bold mt-2.5 mb-5">Dự án của tôi</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(k => {
          const n = k === "ALL" ? projects.length : projects.filter(p => p.status === k).length;
          const label = k === "ALL" ? "Tất cả" : STATUS_LABEL[k];
          return <button key={k} onClick={() => setTab(k)} className={`font-sans text-sm px-4 py-2 rounded-full border ${tab === k ? "bg-ink text-paper border-ink" : "border-line text-ink"}`}>{label} ({n})</button>;
        })}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-14">
          <p className="font-sans text-sub mb-4">Chưa có dự án nào ở mục này.</p>
          <button onClick={() => router.push("/templates")} className="bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold inline-flex items-center gap-2"><Sparkles size={16} /> Bắt đầu thiết kế</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {list.map(p => (
            <div key={p.id} className="bg-white border border-line rounded-2xl p-3">
              <div className="relative">
                <TemplateCover t={p.template} kind="cover" />
                <span className="absolute top-2.5 left-2.5 text-white rounded-full px-2.5 py-1 font-sans text-xs font-semibold" style={{ background: STATUS_COLOR[p.status] }}>{STATUS_LABEL[p.status]}</span>
              </div>
              <div className="px-1 pt-2.5">
                <div className="font-serif text-base text-ink font-semibold">{p.template.title}</div>
                <div className="font-sans text-xs text-sub mt-1 mb-2.5">{p.amount ? `${p.mode === "digital" ? "Bản digital" : CATS.find(c => c.id === p.option)?.label} · ${vnd(p.amount)}` : `${p.photos.length} ảnh đã thêm`}</div>
                <div className="flex gap-2">
                  {p.status === "DESIGNING" && <><button onClick={() => router.push(`/design/${p.template.id}`)} className="flex-1 bg-brass text-white rounded-full py-2 font-sans text-sm font-semibold">Tiếp tục</button><button onClick={() => cancel(p)} className="bg-cream rounded-full px-3"><Trash2 size={15} className="text-[#B05A4A]" /></button></>}
                  {p.status === "DESIGNED" && <><button onClick={() => router.push(`/design/${p.template.id}`)} className="flex-1 bg-brass text-white rounded-full py-2 font-sans text-sm font-semibold inline-flex items-center justify-center gap-1.5"><ShoppingBag size={15} /> Mua ngay</button><button onClick={() => cancel(p)} className="bg-cream rounded-full px-3"><Trash2 size={15} className="text-[#B05A4A]" /></button></>}
                  {(p.status === "PURCHASED" || p.status === "SHIPPING") && <button className="flex-1 border border-ink text-ink rounded-full py-2 font-sans text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Truck size={15} /> Theo dõi đơn</button>}
                  {p.status === "DELIVERED" && <button className="flex-1 border border-ink text-ink rounded-full py-2 font-sans text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Star size={15} /> Đánh giá</button>}
                  {p.status === "CANCELLED" && <button onClick={() => router.push(`/design/${p.template.id}`)} className="flex-1 bg-cream text-ink rounded-full py-2 font-sans text-sm font-semibold">Thiết kế lại</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
