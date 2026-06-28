"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, Package, Users, Pencil, ListOrdered } from "lucide-react";
import { useAuth } from "@/store/useAuth";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutGrid },
  { href: "/admin/orders", label: "Đơn hàng", icon: ListOrdered },
  { href: "/admin/templates", label: "Template", icon: Package },
  { href: "/admin/users", label: "Tài khoản", icon: Users },
  { href: "/admin/about", label: "Trang About", icon: Pencil },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, hydrate } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("mm_token")) { router.push("/login"); return; }
  }, [router]);
  useEffect(() => { if (user && user.role !== "ADMIN") router.push("/"); }, [user, router]);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-7 grid md:grid-cols-[210px_1fr] gap-6">
      <aside>
        <div className="font-serif text-lg text-ink font-bold mb-4">Quản trị</div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex gap-2.5 items-center px-3.5 py-2.5 rounded-lg mb-1.5 font-sans text-sm ${pathname === href ? "bg-ink text-paper" : "text-ink"}`}>
            <Icon size={17} /> {label}
          </Link>
        ))}
      </aside>
      <main>{children}</main>
    </div>
  );
}
