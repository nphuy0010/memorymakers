"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Footer() {
  const [about, setAbout] = useState<any>(null);
  useEffect(() => { api.about().then(setAbout).catch(() => {}); }, []);
  return (
    <footer className="bg-ink text-paper px-5 pt-10 pb-7 mt-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-3 gap-9">
        <div>
          <div className="font-serif text-[22px] font-bold">Memory Makers</div>
          <p className="font-sans text-[13px] text-[#C9C0B3] mt-2.5 leading-relaxed max-w-[320px]">{about?.mission}</p>
        </div>
        <div>
          <div className="font-sans text-xs tracking-[2px] text-brass uppercase mb-3">Chính sách</div>
          {["Mua hàng", "Thanh toán", "Đổi trả", "Vận chuyển", "Bảo mật"].map(p => (
            <div key={p} className="font-sans text-sm text-[#C9C0B3] mb-2">Chính sách {p.toLowerCase()}</div>
          ))}
        </div>
        <div>
          <div className="font-sans text-xs tracking-[2px] text-brass uppercase mb-3">Kết nối</div>
          {[about?.instagram, about?.tiktok, about?.hotline].filter(Boolean).map((p: string) => (
            <div key={p} className="font-sans text-sm text-[#C9C0B3] mb-2">{p}</div>
          ))}
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto mt-6 pt-4 border-t border-[#463F37] font-sans text-xs text-[#8C8377]">© 2026 Memory Makers.</div>
    </footer>
  );
}
