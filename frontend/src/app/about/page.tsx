"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Instagram } from "lucide-react";

import { api } from "@/lib/api";

export default function AboutPage() {
  const router = useRouter();
  const [a, setA] = useState<any>(null);
  useEffect(() => { api.about().then(setA).catch(() => {}); }, []);
  if (!a) return <div className="p-10 text-center text-sub">Đang tải…</div>;

  return (
    <div>
      <section className="max-w-[820px] mx-auto px-5 pt-12 pb-7 text-center">
        <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Về chúng tôi</span>
        <h1 className="font-serif text-4xl text-ink font-bold mt-3 mb-4">{a.headline}</h1>
        <p className="font-sans text-lg text-sub leading-relaxed">{a.mission}</p>
      </section>
      <section className="max-w-[900px] mx-auto px-5 py-10 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="font-serif text-2xl text-ink font-bold mb-3">Câu chuyện</h2>
          <p className="font-sans text-[15px] text-sub leading-relaxed whitespace-pre-line">{a.story}</p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-ink font-bold mb-3">Giá trị</h2>
          <p className="font-sans text-[15px] text-sub leading-relaxed whitespace-pre-line">{a.values}</p>
          <div className="flex gap-3 mt-4">
            <span className="border border-ink text-ink rounded-full px-4 py-2 font-sans text-sm inline-flex items-center gap-2"><Instagram size={15} /> {a.instagram}</span>
            <span className="bg-cream text-ink rounded-full px-4 py-2 font-sans text-sm">{a.tiktok}</span>
          </div>
        </div>
      </section>
      <section className="text-center pb-14">
        <button onClick={() => router.push("/templates")} className="bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold inline-flex items-center gap-2"><Sparkles size={18} /> Bắt đầu thiết kế</button>
      </section>
    </div>
  );
}
