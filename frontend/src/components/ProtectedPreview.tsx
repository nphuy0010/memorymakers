"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, EyeOff } from "lucide-react";
import type { Template } from "@/lib/types";

export default function ProtectedPreview({ t, photos, paid }: { t: Template; photos: string[]; paid: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (paid) return;
    const hide = () => setHidden(true);
    const show = () => setHidden(false);
    const onVis = () => setHidden(document.hidden);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey)) {
        setFlash(true); setHidden(true);
        try { navigator.clipboard?.writeText(""); } catch {}
        setTimeout(() => { setFlash(false); setHidden(false); }, 1200);
      }
    };
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keyup", onKey);
    };
  }, [paid]);

  const slots = Math.max(1, t.slots);
  return (
    <div onContextMenu={(e) => e.preventDefault()} className="relative rounded-2xl overflow-hidden no-select">
      <div draggable={false} className="pointer-events-none aspect-[4/3] p-4 bg-gradient-to-br from-blush to-blushDeep">
        <div className="h-full grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(slots, 3)}, 1fr)`, gridAutoRows: "1fr" }}>
          {Array.from({ length: slots }).map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden bg-white/35 border border-dashed border-white/70">
              {photos[i] && <img src={photos[i]} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
      </div>

      {!paid && (
        <>
          <div className="absolute inset-0 pointer-events-none flex flex-wrap gap-6 items-center justify-center opacity-[0.16] -rotate-[24deg]">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="font-sans font-extrabold text-base text-black whitespace-nowrap">MEMORY MAKERS · CHƯA THANH TOÁN</span>
            ))}
          </div>
          <div className="absolute bottom-3 left-3 bg-ink/80 text-white rounded-full px-3 py-1.5 font-sans text-xs flex gap-1.5 items-center">
            <ShieldCheck size={14} /> Ảnh được bảo vệ — mở khoá sau khi thanh toán
          </div>
          {hidden && (
            <div className="absolute inset-0 bg-ink grid place-items-center">
              <div className="text-center text-white font-sans">
                <EyeOff size={34} className="mx-auto" />
                <div className="mt-2.5 text-sm">{flash ? "Đã chặn ảnh chụp màn hình" : "Nội dung tạm ẩn để bảo vệ bản quyền"}</div>
              </div>
            </div>
          )}
        </>
      )}
      {paid && (
        <div className="absolute top-3 right-3 bg-sage text-white rounded-full px-3 py-1.5 font-sans text-xs flex gap-1.5 items-center">
          <CheckCircle2 size={14} /> Đã mở khoá
        </div>
      )}
    </div>
  );
}
