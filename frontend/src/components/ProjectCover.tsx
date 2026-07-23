"use client";
/* ẢNH BÌA CỦA DỰ ÁN — bìa trước của template ĐÃ CHÈN ảnh khách.
   Dùng chung công thức hiển thị với trình thiết kế/flipbook (imgStyle) nên khớp đúng
   vị trí/zoom/xoay/filter mà khách đã chỉnh. Không có ảnh khách -> hiện bìa mẫu gốc. */
import { buildPages, imgStyle, type Edit } from "@/lib/pages";
import type { Template } from "@/lib/types";
import { Package } from "lucide-react";

export default function ProjectCover({ template, layout, className = "", rounded = 8 }: {
  template?: Template | null;
  layout?: { assignments?: Record<number, string>; edits?: Record<number, Edit> } | null;
  className?: string;
  rounded?: number;
}) {
  if (!template) return <div className={`w-full h-full grid place-items-center text-brass ${className}`}><Package size={18} /></div>;

  const pages = buildPages(template);
  const cover = pages.find((p) => p.type === "front_cover") || pages[0] || null;
  const assignments = layout?.assignments || {};
  const edits = layout?.edits || {};

  // Chưa dựng được trang -> fallback ảnh bìa marketplace
  const fallback = (template as any).coverImage || (template as any).demoImage || null;
  if (!cover?.image) {
    return fallback
      ? <img src={fallback} alt="" className={`w-full h-full object-cover ${className}`} loading="lazy" />
      : <div className={`w-full h-full grid place-items-center text-brass ${className}`}><Package size={18} /></div>;
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ borderRadius: rounded }}>
      <img src={cover.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" draggable={false} />
      {cover.slots.map((s) => {
        const url = assignments[s.g];
        if (!url) return null;
        return (
          <div key={s.g} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`,
            borderRadius: (s as any).shape === "circle" ? "50%" : 2, overflow: "hidden",
            transform: `rotate(${(s as any).rot || 0}deg)`,
          }}>
            <img src={url} alt="" draggable={false} loading="lazy" style={{ width: "100%", height: "100%", ...imgStyle(edits[s.g]) }} />
          </div>
        );
      })}
    </div>
  );
}
