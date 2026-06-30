"use client";
import { useEffect, useState } from "react";
import { Wand2, X, Sparkles } from "lucide-react";
import TemplateCover from "@/components/TemplateCover";
import { matchTemplates } from "@/lib/match";
import type { Template } from "@/lib/types";

const C = { ink: "#2A2520", sub: "#6B6258", brass: "#B08D57", blush: "#E8C9C1", cream2: "#EFE7DA", paper: "#F6F1E9", card: "#FFFFFF", line: "#E5DCCF" };

// Modal "Thiết kế với AI" — mô tả tự nhiên, AI gợi ý mẫu (giống demo)
export default function AIDesignModal({ templates, initialPrompt, onUse, onClose }: {
  templates: Template[]; initialPrompt?: string; onUse: (t: Template) => void; onClose: () => void;
}) {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [thinking, setThinking] = useState(false);
  const [results, setResults] = useState<Template[] | null>(null);
  const EXAMPLES = ["Tôi muốn mẫu đi du lịch biển cùng người yêu", "Album cưới phong cách nhẹ nhàng", "Kỷ yếu tốt nghiệp cho nhóm bạn", "Sinh nhật bé 1 tuổi thật dễ thương"];

  const run = (text?: string) => {
    const q = (text ?? prompt).trim();
    if (!q) return;
    setThinking(true); setResults(null);
    setTimeout(() => {
      const scored = matchTemplates(q, templates).filter((s) => s.score > 0).slice(0, 3).map((s) => s.t);
      const final = scored.length ? scored : [templates.find((t) => t.featured) || templates[0]].filter(Boolean) as Template[];
      setResults(final); setThinking(false);
    }, 450);
  };
  useEffect(() => { if (initialPrompt && initialPrompt.trim()) run(initialPrompt); /* eslint-disable-next-line */ }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,37,32,.5)", backdropFilter: "blur(3px)", zIndex: 80, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="mm-pop" style={{ width: "100%", maxWidth: 560, background: C.paper, borderRadius: 22, border: `1px solid ${C.line}`, overflow: "hidden", boxShadow: "0 30px 80px rgba(42,37,32,.3)" }}>
        <div style={{ background: `linear-gradient(120deg, ${C.blush}, ${C.brass})`, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,.25)", display: "grid", placeItems: "center" }}><Wand2 size={20} color="#fff" /></div>
            <div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 20, color: "#fff", fontWeight: 700 }}>Thiết kế với AI</div>
              <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12, color: "rgba(255,255,255,.9)" }}>Mô tả mẫu — AI chọn giúp bạn</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}><X size={17} color="#fff" /></button>
        </div>

        <div style={{ padding: 24 }}>
          <p style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 14, color: C.sub, margin: "0 0 12px" }}>Bạn muốn cuốn photobook kể câu chuyện gì? Cứ mô tả tự nhiên, AI sẽ tìm mẫu hợp nhất rồi đưa bạn vào trang thiết kế.</p>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            placeholder="Ví dụ: tôi muốn mẫu đi du lịch biển cùng người yêu"
            style={{ width: "100%", padding: 14, borderRadius: 14, border: `1.5px solid ${C.line}`, fontFamily: "var(--font-sans,sans-serif)", fontSize: 15, color: C.ink, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setPrompt(ex)} style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12.5, color: C.sub, background: C.cream2, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 13px", cursor: "pointer" }}>{ex}</button>
            ))}
          </div>

          <button onClick={() => run()} disabled={!prompt.trim() || thinking} className="mm-btn" style={{ width: "100%", background: C.brass, color: "#fff", border: "none", borderRadius: 999, padding: "12px", fontFamily: "var(--font-sans,sans-serif)", fontWeight: 600, fontSize: 14, cursor: prompt.trim() && !thinking ? "pointer" : "not-allowed", opacity: prompt.trim() && !thinking ? 1 : .5, display: "inline-flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <Sparkles size={16} /> {thinking ? "AI đang chọn mẫu…" : "Tạo mẫu với AI"}
          </button>

          {thinking && (
            <div style={{ textAlign: "center", padding: "22px 0 4px" }}>
              <div style={{ width: 44, height: 44, border: `4px solid ${C.cream2}`, borderTopColor: C.brass, borderRadius: "50%", margin: "0 auto", animation: "mmspin 1s linear infinite" }} />
              <style>{`@keyframes mmspin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {results && (
            <div className="mm-rise" style={{ marginTop: 18 }}>
              {results.length === 0
                ? <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 13, color: C.sub }}>Chưa có mẫu nào trong kho. Hãy thêm mẫu ở trang Admin.</div>
                : <>
                  <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 13, color: C.sub, marginBottom: 10 }}>AI gợi ý {results.length} mẫu phù hợp — chọn để vào thiết kế:</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                    {results.map((t) => (
                      <button key={t.id} onClick={() => onUse(t)} className="mm-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, cursor: "pointer", textAlign: "left" }}>
                        <TemplateCover t={t} kind="cover" />
                        <div style={{ fontFamily: "Lora, serif", fontSize: 14, color: C.ink, fontWeight: 600, marginTop: 8 }}>{t.title}</div>
                        <div style={{ fontFamily: "var(--font-sans,sans-serif)", fontSize: 12, color: C.brass, fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><Wand2 size={12} /> Thiết kế ngay</div>
                      </button>
                    ))}
                  </div>
                </>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
