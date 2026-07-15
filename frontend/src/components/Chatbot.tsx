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
    const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9 }); }, [msgs]);

  const [delTarget, setDelTarget] = useState<string | null>(null); // tin nhắn đang hỏi xóa
  const pressTimer = useRef<any>(null);
  const doDelete = async (mode: "recall" | "self") => {
    const id = delTarget; setDelTarget(null);
    if (!id) return;
    try {
      await api.deleteMessage(id, mode);
      if (mode === "self") setMsgs((ms) => ms.filter((x) => x.id !== id)); // ẩn phía tôi
      else setMsgs((ms) => ms.map((x) => x.id === id ? { ...x, recalled: true, content: "" } : x)); // thu hồi 2 phía
    } catch (e: any) { alert(e?.message || "Không xóa được"); }
  };
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
                  <div key={m.id} className={m.fromAdmin ? "self-start" : "self-end group relative"}>
                    {m.fromAdmin && <div className="font-sans text-[10px] text-sub mb-0.5 ml-1">Shop</div>}
                    {(m as any).recalled ? (
                      <div className="px-3 py-2 rounded-xl font-sans text-[12px] italic text-sub border border-dashed border-line bg-transparent">Tin nhắn đã được thu hồi</div>
                    ) : (
                      <div className={`px-3 py-2 rounded-xl font-sans text-[13px] max-w-[230px] whitespace-pre-wrap ${m.fromAdmin ? "bg-cream text-ink" : "bg-brass text-white"}`}
                        onTouchStart={() => { if (!m.fromAdmin) pressTimer.current = setTimeout(() => setDelTarget(m.id), 500); }}
                        onTouchEnd={() => clearTimeout(pressTimer.current)} onTouchMove={() => clearTimeout(pressTimer.current)}>
                        {m.content}
                      </div>
                    )}
                    {!m.fromAdmin && !(m as any).recalled && (
                      <button onClick={() => setDelTarget(m.id)} title="Xóa tin nhắn"
                        className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cream border border-line hidden group-hover:grid place-items-center">
                        <X size={11} className="text-[#B05A4A]" />
                      </button>
                    )}
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
      {/* CONFIRM XÓA kiểu Messenger: Thu hồi / Xoá ở phía tôi / Huỷ */}
      {delTarget && (
        <div className="fixed inset-0 z-[98] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.55)" }} onClick={() => setDelTarget(null)}>
          <div className="bg-paper rounded-2xl border border-line w-full max-w-[300px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-lg text-ink font-bold mb-1">Xoá tin nhắn này?</div>
            <p className="font-sans text-[12.5px] text-sub mb-4">Thu hồi sẽ xoá ở cả hai phía; Xoá ở phía tôi chỉ ẩn với bạn.</p>
            <button onClick={() => doDelete("recall")} className="w-full mb-2 bg-[#B05A4A] text-white rounded-full py-2.5 font-sans text-sm font-semibold">Thu hồi</button>
            <button onClick={() => doDelete("self")} className="w-full mb-2 bg-cream text-ink border border-line rounded-full py-2.5 font-sans text-sm font-semibold">Xoá ở phía tôi</button>
            <button onClick={() => setDelTarget(null)} className="w-full text-sub font-sans text-sm py-1.5">Huỷ</button>
          </div>
        </div>
      )}
    </>
  );
}
