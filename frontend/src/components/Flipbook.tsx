"use client";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Layers, X, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Template, Slot } from "@/lib/types";
import { buildPages, imgStyle, type Edit, type TextItem, type BuiltPage } from "@/lib/pages";
import FontLoader, { fontCss } from "@/components/FontLoader";
import { usePageRatio } from "@/lib/usePageRatio";

const INK = "#2A2520", BRASS = "#B08D57", CREAM = "#EFE7DA", SUB = "#6B6258", LINE = "#E5DCCF", SAGE = "#9CA98C";
type VP = (BuiltPage & { texts?: TextItem[] }) | null;

function NPage({ pg, assignments, edits, sample }: { pg: VP; assignments?: (string | undefined)[]; edits?: Record<number, Edit>; sample?: boolean; }) {
  if (!pg) return <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${CREAM}, #fff)`, display: "grid", placeItems: "center", color: SUB, fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic", opacity: .55 }}>Memory Makers</div>;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#fff", overflow: "hidden" }}>
      {pg.image && <img src={pg.image} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />}
      {pg.slots.map((s: Slot & { g: number }) => {
        const img = assignments?.[s.g]; const round = false; /* chỉ dùng khung chữ nhật */
        return (
          <div key={s.g} style={{ position: "absolute", left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: round ? "50%" : 3, overflow: "hidden", border: img ? "none" : "2px dashed rgba(176,141,87,.9)", background: img ? "transparent" : "rgba(255,255,255,.14)", display: "grid", placeItems: "center", transform: `rotate(${(s as any).rot || 0}deg)` }}>
            {img ? <img src={img} draggable={false} style={imgStyle(edits?.[s.g])} /> : <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 10, color: BRASS }}>{sample ? "Ảnh mẫu" : "Ảnh"}</span>}
          </div>
        );
      })}
      {(((pg as any).stickers) || []).map((st: any) => (
        <img key={st.id} src={st.url} draggable={false} style={{ position: "absolute", left: st.x + "%", top: st.y + "%", width: st.w + "%", transform: `translate(-50%,-50%) rotate(${st.rot || 0}deg)`, zIndex: 7, userSelect: "none" }} />
      ))}
      {(pg.texts || []).map((tx) => (
        <div key={tx.id} style={{ position: "absolute", left: tx.x + "%", top: tx.y + "%", transform: "translate(-50%,-50%)", fontFamily: fontCss(tx.font), fontSize: tx.size || 20, color: tx.color || INK, fontWeight: 600, whiteSpace: "pre", textAlign: "center", textShadow: "0 1px 3px rgba(255,255,255,.45)" }}>{tx.text}</div>
      ))}
    </div>
  );
}

function BookCore({ t, assignments, edits, texts, hidden, stickers, sample, big }: {
  t: Template; assignments?: (string | undefined)[]; edits?: Record<number, Edit>;
  texts?: Record<number, TextItem[]>; hidden?: Record<number, boolean>; stickers?: Record<number, any[]>; sample?: boolean; big?: boolean;
}) {
  // Tỷ lệ khung sách = 2 trang mở cạnh nhau, đo từ ảnh trang thật (fallback 40/13 khi chưa tải xong)
  const oneRatio = usePageRatio((t as any)?.pages?.[0]?.image, "20/13");
  const [prw, prh] = oneRatio.split("/").map(Number);
  const spreadRatio = prw && prh ? `${prw * 2}/${prh}` : "40/13";
  // Dãy "leaf": bìa trước đứng một mình (phải, trái trống), trang trong ghép đôi,
  // bìa sau chỉ có khi tổng trang hiển thị CHẴN. Lật trang cong 3D có bóng.
  const seq = useMemo<VP[]>(() => {
    const dpg = ((t as any).demoPages || []) as string[];
    const useComposed = !assignments && dpg.length > 0; // xem mẫu + đã có ảnh ghép -> hiển thị ảnh phẳng, KHÔNG chồng khung
    const all = buildPages(t).map((p, i) => ({
      ...p,
      image: useComposed && dpg[i] ? dpg[i] : p.image,
      slots: useComposed ? [] : p.slots,
      texts: (texts && texts[i]) || [],
      stickers: (stickers && stickers[i]) || [],
    }));
    const vis = all.filter((_, i) => !(hidden && hidden[i]));
    const n = vis.length;
    if (!n) return [];
    const even = n % 2 === 0 && n > 1;
    const front = vis[0]; const back = even ? vis[n - 1] : null;
    const inner = vis.slice(1, even ? n - 1 : n);
    const s: VP[] = [null, front, ...inner];
    if (back) { s.push(back, null); }
    if (s.length % 2) s.push(null);
    return s;
  }, [t, texts, hidden, assignments]);

  const count = seq.length;

  // CHẾ ĐỘ XEM MẪU: nếu chưa thiết kế (không có assignments) mà template có ảnh demo -> tự điền vào các khung.
  const effAssign = useMemo<(string | undefined)[] | undefined>(() => {
    if (assignments) return assignments; // đang thiết kế: dùng ảnh thật của khách
    const dp = ((t as any).demoPhotos || []) as string[];
    if (!dp.length) return undefined;
    // xáo theo seed id mẫu -> mỗi mẫu một thứ tự ảnh khác nhau (ổn định)
    let seed = 0; const idStr = String((t as any).id || "");
    for (let i = 0; i < idStr.length; i++) seed = (seed * 31 + idStr.charCodeAt(i)) >>> 0;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const sh = [...dp];
    for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
    const total = buildPages(t).reduce((n, p) => n + p.slots.length, 0);
    return Array.from({ length: total }, (_, g) => sh[g % sh.length]);
  }, [t, assignments]);
  const [spread, setSpread] = useState(0);
  const [anim, setAnim] = useState<{ dir: "next" | "prev"; started: boolean } | null>(null);
  useEffect(() => { setSpread((s) => Math.min(s, Math.max(0, count - 2))); }, [count]);
  useEffect(() => { if (!anim) return; const t = setTimeout(() => setAnim(null), 900); return () => clearTimeout(t); }, [anim]); // watchdog chống kẹt lật
  // PRELOAD 2 spread kề -> lật mượt, không chờ ảnh
  useEffect(() => {
    [spread - 2, spread + 2, spread + 3].forEach((i) => {
      const u = seq[i]?.image; if (!u) return;
      const im = new Image(); im.src = u;
    });
  }, [spread, seq]);
  const busy = anim !== null;
  const page = (i: number) => <NPage pg={seq[i] || null} assignments={effAssign} edits={edits} sample={sample} />;

  const go = (dir: "next" | "prev") => {
    if (busy) return;
    if (dir === "next" && spread + 2 >= count) return;
    if (dir === "prev" && spread <= 0) return;
    setAnim({ dir, started: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setAnim((a) => a && { ...a, started: true })));
    setTimeout(() => { setSpread((s) => (dir === "next" ? s + 2 : s - 2)); setAnim(null); }, 720);
  };

  let L = spread, R = spread + 1;
  let leaf: { side: "right" | "left"; front: number; back: number; target: number } | null = null;
  if (anim?.dir === "next") { R = spread + 3; leaf = { side: "right", front: spread + 1, back: spread + 2, target: -180 }; }
  if (anim?.dir === "prev") { L = spread - 2; leaf = { side: "left", front: spread, back: spread - 1, target: 180 }; }
  const turning = anim?.started;
  const half: React.CSSProperties = { position: "absolute", top: 0, width: "50%", height: "100%", overflow: "hidden" };
  const spine = (side: "left" | "right"): React.CSSProperties => ({ position: "absolute", top: 0, bottom: 0, [side]: 0, width: "12%", pointerEvents: "none", background: side === "left" ? "linear-gradient(to right, rgba(0,0,0,.16), transparent)" : "linear-gradient(to left, rgba(0,0,0,.16), transparent)" } as React.CSSProperties);
  if (!count) return <div style={{ aspectRatio: spreadRatio, display: "grid", placeItems: "center", background: CREAM, borderRadius: 12, fontFamily: "var(--font-sans, sans-serif)", color: SUB, fontSize: 13 }}>Tất cả trang đang bị ẩn.</div>;

  return (
    <div onContextMenu={(e) => e.preventDefault()} style={{ userSelect: "none" }}>
      <style>{`@keyframes mmShade{0%{opacity:0}35%{opacity:.55}70%{opacity:.3}100%{opacity:0}} .mm-shade{animation:mmShade .72s ease both}`}</style>
      <div style={{ perspective: big ? 3000 : 2200 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: spreadRatio, borderRadius: 12, background: "#EFE7DA", boxShadow: "0 24px 60px rgba(42,37,32,.28)", transformStyle: "preserve-3d" }}>
          <div style={{ ...half, left: 0, borderRight: "1px solid rgba(0,0,0,.06)" }}>{page(L)}<div style={spine("right")} /></div>
          <div style={{ ...half, left: "50%" }}>{page(R)}<div style={spine("left")} /></div>
          {leaf && (
            <div style={{ position: "absolute", top: 0, height: "100%", width: "50%", [leaf.side === "right" ? "left" : "right"]: "50%", transformStyle: "preserve-3d", transformOrigin: leaf.side === "right" ? "left center" : "right center", transform: `rotateY(${turning ? leaf.target : 0}deg)`, transition: "transform .72s cubic-bezier(.42,.05,.25,1)", zIndex: 5 } as React.CSSProperties}>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", overflow: "hidden" }}>{page(leaf.front)}<div style={spine(leaf.side === "right" ? "left" : "right")} /><div className={turning ? "mm-shade" : ""} style={{ position: "absolute", inset: 0, opacity: 0, background: `linear-gradient(${leaf.side === "right" ? "to right" : "to left"}, rgba(0,0,0,.5), transparent 60%)` }} /></div>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden" }}>{page(leaf.back)}<div style={spine(leaf.side === "right" ? "right" : "left")} /><div className={turning ? "mm-shade" : ""} style={{ position: "absolute", inset: 0, opacity: 0, background: `linear-gradient(${leaf.side === "right" ? "to left" : "to right"}, rgba(0,0,0,.4), transparent 60%)` }} /></div>
            </div>
          )}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 1px)", width: 2, background: "rgba(42,37,32,.12)", zIndex: 6, pointerEvents: "none" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 14 }}>
        <button onClick={() => go("prev")} disabled={spread <= 0 || busy} style={navBtn(spread <= 0)}><ChevronLeft size={18} color={INK} /></button>
        <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 12, letterSpacing: 1.5, color: SUB, textTransform: "uppercase", minWidth: 150, textAlign: "center" }}>Trang {spread + 1}–{Math.min(spread + 2, count)} / {count}</span>
        <button onClick={() => go("next")} disabled={spread + 2 >= count || busy} style={navBtn(spread + 2 >= count)}><ChevronRight size={18} color={INK} /></button>
      </div>
    </div>
  );
}
const navBtn = (dis: boolean): React.CSSProperties => ({ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: `1px solid ${LINE}`, display: "grid", placeItems: "center", cursor: dis ? "default" : "pointer", opacity: dis ? .35 : 1 });

export default function Flipbook({ t, assignments, edits, texts, hidden, stickers, watermark, paid }: {
  t: Template; assignments?: (string | undefined)[]; edits?: Record<number, Edit>;
  texts?: Record<number, TextItem[]>; hidden?: Record<number, boolean>; stickers?: Record<number, any[]>; watermark?: boolean; paid?: boolean;
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


  return (
    <div>
      <FontLoader />
      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-sans text-[11px] tracking-[1.5px] uppercase text-sub font-bold flex items-center gap-1.5"><BookOpen size={14} color={BRASS} /> Interactive Preview</span>
          <button onClick={() => setFull(true)} className="flex items-center gap-1.5 font-sans text-xs font-semibold text-ink bg-cream border border-line rounded-full px-3 py-1.5"><Layers size={13} /> Open Flipbook</button>
        </div>
        <div style={{ position: "relative" }}><BookCore t={t} assignments={assignments} edits={edits} texts={texts} hidden={hidden} stickers={stickers} sample={!assignments} />{overlay}{paidBadge}</div>
      </div>

      {full && (
        <div onClick={() => setFull(false)} className="fixed inset-0 z-[90] grid place-items-center p-7" style={{ background: "rgba(28,24,20,.92)" }}>
          <button onClick={() => setFull(false)} className="absolute top-4 right-5 w-10 h-10 grid place-items-center rounded-full" style={{ background: "rgba(255,255,255,.15)" }}><X size={20} color="#fff" /></button>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(1100px, 94vw)", position: "relative" }}><BookCore t={t} assignments={assignments} edits={edits} texts={texts} hidden={hidden} stickers={stickers} sample={!assignments} big />{overlay}{paidBadge}</div>
        </div>
      )}
    </div>
  );
}
