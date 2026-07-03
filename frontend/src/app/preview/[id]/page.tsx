"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Star } from "lucide-react";
import { api } from "@/lib/api";
import { vnd } from "@/lib/types";
import type { Template } from "@/lib/types";
import Flipbook from "@/components/Flipbook";
import Loading from "@/components/Loading";

type Review = { rating: number; review: string; name: string; createdAt: string };
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={size} className={i < Math.round(value) ? "fill-brass text-brass" : "text-line"} />)}</span>;
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [t, setT] = useState<Template | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => { api.template(id).then(setT).catch(() => {}); }, [id]);
  useEffect(() => { api.templateReviews(id).then(setReviews).catch(() => {}); }, [id]);
  if (!t) return <Loading text="Đang tải mẫu…" pad={120} />;

  const minPrice = Math.min(t.prices.digital, t.prices.soft, t.prices.hard, t.prices.fan);
  const ratingAvg = (t as any).ratingAvg as number | null;
  const ratingCount = (t as any).ratingCount as number || 0;

  return (
    <div className="max-w-[1040px] mx-auto px-5 pt-8 pb-16">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sub font-sans text-sm mb-5"><ArrowLeft size={15} /> Quay lại</button>
      <div className="grid md:grid-cols-[1.15fr_.85fr] gap-10">
        <div>
          <Flipbook t={t} />
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
          </div>
        </div>
      </div>

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
