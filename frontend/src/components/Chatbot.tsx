"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Trash2 } from "lucide-react";
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
    const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9 }); }, [msgs]);

  const [clearAsk, setClearAsk] = useState(false); // confirm xoá CẢ ĐOẠN chat
  const clearChat = async () => {
    setClearAsk(false);
    try { await api.clearMyChat(); setMsgs([]); } // giao diện về trống — nhắn lại bình thường
    catch (e: any) { alert(e?.message || "Không xoá được"); }
  };
  // Báo cho nút ? biết chat đang mở để tự ẩn (tránh popup đè lên nút ?)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mm-chat-open", { detail: { open } }));
  }, [open]);
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
        <div className="fixed bottom-[72px] right-3 left-3 md:bottom-[90px] md:right-6 md:left-auto md:w-[330px] bg-white rounded-2xl border border-line shadow-2xl z-[999] overflow-hidden" style={{ maxHeight: "min(560px, calc(100vh - 110px))" }}>
          <div className="bg-ink text-white px-4 py-3.5 flex justify-between items-center">
            <div>
              <div className="font-serif text-base font-semibold">Nhắn tin với shop</div>
              <div className="font-sans text-[11px] text-white/70">Memory Makers thường trả lời trong ngày</div>
            </div>
            <div className="flex items-center gap-3">
              <Trash2 size={16} className="cursor-pointer text-white/45 hover:text-white/90 transition-colors" onClick={() => setClearAsk(true)} aria-label="Xoá đoạn chat" />
              <X size={18} className="cursor-pointer" onClick={() => setOpen(false)} />
            </div>
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
      <button onClick={() => setOpen(o => !o)} className="mm-float fixed bottom-4 right-4 md:bottom-6 md:right-6 w-11 h-11 md:w-14 md:h-14 rounded-full bg-brass grid place-items-center shadow-lg z-[999]">
        <MessageCircle size={24} className="text-white" />
      </button>
      {/* CONFIRM XOÁ CẢ ĐOẠN CHAT */}
      {clearAsk && (
        <div className="fixed inset-0 z-[98] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.55)" }}>
          <div className="bg-paper rounded-2xl border border-line w-full max-w-[300px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-lg text-ink font-bold mb-1">Xoá đoạn chat này?</div>
            <p className="font-sans text-[12.5px] text-sub mb-4">Bạn sẽ không thấy lịch sử tin nhắn nữa. Shop vẫn thấy đoạn chat bình thường. Nếu shop nhắn tiếp, đoạn chat sẽ hiện lại chỉ với tin nhắn mới.</p>
            <button onClick={clearChat} className="w-full mb-2 bg-[#B05A4A] text-white rounded-full py-2.5 font-sans text-sm font-semibold">Xoá</button>
            <button onClick={() => setClearAsk(false)} className="w-full text-sub font-sans text-sm py-1.5">Huỷ</button>
          </div>
        </div>
      )}
    </>
  );
}
