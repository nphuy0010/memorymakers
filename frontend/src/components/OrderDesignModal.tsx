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
  const hidden: Record<number, boolean> = L.hidden || {};
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [exporting, setExporting] = useState(false);

  const visible = pages.map((p, i) => ({ p, i })).filter(({ i }) => !hidden[i]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1200, 780] });
      let first = true;
      for (let k = 0; k < visible.length; k++) {
        const el = refs.current[k];
        if (!el) continue;
        const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: "#ffffff", logging: false });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (!first) pdf.addPage([1200, 780], "landscape");
        first = false;
        pdf.addImage(img, "JPEG", 0, 0, 1200, 780);
      }
      pdf.save(`memory-makers-${order.customer || "don"}-${order.id.slice(0, 6)}.pdf`);
    } catch (e: any) {
      alert("Xuất PDF lỗi: " + (e?.message || "") + "\n(Ảnh mẫu cần cho phép CORS — dùng Cloudinary là ổn.)");
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
                    <div key={s.g} className="absolute overflow-hidden" style={{ left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: s.shape === "circle" ? "50%" : 4 }}>
                      {img && <img src={img} crossOrigin="anonymous" style={imgStyle(edits[s.g])} />}
                    </div>
                  );
                })}
                {(texts[i] || []).map((tx) => (
                  <div key={tx.id} className="absolute" style={{ left: tx.x + "%", top: tx.y + "%", transform: "translate(-50%,-50%)", fontFamily: tx.font === "sans" ? "var(--font-sans,sans-serif)" : "Lora,serif", fontSize: `${(tx.size || 20) * 0.5}px`, color: tx.color, fontWeight: 600, whiteSpace: "pre" }}>{tx.text}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
