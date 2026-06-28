"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, Eye } from "lucide-react";
import TemplateCover from "./TemplateCover";
import type { Template } from "@/lib/types";

export default function FeaturedCarousel({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  if (!templates.length) return null;
  const t = templates[i];
  const go = (d: number) => setI((p) => (p + d + templates.length) % templates.length);

  return (
    <div className="flex items-center justify-center gap-6">
      <button onClick={() => go(-1)} aria-label="Trước"
        className="w-11 h-11 rounded-full bg-white border border-line grid place-items-center shrink-0 hover:bg-cream">
        <ChevronLeft size={20} className="text-ink" />
      </button>

      <div className="w-full max-w-[360px] transition-all">
        {/* chỉ hiển thị trang bìa, không giá */}
        <TemplateCover t={t} big kind="cover" />
        <div className="text-center mt-4">
          <h3 className="font-serif text-2xl text-ink font-bold">{t.title}</h3>
          <div className="flex gap-3 justify-center mt-3">
            <button onClick={() => router.push(`/design/${t.id}`)}
              className="flex items-center gap-2 bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold">
              <Sparkles size={16} /> Dùng mẫu
            </button>
            <button onClick={() => router.push(`/preview/${t.id}`)}
              className="flex items-center gap-2 border border-ink text-ink rounded-full px-5 py-2.5 font-sans text-sm font-semibold">
              <Eye size={16} /> Xem preview
            </button>
          </div>
        </div>
        {/* chỉ báo vị trí */}
        <div className="flex gap-1.5 justify-center mt-5">
          {templates.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-brass" : "w-1.5 bg-line"}`} />
          ))}
        </div>
      </div>

      <button onClick={() => go(1)} aria-label="Sau"
        className="w-11 h-11 rounded-full bg-white border border-line grid place-items-center shrink-0 hover:bg-cream">
        <ChevronRight size={20} className="text-ink" />
      </button>
    </div>
  );
}
