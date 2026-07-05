"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2, Images, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";
import Loading from "@/components/Loading";
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

  useEffect(() => {
    Promise.all([api.getDemoPool().then(setPool).catch(() => {}), api.templates().then(setTemplates).catch(() => {})]).finally(() => setLoading(false));
  }, []);

  // Lưu kho ảnh lên máy chủ + báo lỗi rõ nếu backend chưa hỗ trợ
  const savePool = async (next: string[]) => {
    setPoolMsg("Đang lưu kho…");
    try { await api.setDemoPool(next); setPoolMsg("Đã lưu kho ✓"); setTimeout(() => setPoolMsg(""), 2000); }
    catch (e: any) {
      setPoolMsg("");
      alert("KHÔNG lưu được kho ảnh: " + (e?.message || "") + "\n→ Backend chưa có mục kho ảnh (route /settings/demo-pool). Hãy DEPLOY LẠI backend rồi thử lại.");
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
  const applyAll = async () => {
    if (!pool.length) { alert("Hãy thêm ít nhất 1 ảnh vào kho."); return; }
    setApplying(true); setProgress("Server đang ghép ảnh demo cho tất cả template…");
    try {
      await api.setDemoPool(pool);
      const r: any = await api.applyDemo();
      const ok = (r.results || []).filter((x: any) => x.ok).length;
      const fail = (r.results || []).filter((x: any) => !x.ok);
      setProgress("");
      alert(`Đã ghép xong ${ok}/${(r.results || []).length} template ✓` + (fail.length ? `\nLỗi: ${fail.map((f: any) => f.title).join(", ")}` : ""));
    } catch (e: any) { alert("Lỗi: " + (e?.message || "") + "\n→ Backend cần deploy bản mới (route /admin/apply-demo + sharp)."); }
    finally { setApplying(false); setProgress(""); }
  };

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex items-center gap-2 mb-1">
          <Images size={20} className="text-brass" />
          <h3 className="font-serif text-lg text-ink font-bold">Kho ảnh demo chung</h3>
        </div>
        <p className="font-sans text-[13px] text-sub mb-4">Tải ảnh vào kho này. Bấm “Áp dụng cho tất cả template” — hệ thống **tự** ghép ảnh vào khung của mọi template để khách xem bản mẫu đã điền. Bạn không cần thêm thủ công cho từng mẫu. Khi khách “Dùng mẫu” vẫn nhận template trống.</p>

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
          </>
        )}
      </div>
    </AdminShell>
  );
}
