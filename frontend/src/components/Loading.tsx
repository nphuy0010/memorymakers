"use client";
import { Loader2 } from "lucide-react";

// Hiển thị "đang tải" giữa vùng nội dung (tránh nhấp nháy trạng thái rỗng khi backend còn chậm)
export default function Loading({ text = "Đang tải…", pad = 60 }: { text?: string; pad?: number }) {
  return (
    <div className="w-full grid place-items-center text-sub" style={{ padding: `${pad}px 0` }}>
      <Loader2 className="animate-spin text-brass" size={30} />
      <div className="font-sans text-sm mt-3">{text}</div>
    </div>
  );
}

// Khung xám nhấp nháy (skeleton) cho lưới thẻ
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-3 border border-line">
          <div className="rounded-2xl bg-cream animate-pulse" style={{ aspectRatio: "3/2" }} />
          <div className="h-4 bg-cream animate-pulse rounded mt-3 w-2/3" />
          <div className="h-8 bg-cream animate-pulse rounded-full mt-3" />
        </div>
      ))}
    </div>
  );
}
