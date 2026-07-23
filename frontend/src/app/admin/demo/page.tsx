"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2, Images, Sparkles, Wand2, Save } from "lucide-react";
import { api, clearApiCache } from "@/lib/api";
import { composeTemplateDemo } from "@/lib/composeCanvas";
import AdminShell from "@/components/AdminShell";
import Loading from "@/components/Loading";
import Builder from "@/components/Builder";
import type { Edit, TextItem, StickerItem } from "@/lib/pages";
import type { Template } from "@/lib/types";

const readDataUrl = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });
function compress(dataUrl: string, max = 1400, q = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d"); if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      try { resolve(cv.toDataURL("image/jpeg", q)); } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl); img.src = dataUrl;
  });
}
function toFile(dataUrl: string, name: string): File {
  const [head, b64] = dataUrl.split(","); const mime = (head.match(/data:(.*?);/) || [])[1] || "image/jpeg";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}
export default function AdminDemoPool() {
  const [pool, setPool] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState("");
  const [poolMsg, setPoolMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // CHỈNH PREVIEW TỪNG MẪU: admin tự xếp ảnh (kéo/zoom bằng chuột) -> server ghép đúng như đã xếp
  const [editT, setEditT] = useState<any>(null);
  const [eLoading, setELoading] = useState(false);
  const [eSaving, setESaving] = useState(false);
  const [ePhotos, setEPhotos] = useState<string[]>([]);
  const [eAssign, setEAssign] = useState<(string | undefined)[]>([]);
  const [eEdits, setEEdits] = useState<Record<number, Edit>>({});
  const [eHidden, setEHidden] = useState<Record<number, boolean>>({});
  const [eTexts, setETexts] = useState<Record<number, TextItem[]>>({});
  const [eStickers, setEStickers] = useState<Record<number, StickerItem[]>>({});
  const [eLocked, setELocked] = useState<Record<number, boolean>>({});

  const openEditor = async (id: string) => {
    setELoading(true);
    try {
      const full: any = await api.template(id); // mở thẳng editor với MỌI template (đã cắt hay chưa) — không chặn, không hỏi cắt đôi
      // ĐIỀN SẴN ảnh như bản AI đã ghép: xáo kho theo seed = id mẫu (cùng thuật toán với server)
      const total = (full.pages || []).reduce((n: number, p: any) => n + ((p.slots || []).length), 0);
      let seed = 0; const idStr = String(full.id || "");
      for (let i = 0; i < idStr.length; i++) seed = (seed * 31 + idStr.charCodeAt(i)) >>> 0;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const sh = [...pool];
      for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
      const prefill = sh.length ? Array.from({ length: total }, (_, g) => sh[g % sh.length]) : [];
      setEditT(full); setEPhotos(pool); setEAssign(prefill); setEEdits({}); setEHidden({}); setETexts({}); setEStickers({}); setELocked({});
    } catch (e: any) { alert("Không tải được mẫu: " + (e?.message || "")); }
    finally { setELoading(false); }
  };
  const savePreview = async () => {
    if (!editT) return;
    setESaving(true);
    try {
      // Gửi edits ĐẦY ĐỦ cho mọi ô có ảnh (kể cả ô chưa chỉnh -> mặc định 50/38/1)
      // => ảnh ghép ra đúng 100% những gì admin đang thấy trong modal (WYSIWYG)
      const editsFull: Record<number, any> = {};
      eAssign.forEach((u, g) => { if (u) editsFull[g] = { ox: 50, oy: 38, scale: 1, ...(eEdits[g] || {}) }; });
      // GHÉP NGAY TRÊN TRÌNH DUYỆT (Canvas) rồi chỉ gửi danh sách URL về backend
      const urls = await composeTemplateDemo(
        editT.id, (editT.pages || []) as any, pool,
        { assignments: eAssign, edits: editsFull },
        (done, total) => setProgress(`Đang xử lý trang ${Math.min(done + 1, total)}/${total}…`),
      );
      await api.saveDemoResult(editT.id, urls);
      clearApiCache();
      setProgress("");
      alert("Đã lưu preview cho “" + editT.title + "” ✓");
      setEditT(null);
    } catch (e: any) {
      console.error("savePreview:", e); // chi tiết kỹ thuật để dev debug
      setProgress("");
      alert("Đã xảy ra lỗi khi xử lý. Vui lòng thử lại.");
    }
    finally { setESaving(false); }
  };

  useEffect(() => {
    Promise.all([api.getDemoPool().then(setPool).catch(() => {}), api.templates().then(setTemplates).catch(() => {})]).finally(() => setLoading(false));
  }, []);

  // Lưu kho ảnh lên máy chủ + báo lỗi rõ nếu backend chưa hỗ trợ
  const savePool = async (next: string[]) => {
    setPoolMsg("Đang lưu kho…");
    try { await api.setDemoPool(next); setPoolMsg("Đã lưu kho ✓"); setTimeout(() => setPoolMsg(""), 2000); }
    catch (e: any) {
      setPoolMsg("");
      console.error("savePool:", e); alert("Đã xảy ra lỗi khi lưu kho ảnh. Vui lòng thử lại.");
    }
  };

  const addPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) {
        const small = await compress(await readDataUrl(f));
        const r = await api.uploadFile(toFile(small, "demo.jpg")); // lỗi -> nhảy xuống catch, KHÔNG nhét base64
        added.push(r.url);
      }
      const next = [...pool, ...added];
      setPool(next);
      await savePool(next); // LƯU NGAY -> thoát ra vào lại vẫn còn
    } catch (e: any) { alert("Lỗi ảnh: " + (e?.message || e)); }
    finally { setUploading(false); }
  };
  const removePhoto = async (i: number) => { const next = pool.filter((_, j) => j !== i); setPool(next); await savePool(next); };

  // GHÉP PHÍA SERVER (sharp): 1 lệnh, chạy trên backend — nhanh, idempotent, không phụ thuộc máy admin
  // Kết quả ghép: danh sách lỗi chi tiết + trạng thái retry từng template
  const [composeResult, setComposeResult] = useState<{ ok: number; total: number; fails: { id: string; title: string; msg: string; hint?: string; retrying?: boolean }[] } | null>(null);
  const suggestFix = (msg: string) => {
    if (/chưa có trang/i.test(msg)) return "→ Vào Template → Sửa mẫu để tải slide lên.";
    if (/chưa có khung/i.test(msg)) return "→ Vào Template → Chỉnh khung để thêm khung ảnh.";
    if (/HTTP 404|đã mất trên máy chủ|Không tải được ảnh/i.test(msg)) return "→ Ảnh của mẫu đã mất trên máy chủ (đĩa Render cũ bị xoá khi restart). Hãy upload lại ảnh cho mẫu này.";
    if (/Kho ảnh demo trống/i.test(msg)) return "→ Thêm ảnh vào kho demo phía trên trước.";
    if (/ETIMEDOUT|ECONNRESET|timeout/i.test(msg)) return "→ Mạng máy chủ chập chờn — bấm Thử lại.";
    return "→ Bấm Thử lại; nếu vẫn lỗi, gửi thông báo này cho kỹ thuật.";
  };
  // Ghép lại RIÊNG 1 mẫu (không phải chạy lại toàn bộ)
  const composeOne = async (id: string, onStep?: (d: number, t: number) => void) => {
    const full: any = await api.template(id);           // lấy pages mới nhất
    const urls = await composeTemplateDemo(id, (full.pages || []) as any, pool, undefined, onStep);
    await api.saveDemoResult(id, urls);
  };
  const retryOne = async (id: string) => {
    setComposeResult((r) => r && { ...r, fails: r.fails.map((x) => x.id === id ? { ...x, retrying: true } : x) });
    try {
      await composeOne(id);
      clearApiCache();
      setComposeResult((r) => r && { ...r, ok: r.ok + 1, fails: r.fails.filter((x) => x.id !== id) });
    } catch (e: any) {
      console.error("retryOne:", e);
      setComposeResult((r) => r && { ...r, fails: r.fails.map((x) => x.id === id ? { ...x, retrying: false, msg: e?.message || x.msg } : x) });
    }
  };
  const applyAll = async () => {
    if (!pool.length) { alert("Hãy thêm ít nhất 1 ảnh vào kho."); return; }
    setApplying(true); setProgress("Đang kiểm tra dữ liệu các template…"); setComposeResult(null);

    // 1) Kiểm tra trước: mẫu nào thiếu trang/khung/ảnh hỏng -> hỏi admin có bỏ qua không
    let list = templates as any[];
    try {
      const chk: any = await api.checkDemo();
      const invalid: any[] = chk.invalid || [];
      if (invalid.length) {
        const names = invalid.map((t: any) => `• ${t.title}: ${t.reason} (${t.hint})`).join("\n");
        if (!confirm(`${invalid.length} template thiếu/hỏng dữ liệu, sẽ KHÔNG ghép được:\n${names}\n\nBỏ qua các mẫu này và tiếp tục với ${(chk.ready || []).length} mẫu còn lại?`)) { setApplying(false); setProgress(""); return; }
        const okIds = new Set((chk.ready || []).map((t: any) => t.id));
        list = list.filter((t) => okIds.has(t.id));
        if (!list.length) { alert("Không còn mẫu hợp lệ nào để ghép."); setApplying(false); setProgress(""); return; }
      }
    } catch { /* backend chưa có route check -> vẫn ghép bình thường */ }

    // 2) GHÉP NGAY TRÊN TRÌNH DUYỆT từng mẫu, backend chỉ nhận URL kết quả
    try { await api.setDemoPool(pool); } catch { /* kho ảnh đã lưu trước đó */ }
    const fails: { id: string; title: string; msg: string }[] = [];
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      try {
        await composeOne(t.id, (d, tot) => setProgress(`Mẫu ${i + 1}/${list.length} — “${t.title}” · trang ${Math.min(d + 1, tot)}/${tot}…`));
        ok++;
      } catch (e: any) {
        console.error(`compose "${t.title}":`, e);
        fails.push({ id: t.id, title: t.title, msg: e?.message || "lỗi không rõ" });
      }
    }
    clearApiCache();
    setComposeResult({ ok, total: list.length, fails });
    setApplying(false); setProgress("");
  };

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex items-center gap-2 mb-1">
          <Images size={20} className="text-brass" />
          <h3 className="font-serif text-lg text-ink font-bold">Kho ảnh demo chung</h3>
        </div>

        {loading ? <Loading text="Đang tải…" /> : (
          <>
            <div className="flex gap-2 mb-4">
              <button onClick={() => fileRef.current?.click()} disabled={uploading || applying} className="mm-btn flex items-center gap-1.5 border border-ink text-ink rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60">
                {uploading ? <><Loader2 size={15} className="animate-spin" /> Đang tải…</> : <><Plus size={15} /> Thêm ảnh vào kho</>}
              </button>
              <button onClick={applyAll} disabled={applying || uploading || !pool.length} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-5 py-2 font-sans text-sm font-semibold disabled:opacity-50">
                {applying ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Áp dụng cho tất cả template
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) addPhotos(e.target.files); e.currentTarget.value = ""; }} />

            {applying && progress && <div className="font-sans text-[13px] text-brass mb-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {progress}</div>}

            {/* KẾT QUẢ GHÉP: tổng hợp + lỗi chi tiết từng mẫu + gợi ý sửa + nút Thử lại riêng từng mẫu */}
            {composeResult && (
              <div className={`rounded-xl border p-4 mb-4 font-sans text-[13.5px] ${composeResult.fails.length ? "border-[#E9B384] bg-[#FEF6EC]" : "border-[#B7C9A8] bg-[#F1F6EC]"}`}>
                <div className="font-semibold text-ink mb-1.5">
                  {composeResult.fails.length ? "⚠" : "✓"} Ghép thành công {composeResult.ok}/{composeResult.total} template
                  {composeResult.fails.length > 0 && <> — lỗi {composeResult.fails.length} template:</>}
                </div>
                {composeResult.fails.map((f) => (
                  <div key={f.id} className="flex items-start gap-2.5 py-2 border-t border-black/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-ink"><b>“{f.title}”</b>: {f.msg}</div>
                      <div className="text-sub text-[12.5px] mt-0.5">{(f as any).hint || suggestFix(f.msg)}</div>
                    </div>
                    <button onClick={() => retryOne(f.id)} disabled={f.retrying}
                      className="shrink-0 mm-btn border border-brass text-brass rounded-full px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50 flex items-center gap-1.5">
                      {f.retrying ? <Loader2 size={12} className="animate-spin" /> : null} {f.retrying ? "Đang thử…" : "Thử lại"}
                    </button>
                  </div>
                ))}
                <button onClick={() => setComposeResult(null)} className="mt-2 text-sub text-[12px] underline">Đóng</button>
              </div>
            )}

            <div className="font-sans text-xs text-sub mb-2">{pool.length} ảnh trong kho · {templates.length} template sẽ được áp dụng {poolMsg && <span className="text-brass font-semibold ml-2">· {poolMsg}</span>}</div>
            {pool.length === 0 ? (
              <div className="border border-dashed border-line rounded-xl py-12 text-center font-sans text-sm text-sub">Kho trống. Bấm “Thêm ảnh vào kho”.</div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {pool.map((p, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-line" style={{ aspectRatio: "1" }}>
                    <img src={p} className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-ink/70 rounded-full w-5 h-5 grid place-items-center"><X size={11} color="#fff" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* CHỈNH PREVIEW TỪNG MẪU: admin tự xếp/kéo/zoom ảnh bằng chuột rồi Lưu */}
            <div className="mt-6 border-t border-line pt-4">
              <div className="font-serif text-base text-ink font-bold mb-1">Tinh chỉnh preview từng mẫu</div>
              <div className="grid md:grid-cols-3 gap-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border border-line rounded-xl px-3 py-2">
                    <span className="font-sans text-sm text-ink truncate">{t.title}</span>
                    <button onClick={() => openEditor(t.id)} disabled={eLoading} className="font-sans text-[12.5px] text-ink bg-cream rounded-full px-3 py-1.5 flex items-center gap-1.5 shrink-0 disabled:opacity-60"><Wand2 size={13} /> Chỉnh preview</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal chỉnh preview: dùng chính trình thiết kế (thuần chuột) */}
      {editT && (
        <div className="fixed inset-0 z-[96] overflow-y-auto" style={{ background: "rgba(42,37,32,.65)" }}>
          <div className="bg-paper rounded-2xl max-w-[1280px] mx-auto my-6 border border-line overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-white sticky top-0 z-10">
              <div>
                <div className="font-serif text-lg text-ink font-bold">Chỉnh preview — {editT.title}</div>
                <div className="font-sans text-xs text-sub">Bấm ô để chọn ảnh · Ctrl + lăn chuột: phóng to · Ctrl + kéo: chỉnh vị trí</div>
              </div>
              <div className="flex gap-2">
                <button onClick={savePreview} disabled={eSaving} className="mm-btn flex items-center gap-2 bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60">
                  {eSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu preview
                </button>
                <button onClick={() => setEditT(null)} className="w-9 h-9 grid place-items-center rounded-full bg-cream"><X size={16} className="text-ink" /></button>
              </div>
            </div>
            <div className="p-4">
              <Builder t={editT} photos={ePhotos} setPhotos={setEPhotos} assignments={eAssign} setAssignments={setEAssign} edits={eEdits} setEdits={setEEdits} hidden={eHidden} setHidden={setEHidden} locked={eLocked} setLocked={setELocked} texts={eTexts} setTexts={setETexts} stickers={eStickers} setStickers={setEStickers} />
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
