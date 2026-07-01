"use client";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, Star } from "lucide-react";
import TemplateCover from "./TemplateCover";
import type { Template } from "@/lib/types";

export default function TemplateCard({ t }: { t: Template }) {
  const router = useRouter();
  return (
    <div className="mm-card mm-rise bg-white rounded-2xl p-3 border border-line flex flex-col h-full">
      <TemplateCover t={t} kind="cover" />
      <div className="px-1 pt-2.5 pb-1 flex flex-col flex-1">
        {t.category && <span className="font-sans text-[10.5px] tracking-[1.5px] uppercase text-brass font-bold mb-1">{t.category}</span>}
        <div className="flex items-start justify-between gap-2">
          <div className="font-serif text-base text-ink font-semibold leading-snug">{t.title}</div>
          {(t as any).ratingCount > 0 && (
            <span className="font-sans text-xs text-sub flex items-center gap-1 shrink-0 mt-0.5" title={`${(t as any).ratingCount} đánh giá`}>
              <Star size={12} className="fill-brass text-brass" />{Number((t as any).ratingAvg).toFixed(1)} <span className="text-line">·</span> {(t as any).ratingCount}
            </span>
          )}
        </div>
        {t.description && <p className="font-sans text-[12.5px] text-sub mt-1 line-clamp-2 leading-snug">{t.description}</p>}
        <div className="font-sans text-[11.5px] text-sub mt-1.5">{t.pageCount ?? t.pages?.length ?? 0} trang</div>

        <div className="flex gap-2 mt-3 mt-auto pt-3">
          <button onClick={() => router.push(`/design/${t.id}`)}
            className="mm-btn flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-brass text-white rounded-full py-2.5 px-2 font-sans text-[13.5px] font-semibold whitespace-nowrap">
            <Sparkles size={15} className="shrink-0" /> Dùng mẫu
          </button>
          <button onClick={() => router.push(`/preview/${t.id}`)}
            className="mm-btn shrink-0 flex items-center justify-center gap-1.5 border border-ink text-ink rounded-full px-3.5 py-2.5 font-sans text-[13.5px] font-semibold whitespace-nowrap">
            <Eye size={15} className="shrink-0" /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}
