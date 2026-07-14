"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

export default function Footer() {
  const [about, setAbout] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [pop, setPop] = useState<any>(null); // chính sách đang mở popup
  useEffect(() => { api.about().then(setAbout).catch(() => {}); api.getPolicies().then(setPolicies).catch(() => {}); }, []);
  return (
    <footer className="bg-ink text-paper px-5 pt-10 pb-7 mt-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-3 gap-9">
        <div>
          <div className="font-serif text-[22px] font-bold">Memory Makers</div>
          <p className="font-sans text-[13px] text-[#C9C0B3] mt-2.5 leading-relaxed max-w-[320px]">{about?.mission}</p>
        </div>
        <div>
          <div className="font-sans text-xs tracking-[2px] text-brass uppercase mb-3">Chính sách</div>
          {/* 5 mục CỐ ĐỊNH giống bản gốc — nội dung do admin soạn, bấm để xem popup */}
          {[["muahang", "Mua hàng"], ["thanhtoan", "Thanh toán"], ["doitra", "Đổi trả"], ["vanchuyen", "Vận chuyển"], ["baomat", "Bảo mật"]].map(([pid, label]) => {
            const found = policies.find((x: any) => x.id === pid);
            const title = "Chính sách " + label.toLowerCase();
            return (
              <button key={pid} onClick={() => found?.content && setPop({ title, content: found.content })}
                className="block font-sans text-sm text-[#C9C0B3] mb-2 hover:text-white text-left">{title}</button>
            );
          })}
        </div>
        <div>
          <div className="font-sans text-xs tracking-[2px] text-brass uppercase mb-3">Kết nối</div>
          {[about?.instagram, about?.tiktok, about?.hotline].filter(Boolean).map((p: string) => (
            <div key={p} className="font-sans text-sm text-[#C9C0B3] mb-2">{p}</div>
          ))}
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto mt-6 pt-4 border-t border-[#463F37] font-sans text-xs text-[#8C8377]">© 2026 Memory Makers.</div>
      {/* POPUP CHÍNH SÁCH giữa màn hình */}
      {pop && (
        <div className="fixed inset-0 z-[97] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.6)" }} onClick={() => setPop(null)}>
          <div className="bg-paper text-ink rounded-2xl border border-line w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-serif text-xl font-bold">{pop.title}</h3>
              <button onClick={() => setPop(null)} className="w-8 h-8 grid place-items-center rounded-full bg-cream shrink-0"><X size={15} /></button>
            </div>
            <div className="font-sans text-[14px] leading-relaxed whitespace-pre-wrap text-sub">{pop.content}</div>
          </div>
        </div>
      )}
    </footer>
  );
}
