"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2, Sticker } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";
import Loading from "@/components/Loading";

const readDataUrl = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });
function toFile(dataUrl: string, name: string): File {
  const [head, b64] = dataUrl.split(","); const mime = (head.match(/data:(.*?);/) || [])[1] || "image/png";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

export default function AdminStickers() {
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.getStickers().then(setList).catch(() => {}).finally(() => setLoading(false)); }, []);

  const save = async (next: string[]) => {
    setMsg("Đang lưu…");
    try { await api.setStickers(next); setMsg("Đã lưu ✓"); setTimeout(() => setMsg(""), 1500); }
    catch (e: any) { setMsg(""); alert("KHÔNG lưu được: " + (e?.message || "") + "\n→ Deploy lại backend (route /settings/stickers)."); }
  };
  const add = async (files: FileList) => {
    setUploading(true);
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) {
        const r = await api.uploadFile(toFile(await readDataUrl(f), f.name || "sticker.png"));
        added.push(r.url);
      }
      const next = [...list, ...added]; setList(next); await save(next);
    } catch (e: any) { alert("Lỗi upload: " + (e?.message || e)); }
    finally { setUploading(false); }
  };
  const remove = async (i: number) => { const next = list.filter((_, j) => j !== i); setList(next); await save(next); };

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex items-center gap-2 mb-1"><Sticker size={20} className="text-brass" /><h3 className="font-serif text-lg text-ink font-bold">Kho sticker</h3></div>
        <p className="font-sans text-[13px] text-sub mb-4">Tải PNG nền trong suốt. Khách sẽ thấy kho này trong trình thiết kế để tự decor (kéo–thả, đổi cỡ, xoay). Tự lưu khi thêm/xóa.</p>
        {loading ? <Loading text="Đang tải…" /> : (
          <>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mm-btn flex items-center gap-1.5 bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60 mb-4">
              {uploading ? <><Loader2 size={15} className="animate-spin" /> Đang tải…</> : <><Plus size={15} /> Thêm sticker</>}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.currentTarget.value = ""; }} />
            <span className="font-sans text-xs text-sub ml-3">{list.length} sticker {msg && <b className="text-brass">· {msg}</b>}</span>
            {list.length === 0 ? <div className="border border-dashed border-line rounded-xl py-12 text-center font-sans text-sm text-sub mt-2">Chưa có sticker.</div> : (
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mt-2">
                {list.map((u, i) => (
                  <div key={i} className="relative rounded-lg border border-line bg-cream/40 p-1" style={{ aspectRatio: "1" }}>
                    <img src={u} className="w-full h-full object-contain" />
                    <button onClick={() => remove(i)} className="absolute top-0.5 right-0.5 bg-ink/70 rounded-full w-5 h-5 grid place-items-center"><X size={11} color="#fff" /></button>
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
