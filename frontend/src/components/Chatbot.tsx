"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { api } from "@/lib/api";
import type { Template } from "@/lib/types";

type Msg = { from: "bot" | "user"; text: string; sugg?: Template[] };

export default function Chatbot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Template[]>([]);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Chào bạn 👋 Bạn muốn làm photobook về chủ đề gì? (vd: du lịch, sinh nhật, cưới) — mình gợi ý mẫu phù hợp." },
  ]);

  useEffect(() => { api.templates().then(setAll).catch(() => {}); }, []);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs((m) => [...m, { from: "user", text }]);
    // gợi ý mẫu giống cơ chế thanh tìm kiếm: khớp keyword/title
    const k = text.toLowerCase();
    const sugg = all.filter(t => t.title.toLowerCase().includes(k) || t.keywords.some(w => k.includes(w.toLowerCase()) || w.toLowerCase().includes(k))).slice(0, 4);
    setTimeout(() => {
      setMsgs((m) => [...m, sugg.length
        ? { from: "bot", text: `Mình tìm thấy ${sugg.length} mẫu hợp với “${text}”:`, sugg }
        : { from: "bot", text: "Chưa thấy mẫu khớp. Thử từ khóa khác như “du lịch”, “gia đình”, “tốt nghiệp” nhé!" }]);
    }, 500);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-[90px] right-6 w-[330px] bg-white rounded-2xl border border-line shadow-2xl z-[60] overflow-hidden">
          <div className="bg-ink text-white px-4 py-3.5 flex justify-between items-center">
            <span className="font-serif text-base font-semibold">Trợ lý Memory Makers</span>
            <X size={18} className="cursor-pointer" onClick={() => setOpen(false)} />
          </div>
          <div className="p-3.5 h-[300px] overflow-y-auto flex flex-col gap-2.5">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "bot" ? "self-start" : "self-end"}>
                <div className={`px-3 py-2 rounded-xl font-sans text-[13px] max-w-[220px] ${m.from === "bot" ? "bg-cream text-ink" : "bg-brass text-white"}`}>{m.text}</div>
                {m.sugg && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {m.sugg.map(t => (
                      <button key={t.id} onClick={() => router.push(`/preview/${t.id}`)} className="text-left bg-white border border-line rounded-lg p-1.5">
                        <div className="aspect-square rounded-md overflow-hidden bg-cream">
                          {(t.demoImage || t.blankImage) && <img src={(t.demoImage || t.blankImage)!} className="w-full h-full object-cover" />}
                        </div>
                        <div className="font-sans text-[11px] text-ink mt-1 font-semibold leading-tight">{t.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 p-3 border-t border-line">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Nhập chủ đề / prompt…" className="flex-1 border border-line rounded-full px-3.5 py-2 font-sans text-[13px] outline-none" />
            <button onClick={send} className="bg-ink rounded-full w-9 h-9 grid place-items-center"><Send size={15} className="text-white" /></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brass grid place-items-center shadow-lg z-[60]">
        <MessageCircle size={24} className="text-white" />
      </button>
    </>
  );
}
