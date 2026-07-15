"use client";
import { useEffect, useRef, useState } from "react";
import { Send, User, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

type Msg = { id: string; content: string; fromAdmin: boolean; createdAt: string };
type Convo = { userId: string; name?: string; email?: string; phone?: string; messages: Msg[]; unread: number; lastAt: string };

export default function AdminMessages() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [delTarget, setDelTarget] = useState<string | null>(null);
  // Xóa kiểu Messenger: recall = thu hồi 2 phía (hiện "đã thu hồi"); self = chỉ ẩn phía shop
  const doDelete = async (mode: "recall" | "self") => {
    const id = delTarget; setDelTarget(null);
    if (!id) return;
    try {
      await api.deleteMessage(id, mode);
      setConvos(cs => cs.map(c => ({
        ...c,
        messages: mode === "self"
          ? c.messages.filter((m: any) => m.id !== id)
          : c.messages.map((m: any) => m.id === id ? { ...m, recalled: true, content: "" } : m),
      })));
    } catch (e: any) { alert(e?.message || "Không xóa được"); }
  };
  const bodyRef = useRef<HTMLDivElement>(null);

  const load = () => api.adminMessages().then((d: Convo[]) => setConvos(d)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, 15000); return () => clearInterval(t); }, []);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9 }); }, [convos, sel]);

  const cur = convos.find(c => c.userId === sel);
  const openConvo = async (c: Convo) => { setSel(c.userId); if (c.unread > 0) { try { await api.adminMessageRead(c.userId); load(); } catch {} } };
  const sendReply = async () => {
    if (!cur || !reply.trim() || sending) return;
    const text = reply.trim(); setReply(""); setSending(true);
    try { await api.adminReply(cur.userId, text); load(); }
    catch (e: any) { alert("Gửi lỗi: " + (e?.message || "")); }
    finally { setSending(false); }
  };

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line overflow-hidden grid md:grid-cols-[280px_1fr] h-[600px]">
        {/* danh sách hội thoại */}
        <div className="border-r border-line overflow-y-auto min-h-0">
          <div className="px-4 py-3 font-serif text-lg text-ink font-bold border-b border-line">Tin nhắn ({convos.length})</div>
          {loading && convos.length === 0 && <div className="p-5 text-center font-sans text-sm text-sub"><Loader2 className="animate-spin inline text-brass" size={20} /><div className="mt-2">Đang tải…</div></div>}
          {!loading && convos.length === 0 && <div className="p-5 text-center font-sans text-sm text-sub">Chưa có tin nhắn nào từ khách.</div>}
          {convos.map(c => (
            <button key={c.userId} onClick={() => openConvo(c)} className={`w-full text-left px-4 py-3 border-b border-line flex items-center gap-3 ${sel === c.userId ? "bg-cream" : "hover:bg-cream/50"}`}>
              <span className="w-9 h-9 rounded-full bg-brass text-white grid place-items-center font-semibold shrink-0">{(c.name || "?")[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="font-sans text-sm text-ink font-semibold truncate">{c.name || "Khách"}</div>
                <div className="font-sans text-xs text-sub truncate">{c.messages[c.messages.length - 1]?.content}</div>
              </div>
              {c.unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#D9534F] text-white text-[11px] font-bold grid place-items-center">{c.unread}</span>}
            </button>
          ))}
        </div>

        {/* khung chat */}
        <div className="flex flex-col min-h-0">
          {!cur ? (
            <div className="flex-1 grid place-items-center text-sub font-sans text-sm">Chọn một hội thoại để xem & trả lời.</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-line flex items-center gap-2">
                <User size={16} className="text-brass" />
                <div className="font-sans text-sm text-ink font-semibold">{cur.name}</div>
                <div className="font-sans text-xs text-sub">· {cur.email} · {cur.phone}</div>
              </div>
              <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-2.5 bg-paper/40">
                {cur.messages.map(m => (
                  <div key={m.id} className={(m.fromAdmin ? "self-end" : "self-start") + " group relative"}>
                    {(m as any).recalled ? (
                      <div className="px-3 py-2 rounded-xl font-sans text-[12px] italic text-sub border border-dashed border-line">Tin nhắn đã được thu hồi</div>
                    ) : (
                      <div className={`px-3 py-2 rounded-xl font-sans text-[13px] max-w-[420px] whitespace-pre-wrap ${m.fromAdmin ? "bg-brass text-white" : "bg-cream text-ink"}`}>{m.content}</div>
                    )}
                    {m.fromAdmin && !(m as any).recalled && (
                      <button onClick={() => setDelTarget(m.id)} title="Xóa tin nhắn của shop"
                        className="absolute top-1/2 -translate-y-1/2 -left-6 w-5 h-5 rounded-full bg-white border border-line hidden group-hover:grid place-items-center">
                        <Trash2 size={11} className="text-[#B05A4A]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-3 border-t border-line">
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()}
                  placeholder="Trả lời khách…" className="flex-1 border border-line rounded-full px-4 py-2 font-sans text-sm outline-none" />
                <button onClick={sendReply} disabled={sending} className="bg-ink rounded-full w-10 h-10 grid place-items-center disabled:opacity-50"><Send size={16} className="text-white" /></button>
              </div>
            </>
          )}
        </div>
      </div>
      {delTarget && (
        <div className="fixed inset-0 z-[98] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.55)" }} onClick={() => setDelTarget(null)}>
          <div className="bg-paper rounded-2xl border border-line w-full max-w-[300px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-lg text-ink font-bold mb-1">Xoá tin nhắn này?</div>
            <p className="font-sans text-[12.5px] text-sub mb-4">Thu hồi sẽ xoá ở cả hai phía; Xoá ở phía tôi chỉ ẩn với shop.</p>
            <button onClick={() => doDelete("recall")} className="w-full mb-2 bg-[#B05A4A] text-white rounded-full py-2.5 font-sans text-sm font-semibold">Thu hồi</button>
            <button onClick={() => doDelete("self")} className="w-full mb-2 bg-cream text-ink border border-line rounded-full py-2.5 font-sans text-sm font-semibold">Xoá ở phía tôi</button>
            <button onClick={() => setDelTarget(null)} className="w-full text-sub font-sans text-sm py-1.5">Huỷ</button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
