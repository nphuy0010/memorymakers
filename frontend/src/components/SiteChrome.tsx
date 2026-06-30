"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import { useAuth } from "@/store/useAuth";
import { api } from "@/lib/api";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "";
  const hydrate = useAuth((s) => s.hydrate);
  const logout = useAuth((s) => s.logout);
  useEffect(() => {
    hydrate(); // nạp phiên đăng nhập NGAY khi mở web
    // Kiểm tra phiên với DB hiện tại: nếu token trỏ user đã bị xoá (vd sau reset DB) -> đăng xuất để buộc login lại.
    if (typeof window !== "undefined" && localStorage.getItem("mm_token")) {
      api.me().catch((e: any) => { if (e?.status === 401 || e?.status === 404) logout(); });
    }
  }, [hydrate, logout]);
  if (path.startsWith("/prototype")) return <>{children}</>;
  return (
    <>
      <Header />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
      <Chatbot />
    </>
  );
}
