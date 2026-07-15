"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// 5 mục cố định giống bản gốc; click -> mở /policies (không còn popup)
const POLICY_LABELS: [string, string][] = [
  ["muahang", "Mua hàng"], ["thanhtoan", "Thanh toán"], ["doitra", "Đổi trả"], ["vanchuyen", "Vận chuyển"], ["baomat", "Bảo mật"],
];

export default function Footer() {
  const [about, setAbout] = useState<any>(null);
  useEffect(() => { api.about().then(setAbout).catch(() => {}); }, []);
  return (
    <footer className="bg-ink text-paper px-5 pt-10 pb-7 mt-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-9">
        <div>
          <div className="font-serif text-2xl font-bold mb-3">Memory Makers</div>
          <p className="font-sans text-sm text-[#C9C0B3] leading-relaxed max-w-[320px]">{about?.mission || "Biến ảnh trong điện thoại của bạn thành sách kỷ niệm in thật — thiết kế sẵn, AI xếp giúp."}</p>
        </div>
        <div>
          <div className="font-sans text-xs tracking-[2px] text-brass uppercase mb-3">Chính sách</div>
          {POLICY_LABELS.map(([id, label]) => (
            <Link key={id} href={`/policies#${id}`} className="block font-sans text-sm text-[#C9C0B3] mb-2 hover:text-white">Chính sách {label.toLowerCase()}</Link>
          ))}
        </div>
        {/* KẾT NỐI: ô nào trống thì ẩn; cả 3 trống thì ẩn nguyên cột */}
        {[about?.instagram, about?.tiktok, about?.hotline].some((v) => (v || "").trim()) && (
          <div>
            <div className="font-sans text-xs tracking-[2px] text-brass uppercase mb-3">Kết nối</div>
            {(about?.instagram || "").trim() && <div className="font-sans text-sm text-[#C9C0B3] mb-2">{about.instagram}</div>}
            {(about?.tiktok || "").trim() && <div className="font-sans text-sm text-[#C9C0B3] mb-2">{about.tiktok}</div>}
            {(about?.hotline || "").trim() && <div className="font-sans text-sm text-[#C9C0B3] mb-2">{about.hotline}</div>}
          </div>
        )}
      </div>
      <div className="max-w-[1200px] mx-auto mt-6 pt-4 border-t border-[#463F37] font-sans text-xs text-[#8C8377]">© {new Date().getFullYear()} Memory Makers.</div>
    </footer>
  );
}
