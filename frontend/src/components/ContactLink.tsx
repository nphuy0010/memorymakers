"use client";
import React from "react";

// Rút gọn URL làm tên hiển thị khi admin chỉ nhập link:
//  https://instagram.com/memorymakers -> memorymakers ; tel:0909xxxxxx -> 0909xxxxxx
export function shortNameFromUrl(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("tel:")) return u.slice(4);
  try {
    const p = new URL(u);
    const last = p.pathname.replace(/\/+$/, "").split("/").pop() || "";
    return (last.replace(/^@/, "") || p.hostname.replace(/^www\./, ""));
  } catch { return u; }
}

/**
 * Kênh liên hệ (Instagram/TikTok/Hotline):
 *  - name + url  -> hiển thị name, bấm mở link (tab mới; tel: mở app gọi)
 *  - chỉ name    -> text thường, không bấm được, không hover
 *  - chỉ url     -> hiển thị link rút gọn làm tên, bấm được
 *  - cả 2 trống  -> không render
 */
export default function ContactLink({ name, url, icon, className = "" }: {
  name?: string | null; url?: string | null; icon?: React.ReactNode; className?: string;
}) {
  const n = (name || "").trim();
  const u = (url || "").trim();
  if (!n && !u) return null;
  const label = n || shortNameFromUrl(u);
  const inner = <>{icon}{label}</>;
  if (!u) return <span className={className}>{inner}</span>; // chỉ tên -> text thường
  const isTel = u.startsWith("tel:");
  return (
    <a href={u} target={isTel ? undefined : "_blank"} rel={isTel ? undefined : "noopener noreferrer"}
      className={className + " cursor-pointer transition-colors hover:underline"}>
      {inner}
    </a>
  );
}

/** Kênh có nội dung để hiển thị? (dùng để ẩn cả section khi tất cả trống) */
export function hasContact(name?: string | null, url?: string | null) {
  return !!((name || "").trim() || (url || "").trim());
}
