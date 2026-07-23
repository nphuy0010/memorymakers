"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wand2, User, LogOut, Lock, ShoppingBag, Pencil, Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { useCart } from "@/store/useCart";
import { Logo } from "@/components/Brand";
import AIDesignModal from "@/components/AIDesignModal";
import type { Template } from "@/lib/types";

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [all, setAll] = useState<Template[]>([]);
  const [menu, setMenu] = useState(false);
  const [ai, setAi] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // menu hamburger (mobile)
  const { items: cartItems } = useCart();
  const cartCount = cartItems.length;

  useEffect(() => { api.templates().then(setAll).catch(() => {}); }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-line">
        <div className="max-w-[1200px] mx-auto px-3 md:px-5 py-2.5 md:py-3 flex items-center gap-2 md:gap-5">
          <Link href="/" className="flex items-center gap-2.5"><span className="hidden sm:block"><Logo size={40} /></span><span className="sm:hidden"><Logo size={32} /></span></Link>
          <div className="flex-1" />
          <nav className="flex items-center gap-2 md:gap-[18px] font-sans text-sm shrink-0">
            <Link href="/templates" className="hidden md:inline mm-nav text-ink whitespace-nowrap text-sm">Mẫu thiết kế</Link>
            <Link href="/about" className="hidden md:inline mm-nav text-ink whitespace-nowrap text-sm">Về chúng tôi</Link>
            <button onClick={() => setAi(true)} className="mm-btn hidden md:flex items-center gap-2 bg-brass text-white rounded-full px-5 py-2.5 font-sans font-semibold whitespace-nowrap">
              <Wand2 size={16} /> Thiết kế với AI
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/cart" className="relative mm-btn grid place-items-center w-9 h-9 md:w-10 md:h-10 rounded-full border border-line bg-white" title="Giỏ hàng">
                  <ShoppingBag size={18} className="text-ink" />
                  {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D9534F] text-white text-[11px] font-bold grid place-items-center">{cartCount > 99 ? "99+" : cartCount}</span>}
                </Link>
                <div className="relative">
                  <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2">
                    {user.avatar
                      ? <img src={user.avatar} className="w-[30px] h-[30px] rounded-full object-cover border border-line" alt="avatar" />
                      : <span className="w-[30px] h-[30px] rounded-full bg-brass text-white grid place-items-center font-semibold text-[13px]">{user.name[0]?.toUpperCase()}</span>}
                  </button>
                  {menu && (
                    <div className="absolute top-11 right-0 bg-white border border-line rounded-xl shadow-xl min-w-[180px] overflow-hidden z-50">
                      <Link href="/account" onClick={() => setMenu(false)} className="flex gap-2 items-center px-4 py-3 text-sm text-ink hover:bg-cream"><User size={15} /> Dự án của tôi</Link>
                      <Link href="/profile" onClick={() => setMenu(false)} className="flex gap-2 items-center px-4 py-3 text-sm text-ink hover:bg-cream"><Pencil size={15} /> Tùy chỉnh cá nhân</Link>
                      {user.role === "ADMIN" && <Link href="/admin" onClick={() => setMenu(false)} className="flex gap-2 items-center px-4 py-3 text-sm text-ink hover:bg-cream"><Lock size={15} /> Trang quản trị</Link>}
                      <button onClick={() => { setMenu(false); logout(); router.push("/"); }} className="w-full flex gap-2 items-center px-4 py-3 text-sm text-[#B05A4A] hover:bg-cream"><LogOut size={15} /> Đăng xuất</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/login" className="mm-btn flex items-center gap-1.5 border border-ink rounded-full px-3 md:px-4 py-2 text-ink shrink-0"><User size={15} /> <span className="hidden sm:inline">Đăng nhập</span></Link>
            )}

            {/* HAMBURGER (chỉ mobile) — chứa Mẫu thiết kế / Về chúng tôi / Thiết kế với AI */}
            <button onClick={() => setNavOpen((v) => !v)} aria-label="Menu"
              className="md:hidden grid place-items-center w-9 h-9 rounded-full border border-line bg-white shrink-0">
              {navOpen ? <X size={18} className="text-ink" /> : <Menu size={18} className="text-ink" />}
            </button>
          </nav>
        </div>

        {/* Panel menu mobile */}
        {navOpen && (
          <div className="md:hidden border-t border-line bg-paper">
            <div className="max-w-[1200px] mx-auto px-3 py-2 flex flex-col">
              <Link href="/templates" onClick={() => setNavOpen(false)} className="py-3 font-sans text-sm text-ink border-b border-line/60">Mẫu thiết kế</Link>
              <Link href="/about" onClick={() => setNavOpen(false)} className="py-3 font-sans text-sm text-ink border-b border-line/60">Về chúng tôi</Link>
              <button onClick={() => { setNavOpen(false); setAi(true); }}
                className="mt-2.5 mb-1 mm-btn flex items-center justify-center gap-2 bg-brass text-white rounded-full py-2.5 font-sans font-semibold">
                <Wand2 size={16} /> Thiết kế với AI
              </button>
            </div>
          </div>
        )}
      </header>

      {ai && <AIDesignModal templates={all} onClose={() => setAi(false)} onUse={(t) => { setAi(false); router.push(`/design/${t.id}`); }} />}
    </>
  );
}
