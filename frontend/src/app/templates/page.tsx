"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import TemplateCard from "@/components/TemplateCard";
import AIDesignModal from "@/components/AIDesignModal";
import { SkeletonGrid } from "@/components/Loading";
import type { Template } from "@/lib/types";

export default function GalleryPage() {
  const router = useRouter();
  const [all, setAll] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(false);

  useEffect(() => { api.templates().then(setAll).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div className="mm-page max-w-[1200px] mx-auto px-5 pt-10 pb-16">
      <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Bộ sưu tập</span>
      <h1 className="font-serif text-4xl text-ink font-bold mt-2.5 mb-1.5">Mẫu photobook</h1>
      <p className="font-sans text-sub text-[15.5px] mb-5">Chọn một mẫu — AI sẽ điền ảnh của bạn vào các ô có sẵn. Hoặc để AI gợi ý theo mô tả của bạn.</p>

      <div className="mb-7">
        <button onClick={() => setAi(true)} className="mm-btn inline-flex items-center gap-2 bg-brass text-white rounded-full px-5 py-3 font-sans font-semibold">
          <Wand2 size={18} /> Để AI chọn mẫu giúp tôi
        </button>
      </div>

      {loading ? (
        <SkeletonGrid count={8} />
      ) : all.length === 0 ? (
        <div className="text-center py-16 text-sub font-sans">Chưa có mẫu nào. Admin có thể thêm mẫu trong khu quản trị.</div>
      ) : (
        <div className="grid md:grid-cols-4 gap-5">
          {all.map(t => <TemplateCard key={t.id} t={t} />)}
        </div>
      )}

      {ai && <AIDesignModal templates={all} onClose={() => setAi(false)} onUse={(t) => { setAi(false); router.push(`/design/${t.id}`); }} />}
    </div>
  );
}
