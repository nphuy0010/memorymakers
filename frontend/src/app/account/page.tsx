"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Truck, Star, ShoppingBag, X, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import TemplateCover from "@/components/TemplateCover";
import Loading from "@/components/Loading";
import { STATUS_LABEL, STATUS_COLOR, vnd, CATS, type Project, type ProjectStatus } from "@/lib/types";

const TABS: (ProjectStatus | "ALL")[] = ["ALL", "DESIGNING", "DESIGNED"]; // đơn đã đặt (đang xử lý/giao/đã giao/hủy) xem ở Giỏ hàng

export default function AccountPage() {
  const router = useRouter();
  const { user, hydrate } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProjectStatus | "ALL">("ALL");
  const [track, setTrack] = useState<Project | null>(null);
  const [review, setReview] = useState<Project | null>(null);
  const [rStars, setRStars] = useState(5);
  const [rText, setRText] = useState("");
  const [rSaving, setRSaving] = useState(false);

  const submitReview = async () => {
    if (!review) return;
    setRSaving(true);
    try {
      await api.reviewProject(review.id, { rating: rStars, review: rText });
      setProjects(ps => ps.map(x => x.id === review.id ? ({ ...x, rating: rStars, review: rText } as any) : x));
      setReview(null);
    } catch (e: any) { alert("Lưu đánh giá lỗi: " + (e?.message || "")); }
    finally { setRSaving(false); }
  };

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mm_token")) { router.push("/login"); return; }
    setLoading(true);
    api.projects().then((ps: any[]) => setProjects(ps.filter((p: any) => p.status === "DESIGNING" || p.status === "DESIGNED"))).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  const list = tab === "ALL" ? projects : projects.filter(p => p.status === tab);
  const cancel = async (p: Project) => { await api.cancelProject(p.id); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, status: "CANCELLED" } : x)); };
  const remove = async (p: Project) => {
    if (!confirm("Xóa hẳn dự án này khỏi danh sách?")) return;
    try { await api.deleteProject(p.id); setProjects(ps => ps.filter(x => x.id !== p.id)); }
    catch (e: any) { alert("Không xóa được: " + (e?.message || "")); }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-5 pt-9 pb-16">
      <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Tài khoản{user ? ` · ${user.name}` : ""}</span>
      <h1 className="font-serif text-3xl text-ink font-bold mt-2.5 mb-1.5">Dự án của tôi</h1>
      <p className="font-sans text-[13px] text-sub mb-5">Nơi chứa các mẫu đang thiết kế / đã thiết kế. Đơn đã đặt (đang xử lý, đang giao, đã giao, đã hủy) xem trong <a href="/cart" className="text-brass underline">Giỏ hàng</a>.</p>

      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(k => {
          const n = k === "ALL" ? projects.length : projects.filter(p => p.status === k).length;
          const label = k === "ALL" ? "Tất cả" : STATUS_LABEL[k];
          return <button key={k} onClick={() => setTab(k)} className={`font-sans text-sm px-4 py-2 rounded-full border ${tab === k ? "bg-ink text-paper border-ink" : "border-line text-ink"}`}>{label} ({n})</button>;
        })}
      </div>

      {loading ? (
        <Loading text="Đang tải dự án của bạn…" />
      ) : list.length === 0 ? (
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
                  {p.status === "DESIGNING" && <><button onClick={() => router.push(`/design/${p.template.id}?project=${p.id}`)} className="flex-1 bg-brass text-white rounded-full py-2 font-sans text-sm font-semibold">Tiếp tục</button><button onClick={() => cancel(p)} className="bg-cream rounded-full px-3"><Trash2 size={15} className="text-[#B05A4A]" /></button></>}
                  {p.status === "DESIGNED" && <><button onClick={() => router.push(`/design/${p.template.id}?project=${p.id}`)} className="flex-1 bg-brass text-white rounded-full py-2 font-sans text-sm font-semibold inline-flex items-center justify-center gap-1.5"><ShoppingBag size={15} /> Mua ngay</button><button onClick={() => cancel(p)} className="bg-cream rounded-full px-3"><Trash2 size={15} className="text-[#B05A4A]" /></button></>}
                  {(p.status === "PURCHASED" || p.status === "SHIPPING") && <button onClick={() => setTrack(p)} className="flex-1 border border-ink text-ink rounded-full py-2 font-sans text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Truck size={15} /> Theo dõi đơn</button>}
                  {p.status === "DELIVERED" && ((p as any).rating
                    ? <div className="flex-1 flex items-center justify-center gap-1 py-2 font-sans text-sm text-brass font-semibold">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className={i < (p as any).rating ? "fill-brass text-brass" : "text-line"} />)}<span className="ml-1">Đã đánh giá</span></div>
                    : <button onClick={() => { setReview(p); setRStars(5); setRText(""); }} className="flex-1 border border-ink text-ink rounded-full py-2 font-sans text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Star size={15} /> Đánh giá</button>)}
                  {p.status === "CANCELLED" && <><button onClick={() => router.push(`/design/${p.template.id}?project=${p.id}`)} className="flex-1 bg-cream text-ink rounded-full py-2 font-sans text-sm font-semibold">Thiết kế lại</button><button onClick={() => remove(p)} title="Xóa dự án" className="bg-cream rounded-full px-3"><Trash2 size={15} className="text-[#B05A4A]" /></button></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {track && (() => {
        const tr = (track as any).tracking as string | undefined;
        const ad = (track as any).address as { name?: string; phone?: string; address?: string } | null | undefined;
        const steps: ProjectStatus[] = ["PURCHASED", "SHIPPING", "DELIVERED"];
        const curIdx = steps.indexOf(track.status as ProjectStatus);
        return (
          <div className="fixed inset-0 z-[90] grid place-items-center p-5" style={{ background: "rgba(42,37,32,.5)", backdropFilter: "blur(3px)" }}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl border border-line w-full max-w-[440px] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Theo dõi đơn</span>
                  <h3 className="font-serif text-xl text-ink font-bold mt-1">{track.template.title}</h3>
                </div>
                <button onClick={() => setTrack(null)} className="w-8 h-8 grid place-items-center rounded-full bg-cream"><X size={16} className="text-ink" /></button>
              </div>
              <div className="bg-cream rounded-xl p-3 mb-4 font-sans text-sm text-ink">
                Mã vận đơn: <b>{tr ? tr : "Đang cập nhật"}</b>
                {track.amount ? <span className="text-sub"> · {vnd(track.amount)}</span> : null}
              </div>
              <div className="relative pl-6">
                {steps.map((s, i) => {
                  const done = i <= curIdx;
                  return (
                    <div key={s} className="relative pb-5 last:pb-0">
                      {i < steps.length - 1 && <div className="absolute left-[-14px] top-4 bottom-0 w-px" style={{ background: done ? STATUS_COLOR[s] : "#E5DCCF" }} />}
                      <div className="absolute left-[-20px] top-0.5 w-3.5 h-3.5 rounded-full grid place-items-center" style={{ background: done ? STATUS_COLOR[s] : "#E5DCCF" }}>{done && <CheckCircle2 size={10} color="#fff" />}</div>
                      <div className={`font-sans text-sm ${done ? "text-ink font-semibold" : "text-sub"}`}>{STATUS_LABEL[s]}</div>
                    </div>
                  );
                })}
              </div>
              {ad?.address && (
                <div className="border-t border-line mt-3 pt-3 font-sans text-sm text-sub">
                  <div className="text-ink font-semibold">{ad.name} · {ad.phone}</div>
                  <div>{ad.address}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {review && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-5" style={{ background: "rgba(42,37,32,.5)", backdropFilter: "blur(3px)" }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl border border-line w-full max-w-[420px] p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Đánh giá sản phẩm</span>
                <h3 className="font-serif text-xl text-ink font-bold mt-1">{review.template.title}</h3>
              </div>
              <button onClick={() => setReview(null)} className="w-8 h-8 grid place-items-center rounded-full bg-cream"><X size={16} className="text-ink" /></button>
            </div>
            <div className="flex justify-center gap-2 my-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setRStars(i + 1)} className="mm-btn">
                  <Star size={34} className={i < rStars ? "fill-brass text-brass" : "text-line"} />
                </button>
              ))}
            </div>
            <div className="text-center font-sans text-sm text-sub mb-3">{["", "Tệ", "Chưa ổn", "Bình thường", "Tốt", "Tuyệt vời"][rStars]}</div>
            <textarea value={rText} onChange={e => setRText(e.target.value)} rows={4} placeholder="Chia sẻ cảm nhận của bạn về cuốn photobook…"
              className="w-full p-3 rounded-xl border border-line font-sans text-sm outline-none resize-none mb-4" />
            <button onClick={submitReview} disabled={rSaving} className="mm-btn w-full bg-brass text-white rounded-full py-3 font-sans font-semibold disabled:opacity-50">{rSaving ? "Đang gửi…" : "Gửi đánh giá"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
