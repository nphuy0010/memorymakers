"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Star, Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api } from "@/lib/api";
import TemplateCover from "@/components/TemplateCover";
import { FanMotif, CatIcon, GRADS } from "@/components/Brand";
import { CATS, type Template } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [about, setAbout] = useState<any>(null);
  const [hero, setHero] = useState("");
  const [heroVideo, setHeroVideo] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.templates().then(setTemplates).catch(() => {});
    api.about().then(setAbout).catch(() => {});
    api.getHeroVideo().then((r: any) => setHeroVideo(r?.url || null)).catch(() => {});
  }, []);

  const featured = useMemo(() => {
    const f = templates.filter(t => t.featured);
    return (f.length ? f : templates).slice(0, 10);
  }, [templates]);
  const popular = useMemo(() => [...templates].sort((a, b) => ((b as any).uses || 0) - ((a as any).uses || 0)).slice(0, 10), [templates]);
  const loop = popular.length ? [...popular, ...popular] : [];
  const scroll = (d: number) => stripRef.current?.scrollBy({ left: d * 296, behavior: "smooth" });
  const search = () => router.push(hero.trim() ? `/templates?q=${encodeURIComponent(hero.trim())}` : "/templates");

  return (
    <div className="mm-page">
      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-5 pt-14 pb-9 grid md:grid-cols-[1.1fr_.9fr] gap-12 items-center">
        <div>
          <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Quà tặng kể chuyện · Lưu khoảnh khắc thành sách</span>
          <h1 className="font-serif text-[52px] leading-[1.08] text-ink font-bold mt-4 mb-4">
            Tả một câu —<br /><span className="text-brass italic">AI chọn mẫu</span> cho bạn.
          </h1>
          <p className="font-sans text-[16.5px] text-sub leading-relaxed max-w-[460px]">
            Bạn không cần dò tìm. Mô tả cuốn photobook mong muốn, Memory Makers gợi ý mẫu thiết kế sẵn phù hợp nhất rồi đưa bạn vào trang thiết kế — AI lo phần xếp ảnh.
          </p>
          <div className="mt-6 bg-white border-[1.5px] border-line rounded-[18px] p-2.5 shadow-[0_12px_32px_rgba(42,37,32,0.08)]">
            <div className="flex items-center gap-2.5">
              <Search size={18} className="text-brass ml-2 shrink-0" />
              <input value={hero} onChange={e => setHero(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
                placeholder="Mô tả cuốn photobook bạn muốn…"
                className="flex-1 bg-transparent outline-none font-sans text-[15px] text-ink py-2.5" />
              <button onClick={search} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold shrink-0">
                <Sparkles size={16} /> Tìm mẫu
              </button>
            </div>
          </div>
          <button onClick={() => router.push("/templates")} className="mm-nav mt-3.5 font-sans text-sm text-sub">hoặc xem toàn bộ mẫu có sẵn →</button>
        </div>

        {/* CÓ VIDEO (admin upload) -> hiển thị video; KHÔNG có -> hai bìa mẫu như cũ */}
        {heroVideo ? (
          <div className="relative">
            <video src={heroVideo} autoPlay muted loop playsInline className="w-full rounded-2xl border border-line shadow-[0_18px_50px_rgba(42,37,32,.18)]" />
          </div>
        ) : (
        <div className="relative min-h-[320px]">
          {featured[0]
            ? <div className="rotate-3"><TemplateCover t={featured[0]} big kind="cover" /></div>
            : <div className="rotate-3 rounded-2xl bg-cream animate-pulse" style={{ aspectRatio: "4/5" }} />}
          {featured[1] && <div className="absolute -bottom-6 -left-7 w-[62%] -rotate-6"><TemplateCover t={featured[1]} big kind="cover" /></div>}
        </div>
        )}
      </section>

      <FanMotif />

      {/* VỀ + DANH MỤC */}
      <section className="bg-cream">
        <div className="max-w-[1200px] mx-auto px-5 py-13 grid md:grid-cols-2 gap-12 items-start py-14">
          <div>
            <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Về Memory Makers</span>
            <h2 className="font-serif text-[32px] text-ink font-bold mt-3 mb-4">{about?.headline || "Mỗi cuốn sách là một lần được sống lại khoảnh khắc."}</h2>
            <p className="font-sans text-[15px] text-sub leading-relaxed">{about?.mission || "Memory Makers giúp những kỷ niệm trong điện thoại trở thành một vật phẩm có thể chạm vào."}</p>
            <div className="flex gap-3.5 mt-5">
              <button onClick={() => router.push("/templates")} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold"><Sparkles size={16} /> Bắt đầu thiết kế</button>
              <button onClick={() => router.push("/about")} className="mm-btn bg-cream border border-line text-ink rounded-full px-5 py-2.5 font-sans text-sm font-semibold">Tìm hiểu thêm</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {CATS.map((c, i) => (
              <div key={c.id} className="mm-card mm-rise bg-white rounded-2xl p-[18px] border border-line" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="mm-caticon w-12 h-12 rounded-xl grid place-items-center mb-3 shadow-[0_6px_16px_rgba(42,37,32,0.12)]" style={{ background: `linear-gradient(135deg, ${GRADS[i % GRADS.length][0]}, ${GRADS[i % GRADS.length][1]})` }}>
                  <CatIcon id={c.id} />
                </div>
                <div className="font-serif text-lg text-ink font-semibold">{c.label}</div>
                <div className="font-sans text-[13px] text-sub mt-1">Tùy chọn khi đặt hàng</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MẪU NỔI BẬT — strip trượt ngang */}
      {featured.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-5 py-14">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Bộ sưu tập</span>
              <h2 className="font-serif text-3xl text-ink font-bold mt-2">Mẫu nổi bật</h2>
            </div>
            <button onClick={() => router.push("/templates")} className="mm-btn flex items-center gap-2 bg-cream text-ink rounded-full px-4 py-2.5 font-sans text-sm font-semibold"><ArrowRight size={16} /> Xem tất cả</button>
          </div>
          <div className="relative">
            <div ref={stripRef} className="mm-strip flex gap-5 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
              {featured.map(t => (
                <button key={t.id} onClick={() => router.push(`/design/${t.id}`)} title={t.title} className="shrink-0 w-[300px] text-left">
                  <TemplateCover t={t} kind="cover" />
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="font-serif text-base text-ink font-semibold">{t.title}</div>
                    <span className="font-sans text-xs text-sub flex items-center gap-1"><Star size={12} className="fill-brass text-brass" />{t.rating}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => scroll(-1)} className="mm-arrow absolute -left-4 top-[38%] w-11 h-11 rounded-full bg-white border border-line grid place-items-center shadow-md"><ChevronLeft size={20} className="text-ink" /></button>
            <button onClick={() => scroll(1)} className="mm-arrow absolute -right-4 top-[38%] w-11 h-11 rounded-full bg-white border border-line grid place-items-center shadow-md"><ChevronRight size={20} className="text-ink" /></button>
          </div>
        </section>
      )}

      {about && (
        <section className="bg-cream">
          <div className="max-w-[820px] mx-auto px-5 py-14 text-center">
            <h2 className="font-serif text-3xl text-ink font-bold mb-3">{about.headline}</h2>
            <p className="font-sans text-base text-sub leading-relaxed">{about.mission}</p>
          </div>
        </section>
      )}

      {/* MARQUEE — bìa mẫu được dùng nhiều nhất, trượt vô tận */}
      {popular.length > 0 && (
        <section className="py-14">
          <div className="max-w-[1200px] mx-auto px-5 mb-5 text-center">
            <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Được yêu thích</span>
            <h2 className="font-serif text-3xl text-ink font-bold mt-2">Mẫu được dùng nhiều nhất</h2>
          </div>
          <div className="mm-marquee overflow-hidden" style={{ WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)", maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)" }}>
            <div className="mm-marquee-track">
              {loop.map((t, i) => (
                <button key={t.id + "-" + i} onClick={() => router.push(`/template/${t.slug}`)} title={t.title} className="shrink-0 w-[210px] text-left">
                  <TemplateCover t={t} kind="cover" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
