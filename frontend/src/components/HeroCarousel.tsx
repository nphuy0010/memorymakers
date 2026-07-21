"use client";
/* CAROUSEL TRANG CHỦ dạng VÒNG TRÒN:
   - Item đang hiển thị nằm TRƯỚC (giữa); các item kế xếp PHÍA SAU bên phải, nhỏ + mờ dần.
   - Ảnh hiển thị 3s; video chạy hết mới chuyển (video luôn chiếu, không dừng).
   - Chuyển cảnh: item hiện BAY SANG TRÁI mờ dần, item kế từ chồng phải TIẾN VÀO giữa — lặp vô hạn. */
import { useEffect, useRef, useState } from "react";

export type HeroItem = { url: string; type: "image" | "video" };

export default function HeroCarousel({ items }: { items: HeroItem[] }) {
  const [active, setActive] = useState(0);
  const vidRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const timerRef = useRef<any>(null);
  const n = items.length;

  const next = () => setActive((a) => (a + 1) % n);

  // CHỈ video active được phát; video khác pause + tua 0 (không phát ngầm)
  useEffect(() => {
    Object.entries(vidRefs.current).forEach(([k, v]) => {
      if (!v) return;
      if (+k === active && items[+k]?.type === "video") { v.currentTime = 0; v.play().catch(() => {}); }
      else { v.pause(); v.currentTime = 0; }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Ảnh: hẹn 3s chuyển; Video: chuyển bằng onEnded
  useEffect(() => {
    if (n <= 1) return;
    clearTimeout(timerRef.current);
    if (items[active].type === "image") timerRef.current = setTimeout(next, 3000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, n]);

  // Ẩn tab -> pause video; quay lại -> phát tiếp (không chạy ngầm tốn pin)
  useEffect(() => {
    const onVis = () => {
      const v = vidRefs.current[active];
      if (!v || items[active]?.type !== "video") return;
      if (document.hidden) v.pause(); else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!n) return null;
  if (n === 1) {
    const it = items[0];
    return it.type === "video"
      ? <video src={it.url} autoPlay muted loop playsInline className="w-full rounded-2xl border border-line shadow-[0_18px_50px_rgba(42,37,32,.18)]" />
      : <img src={it.url} className="w-full rounded-2xl border border-line shadow-[0_18px_50px_rgba(42,37,32,.18)] object-cover" alt="" />;
  }

  // Vị trí theo vòng: rel 0 = giữa trước; 1,2 = chồng phía sau bên phải mờ dần; n-1 = vừa rời, bay sang trái
  const styleFor = (i: number): React.CSSProperties => {
    const rel = (i - active + n) % n;
    const base: React.CSSProperties = {
      position: "absolute", inset: 0, transition: "transform .8s cubic-bezier(.4,.1,.2,1), opacity .8s ease",
      willChange: "transform, opacity", borderRadius: 16, overflow: "hidden",
    };
    if (rel === 0) return { ...base, transform: "translateX(0) scale(1)", opacity: 1, zIndex: 30 };
    if (rel === n - 1) return { ...base, transform: "translateX(-34%) scale(.9)", opacity: 0, zIndex: 5 };  // vừa hiển thị xong -> bay sang TRÁI
    if (rel === 1) return { ...base, transform: "translateX(9%) scale(.93) translateY(2.5%)", opacity: 0.5, zIndex: 20 };
    if (rel === 2) return { ...base, transform: "translateX(17%) scale(.87) translateY(5%)", opacity: 0.28, zIndex: 10 };
    return { ...base, transform: "translateX(22%) scale(.82) translateY(7%)", opacity: 0, zIndex: 1 };
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
      {items.map((it, i) => (
        <div key={i} style={styleFor(i)} className="border border-line shadow-[0_18px_50px_rgba(42,37,32,.18)] bg-cream">
          {it.type === "video"
            ? <video ref={(el) => { vidRefs.current[i] = el; }} src={it.url} muted playsInline preload="metadata"
                onEnded={() => { if (i === active) next(); }} className="w-full h-full object-cover" />
            : <img src={it.url} className="w-full h-full object-cover" alt="" loading={i === 0 ? "eager" : "lazy"} />}
        </div>
      ))}
      {/* chấm chỉ mục */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
        {items.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} aria-label={`Media ${i + 1}`}
            className="rounded-full transition-all" style={{ width: i === active ? 18 : 7, height: 7, background: i === active ? "#B08D57" : "#E4DACB" }} />
        ))}
      </div>
    </div>
  );
}
