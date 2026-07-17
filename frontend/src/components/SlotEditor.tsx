"use client";
import { useEffect, useRef, useState } from "react";
import { X, Square, Trash2, ChevronUp, ChevronDown, Loader2, Save, RotateCw } from "lucide-react";
import { api, clearApiCache } from "@/lib/api";

type Slot = { x: number; y: number; w: number; h: number; shape: "rect" | "circle"; rot?: number };
type Page = { image: string; slots: Slot[] };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Trình chỉnh khung thủ công: kéo–thả, đổi cỡ, XOAY, chồng lớp
export default function SlotEditor({ template, onClose, onSaved }: { template: any; onClose: () => void; onSaved: (t: any) => void }) {
  const [pages, setPages] = useState<Page[]>(() => (template.pages || []).map((p: any) => ({ image: p.image, slots: (p.slots || []).map((s: any) => ({ x: s.x, y: s.y, w: s.w, h: s.h, shape: "rect", rot: s.rot || 0 })) })));
  const [pi, setPi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize" | "rotate"; idx: number; sx: number; sy: number; orig: Slot; cx?: number; cy?: number } | null>(null);

  const page = pages[pi];
  const pageRatio = usePageRatio(page?.image);
  const slots = page?.slots || [];
  const setSlots = (fn: (s: Slot[]) => Slot[]) => setPages(ps => ps.map((p, i) => i === pi ? { ...p, slots: fn(p.slots) } : p));

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d || !boxRef.current) return;
      const r = boxRef.current.getBoundingClientRect();
      if (d.mode === "rotate") {
        const ang = Math.atan2(e.clientY - (d.cy || 0), e.clientX - (d.cx || 0)) * 180 / Math.PI + 90;
        const snapped = e.shiftKey ? Math.round(ang / 15) * 15 : Math.round(ang);
        setSlots(ss => ss.map((s, i) => i === d.idx ? { ...s, rot: snapped } : s));
        return;
      }
      const dxp = ((e.clientX - d.sx) / r.width) * 100, dyp = ((e.clientY - d.sy) / r.height) * 100;
      setSlots(ss => ss.map((s, i) => {
        if (i !== d.idx) return s;
        if (d.mode === "move") return { ...s, x: +clamp(d.orig.x + dxp, 0, 100 - d.orig.w).toFixed(1), y: +clamp(d.orig.y + dyp, 0, 100 - d.orig.h).toFixed(1) };
        return { ...s, w: +clamp(d.orig.w + dxp, 3, 100 - d.orig.x).toFixed(1), h: +clamp(d.orig.h + dyp, 3, 100 - d.orig.y).toFixed(1) };
      }));
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pi]);

  const addSlot = (shape: "rect" | "circle") => { setSlots(ss => [...ss, { x: 35, y: 35, w: 30, h: 30, shape, rot: 0 }]); setSel(slots.length); };
  const delSlot = (i: number) => { setSlots(ss => ss.filter((_, j) => j !== i)); setSel(null); };
  const moveLayer = (i: number, dir: -1 | 1) => setSlots(ss => { const a = [...ss]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; setSel(j); return a; });
  const startRotate = (e: React.PointerEvent, i: number, s: Slot) => {
    e.stopPropagation();
    const r = boxRef.current!.getBoundingClientRect();
    const cx = r.left + ((s.x + s.w / 2) / 100) * r.width, cy = r.top + ((s.y + s.h / 2) / 100) * r.height;
    drag.current = { mode: "rotate", idx: i, sx: 0, sy: 0, orig: { ...s }, cx, cy };
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateTemplate(template.id, { pages });
      clearApiCache(); // khung mới có hiệu lực NGAY ở mọi trang (kho mẫu, thiết kế, preview)
      onSaved(updated); onClose();
    } catch (e: any) { alert("Lưu lỗi: " + (e?.message || "")); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.6)" }}>
      <div className="bg-paper rounded-2xl w-full max-w-[1280px] max-h-[94vh] flex flex-col overflow-hidden border border-line">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-line bg-white">
          <div>
            <div className="font-serif text-lg text-ink font-bold">Chỉnh khung ảnh — {template.title}</div>
            <div className="font-sans text-xs text-sub">Kéo để di chuyển · kéo góc để đổi cỡ · cho phép chồng lớp</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu
            </button>
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-cream"><X size={16} className="text-ink" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid md:grid-cols-[1fr_230px] gap-4">
          {/* Vùng vẽ */}
          <div>
            {/* chọn trang */}
            {pages.length > 1 && (
              pages.length > 10 ? (
                <select value={pi} onChange={(e) => { setPi(+e.target.value); setSel(null); }} className="font-sans text-xs px-3 py-1.5 rounded-full border border-line mb-2 outline-none">
                  {pages.map((_, i) => <option key={i} value={i}>Trang {i + 1}</option>)}
                </select>
              ) : (
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {pages.map((_, i) => (
                    <button key={i} onClick={() => { setPi(i); setSel(null); }} className={`font-sans text-xs px-2.5 py-1 rounded-full border ${pi === i ? "bg-ink text-paper border-ink" : "border-line text-ink"}`}>Trang {i + 1}</button>
                  ))}
                </div>
              )
            )}
            {/* VÙNG ĐỆM quanh ảnh: ô sát mép vẫn lộ tay cầm xoay/đổi cỡ ra ngoài để thao tác dễ */}
            <div className="bg-cream/60 rounded-xl border border-line relative" style={{ padding: 44 }}>
              {pages.length > 1 && <>
                <button onClick={() => { setPi(Math.max(0, pi - 1)); setSel(null); }} aria-label="Trang trước" className="mm-flipnav" style={{ left: 6, opacity: pi === 0 ? 0.3 : 1, pointerEvents: pi === 0 ? "none" : "auto" }}><ChevronLeft size={18} /></button>
                <button onClick={() => { setPi(Math.min(pages.length - 1, pi + 1)); setSel(null); }} aria-label="Trang sau" className="mm-flipnav" style={{ right: 6, opacity: pi === pages.length - 1 ? 0.3 : 1, pointerEvents: pi === pages.length - 1 ? "none" : "auto" }}><ChevronRight size={18} /></button>
              </>}
              <div style={{ width: "70%", margin: "0 auto" }}>
              <div ref={boxRef} className="relative w-full select-none" style={{ aspectRatio: pageRatio, touchAction: "none", overflow: "visible" }} onPointerDown={() => setSel(null)}>
                {page?.image && <img src={page.image} className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-md border border-line bg-white" draggable={false} />}
              {slots.map((s, i) => (
                <div key={i}
                  onPointerDown={(e) => { e.stopPropagation(); setSel(i); drag.current = { mode: "move", idx: i, sx: e.clientX, sy: e.clientY, orig: { ...s } }; }}
                  className="absolute"
                  style={{ left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: 4, border: `2px solid ${sel === i ? "#B08D57" : "rgba(176,141,87,.7)"}`, background: sel === i ? "rgba(176,141,87,.18)" : "rgba(176,141,87,.08)", cursor: "move", boxShadow: sel === i ? "0 0 0 2px rgba(176,141,87,.3)" : "none", transform: `rotate(${s.rot || 0}deg)` }}>
                  <span className="absolute top-0.5 left-1 font-sans text-[10px] font-bold text-brass bg-white/70 rounded px-1">{i + 1}{s.rot ? ` · ${s.rot}°` : ""}</span>
                  {sel === i && (
                    <>
                      <div onPointerDown={(e) => { e.stopPropagation(); drag.current = { mode: "resize", idx: i, sx: e.clientX, sy: e.clientY, orig: { ...s } }; }}
                        className="absolute bg-brass rounded-full" style={{ right: -7, bottom: -7, width: 14, height: 14, cursor: "nwse-resize", border: "2px solid #fff" }} />
                      {/* tay cầm XOAY (kéo để xoay; giữ Shift để bắt 15°) */}
                      <div onPointerDown={(e) => startRotate(e, i, s)} title="Kéo để xoay (giữ Shift: 15°)"
                        className="absolute bg-white rounded-full grid place-items-center" style={{ top: -30, left: "50%", transform: "translateX(-50%)", width: 18, height: 18, cursor: "grab", border: "2px solid #B08D57" }}>
                        <RotateCw size={11} className="text-brass" />
                      </div>
                      <div className="absolute" style={{ top: -14, left: "50%", width: 2, height: 14, background: "#B08D57", transform: "translateX(-50%)" }} />
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => delSlot(i)} className="absolute bg-[#B05A4A] rounded-full grid place-items-center" style={{ top: -9, right: -9, width: 18, height: 18 }}><X size={11} color="#fff" /></button>
                    </>
                  )}
                </div>
              ))}
              </div>
              </div>
              <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 8 }} className="font-sans">{pi + 1} / {pages.length}</p>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => addSlot("rect")} className="mm-btn flex items-center gap-1.5 border border-ink text-ink rounded-full px-3.5 py-2 font-sans text-[13px] font-semibold"><Square size={14} /> Thêm khung</button>
            </div>
          </div>

          {/* Danh sách khung (lớp) */}
          <div className="border border-line rounded-xl p-3 h-fit">
            <div className="font-sans text-xs text-sub mb-2">Các khung ({slots.length}) · trên = lớp dưới cùng</div>
            {slots.length === 0 && <div className="font-sans text-xs text-sub py-4 text-center">Chưa có khung. Bấm “Thêm khung”.</div>}
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => (
                <div key={i} onClick={() => setSel(i)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer ${sel === i ? "bg-cream" : "hover:bg-cream/50"}`}>
                  <Square size={14} className="text-brass shrink-0" />
                  <span className="font-sans text-xs text-ink flex-1">Khung {i + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(i, -1); }} title="Xuống dưới" className="p-1 hover:bg-cream rounded"><ChevronUp size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 1); }} title="Lên trên" className="p-1 hover:bg-cream rounded"><ChevronDown size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); delSlot(i); }} className="p-1 hover:bg-cream rounded"><Trash2 size={12} className="text-[#B05A4A]" /></button>
                </div>
              ))}
            </div>
            <p className="font-sans text-[11px] text-sub mt-3 leading-relaxed">Khung nằm dưới trong danh sách sẽ đè lên khung phía trên (chồng lớp). Dùng để làm mẫu 2–3 ảnh đè nhau.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
