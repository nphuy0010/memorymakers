"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Star, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { vnd } from "@/lib/types";
import type { Template } from "@/lib/types";
import Flipbook from "@/components/Flipbook";

// /template/[slug] — trang chi tiết mẫu (SEO), flipbook từ ảnh trang thật + GIF/Video.
export default function TemplateBySlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [t, setT] = useState<Template | null>(null);
  const [tab, setTab] = useState<"gif" | "video" | "flip">("flip");

  useEffect(() => { api.templateBySlug(slug).then((x) => { setT(x); setTab(x.previewVideo ? "video" : x.previewGif ? "gif" : "flip"); }).catch(() => {}); }, [slug]);
  if (!t) return <div className="p-10 text-center text-sub">Đang tải…</div>;

  const minPrice = Math.min(t.prices.digital, t.prices.soft, t.prices.hard, t.prices.fan);
  const tabs: ["gif" | "video" | "flip", string][] = [];
  if (t.previewGif) tabs.push(["gif", "GIF"]);
  if (t.previewVideo) tabs.push(["video", "Video"]);
  tabs.push(["flip", "Flipbook"]);

  return (
    <div className="max-w-[1040px] mx-auto px-5 pt-8 pb-16">
      <button onClick={() => router.push("/templates")} className="flex items-center gap-1.5 text-sub font-sans text-sm mb-5"><ArrowLeft size={15} /> Kho mẫu</button>
      <div className="grid md:grid-cols-[1.15fr_.85fr] gap-10">
        <div>
          <div className="flex gap-2 mb-3">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className="font-sans text-[13px] px-3.5 py-1.5 rounded-full border"
                style={{ borderColor: tab === k ? "#2A2520" : "#E5DCCF", background: tab === k ? "#2A2520" : "transparent", color: tab === k ? "#F6F1E9" : "#2A2520" }}>{l}</button>
            ))}
          </div>
          {tab === "gif" && t.previewGif && <img src={t.previewGif} alt={t.title} className="w-full rounded-2xl" />}
          {tab === "video" && t.previewVideo && <video src={t.previewVideo} controls className="w-full rounded-2xl" />}
          {tab === "flip" && <Flipbook t={t} />}
        </div>
        <div>
          <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Xem trước</span>
          <h1 className="font-serif text-3xl text-ink font-bold mt-2.5">{t.title}</h1>
          <div className="flex gap-2 flex-wrap my-3">
            {t.category && <span className="font-sans text-xs text-sub bg-cream rounded-full px-2.5 py-1">{t.category}</span>}
            <span className="font-sans text-xs text-sub bg-cream rounded-full px-2.5 py-1">{t.pageCount ?? (t.pages?.length ?? 0)} trang</span>
            <span className="font-sans text-xs text-sub bg-cream rounded-full px-2.5 py-1 flex items-center gap-1"><Star size={11} fill="#B08D57" color="#B08D57" />{t.rating}</span>
          </div>
          <p className="font-sans text-sub leading-relaxed">{t.description}</p>
          <div className="font-sans text-brass font-bold mt-3">từ {vnd(minPrice)}</div>
          <div className="mt-6 flex gap-2.5">
            <button onClick={() => router.push(`/design/${t.id}`)} className="flex items-center gap-2 bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold"><Sparkles size={18} /> Dùng mẫu này</button>
            {t.canvaLink && <a href={t.canvaLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-ink text-ink rounded-full px-5 py-3 font-sans font-semibold"><ExternalLink size={16} /> Canva</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
