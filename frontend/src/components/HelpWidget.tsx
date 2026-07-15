"use client";
import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { api } from "@/lib/api";

// Đổi URL YouTube/Vimeo dạng xem thường -> dạng nhúng iframe; mp4/webm -> dùng <video>
function toEmbed(url: string): { kind: "iframe" | "video"; src: string } {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  if (u.includes("youtube.com/embed/")) return { kind: "iframe", src: u };
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: "video", src: u }; // mp4/webm/Cloudinary
}

export default function HelpWidget() {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.getHelpVideo().then((r: any) => setUrl(r?.url || null)).catch(() => {}); }, []);

  if (!url) return null; // admin chưa nhập URL -> ẩn hoàn toàn nút ?
  const emb = toEmbed(url);

  return (
    <>
      {open && (
        <div className="fixed bottom-[160px] right-6 w-[330px] md:w-[380px] bg-white rounded-2xl border border-line shadow-2xl z-[60] overflow-hidden">
          {/* Header giống khung chat */}
          <div className="flex items-center justify-between px-4 py-3 bg-brass">
            <div>
              <div className="font-serif text-[15px] text-white font-bold leading-tight">Hướng dẫn sử dụng</div>
              <div className="font-sans text-[11.5px] text-white/85">Xem video để bắt đầu nhanh hơn</div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 grid place-items-center rounded-full bg-white/20"><X size={15} className="text-white" /></button>
          </div>
          <div className="bg-ink" style={{ aspectRatio: "16/9" }}>
            {emb.kind === "iframe"
              ? <iframe src={emb.src} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Hướng dẫn sử dụng" />
              : <video src={emb.src} controls playsInline className="w-full h-full object-contain" />}
          </div>
        </div>
      )}
      {/* Nút ? — giống hệt nút chat, đặt PHÍA TRÊN nút chat ~14px (chat: bottom-6 h-14 => 24+56+14 = 94px) */}
      <button onClick={() => setOpen(o => !o)} aria-label="Hướng dẫn sử dụng"
        className="mm-float fixed right-6 w-14 h-14 rounded-full bg-brass grid place-items-center shadow-lg z-[60]" style={{ bottom: 94 }}>
        <HelpCircle size={24} className="text-white" />
      </button>
    </>
  );
}
