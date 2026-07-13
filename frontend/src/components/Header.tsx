"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wand2, User, LogOut, Lock, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Logo } from "@/components/Brand";
import AIDesignModal from "@/components/AIDesignModal";
import type { Template } from "@/lib/types";

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [all, setAll] = useState<Template[]>([]);
  const [menu, setMenu] = useState(false);
  const [ai, setAi] = useState(false);
  const [cart, setCart] = useState(0);

  useEffect(() => { api.templates().then(setAll).catch(() => {}); }, []);
  // Đếm đơn ĐANG THIẾT KẾ / CHƯA THANH TOÁN (DESIGNING + DESIGNED) -> nốt đỏ trên giỏ
  useEffect(() => {
    if (!user) { setCart(0); return; }
    const refresh = () => api.projects().then((ps: any[]) => setCart(ps.filter(p => p.status === "DESIGNING" || p.status === "DESIGNED").length)).catch(() => {});
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(t); };
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 py-3 flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5"><span className="hidden sm:block"><Logo size={40} /></span><span className="sm:hidden"><Logo size={32} /></span></Link>
          <div className="flex-1" />
          <nav className="flex items-center gap-2.5 md:gap-[18px] font-sans text-sm">
            <Link href="/templates" className="mm-nav text-ink whitespace-nowrap text-[12.5px] md:text-sm">Mẫu thiết kế</Link>
            <Link href="/about" className="mm-nav text-ink whitespace-nowrap text-[12.5px] md:text-sm">Về chúng tôi</Link>
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="mm-nav flex items-center gap-1 text-ink text-[12.5px] md:text-sm"><Lock size={14} /> Admin</Link>
            )}
            <button onClick={() => setAi(true)} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-3.5 py-2 md:px-5 md:py-2.5 font-sans font-semibold whitespace-nowrap">
              <Wand2 size={16} /> <span className="hidden sm:inline">Thiết kế với AI</span><span className="sm:hidden">AI</span>
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/account" className="relative mm-btn grid place-items-center w-10 h-10 rounded-full border border-line bg-white" title="Đơn & dự án của tôi">
                  <ShoppingBag size={18} className="text-ink" />
                  {cart > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D9534F] text-white text-[11px] font-bold grid place-items-center">{cart > 99 ? "99+" : cart}</span>}
                </Link>
                <div className="relative">
                  <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2">
                    <span className="w-[30px] h-[30px] rounded-full bg-brass text-white grid place-items-center font-semibold text-[13px]">{user.name[0]?.toUpperCase()}</span>
                  </button>
                  {menu && (
                    <div className="absolute top-11 right-0 bg-white border border-line rounded-xl shadow-xl min-w-[180px] overflow-hidden z-50">
                      <Link href="/account" onClick={() => setMenu(false)} className="flex gap-2 items-center px-4 py-3 text-sm text-ink hover:bg-cream"><User size={15} /> Dự án của tôi</Link>
                      <button onClick={() => { setMenu(false); logout(); router.push("/"); }} className="w-full flex gap-2 items-center px-4 py-3 text-sm text-[#B05A4A] hover:bg-cream"><LogOut size={15} /> Đăng xuất</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/login" className="mm-btn flex items-center gap-1.5 border border-ink rounded-full px-4 py-2 text-ink"><User size={15} /> Đăng nhập</Link>
            )}
          </nav>
        </div>
      </header>

      {ai && <AIDesignModal templates={all} onClose={() => setAi(false)} onUse={(t) => { setAi(false); router.push(`/design/${t.id}`); }} />}
    </>
  );
}
