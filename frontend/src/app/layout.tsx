import type { Metadata } from "next";
import { EB_Garamond, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

// Font tối ưu bằng next/font: tự host, preload, không giật layout. Có subset tiếng Việt -> không lỗi dấu.
const serif = EB_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memory Makers — AI Photobook Studio",
  description: "Chọn mẫu, thêm ảnh — AI điền ảnh vào đúng chỗ. Photobook in & digital.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
