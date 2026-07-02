"use client";
import { BookOpen, Book, Monitor } from "lucide-react";

const C = { ink: "#2A2520", sub: "#6B6258", brass: "#B08D57", blush: "#E8C9C1", cream2: "#EFE7DA", line: "#E5DCCF" };

/* Logo: monogram (sách mở + lấp lánh) + chữ ký nghệ thuật — giống bản demo */
export function Logo({ size = 40, light = false, withText = true }: { size?: number; light?: boolean; withText?: boolean }) {
  const ink = light ? "#F6F1E9" : C.ink;
  const subc = light ? "#C9C0B3" : C.sub;
  return (
    <div className="mm-logo" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg className="mm-mark" width={size} height={size} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="mmGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E8C9C1" /><stop offset="0.55" stopColor="#D9A99E" /><stop offset="1" stopColor="#B08D57" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="13" fill="url(#mmGrad)" />
        <rect x="3.6" y="3.6" width="40.8" height="40.8" rx="12.4" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.1" />
        <path d="M24 16.5c-2.9-2-6.2-2.2-9-1.3v14.6c2.8-.9 6.1-.7 9 1.3 2.9-2 6.2-2.2 9-1.3V15.2c-2.8-.9-6.1-.7-9 1.3Z" fill="#FFFDF9" fillOpacity="0.96" />
        <path d="M24 16.5v14.3" stroke="#B08D57" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M17.5 19.2c1.7-.5 3.4-.4 4.9.4M17.5 22.4c1.7-.5 3.4-.4 4.9.4M25.6 19.6c1.5-.8 3.2-.9 4.9-.4M25.6 22.8c1.5-.8 3.2-.9 4.9-.4" stroke="#D9A99E" strokeWidth="1" strokeLinecap="round" />
        <path className="mm-twinkle" d="M35.5 10.2c.45 1.85 1.1 2.5 2.95 2.95-1.85.45-2.5 1.1-2.95 2.95-.45-1.85-1.1-2.5-2.95-2.95 1.85-.45 2.5-1.1 2.95-2.95Z" fill="#FFFDF9" />
      </svg>
      {withText && (
        <div style={{ textAlign: "left", lineHeight: 1 }}>
          <div style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: size * 0.5, fontWeight: 700, color: ink, letterSpacing: 0.2 }}>
            <span style={{ fontStyle: "italic", color: light ? "#E8C9C1" : C.brass }}>Memory</span> Makers
          </div>
          <svg width={size * 3.4} height="8" viewBox="0 0 160 8" style={{ display: "block", marginTop: 2 }} preserveAspectRatio="none">
            <path className="mm-swash" d="M3 5 C 30 1.5, 55 1.5, 80 4 S 130 7, 157 2.5" stroke={light ? "#E8C9C1" : C.brass} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 8.5, letterSpacing: 3, color: subc, textTransform: "uppercase", marginTop: 3 }}>AI Photobook Studio</div>
        </div>
      )}
    </div>
  );
}

/* Dải nan quạt trang trí */
export function FanMotif({ h = 44, n = 22 }: { h?: number; n?: number }) {
  return (
    <div style={{ display: "flex", height: h }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ flex: 1, background: i % 2 ? C.blush : C.cream2, transform: `skewX(${i % 2 ? 8 : -8}deg)`, borderRight: `1px solid ${C.line}` }} />
      ))}
    </div>
  );
}

/* Icon loại bìa */
export function CatIcon({ id }: { id: string }) {
  if (id === "fan") return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21 L4.5 9.5" /><path d="M12 21 L9 8" /><path d="M12 21 L15 8" /><path d="M12 21 L19.5 9.5" /><path d="M4.5 9.5 Q12 4.5 19.5 9.5" />
    </svg>
  );
  const map: Record<string, any> = { soft: BookOpen, hard: Book, digital: Monitor };
  const I = map[id] || BookOpen;
  return <I size={22} color="#fff" />;
}

export const GRADS: [string, string][] = [
  ["#E8C9C1", "#D9A99E"], ["#C9D6C2", "#9CA98C"], ["#E5D5B8", "#B08D57"], ["#CBD5DE", "#94A8BC"],
];
