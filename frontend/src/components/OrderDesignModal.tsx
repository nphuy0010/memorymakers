"use client";
import { useRef, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { buildPages, imgStyle, type Edit, type TextItem } from "@/lib/pages";

// Xem lại mẫu KHÁCH đã đặt (ảnh đã ghép vào khung) + xuất PDF để đem in
export default function OrderDesignModal({ order, onClose }: { order: any; onClose: () => void }) {
  const pages = buildPages({ pages: order.pages || [] } as any);
  const L = order.layout || {};
  const assignments: (string | undefined)[] = L.assignments || [];
  const edits: Record<number, Edit> = L.edits || {};
  const texts: Record<number, TextItem[]> = L.texts || {};
  const stickersMap: Record<number, any[]> = L.stickers || {};
  const hidden: Record<number, boolean> = L.hidden || {};
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [exporting, setExporting] = useState(false);

  const visible = pages.map((p, i) => ({ p, i })).filter(({ i }) => !hidden[i]);

  const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number, e?: any) {
    const iw = img.naturalWidth, ih = img.naturalHeight; const sc = Math.max(dw / iw, dh / ih);
    const sw = dw / sc, sh = dh / sc;
    const ox = (e?.ox ?? 50) / 100, oy = (e?.oy ?? 38) / 100; // theo điểm mặt; mặc định lệch lên trên
    const sx = Math.max(0, Math.min(iw - sw, ox * iw - sw / 2));
    const sy = Math.max(0, Math.min(ih - sh, oy * ih - sh / 2));
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  // Vẽ 1 trang ở ĐỘ PHÂN GIẢI GỐC -> không méo, khớp đúng thiết kế
  async function renderPageCanvas(p: any, pageIndex: number): Promise<HTMLCanvasElement> {
    const base = await loadImg(p.image);
    const W = base.naturalWidth || 2000, H = base.naturalHeight || 1300;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.drawImage(base, 0, 0, W, H);
    for (const s of p.slots) {
      const url = assignments[s.g]; if (!url) continue;
      try {
        const ph = await loadImg(url);
        const dx = (s.x / 100) * W, dy = (s.y / 100) * H, dw = (s.w / 100) * W, dh = (s.h / 100) * H;
        const rot = (s as any).rot || 0;
        if (rot) { ctx.save(); ctx.translate(dx + dw / 2, dy + dh / 2); ctx.rotate(rot * Math.PI / 180); drawCover(ctx, ph, -dw / 2, -dh / 2, dw, dh, edits[s.g]); ctx.restore(); }
        else drawCover(ctx, ph, dx, dy, dw, dh, edits[s.g]);
      } catch { /* bỏ ảnh lỗi */ }
    }
    for (const tx of (texts[pageIndex] || [])) {
      ctx.save();
      ctx.fillStyle = tx.color || "#2A2520";
      ctx.font = `600 ${(tx.size || 20) * (W / 1000)}px ${tx.font === "sans" ? "sans-serif" : "Georgia, serif"}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(tx.text, (tx.x / 100) * W, (tx.y / 100) * H);
      ctx.restore();
    }
    // sticker vẽ SAU chữ -> nằm trên (khớp thứ tự lớp trên màn hình)
    for (const st of (stickersMap[pageIndex] || [])) {
      try {
        const im = await loadImg(st.url);
        const dw = (st.w / 100) * W, dh = dw * ((im.naturalHeight || 1) / (im.naturalWidth || 1));
        const cx = (st.x / 100) * W, cy = (st.y / 100) * H;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(((st.rot || 0) * Math.PI) / 180);
        ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh); ctx.restore();
      } catch { /* bỏ sticker lỗi */ }
    }
    return cv;
  }

  const exportPdf = async () => {
    setExporting(true);
    try {
      try { await (document as any).fonts?.ready; } catch {}
      const { default: jsPDF } = await import("jspdf");
      const canvases: HTMLCanvasElement[] = [];
      for (const { p, i } of visible) canvases.push(await renderPageCanvas(p, i));
      if (!canvases.length) { alert("Không có trang để xuất."); return; }
      const first = canvases[0];
      const pdf = new jsPDF({ orientation: first.width >= first.height ? "landscape" : "portrait", unit: "px", format: [first.width, first.height] });
      canvases.forEach((c, k) => {
        if (k > 0) pdf.addPage([c.width, c.height], c.width >= c.height ? "landscape" : "portrait");
        pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, c.width, c.height);
      });
      pdf.save(`memory-makers-${order.customer || "don"}-${order.id.slice(0, 6)}.pdf`);
    } catch (e: any) {
      alert("Xuất PDF lỗi: " + (e?.message || "") + "\n(Ảnh cần cho phép CORS — dùng Cloudinary là ổn.)");
    } finally { setExporting(false); }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[95] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.6)" }}>
      <div onClick={e => e.stopPropagation()} className="bg-paper rounded-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-line bg-white">
          <div>
            <div className="font-serif text-lg text-ink font-bold">Mẫu khách đã đặt</div>
            <div className="font-sans text-xs text-sub">{order.template} · {order.customer} · {order.phone}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPdf} disabled={exporting} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60">
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {exporting ? "Đang xuất…" : "Xuất PDF để in"}
            </button>
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-cream"><X size={16} className="text-ink" /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 flex flex-col gap-4 items-center">
          {visible.length === 0 && <div className="font-sans text-sm text-sub py-10">Đơn này chưa có dữ liệu thiết kế để hiển thị.</div>}
          {visible.map(({ p, i }, k) => (
            <div key={i} className="w-full">
              <div className="font-sans text-xs text-sub mb-1">Trang {k + 1}</div>
              <div ref={(el) => { refs.current[k] = el; }} className="relative w-full rounded-lg overflow-hidden border border-line bg-white" style={{ aspectRatio: "2000 / 1300" }}>
                {p.image && <img src={p.image} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />}
                {p.slots.map((s) => {
                  const img = assignments[s.g];
                  return (
                    <div key={s.g} className="absolute overflow-hidden" style={{ left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: 4 }}>
                      {img && <img src={img} crossOrigin="anonymous" style={imgStyle(edits[s.g])} />}
                    </div>
                  );
                })}
                {(stickersMap[i] || []).map((st: any) => (
                  <img key={st.id} src={st.url} crossOrigin="anonymous" style={{ position: "absolute", left: st.x + "%", top: st.y + "%", width: st.w + "%", transform: `translate(-50%,-50%) rotate(${st.rot || 0}deg)`, zIndex: 7 }} />
                ))}
                {(texts[i] || []).map((tx) => (
                  <div key={tx.id} className="absolute" style={{ left: tx.x + "%", top: tx.y + "%", transform: "translate(-50%,-50%)", fontFamily: tx.font === "sans" ? "var(--font-sans,sans-serif)" : "var(--font-serif), Georgia, serif", fontSize: `${(tx.size || 20) * 0.5}px`, color: tx.color, fontWeight: 600, whiteSpace: "pre" }}>{tx.text}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
