"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Star, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { vnd } from "@/lib/types";
import type { Template } from "@/lib/types";
import Flipbook from "@/components/Flipbook";

type Review = { rating: number; review: string; name: string; createdAt: string };

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={size} className={i < Math.round(value) ? "fill-brass text-brass" : "text-line"} />)}</span>;
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [t, setT] = useState<Template | null>(null);
  const [tab, setTab] = useState<"gif" | "video" | "flip">("flip");
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => { api.template(id).then((x) => { setT(x); setTab(x.previewVideo ? "video" : x.previewGif ? "gif" : "flip"); }).catch(() => {}); }, [id]);
  useEffect(() => { api.templateReviews(id).then(setReviews).catch(() => {}); }, [id]);
  if (!t) return <div className="p-10 text-center text-sub">Đang tải…</div>;

  const minPrice = Math.min(t.prices.digital, t.prices.soft, t.prices.hard, t.prices.fan);
  const ratingAvg = (t as any).ratingAvg as number | null;
  const ratingCount = (t as any).ratingCount as number || 0;
  const tabs: ["gif" | "video" | "flip", string][] = [];
  if (t.previewGif) tabs.push(["gif", "GIF"]);
  if (t.previewVideo) tabs.push(["video", "Video"]);
  tabs.push(["flip", "Flipbook"]);

  return (
    <div className="max-w-[1040px] mx-auto px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sub font-sans text-sm mb-5"><ArrowLeft size={15} /> Quay lại</button>
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
          <div className="flex gap-2 flex-wrap my-3 items-center">
            {t.category && <span className="font-sans text-xs text-sub bg-cream rounded-full px-2.5 py-1">{t.category}</span>}
            <span className="font-sans text-xs text-sub bg-cream rounded-full px-2.5 py-1">{t.pageCount ?? (t.pages?.length ?? 0)} trang</span>
            {ratingCount > 0
              ? <span className="font-sans text-xs text-ink bg-cream rounded-full px-2.5 py-1 flex items-center gap-1"><Star size={11} fill="#B08D57" color="#B08D57" />{Number(ratingAvg).toFixed(1)} · {ratingCount} đánh giá</span>
              : <span className="font-sans text-xs text-sub bg-cream rounded-full px-2.5 py-1">Chưa có đánh giá</span>}
          </div>
          <p className="font-sans text-sub leading-relaxed">{t.description}</p>
          <div className="font-sans text-brass font-bold mt-3">từ {vnd(minPrice)}</div>
          <div className="mt-6 flex gap-2.5">
            <button onClick={() => router.push(`/design/${t.id}`)} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold"><Sparkles size={18} /> Dùng mẫu này</button>
            {t.canvaLink && <a href={t.canvaLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-ink text-ink rounded-full px-5 py-3 font-sans font-semibold"><ExternalLink size={16} /> Canva</a>}
          </div>
        </div>
      </div>

      {/* Đánh giá của mọi người — chỉ hiện khi có */}
      {ratingCount > 0 && (
        <section className="mt-12 border-t border-line pt-8">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-serif text-2xl text-ink font-bold">Đánh giá</h2>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl text-brass font-bold">{Number(ratingAvg).toFixed(1)}</span>
              <Stars value={Number(ratingAvg)} size={16} />
              <span className="font-sans text-sm text-sub">({ratingCount})</span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white border border-line rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-brass text-white grid place-items-center font-semibold text-sm">{(r.name || "?")[0]?.toUpperCase()}</span>
                    <span className="font-sans text-sm text-ink font-semibold">{r.name}</span>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.review && <p className="font-sans text-sm text-sub leading-relaxed">{r.review}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
