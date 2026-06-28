"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import TemplateCard from "@/components/TemplateCard";
import type { Template } from "@/lib/types";

function GalleryInner() {
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [all, setAll] = useState<Template[]>([]);

  useEffect(() => { api.templates().then(setAll).catch(() => {}); }, []);
  useEffect(() => { setQ(params.get("q") || ""); }, [params]);

  // khớp từng ký tự theo title/keyword/description
  const k = q.toLowerCase().trim();
  const list = k
    ? all.filter(t => t.title.toLowerCase().includes(k) || t.description.toLowerCase().includes(k) || t.keywords.some(w => w.toLowerCase().includes(k)))
    : all;

  return (
    <div className="max-w-[1200px] mx-auto px-5 pt-10 pb-16">
      <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Bộ sưu tập</span>
      <h1 className="font-serif text-4xl text-ink font-bold mt-2.5 mb-1">Mẫu photobook</h1>
      <p className="font-sans text-sub text-base mb-5">Chọn một mẫu — AI sẽ điền ảnh của bạn vào các ô có sẵn.</p>

      {/* thanh tìm kiếm tại trang: gõ tới đâu lọc tới đó; Enter giữ kết quả */}
      <div className="flex items-center gap-2 bg-white border border-line rounded-full px-4 py-2.5 max-w-[480px] mb-6">
        <Search size={16} className="text-sub" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo chủ đề, tên mẫu…"
          className="flex-1 bg-transparent outline-none font-sans text-sm text-ink" />
        {q && <button onClick={() => setQ("")}><X size={16} className="text-sub" /></button>}
      </div>

      {k && <div className="font-sans text-sm text-sub mb-4">Kết quả cho “<b className="text-ink">{q}</b>” · {list.length} mẫu</div>}

      {list.length === 0 ? (
        <div className="text-center py-16 text-sub font-sans">Không tìm thấy mẫu nào khớp. Thử “du lịch” hoặc “sinh nhật”.</div>
      ) : (
        <div className="grid md:grid-cols-4 gap-5">
          {list.map(t => <TemplateCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return <Suspense fallback={<div className="p-10 text-center text-sub">Đang tải…</div>}><GalleryInner /></Suspense>;
}
