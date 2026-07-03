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
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; });
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const iw = img.naturalWidth, ih = img.naturalHeight; const sc = Math.max(dw / iw, dh / ih);
  const sw = dw / sc, sh = dh / sc; ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh);
}
async function composePage(pageImage: string, slots: any[], photos: string[], gStart: number): Promise<string> {
  const base = await loadImg(pageImage);
  const W = base.naturalWidth || 2000, H = base.naturalHeight || 1300;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); if (!ctx) return pageImage;
  ctx.drawImage(base, 0, 0, W, H);
  for (let j = 0; j < slots.length; j++) {
    const s = slots[j]; const url = photos[(gStart + j) % photos.length]; if (!url) continue;
    try { const ph = await loadImg(url); drawCover(ctx, ph, (s.x / 100) * W, (s.y / 100) * H, (s.w / 100) * W, (s.h / 100) * H); } catch {}
  }
  return cv.toDataURL("image/jpeg", 0.9);
}

export default function AdminDemoPool() {
  const [pool, setPool] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api.getDemoPool().then(setPool).catch(() => {}), api.templates().then(setTemplates).catch(() => {})]).finally(() => setLoading(false));
  }, []);

  const addPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const small = await compress(await readDataUrl(f));
        let url = small;
        try { const r = await api.uploadFile(toFile(small, "demo.jpg")); url = r.url; } catch {}
        setPool(p => [...p, url]);
      }
    } catch (e: any) { alert("Lỗi ảnh: " + (e?.message || e)); }
    finally { setUploading(false); }
  };

  // Lưu kho + ghép ảnh vào TẤT CẢ trang của mọi template -> ảnh phẳng (dùng cho preview nhẹ)
  const applyAll = async () => {
    if (!pool.length) { alert("Hãy thêm ít nhất 1 ảnh vào kho."); return; }
    setApplying(true); setProgress("Đang lưu kho ảnh…");
    try {
      await api.setDemoPool(pool);
      for (let i = 0; i < templates.length; i++) {
        setProgress(`Đang áp dụng: ${i + 1}/${templates.length} — ${templates[i].title}`);
        try {
          const full: any = await api.template(templates[i].id); // bản đầy đủ (có pages)
          const composed: string[] = [];
          let g = 0;
          for (const pg of (full.pages || [])) {
            const slots = pg.slots || [];
            const dataUrl = slots.length ? await composePage(pg.image, slots, pool, g) : pg.image;
            g += slots.length;
            let url = dataUrl;
            try { const r = await api.uploadFile(toFile(dataUrl, "demopage.jpg")); url = r.url; } catch {}
            composed.push(url);
          }
          // Lưu ảnh phẳng từng trang + bìa -> preview hiển thị ảnh, không cần render flipbook
          const updated: any = await api.updateTemplate(templates[i].id, { demoPages: composed, demoImage: composed[0] || null });
          if (composed.length && !(updated?.demoPages || []).length) {
            setProgress("");
            alert("Máy chủ CHƯA lưu được ảnh demo (thiếu cột demoPages).\n→ Deploy lại backend (tự chạy db:push) rồi thử lại.");
            return;
          }
        } catch (e: any) { console.warn("Bỏ qua template", templates[i].title, e?.message); }
      }
      setProgress("");
      alert("Đã tạo ảnh demo cho tất cả template ✓");
    } catch (e: any) { alert("Lỗi: " + (e?.message || "")); }
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

            <div className="font-sans text-xs text-sub mb-2">{pool.length} ảnh trong kho · {templates.length} template sẽ được áp dụng</div>
            {pool.length === 0 ? (
              <div className="border border-dashed border-line rounded-xl py-12 text-center font-sans text-sm text-sub">Kho trống. Bấm “Thêm ảnh vào kho”.</div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {pool.map((p, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-line" style={{ aspectRatio: "1" }}>
                    <img src={p} className="w-full h-full object-cover" />
                    <button onClick={() => setPool(ph => ph.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-ink/70 rounded-full w-5 h-5 grid place-items-center"><X size={11} color="#fff" /></button>
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
