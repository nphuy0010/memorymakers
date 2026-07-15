"use client";
// FONT cho trình thiết kế — nhóm Serif / Sans / Viết tay. `vi: false` = KHÔNG hỗ trợ tiếng Việt có dấu
// (dựa theo subset "vietnamese" của Google Fonts). Các font thiếu dấu vẫn dùng được cho chữ không dấu/tiếng Anh.
import { useEffect } from "react";

export type FontDef = { name: string; vi: boolean };
export const FONT_GROUPS: { label: string; fonts: FontDef[] }[] = [
  {
    label: "Serif (trang trọng)",
    fonts: [
      { name: "Playfair Display", vi: true },
      { name: "Lora", vi: true },
      { name: "EB Garamond", vi: true },
      { name: "Cormorant Garamond", vi: true },
      { name: "Crimson Text", vi: false },
    ],
  },
  {
    label: "Sans-serif (hiện đại)",
    fonts: [
      { name: "Be Vietnam Pro", vi: true },
      { name: "Inter", vi: true },
      { name: "Montserrat", vi: true },
      { name: "Raleway", vi: true },
      { name: "Nunito", vi: true },
      { name: "Quicksand", vi: true },
      { name: "Lexend", vi: true },
      { name: "Josefin Sans", vi: true },
      { name: "Poppins", vi: false },
    ],
  },
  {
    label: "Viết tay (handwriting)",
    fonts: [
      { name: "Dancing Script", vi: true },
      { name: "Pacifico", vi: true },
      { name: "Caveat", vi: false },
      { name: "Satisfy", vi: false },
      { name: "Great Vibes", vi: false },
    ],
  },
];
export const ALL_FONTS: FontDef[] = FONT_GROUPS.flatMap((g) => g.fonts);

// Map giá trị CŨ ("serif"/"sans") -> font mới để text đã lưu trước đây vẫn hiển thị đúng
export function fontCss(font?: string) {
  if (!font || font === "serif") return "var(--font-serif), Georgia, serif";
  if (font === "sans") return "var(--font-sans), sans-serif";
  return `"${font}", sans-serif`;
}

const HREF = "https://fonts.googleapis.com/css2?" +
  ALL_FONTS.map((f) => "family=" + f.name.replace(/ /g, "+") + ":wght@400;600;700").join("&") +
  "&display=swap";

/** Nạp toàn bộ font Google 1 lần (link duy nhất, cache chung giữa các trang). */
export default function FontLoader() {
  useEffect(() => {
    if (document.querySelector('link[data-mm-fonts]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = HREF; l.setAttribute("data-mm-fonts", "1");
    document.head.appendChild(l);
  }, []);
  return null;
}
