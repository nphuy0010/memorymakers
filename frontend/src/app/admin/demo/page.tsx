"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2, Images, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";
import Flipbook from "@/components/Flipbook";
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
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; });
// vẽ ảnh kiểu object-cover vào ô (dx,dy,dw,dh)
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const sc = Math.max(dw / iw, dh / ih);
  const sw = dw / sc, sh = dh / sc;
  const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
// Ghép 1 trang: ảnh nền trang + các ảnh demo lấp đầy khung -> trả dataURL ảnh phẳng
async function composePage(pageImage: string, slots: any[], photos: string[], gStart: number): Promise<string> {
  const base = await loadImg(pageImage);
  const W = base.naturalWidth || 2000, H = base.naturalHeight || 1300;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); if (!ctx) return pageImage;
  ctx.drawImage(base, 0, 0, W, H);
  for (let j = 0; j < slots.length; j++) {
    const s = slots[j]; const url = photos[(gStart + j) % photos.length];
    if (!url) continue;
    try {
      const ph = await loadImg(url);
      const dx = (s.x / 100) * W, dy = (s.y / 100) * H, dw = (s.w / 100) * W, dh = (s.h / 100) * H;
      if (s.shape === "circle") { ctx.save(); ctx.beginPath(); ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2); ctx.clip(); drawCover(ctx, ph, dx, dy, dw, dh); ctx.restore(); }
      else drawCover(ctx, ph, dx, dy, dw, dh);
    } catch { /* bỏ qua ảnh lỗi */ }
  }
  return cv.toDataURL("image/jpeg", 0.9);
}

export default function AdminDemoPhotos() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.templates().then((d: Template[]) => setTemplates(d)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const sel = templates.find(t => t.id === selId) || null;
  const totalSlots = sel ? (sel.pages || []).reduce((n: number, p: any) => n + (p.slots?.length || 0), 0) : 0;

  const choose = (t: Template) => { setSelId(t.id); setPhotos(((t as any).demoPhotos || []) as string[]); setSaved(false); };

  const addPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const small = await compress(await readDataUrl(f));
        let url = small;
        try { const r = await api.uploadFile(toFile(small, "demo.jpg")); url = r.url; } catch { /* fallback dataURL */ }
        setPhotos(p => [...p, url]); setSaved(false);
      }
    } catch (e: any) { alert("Lỗi ảnh: " + (e?.message || e)); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!sel) return;
    if (!photos.length) { alert("Hãy thêm ít nhất 1 ảnh demo."); return; }
    setSaving(true);
    try {
      // GHÉP ảnh demo vào từng trang -> ảnh phẳng; upload lấy URL (lỗi thì dùng dataURL)
      const composed: string[] = [];
      let g = 0;
      for (const pg of (sel.pages || [])) {
        const slots = (pg as any).slots || [];
        const dataUrl = slots.length ? await composePage((pg as any).image, slots, photos, g) : (pg as any).image;
        g += slots.length;
        let url = dataUrl;
        try { const r = await api.uploadFile(toFile(dataUrl, "demopage.jpg")); url = r.url; } catch { /* fallback dataURL */ }
        composed.push(url);
      }
      const cover = composed[0] || null;
      const updated: any = await api.updateTemplate(sel.id, { demoPhotos: photos, demoPages: composed, demoImage: cover });
      setTemplates(ts => ts.map(t => t.id === sel.id ? updated : t));
      setSaved(true);
    } catch (e: any) {
      alert("Lưu lỗi: " + (e?.message || "") + "\n→ Backend cần cập nhật CSDL (cột demoPages). Chạy 'npm run db:push' hoặc deploy lại backend.");
    } finally { setSaving(false); }
  };

  const previewT = sel ? ({ ...sel, demoPhotos: photos } as any) : null;

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex items-center gap-2 mb-1">
          <Images size={20} className="text-brass" />
          <h3 className="font-serif text-lg text-ink font-bold">Ảnh demo cho template</h3>
        </div>
        <p className="font-sans text-[13px] text-sub mb-4">Chọn 1 template, tải nhiều ảnh lên. Hệ thống tự chèn ảnh vào các khung để khách xem bản mẫu đã điền. Khi khách bấm “Dùng mẫu” vẫn nhận template trống để tự sửa.</p>

        {loading ? <Loading text="Đang tải template…" /> : (
          <div className="grid md:grid-cols-[260px_1fr] gap-5">
            <div className="border border-line rounded-xl overflow-hidden max-h-[520px] overflow-y-auto">
              {templates.length === 0 && <div className="p-4 text-sm text-sub font-sans">Chưa có template.</div>}
              {templates.map(t => {
                const n = ((t as any).demoPhotos || []).length;
                return (
                  <button key={t.id} onClick={() => choose(t)} className={`w-full text-left px-3.5 py-3 border-b border-line flex items-center gap-2 ${selId === t.id ? "bg-cream" : "hover:bg-cream/50"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-sm text-ink font-semibold truncate">{t.title}</div>
                      <div className="font-sans text-xs text-sub">{(t.pages?.length ?? 0)} trang · {n > 0 ? `${n} ảnh demo` : "chưa có ảnh demo"}</div>
                    </div>
                    {n > 0 && <CheckCircle2 size={16} className="text-sage shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div>
              {!sel ? <div className="grid place-items-center h-[300px] text-sub font-sans text-sm">Chọn một template ở bên trái để thêm ảnh demo.</div> : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-serif text-base text-ink font-bold">{sel.title}</div>
                      <div className="font-sans text-xs text-sub">{totalSlots} khung ảnh · đã có {photos.length} ảnh demo</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="font-sans text-[13px] text-white bg-brass rounded-full px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
                        {uploading ? <><Loader2 size={14} className="animate-spin" /> Đang tải…</> : <><Plus size={14} /> Thêm ảnh</>}
                      </button>
                      <button onClick={save} disabled={saving} className="font-sans text-[13px] text-ink border border-ink rounded-full px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {saved ? "Đã lưu" : "Lưu"}
                      </button>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) addPhotos(e.target.files); e.currentTarget.value = ""; }} />

                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                      {photos.map((p, i) => (
                        <div key={i} className="relative rounded-lg overflow-hidden border border-line" style={{ aspectRatio: "1" }}>
                          <img src={p} className="w-full h-full object-cover" />
                          <button onClick={() => { setPhotos(ph => ph.filter((_, j) => j !== i)); setSaved(false); }} className="absolute top-1 right-1 bg-ink/70 rounded-full w-5 h-5 grid place-items-center"><X size={11} color="#fff" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="font-sans text-[12.5px] text-sub mb-2">Xem trước (khách sẽ thấy):</div>
                  {previewT && <Flipbook t={previewT} watermark={false} />}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
