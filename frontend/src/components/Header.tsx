"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles, User, LogOut, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import type { Template } from "@/lib/types";

export default function Header() {
  const router = useRouter();
  const { user, logout, hydrate } = useAuth();
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { api.templates().then(setAll).catch(() => {}); }, []);

  // gợi ý: khớp từng ký tự theo title/keyword
  const sugg = useMemo(() => {
    const k = q.toLowerCase().trim();
    if (!k) return [];
    return all.filter(t => t.title.toLowerCase().includes(k) || t.keywords.some(w => w.toLowerCase().includes(k))).slice(0, 5);
  }, [q, all]);

  const submit = () => { router.push(`/templates?q=${encodeURIComponent(q)}`); setOpen(false); };

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-line">
      <div className="max-w-[1200px] mx-auto px-5 py-3 flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Sparkles size={22} className="text-brass" />
          <div>
            <div className="font-serif text-[20px] font-bold text-ink leading-none">Memory Makers</div>
            <div className="font-sans text-[8.5px] tracking-[3px] text-sub uppercase">AI Photobook Studio</div>
          </div>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-[420px] relative">
          <div className="flex items-center gap-2 bg-white border border-line rounded-full px-4 py-2">
            <Search size={16} className="text-sub" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Tìm mẫu: du lịch, sinh nhật, cưới…"
              className="flex-1 bg-transparent outline-none font-sans text-sm text-ink"
            />
          </div>
          {open && sugg.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-white border border-line rounded-2xl shadow-xl overflow-hidden z-50">
              {sugg.map(t => (
                <button key={t.id} onMouseDown={() => router.push(`/preview/${t.id}`)}
                  className="w-full flex gap-3 items-center p-2.5 border-b border-line hover:bg-cream text-left">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                    {(t.demoImage || t.blankImage) && <img src={(t.demoImage || t.blankImage)!} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <div className="font-sans text-sm font-semibold text-ink">{t.title}</div>
                    <div className="font-sans text-xs text-sub">{t.keywords[0] || "photobook"}</div>
                  </div>
                </button>
              ))}
              <button onMouseDown={submit} className="w-full p-2.5 bg-cream text-brass font-sans text-sm font-semibold">
                Xem tất cả kết quả cho “{q}”
              </button>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-5 font-sans text-sm">
          <Link href="/templates" className="text-ink">Mẫu thiết kế</Link>
          <Link href="/about" className="text-ink">Về chúng tôi</Link>
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="flex items-center gap-1.5 text-ink"><Lock size={15} /> Admin</Link>
          )}
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-brass text-white grid place-items-center font-semibold text-sm">{user.name[0]?.toUpperCase()}</span>
                <span className="text-ink">{user.name.split(" ").slice(-1)[0]}</span>
              </button>
              {menu && (
                <div className="absolute top-11 right-0 bg-white border border-line rounded-xl shadow-xl min-w-[180px] overflow-hidden z-50">
                  <Link href="/account" onClick={() => setMenu(false)} className="flex gap-2 items-center px-4 py-3 text-sm text-ink hover:bg-cream"><User size={15} /> Dự án của tôi</Link>
                  <button onClick={() => { setMenu(false); logout(); router.push("/"); }} className="w-full flex gap-2 items-center px-4 py-3 text-sm text-[#B05A4A] hover:bg-cream"><LogOut size={15} /> Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 border border-ink rounded-full px-4 py-2 text-ink"><User size={15} /> Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
