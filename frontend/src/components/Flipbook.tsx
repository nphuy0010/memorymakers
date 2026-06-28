"use client";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Layers, X, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Template, PageDef, Slot } from "@/lib/types";

const INK = "#2A2520", BRASS = "#B08D57", CREAM = "#EFE7DA", SUB = "#6B6258", LINE = "#E5DCCF", SAGE = "#9CA98C";

export interface TextItem { id: string; text: string; x: number; y: number; size: number; color: string; font: string; }
type Edit = { scale?: number; ox?: number; oy?: number; rot?: number; filter?: string };

const FILTERS: Record<string, string> = {
  none: "none", warm: "saturate(1.15) sepia(.15)", cool: "saturate(1.1) hue-rotate(-10deg)",
  bw: "grayscale(1)", vivid: "saturate(1.5) contrast(1.05)", fade: "contrast(.92) brightness(1.05) saturate(.85)",
};
function imgStyle(e?: Edit): React.CSSProperties {
  const sc = e?.scale ?? 1, ox = e?.ox ?? 50, oy = e?.oy ?? 50, rot = e?.rot ?? 0;
  return { width: "100%", height: "100%", objectFit: "cover", objectPosition: `${ox}% ${oy}%`, transform: `scale(${sc}) rotate(${rot}deg)`, filter: FILTERS[e?.filter || "none"] || "none", display: "block" };
}

/* Dựng pages [{image, slots(g)}] — gán chỉ số khung toàn cục g */
function buildPages(t: Template): { image: string | null; slots: (Slot & { g: number })[] }[] {
  const pages = (t.pages || []) as PageDef[];
  if (pages.length && typeof pages[0] === "object" && (pages[0] as PageDef).image) {
    let g = 0;
    return pages.map((p) => ({ image: p.image, slots: (p.slots || []).map((s) => ({ ...s, g: g++ })) }));
  }
  // fallback: số trang tối thiểu
  const n = Math.max(t.pageCount || 4, 2);
  return Array.from({ length: n }).map(() => ({ image: null, slots: [] }));
}

function NPage({ pg, assignments, edits, texts, sample }: {
  pg: { image: string | null; slots: (Slot & { g: number })[] } | null;
  assignments?: (string | undefined)[]; edits?: Record<number, Edit>; texts?: TextItem[]; sample?: boolean;
}) {
  if (!pg) return <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${CREAM}, #fff)`, display: "grid", placeItems: "center", color: SUB, fontFamily: "Lora, serif", fontStyle: "italic", opacity: .6 }}>Memory Makers</div>;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#fff", overflow: "hidden" }}>
      {pg.image && <img src={pg.image} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      {pg.slots.map((s) => {
        const img = assignments?.[s.g];
        const round = s.shape === "circle";
        return (
          <div key={s.g} style={{ position: "absolute", left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: round ? "50%" : 3, overflow: "hidden", border: img ? "none" : "2px dashed rgba(176,141,87,.9)", background: img ? "transparent" : "rgba(255,255,255,.14)", display: "grid", placeItems: "center" }}>
            {img ? <img src={img} draggable={false} style={imgStyle(edits?.[s.g])} />
                 : <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 10, color: BRASS }}>{sample ? "Ảnh mẫu" : "Ảnh"}</span>}
          </div>
        );
      })}
      {(texts || []).map((tx) => (
        <div key={tx.id} style={{ position: "absolute", left: tx.x + "%", top: tx.y + "%", transform: "translate(-50%,-50%)", fontFamily: tx.font === "sans" ? "var(--font-sans, sans-serif)" : "Lora, serif", fontSize: tx.size || 20, color: tx.color || INK, fontWeight: 600, whiteSpace: "pre", textAlign: "center", textShadow: "0 1px 3px rgba(255,255,255,.45)" }}>{tx.text}</div>
      ))}
    </div>
  );
}

function BookCore({ t, assignments, edits, texts, hidden, sample, big }: {
  t: Template; assignments?: (string | undefined)[]; edits?: Record<number, Edit>;
  texts?: Record<number, TextItem[]>; hidden?: Record<number, boolean>; sample?: boolean; big?: boolean;
}) {
  // Bìa trước = trang 1: hiển thị MỘT MÌNH & CĂN GIỮA. Trang trong ghép đôi.
  // Bìa sau CHỈ có khi tổng số trang hiển thị là CHẴN (lẻ thì không có bìa sau).
  const views = useMemo(() => {
    const all = buildPages(t).map((p, i) => ({ ...p, texts: (texts && texts[i]) || [] }));
    const vis = all.filter((_, i) => !(hidden && hidden[i]));
    const n = vis.length;
    if (!n) return [] as { type: "single" | "spread"; label: string; pages: any[] }[];
    const vw: { type: "single" | "spread"; label: string; pages: any[] }[] = [{ type: "single", label: "Bìa trước", pages: [vis[0]] }];
    let no = 2;
    const even = n % 2 === 0;
    const inner = even ? vis.slice(1, n - 1) : vis.slice(1);
    for (let i = 0; i < inner.length; i += 2) { vw.push({ type: "spread", label: `Trang ${no}–${no + 1}`, pages: [inner[i], inner[i + 1]] }); no += 2; }
    if (even && n > 1) vw.push({ type: "single", label: "Bìa sau", pages: [vis[n - 1]] });
    return vw;
  }, [t, texts, hidden]);

  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx((i) => Math.min(i, Math.max(0, views.length - 1))); }, [views.length]);
  const v = views[Math.min(idx, views.length - 1)];
  const render = (pg: any) => <NPage pg={pg} assignments={assignments} edits={edits} texts={pg?.texts} sample={sample} />;
  const spine = (side: "left" | "right"): React.CSSProperties => ({ position: "absolute", top: 0, bottom: 0, [side]: 0, width: "12%", pointerEvents: "none", background: side === "left" ? "linear-gradient(to right, rgba(0,0,0,.16), transparent)" : "linear-gradient(to left, rgba(0,0,0,.16), transparent)" } as React.CSSProperties);
  if (!v) return <div style={{ aspectRatio: "40/13", display: "grid", placeItems: "center", background: CREAM, borderRadius: 12, fontFamily: "var(--font-sans, sans-serif)", color: SUB, fontSize: 13 }}>Tất cả trang đang bị ẩn.</div>;

  return (
    <div onContextMenu={(e) => e.preventDefault()} style={{ userSelect: "none" }}>
      <style>{`@keyframes mmTurn{0%{opacity:.4;transform:translateX(2%) scale(.99)}100%{opacity:1;transform:none}} .mm-turn{animation:mmTurn .4s ease both}`}</style>
      <div style={{ perspective: big ? 2600 : 2000 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "40/13", borderRadius: 12, background: "#EFE7DA", boxShadow: "0 24px 60px rgba(42,37,32,.28)", overflow: "hidden" }}>
          <div key={idx} className="mm-turn" style={{ position: "absolute", inset: 0 }}>
            {v.type === "single" ? (
              <div style={{ position: "absolute", top: 0, bottom: 0, left: "25%", width: "50%", overflow: "hidden", boxShadow: "0 0 40px rgba(42,37,32,.25)" }}>{render(v.pages[0])}</div>
            ) : (
              <>
                <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", overflow: "hidden", borderRight: "1px solid rgba(0,0,0,.06)" }}>{render(v.pages[0])}<div style={spine("right")} /></div>
                <div style={{ position: "absolute", top: 0, left: "50%", width: "50%", height: "100%", overflow: "hidden" }}>{render(v.pages[1])}<div style={spine("left")} /></div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 1px)", width: 2, background: "rgba(42,37,32,.12)", zIndex: 6, pointerEvents: "none" }} />
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 14 }}>
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx <= 0} style={navBtn(idx <= 0)}><ChevronLeft size={18} color={INK} /></button>
        <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 12, letterSpacing: 1.5, color: SUB, textTransform: "uppercase", minWidth: 150, textAlign: "center" }}>{v.label} · {idx + 1}/{views.length}</span>
        <button onClick={() => setIdx((i) => Math.min(views.length - 1, i + 1))} disabled={idx >= views.length - 1} style={navBtn(idx >= views.length - 1)}><ChevronRight size={18} color={INK} /></button>
      </div>
    </div>
  );
}
const navBtn = (dis: boolean): React.CSSProperties => ({ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: `1px solid ${LINE}`, display: "grid", placeItems: "center", cursor: dis ? "default" : "pointer", opacity: dis ? .35 : 1 });

export default function Flipbook({ t, assignments, edits, texts, hidden, watermark, paid }: {
  t: Template; assignments?: (string | undefined)[]; edits?: Record<number, Edit>;
  texts?: Record<number, TextItem[]>; hidden?: Record<number, boolean>; watermark?: boolean; paid?: boolean;
}) {
  const [full, setFull] = useState(false);
  const [blurGuard, setBlurGuard] = useState(false);
  useEffect(() => {
    if (!watermark || paid) return;
    const onVis = () => setBlurGuard(document.hidden);
    const hide = () => setBlurGuard(true); const show = () => setBlurGuard(false);
    window.addEventListener("blur", hide); window.addEventListener("focus", show); document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("blur", hide); window.removeEventListener("focus", show); document.removeEventListener("visibilitychange", onVis); };
  }, [watermark, paid]);

  const overlay = watermark && !paid && (
    <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", flexWrap: "wrap", gap: 24, alignContent: "center", justifyContent: "center", opacity: .13, transform: "rotate(-22deg)", zIndex: 8 }}>
        {Array.from({ length: 14 }).map((_, k) => <span key={k} style={{ fontFamily: "var(--font-sans, sans-serif)", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>MEMORY MAKERS · CHƯA THANH TOÁN</span>)}
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(42,37,32,.8)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontFamily: "var(--font-sans, sans-serif)", fontSize: 12, display: "flex", gap: 6, alignItems: "center", zIndex: 8 }}><ShieldCheck size={14} /> Ảnh được bảo vệ — mở khoá sau khi thanh toán</div>
      {blurGuard && <div style={{ position: "absolute", inset: 0, background: INK, display: "grid", placeItems: "center", color: "#fff", fontFamily: "var(--font-sans, sans-serif)", zIndex: 9, borderRadius: 12 }}><div style={{ textAlign: "center" }}><EyeOff size={30} /><div style={{ marginTop: 8, fontSize: 13 }}>Tạm ẩn để bảo vệ bản quyền</div></div></div>}
    </>
  );
  const paidBadge = watermark && paid && (
    <div style={{ position: "absolute", top: 12, right: 12, background: SAGE, color: "#fff", borderRadius: 999, padding: "6px 12px", fontFamily: "var(--font-sans, sans-serif)", fontSize: 12, display: "flex", gap: 6, alignItems: "center", zIndex: 8 }}><CheckCircle2 size={14} /> Đã mở khoá</div>
  );

  const Book = ({ big }: { big?: boolean }) => <BookCore t={t} assignments={assignments} edits={edits} texts={texts} hidden={hidden} sample={!assignments} big={big} />;

  return (
    <div>
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-sans text-[11px] tracking-[1.5px] uppercase text-sub font-bold flex items-center gap-1.5"><BookOpen size={14} color={BRASS} /> Interactive Preview</span>
          <button onClick={() => setFull(true)} className="flex items-center gap-1.5 font-sans text-xs font-semibold text-ink bg-cream border border-line rounded-full px-3 py-1.5"><Layers size={13} /> Open Flipbook</button>
        </div>
        <div style={{ position: "relative" }}><Book />{overlay}{paidBadge}</div>
      </div>

      {full && (
        <div onClick={() => setFull(false)} className="fixed inset-0 z-[90] grid place-items-center p-7" style={{ background: "rgba(28,24,20,.92)" }}>
          <button onClick={() => setFull(false)} className="absolute top-4 right-5 w-10 h-10 grid place-items-center rounded-full" style={{ background: "rgba(255,255,255,.15)" }}><X size={20} color="#fff" /></button>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(1100px, 94vw)", position: "relative" }}><Book big />{overlay}{paidBadge}</div>
        </div>
      )}
    </div>
  );
}
