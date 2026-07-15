"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Wand2, ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Plus, Trash2, ShieldCheck, Image as ImageIcon, Lock, Unlock } from "lucide-react";
import type { Template, Slot } from "@/lib/types";
import { buildPages, imgStyle, type Edit, type TextItem, type StickerItem, type BuiltPage } from "@/lib/pages";
import { detectFocus } from "@/lib/face";
import { usePageRatio } from "@/lib/usePageRatio";
import FontLoader, { FONT_GROUPS, fontCss } from "@/components/FontLoader";
import { api } from "@/lib/api";

const C = { ink: "#2A2520", sub: "#6B6258", brass: "#B08D57", line: "#E5DCCF", cream: "#EFE7DA", blushDeep: "#D9A99E" };

// Nén ảnh người dùng -> dataURL JPEG gọn (tránh payload quá lớn khi lưu dự án)
function compressImage(file: File, max = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d"); if (!ctx) return resolve(r.result as string);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL("image/jpeg", quality)); } catch { resolve(r.result as string); }
      };
      img.onerror = () => resolve(r.result as string);
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}

/* Trang tương tác: nền ảnh thật + khung (chèn/kéo ra) + text di chuyển được */
function PageCanvas({ page, assignments, edits, onSlot, selected, editSlot, onAdjust, texts, onTextMove, onTextSelect, selText, onPhotoDragStart, onPhotoDragEnd, stickers, onStickerMove, onStickerSelect, selStk }: {
  page: BuiltPage; assignments: (string | undefined)[]; edits: Record<number, Edit>;
  onSlot?: (g: number, payload?: any) => void; selected?: number | null; editSlot?: number | null;
  onAdjust?: (g: number, patch: Edit) => void; texts?: TextItem[]; onTextMove?: (id: string, patch: any) => void;
  onTextSelect?: (id: string) => void; selText?: string | null;
  stickers?: StickerItem[]; onStickerMove?: (id: string, patch: any) => void; onStickerSelect?: (id: string) => void; selStk?: string | null;
  onPhotoDragStart?: (g: number) => void; onPhotoDragEnd?: (g: number) => void;
}) {
  const pageRatio = usePageRatio(page?.image);
  const draggedRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // CTRL + CHUỘT trên trang -> LUÔN tác động Ô ĐANG CHỌN (cùng cơ chế cho cả zoom lẫn kéo,
  // không phụ thuộc chuột trúng div nào -> hết lỗi kéo nhầm ô khi khung chồng/xoay)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onAdjust) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey || editSlot == null || !assignments?.[editSlot]) return;
      e.preventDefault();
      const cur = edits?.[editSlot]?.scale ?? 1;
      onAdjust(editSlot, { scale: Math.min(2.5, Math.max(1, +(cur + (e.deltaY < 0 ? 0.06 : -0.06)).toFixed(2))) });
    };
    const down = (e: PointerEvent) => {
      if (!e.ctrlKey || e.button !== 0 || editSlot == null || !assignments?.[editSlot]) return;
      e.preventDefault(); e.stopPropagation();
      const g = editSlot;
      const cur = edits?.[g] || {};
      const sx = e.clientX, sy = e.clientY, ox = cur.ox ?? 50, oy = cur.oy ?? 38;
      let moved = false;
      const slot: any = page.slots.find((x: any) => x.g === g);
      const rect = el.getBoundingClientRect();
      const sw = slot ? (rect.width * slot.w) / 100 : 300, sh = slot ? (rect.height * slot.h) / 100 : 200;
      const sc = Math.max(1, cur.scale ?? 1);
      const kx = sc > 1.02 ? Math.min(2, 100 / (sw * (sc - 1))) : 0.25;
      const ky = sc > 1.02 ? Math.min(2, 100 / (sh * (sc - 1))) : 0.25;
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        onAdjust(g, { ox: Math.min(100, Math.max(0, ox - dx * kx)), oy: Math.min(100, Math.max(0, oy - dy * ky)) });
      };
      const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); if (moved) draggedRef.current = Date.now(); };
      document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("pointerdown", down);
    return () => { el.removeEventListener("wheel", wheel); el.removeEventListener("pointerdown", down); };
  }, [editSlot, edits, onAdjust, assignments, page]);

  const startStickerDrag = (st: StickerItem, ev: React.PointerEvent) => {
    if (!onStickerMove) return; ev.stopPropagation(); ev.preventDefault();
    onStickerSelect && onStickerSelect(st.id);
    const rect = rootRef.current!.getBoundingClientRect();
    const move = (e: PointerEvent) => { const x = ((e.clientX - rect.left) / rect.width) * 100, y = ((e.clientY - rect.top) / rect.height) * 100; onStickerMove(st.id, { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) }); };
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  };
  const startTextDrag = (tx: TextItem, ev: React.PointerEvent) => {
    if (!onTextMove) return; ev.stopPropagation();
    const rect = rootRef.current!.getBoundingClientRect();
    const move = (e: PointerEvent) => { const x = ((e.clientX - rect.left) / rect.width) * 100, y = ((e.clientY - rect.top) / rect.height) * 100; onTextMove(tx.id, { x: Math.max(2, Math.min(98, x)), y: Math.max(3, Math.min(97, y)) }); };
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  };
  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%", aspectRatio: pageRatio, borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 10px 30px rgba(42,37,32,.14)" }}>
      {page.image && <img src={page.image} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />}
      {page.slots.map((s) => {
        const img = assignments?.[s.g]; const sel = selected === s.g; const editable = editSlot === s.g && !!img && !!onAdjust; const round = false; /* chỉ dùng khung chữ nhật */
        const canDragOut = !!onSlot && !!img && !sel;
        return (
          <div key={s.g}
            onClick={onSlot ? () => { if (Date.now() - draggedRef.current < 200) return; onSlot(s.g); } : undefined}
            title={editable ? "Giữ Ctrl + lăn chuột: phóng to · Giữ Ctrl + kéo: di chuyển ảnh" : undefined}
            onDragOver={onSlot ? (e) => e.preventDefault() : undefined}
            onDrop={onSlot ? (e) => { e.preventDefault(); const u = e.dataTransfer.getData("text/mm"); const fr = e.dataTransfer.getData("text/mm-from"); if (u) onSlot(s.g, u); else if (fr !== "") onSlot(s.g, { move: +fr }); } : undefined}
            style={{ position: "absolute", left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: round ? "50%" : 3, overflow: "hidden", cursor: editable ? "move" : (onSlot ? "pointer" : "default"), border: sel ? `3px solid ${C.brass}` : img ? "none" : `2px dashed rgba(176,141,87,.9)`, background: img ? "transparent" : "rgba(255,255,255,.14)", display: "grid", placeItems: "center", boxShadow: sel ? "0 0 0 3px rgba(176,141,87,.3)" : "none", zIndex: 3, transform: `rotate(${(s as any).rot || 0}deg)` }}>
            {img
              ? <img src={img} draggable={canDragOut && !editable} onDragStart={canDragOut && !editable ? (e) => { if (e.ctrlKey) { e.preventDefault(); return; } e.dataTransfer.setData("text/mm-from", String(s.g)); onPhotoDragStart && onPhotoDragStart(s.g); } : undefined} onDragEnd={canDragOut && !editable ? () => onPhotoDragEnd && onPhotoDragEnd(s.g) : undefined} style={imgStyle(edits?.[s.g])} />
              : <div style={{ textAlign: "center", color: C.brass, fontFamily: "var(--font-sans,sans-serif)", fontSize: 11 }}><ImageIcon size={16} /><div>Chèn ảnh</div></div>}
          </div>
        );
      })}
      {(texts || []).map((tx) => (
        <div key={tx.id} onPointerDown={onTextMove ? (e) => startTextDrag(tx, e) : undefined} onClick={onTextSelect ? (e) => { e.stopPropagation(); onTextSelect(tx.id); } : undefined}
          style={{ position: "absolute", left: tx.x + "%", top: tx.y + "%", transform: "translate(-50%,-50%)", fontFamily: fontCss(tx.font), fontSize: tx.size || 20, color: tx.color || C.ink, fontWeight: 600, whiteSpace: "pre", textAlign: "center", cursor: onTextMove ? "move" : "default", userSelect: "none", zIndex: 6, padding: "2px 6px", borderRadius: 5, border: selText === tx.id ? `1.5px dashed ${C.brass}` : "1.5px solid transparent", textShadow: "0 1px 3px rgba(255,255,255,.45)" }}>{tx.text || "Nhập chữ"}</div>
      ))}
      {/* STICKER: khách decor tự do — kéo di chuyển, chọn để đổi cỡ/xoay/xóa */}
      {(stickers || []).map((st) => (
        <img key={st.id} src={st.url} draggable={false}
          onPointerDown={onStickerMove ? (e) => startStickerDrag(st, e) : undefined}
          onClick={onStickerSelect ? (e) => { e.stopPropagation(); onStickerSelect(st.id); } : undefined}
          style={{ position: "absolute", left: st.x + "%", top: st.y + "%", width: st.w + "%", transform: `translate(-50%,-50%) rotate(${st.rot || 0}deg)`, zIndex: 7, cursor: onStickerMove ? "move" : "default", userSelect: "none", outline: selStk === st.id ? `2px dashed ${C.brass}` : "none", outlineOffset: 2, borderRadius: 4 }} />
      ))}
    </div>
  );
}

/* Thumbnail trang NHẸ cho thanh trái (chỉ ảnh + ô đã điền, không tương tác) — memo để không render lại toàn bộ khi đổi 1 ô */
const MiniPage = React.memo(function MiniPage({ page, urls, edits, texts }: { page: BuiltPage; urls: (string | undefined)[]; edits: Record<number, Edit>; texts: TextItem[] }) {
  const pageRatio = usePageRatio(page?.image);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: pageRatio, borderRadius: 8, overflow: "hidden", background: "#fff", pointerEvents: "none" }}>
      {page.image && <img src={page.image} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />}
      {page.slots.map((s, k) => {
        const img = urls[k];
        return <div key={s.g} style={{ position: "absolute", left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: 2, overflow: "hidden", background: img ? "transparent" : "rgba(176,141,87,.18)", transform: `rotate(${(s as any).rot || 0}deg)` }}>
          {img && <img src={img} loading="lazy" decoding="async" style={imgStyle(edits?.[s.g])} />}
        </div>;
      })}
      {texts.map((tx) => <div key={tx.id} style={{ position: "absolute", left: tx.x + "%", top: tx.y + "%", transform: "translate(-50%,-50%)", fontFamily: fontCss(tx.font), fontSize: (tx.size || 20) * 0.34, color: tx.color, fontWeight: 600, whiteSpace: "pre" }}>{tx.text}</div>)}
    </div>
  );
}, (a, b) =>
  a.page.image === b.page.image &&
  a.urls.join("|") === b.urls.join("|") &&
  JSON.stringify(a.texts) === JSON.stringify(b.texts) &&
  a.page.slots.every((s) => JSON.stringify(a.edits[s.g]) === JSON.stringify(b.edits[s.g]))
);

export default function Builder({ t, photos, setPhotos, assignments, setAssignments, edits, setEdits, hidden, setHidden, locked, setLocked, texts, setTexts, stickers, setStickers }: {
  t: Template; photos: string[]; setPhotos: (f: (p: string[]) => string[]) => void;
  assignments: (string | undefined)[]; setAssignments: (f: (a: (string | undefined)[]) => (string | undefined)[]) => void;
  edits: Record<number, Edit>; setEdits: (f: (e: Record<number, Edit>) => Record<number, Edit>) => void;
  hidden: Record<number, boolean>; setHidden: (f: (h: Record<number, boolean>) => Record<number, boolean>) => void;
  locked?: Record<number, boolean>; setLocked?: (f: (h: Record<number, boolean>) => Record<number, boolean>) => void;
  texts: Record<number, TextItem[]>; setTexts: (f: (x: Record<number, TextItem[]>) => Record<number, TextItem[]>) => void;
  stickers: Record<number, StickerItem[]>; setStickers: (f: (x: Record<number, StickerItem[]>) => Record<number, StickerItem[]>) => void;
}) {
  const pages = useMemo(() => buildPages(t), [t]);
  const [pageIdx, setPageIdx] = useState(0);
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [selText, setSelText] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragInfo = useRef<{ from: number; landed: boolean } | null>(null);
  const pageTexts = (texts && texts[pageIdx]) || [];
  const pageHidden = !!(hidden && hidden[pageIdx]);

  // Ảnh khách: nén -> UPLOAD lên server lấy URL (KHÔNG lưu base64 vào DB — nhẹ & nhanh).
  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(async (f) => {
      try {
        const dataUrl = await compressImage(f);
        const [head, b64] = dataUrl.split(",");
        const mime = (head.match(/data:(.*?);/) || [])[1] || "image/jpeg";
        const bin = atob(b64); const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const { url } = await api.uploadFile(new File([arr], "photo.jpg", { type: mime }));
        setPhotos((p) => [...p, url]);
      } catch (err: any) {
        const hint = err?.status === 403
          ? "\n→ Backend đang chạy BẢN CŨ (chưa cho khách upload). Hãy deploy lại backend (push code + chờ Render build)."
          : err?.status === 401
            ? "\n→ Phiên đăng nhập hết hạn — hãy đăng nhập lại."
            : "\n→ Kiểm tra mạng/backend rồi thử lại.";
        alert("Tải ảnh lỗi: " + (err?.message || "") + hint);
      }
    });
  };
  // DÒ MẶT XONG mới điền ảnh -> điểm crop giữ mặt được đặt ngay từ đầu, ảnh không bị "nhảy"
  const assign = async (g: number, url: string) => {
    const f = await detectFocus(url).catch(() => null);
    setAssignments((a) => { const n = [...a]; n[g] = url; return n; });
    if (f) setEdits((e) => (e[g]?.ox !== undefined ? e : { ...e, [g]: { ...e[g], ox: f.ox, oy: f.oy } }));
  };
  const clearSlot = (g: number) => { setAssignments((a) => { const n = [...a]; n[g] = undefined; return n; }); setEdits((e) => { const n = { ...e }; delete n[g]; return n; }); };
  const onSlot = (g: number, payload?: any) => {
    if (payload && typeof payload === "object" && "move" in payload) { const from = payload.move; if (from === g) return; setAssignments((a) => { const n = [...a]; n[g] = a[from]; n[from] = undefined; return n; }); setEdits((e) => { const n = { ...e }; if (e[from]) n[g] = e[from]; delete n[from]; return n; }); if (dragInfo.current) dragInfo.current.landed = true; setSelSlot(null); return; }
    if (typeof payload === "string") return assign(g, payload);
    setSelText(null); setSelSlot((s) => (s === g ? null : g));
  };
  const clickPhoto = (url: string) => { if (selSlot != null) assign(selSlot, url); };
  const setEdit = (g: number, patch: Edit) => setEdits((e) => ({ ...e, [g]: { ...(e[g] || {}), ...patch } }));
  const resetEdit = (g: number) => setEdits((e) => { const n = { ...e }; delete n[g]; return n; });
  const onPhotoDragStart = (g: number) => { dragInfo.current = { from: g, landed: false }; setSelSlot(null); };
  const onPhotoDragEnd = () => { if (dragInfo.current && !dragInfo.current.landed) clearSlot(dragInfo.current.from); dragInfo.current = null; };

  const visibleGs = useMemo(() => pages.filter((_, i) => !(hidden && hidden[i])).flatMap((p) => p.slots.map((s) => s.g)), [pages, hidden]);
  // Tự động điền: mỗi lần bấm XÁO + ĐIỀN LẠI TẤT CẢ Ô (kể cả ô đã có ảnh) — bấm lại để đổi cách xếp
  const autoFill = async () => {
    if (!photos.length) return;
    setFilling(true);
    try {
      // XÁO ảnh (Fisher–Yates) — không điền theo thứ tự upload
      const shuffled = [...photos];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      const plan: Record<number, string> = {};
      let pi = 0;
      // KHÔNG xáo trang bị KHÓA (và trang ẩn) — trang admin/khách đã chỉnh ưng ý giữ nguyên
      const fillableGs = pages.filter((_, i) => !(hidden && hidden[i]) && !(locked && locked[i])).flatMap((p) => p.slots.map((x) => x.g));
      for (const g of fillableGs) { plan[g] = shuffled[pi % shuffled.length]; pi++; }
      const focus: Record<number, { ox: number; oy: number }> = {};
      await Promise.all(Object.entries(plan).map(async ([g, url]) => { try { focus[+g] = await detectFocus(url); } catch {} }));
      setAssignments((a) => { const n = [...a]; for (const g in plan) n[+g] = plan[+g]; return n; });
      // ảnh MỚI -> đặt lại điểm nhìn theo khuôn mặt + reset zoom (edit cũ của ảnh cũ không còn phù hợp)
      setEdits((e) => { const n = { ...e }; for (const g in plan) n[+g] = { ...(focus[+g] || { ox: 50, oy: 38 }), scale: 1 }; return n; });
    } finally { setFilling(false); }
  };

  const [selStk, setSelStk] = useState<string | null>(null);
  const [stkLib, setStkLib] = useState<string[]>([]);
  useEffect(() => { api.getStickers().then(setStkLib).catch(() => {}); }, []);
  const pageStickers = (stickers && stickers[pageIdx]) || [];
  const addSticker = (url: string) => { const id = "st" + Date.now(); setStickers((x) => ({ ...x, [pageIdx]: [...((x && x[pageIdx]) || []), { id, url, x: 50, y: 50, w: 16, rot: 0 }] })); setSelStk(id); setSelText(null); setSelSlot(null); };
  const updateSticker = (id: string, patch: any) => setStickers((x) => ({ ...x, [pageIdx]: ((x && x[pageIdx]) || []).map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeSticker = (id: string) => { setStickers((x) => ({ ...x, [pageIdx]: ((x && x[pageIdx]) || []).filter((i) => i.id !== id) })); setSelStk(null); };
  const curStk = pageStickers.find((x) => x.id === selStk);

  const addText = () => { const id = "tx" + Date.now(); setTexts((x) => ({ ...x, [pageIdx]: [...((x && x[pageIdx]) || []), { id, text: "Nhập chữ", x: 50, y: 50, size: 24, color: "#2A2520", font: "serif" }] })); setSelText(id); setSelSlot(null); };
  const updateText = (id: string, patch: any) => setTexts((x) => ({ ...x, [pageIdx]: ((x && x[pageIdx]) || []).map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeText = (id: string) => { setTexts((x) => ({ ...x, [pageIdx]: ((x && x[pageIdx]) || []).filter((i) => i.id !== id) })); setSelText(null); };
  const curText = pageTexts.find((x) => x.id === selText);
  const toggleHide = (idx: number) => setHidden((h) => ({ ...h, [idx]: !(h && h[idx]) }));
  const toggleLock = (idx: number) => setLocked && setLocked((h) => ({ ...h, [idx]: !(h && h[idx]) }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || ""; if (/INPUT|TEXTAREA/.test(tag)) return;
      if (e.key === "Delete" || e.key === "Backspace") { if (selStk != null) { removeSticker(selStk); e.preventDefault(); } else if (selText != null) { removeText(selText); e.preventDefault(); } else if (selSlot != null && assignments[selSlot]) { clearSlot(selSlot); e.preventDefault(); } }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selText, selSlot, assignments]);

  const filled = visibleGs.filter((g) => assignments[g]).length;
  const cur = selSlot != null ? edits[selSlot] || {} : null;
  const editable = selSlot != null && !!assignments[selSlot];
  const idxLabel = (i: number, n: number) => (i === 0 ? "Bìa trước" : i === n - 1 ? "Bìa sau" : `Trang ${i + 1}/${n}`);
  const arrow = (dis: boolean): React.CSSProperties => ({ width: 34, height: 34, borderRadius: "50%", background: "#fff", border: `1px solid ${C.line}`, display: "grid", placeItems: "center", cursor: dis ? "default" : "pointer", opacity: dis ? .4 : 1 });

  return (
    <div className="mm-builder" style={{ alignItems: "start" }}>
      <FontLoader />
      <style>{`@keyframes mmspin{to{transform:rotate(360deg)}}`}</style>
      {/* LEFT: trang + ẩn/hiện */}
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 10 }}>
        <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.sub, fontWeight: 700, marginBottom: 10 }}>Các trang</div>
        <div className="mm-pages">
          {pages.map((pg, idx) => {
            const hid = !!(hidden && hidden[idx]);
            const lck = !!(locked && locked[idx]);
            return (
              <div key={idx} style={{ position: "relative" }}>
                <button onClick={() => { setPageIdx(idx); setSelSlot(null); setSelText(null); }} style={{ width: "100%", border: `2px solid ${idx === pageIdx ? C.brass : C.line}`, borderRadius: 10, padding: 4, background: "none", cursor: "pointer", opacity: hid ? 0.45 : 1 }}>
                  <div><MiniPage page={pg} urls={pg.slots.map((s) => assignments[s.g])} edits={edits} texts={(texts && texts[idx]) || []} /></div>
                  <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 10.5, color: C.sub, marginTop: 4 }}>{idx === 0 ? "Bìa trước" : idx === pages.length - 1 ? "Bìa sau" : `Trang ${idx + 1}`}</div>
                </button>
                <button onClick={() => toggleHide(idx)} title={hid ? "Hiện trang (trang ẩn sẽ KHÔNG in)" : "Ẩn trang này khi in"} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer", background: hid ? "#B05A4A" : "rgba(42,37,32,.6)", display: "grid", placeItems: "center" }}>{hid ? <EyeOff size={13} color="#fff" /> : <Eye size={13} color="#fff" />}</button>
                {setLocked && <button onClick={() => toggleLock(idx)} title={lck ? "Mở khóa (AI được xáo lại trang này)" : "Khóa trang — AI tự điền sẽ KHÔNG xáo lại"} style={{ position: "absolute", top: 6, right: 34, width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer", background: lck ? "#B08D57" : "rgba(42,37,32,.6)", display: "grid", placeItems: "center" }}>{lck ? <Lock size={12} color="#fff" /> : <Unlock size={12} color="#fff" />}</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button onClick={() => setPageIdx((i) => Math.max(0, i - 1))} disabled={pageIdx === 0} style={arrow(pageIdx === 0)}><ChevronLeft size={16} color={C.ink} /></button>
          <input type="range" min={0} max={pages.length - 1} value={pageIdx} onChange={(e) => { setPageIdx(+e.target.value); setSelSlot(null); setSelText(null); }} style={{ flex: 1, accentColor: C.brass }} />
          <button onClick={() => setPageIdx((i) => Math.min(pages.length - 1, i + 1))} disabled={pageIdx === pages.length - 1} style={arrow(pageIdx === pages.length - 1)}><ChevronRight size={16} color={C.ink} /></button>
          <span style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12.5, color: C.sub, minWidth: 96, textAlign: "right" }}>{idxLabel(pageIdx, pages.length)}</span>
        </div>
        {pageHidden && <div style={{ background: "#FBEEE7", border: "1px solid #E8C2B0", borderRadius: 10, padding: "8px 12px", fontFamily: "var(--font-sans,sans-serif)", fontSize: 12.5, color: "#9A4E26", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span><EyeOff size={13} style={{ verticalAlign: -2 }} /> Trang này đang ẩn — sẽ không xuất hiện khi xem/đặt in.</span><button onClick={() => toggleHide(pageIdx)} style={{ background: "none", border: "none", color: C.brass, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Hiện lại</button></div>}
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
          {filling
            ? <div style={{ aspectRatio: "3/2", display: "grid", placeItems: "center" }}><div style={{ width: 44, height: 44, border: `4px solid ${C.cream}`, borderTopColor: C.brass, borderRadius: "50%", animation: "mmspin 1s linear infinite" }} /></div>
            : <PageCanvas page={pages[pageIdx]} assignments={assignments} edits={edits} onSlot={onSlot} selected={selSlot} editSlot={editable ? selSlot : null} onAdjust={setEdit} texts={pageTexts} onTextMove={updateText} onTextSelect={(id) => { setSelText(id); setSelSlot(null); setSelStk(null); }} selText={selText} stickers={pageStickers} onStickerMove={updateSticker} onStickerSelect={(id) => { setSelStk(id); setSelText(null); setSelSlot(null); }} selStk={selStk} onPhotoDragStart={onPhotoDragStart} onPhotoDragEnd={onPhotoDragEnd} />}
        </div>
        <p style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12.5, color: C.sub, marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}><ShieldCheck size={13} color={C.brass} /> Bấm khung để chọn ảnh/chỉnh sửa · kéo ảnh ra ngoài khung hoặc nhấn <b>Delete</b> để gỡ ảnh.</p>
        {/* TEXT */}
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12, fontWeight: 700, color: C.ink, display: "flex", gap: 6, alignItems: "center" }}><Pencil size={13} color={C.brass} /> Chữ trên trang</span>
            <button onClick={addText} style={{ background: C.brass, color: "#fff", border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}><Plus size={14} /> Thêm text</button>
          </div>
          {curText ? (
            <div style={{ marginTop: 12 }}>
              <input value={curText.text} onChange={(e) => updateText(curText.id, { text: e.target.value })} placeholder="Nhập nội dung…" style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: C.sub }}>Cỡ</span><input type="range" min={12} max={64} value={curText.size} onChange={(e) => updateText(curText.id, { size: +e.target.value })} style={{ accentColor: C.brass }} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: C.sub }}>Màu</span><input type="color" value={curText.color} onChange={(e) => updateText(curText.id, { color: e.target.value })} style={{ width: 30, height: 26, border: "none", background: "none", cursor: "pointer" }} /></div>
                <select value={curText.font || "serif"} onChange={(e) => updateText(curText.id, { font: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff", fontFamily: fontCss(curText.font), outline: "none" }}>
                  <option value="serif" style={{ fontFamily: "Georgia, serif" }}>Mặc định (Serif)</option>
                  <option value="sans" style={{ fontFamily: "sans-serif" }}>Mặc định (Sans)</option>
                  {FONT_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.fonts.map((fo) => (
                        <option key={fo.name} value={fo.name} style={{ fontFamily: `"${fo.name}", sans-serif` }}>
                          {fo.name}{fo.vi ? "" : " (không hỗ trợ tiếng Việt)"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button onClick={() => removeText(curText.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#B05A4A", fontSize: 12.5, display: "flex", gap: 4, alignItems: "center" }}><Trash2 size={13} /> Xoá</button>
              </div>
            </div>
          ) : <div style={{ fontSize: 12.5, color: C.sub, marginTop: 8 }}>Bấm “Thêm text” rồi kéo để đặt vị trí. Bấm vào chữ để sửa nội dung/cỡ/màu.</div>}
        </div>

        {/* STICKER: kho do admin cung cấp — bấm để thêm, kéo đặt vị trí, chọn để đổi cỡ/xoay */}
        {stkLib.length > 0 && (
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12, fontWeight: 700, color: C.ink }}>✨ Sticker decor</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginTop: 10, maxHeight: 130, overflowY: "auto" }}>
              {stkLib.map((u, i) => (
                <button key={i} onClick={() => addSticker(u)} title="Thêm vào trang" style={{ background: C.cream, border: `1px solid ${C.line}`, borderRadius: 8, padding: 4, cursor: "pointer", aspectRatio: "1" }}>
                  <img src={u} style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
                </button>
              ))}
            </div>
            {curStk && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: C.sub }}>Cỡ</span><input type="range" min={5} max={50} value={curStk.w} onChange={(e) => updateSticker(curStk.id, { w: +e.target.value })} style={{ accentColor: C.brass }} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: C.sub }}>Xoay</span><input type="range" min={-180} max={180} value={curStk.rot || 0} onChange={(e) => updateSticker(curStk.id, { rot: +e.target.value })} style={{ accentColor: C.brass }} /></div>
                <button onClick={() => removeSticker(curStk.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#B05A4A", fontSize: 12.5, display: "flex", gap: 4, alignItems: "center" }}><Trash2 size={13} /> Xoá</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
        <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: C.sub, fontWeight: 700, marginBottom: 10 }}>Ảnh của bạn</div>
        <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${C.blushDeep}`, borderRadius: 12, padding: 16, textAlign: "center", cursor: "pointer", background: C.cream }}>
          <Upload size={18} color={C.brass} /><div style={{ fontSize: 12.5, color: C.ink, marginTop: 6 }}>Tải ảnh lên</div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display: "none" }} />
        </div>
        <button onClick={autoFill} disabled={!photos.length} style={{ width: "100%", marginTop: 10, background: C.brass, color: "#fff", border: "none", borderRadius: 999, padding: "11px", fontWeight: 600, cursor: photos.length ? "pointer" : "not-allowed", opacity: photos.length ? 1 : .5, display: "inline-flex", gap: 8, justifyContent: "center", alignItems: "center" }}><Wand2 size={16} /> Tự động điền (AI)</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
          {photos.map((p, i) => (
            <div key={i} draggable onDragStart={(e) => e.dataTransfer.setData("text/mm", p)} onClick={() => clickPhoto(p)} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: selSlot != null ? "copy" : "grab", border: `1px solid ${C.line}` }}>
              <img src={p} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: C.sub, textAlign: "center" }}>Đã điền {filled}/{visibleGs.length} khung (trang hiển thị)</div>
        {editable && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, display: "flex", gap: 6, alignItems: "center" }}><Pencil size={13} color={C.brass} /> Chỉnh ảnh</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => clearSlot(selSlot!)} style={{ background: "none", border: "none", cursor: "pointer", color: "#B05A4A", fontSize: 11.5, display: "flex", gap: 3, alignItems: "center" }}><Trash2 size={12} /> Gỡ</button>
                <button onClick={() => resetEdit(selSlot!)} style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, fontSize: 11.5 }}>Đặt lại</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
