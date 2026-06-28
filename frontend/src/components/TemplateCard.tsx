"use client";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, Star } from "lucide-react";
import TemplateCover from "./TemplateCover";
import type { Template } from "@/lib/types";

export default function TemplateCard({ t }: { t: Template }) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl p-3 border border-line">
      <TemplateCover t={t} kind="cover" />
      <div className="px-1 pt-2.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="font-serif text-base text-ink font-semibold">{t.title}</div>
          <span className="font-sans text-xs text-sub flex items-center gap-1"><Star size={12} className="fill-brass text-brass" />{t.rating}</span>
        </div>
        {/* KHÔNG hiển thị giá ở đây — giá chỉ lộ sau khi chọn option ở bước thiết kế */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => router.push(`/design/${t.id}`)}
            className="flex-1 flex items-center justify-center gap-2 bg-brass text-white rounded-full py-2.5 font-sans text-sm font-semibold">
            <Sparkles size={15} /> Dùng mẫu
          </button>
          <button onClick={() => router.push(`/preview/${t.id}`)}
            className="flex items-center justify-center gap-2 border border-ink text-ink rounded-full px-4 py-2.5 font-sans text-sm font-semibold">
            <Eye size={15} /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}
