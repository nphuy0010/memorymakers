"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";

type Msg = { id: string; content: string; fromAdmin: boolean; createdAt: string };

export default function Chatbot() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const load = () => { if (user) api.messages().then(setMsgs).catch(() => {}); };
  // mở hộp chat -> tải tin + poll để nhận trả lời của admin
  useEffect(() => {
    if (!open || !user) return;
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9 }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const optimistic: Msg = { id: "tmp" + Date.now(), content: text, fromAdmin: false, createdAt: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    setSending(true);
    try { await api.sendMessage(text); load(); }
    catch (e: any) { alert("Gửi tin lỗi: " + (e?.message || "")); }
    finally { setSending(false); }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-[90px] right-6 w-[330px] bg-white rounded-2xl border border-line shadow-2xl z-[60] overflow-hidden">
          <div className="bg-ink text-white px-4 py-3.5 flex justify-between items-center">
            <div>
              <div className="font-serif text-base font-semibold">Nhắn tin với shop</div>
              <div className="font-sans text-[11px] text-white/70">Memory Makers thường trả lời trong ngày</div>
            </div>
            <X size={18} className="cursor-pointer" onClick={() => setOpen(false)} />
          </div>

          {!user ? (
            <div className="p-6 text-center">
              <p className="font-sans text-sm text-sub mb-4">Đăng nhập để nhắn tin trực tiếp với shop — tin của bạn sẽ được gửi tới admin.</p>
              <button onClick={() => { setOpen(false); router.push("/login"); }} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold">Đăng nhập</button>
            </div>
          ) : (
            <>
              <div ref={bodyRef} className="p-3.5 h-[300px] overflow-y-auto flex flex-col gap-2.5">
                <div className="self-start"><div className="px-3 py-2 rounded-xl font-sans text-[13px] max-w-[230px] bg-cream text-ink">Chào bạn 👋 Bạn cần hỗ trợ gì về photobook? Nhắn cho shop nhé, admin sẽ phản hồi sớm.</div></div>
                {msgs.map((m) => (
                  <div key={m.id} className={m.fromAdmin ? "self-start" : "self-end"}>
                    {m.fromAdmin && <div className="font-sans text-[10px] text-sub mb-0.5 ml-1">Shop</div>}
                    <div className={`px-3 py-2 rounded-xl font-sans text-[13px] max-w-[230px] whitespace-pre-wrap ${m.fromAdmin ? "bg-cream text-ink" : "bg-brass text-white"}`}>{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-3 border-t border-line">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Nhập tin nhắn…" className="flex-1 border border-line rounded-full px-3.5 py-2 font-sans text-[13px] outline-none" />
                <button onClick={send} disabled={sending} className="bg-ink rounded-full w-9 h-9 grid place-items-center disabled:opacity-50"><Send size={15} className="text-white" /></button>
              </div>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="mm-float fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brass grid place-items-center shadow-lg z-[60]">
        <MessageCircle size={24} className="text-white" />
      </button>
    </>
  );
}
