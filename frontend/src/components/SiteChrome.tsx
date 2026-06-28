"use client";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";

// Trang /prototype là bản demo all-in-one (tự render header/footer riêng) -> ẩn chrome toàn cục.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "";
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
