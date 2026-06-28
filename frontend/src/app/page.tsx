"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { CATS, type Template } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [about, setAbout] = useState<any>(null);
  useEffect(() => {
    api.templates().then(setTemplates).catch(() => {});
    api.about().then(setAbout).catch(() => {});
  }, []);
  const featured = templates.filter(t => t.featured);
  const showcase = (featured.length ? featured : templates).slice(0, 8);

  return (
    <div>
      {/* HERO — không nhắc '30 mẫu', không giá */}
      <section className="max-w-[1200px] mx-auto px-5 pt-14 pb-8 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Quà tặng kể chuyện · Lưu khoảnh khắc thành sách</span>
          <h1 className="font-serif text-5xl leading-tight text-ink font-bold mt-4 mb-4">
            Chọn mẫu, thêm ảnh —<br /><span className="text-brass italic">AI điền ảnh</span> vào đúng chỗ.
          </h1>
          <p className="font-sans text-base text-sub leading-relaxed max-w-[440px]">
            Memory Makers dùng các mẫu photobook thiết kế sẵn. Bạn chỉ cần tải ảnh lên, AI tự xếp ảnh vào từng ô trong mẫu — giữ nguyên bố cục đẹp.
          </p>
          <div className="flex gap-3 mt-7">
            <button onClick={() => router.push("/templates")} className="flex items-center gap-2 bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold">
              <Sparkles size={18} /> Bắt đầu thiết kế
            </button>
            <button onClick={() => router.push("/about")} className="border border-ink text-ink rounded-full px-6 py-3 font-sans font-semibold">Về chúng tôi</button>
          </div>
        </div>
        <div className="bg-cream rounded-3xl p-8">
          <FeaturedCarousel templates={showcase} />
        </div>
      </section>

      {/* 4 dòng sản phẩm — không hiển thị giá */}
      <section className="bg-cream">
        <div className="max-w-[1200px] mx-auto px-5 py-12">
          <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Dòng sản phẩm</span>
          <div className="grid md:grid-cols-4 gap-4 mt-5">
            {CATS.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-5 border border-line">
                <div className="font-serif text-lg text-ink font-semibold">{c.label}</div>
                <div className="font-sans text-sm text-sub mt-1">Chọn ở bước đặt hàng</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {about && (
        <section className="max-w-[820px] mx-auto px-5 py-14 text-center">
          <h2 className="font-serif text-3xl text-ink font-bold mb-3">{about.headline}</h2>
          <p className="font-sans text-base text-sub leading-relaxed">{about.mission}</p>
        </section>
      )}
    </div>
  );
}
