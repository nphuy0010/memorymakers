"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ImageIcon, X, Loader2, Wand2, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import AdminShell from "@/components/AdminShell";
import SlotEditor from "@/components/SlotEditor";
import { type Template, type PageDef } from "@/lib/types";
import { detectSlots } from "@/lib/detectSlots";

const readDataUrl = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });

// Nén ảnh trang -> dataURL JPEG gọn (giảm dung lượng, tránh upload nặng/timeout)
function compressDataUrl(dataUrl: string, max = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d"); if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      try { resolve(cv.toDataURL("image/jpeg", quality)); } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
function dataUrlToFile(dataUrl: string, name: string): File {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:(.*?);/) || [])[1] || "image/jpeg";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editSlots, setEditSlots] = useState<Template | null>(null);
  const [form, setForm] = useState({ title: "", category: "", description: "", keywords: "", canvaLink: "", featured: false, soft: "290000", hard: "450000", fan: "520000", digital: "150000" });
  const [pages, setPages] = useState<PageDef[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [editInfo, setEditInfo] = useState<any>(null); // sửa tên/mô tả/giá
  const [savingInfo, setSavingInfo] = useState(false);
  const saveInfo = async () => {
    if (!editInfo) return;
    setSavingInfo(true);
    try {
      const b = { title: editInfo.title, description: editInfo.description || "", priceDigital: +editInfo.priceDigital || 0, priceSoft: +editInfo.priceSoft || 0, priceHard: +editInfo.priceHard || 0, priceFan: +editInfo.priceFan || 0 };
      const u = await api.updateTemplate(editInfo.id, b);
      clearApiCache();
      setTemplates(ts => ts.map(x => x.id === editInfo.id ? { ...x, ...u } : x));
      setEditInfo(null);
    } catch (e: any) { alert("Lưu lỗi: " + (e?.message || "")); }
    finally { setSavingInfo(false); }
  };
  const [saving, setSaving] = useState(false);
  const pagesRef = useRef<HTMLInputElement>(null);

  const load = () => api.templates().then(setTemplates).catch(() => {});
  useEffect(() => { load(); }, []);

  // Tải nhiều trang SONG SONG (dò khung + nén + upload chạy cùng lúc) — nhanh hơn nhiều so với tuần tự
  const pickPages = async (files: FileList) => {
    setDetecting(true);
    try {
      const results = await Promise.all(Array.from(files).map(async (f) => {
        const dataUrl = await readDataUrl(f);
        const [slots, small] = await Promise.all([detectSlots(dataUrl), compressDataUrl(dataUrl)]);
        const { url } = await api.uploadFile(dataUrlToFile(small, "page.jpg"));
        return { image: url, slots };
      }));
      setPages((p) => [...p, ...results]); // giữ đúng thứ tự file
    } catch (e: any) {
      alert("Upload ảnh lỗi: " + (e?.message || e) + "\n→ Kiểm tra đăng nhập admin + backend đang chạy. KHÔNG dùng ảnh nhúng để tránh làm nặng hệ thống.");
    }
    finally { setDetecting(false); }
  };

  const totalSlots = pages.reduce((s, p) => s + p.slots.length, 0);

  const submit = async () => {
    if (!form.title) return alert("Nhập tên template");
    if (!pages.length) return alert("Tải ít nhất 1 trang");
    setSaving(true);
    try {
      await api.createTemplate({
        title: form.title, category: form.category, description: form.description,
        slots: totalSlots, pageCount: pages.length, featured: form.featured, canvaLink: form.canvaLink,
        keywords: form.keywords.split(",").map((s) => s.trim()).filter(Boolean),
        prices: { soft: +form.soft, hard: +form.hard, fan: +form.fan, digital: +form.digital },
        coverImage: pages[0]?.image || null,   // bìa mặc định = trang đầu
        pages,
      });
      setForm({ title: "", category: "", description: "", keywords: "", canvaLink: "", featured: false, soft: "290000", hard: "450000", fan: "520000", digital: "150000" });
      setPages([]);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Xóa template này?")) return;
    const prev = templates;
    setTemplates(ts => ts.filter(t => t.id !== id)); // xóa NGAY trên giao diện
    try { await api.deleteTemplate(id); }             // gọi API chạy nền, không tải lại cả danh sách
    catch (e: any) { alert("Xóa lỗi: " + (e?.message || "")); setTemplates(prev); } // lỗi thì khôi phục
  };

  const inp = "w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none mb-2.5";

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5 mb-6">
        <h3 className="font-serif text-lg text-ink font-bold mb-1">Thêm template</h3>
        <p className="font-sans text-sm text-sub mb-4">Mỗi ảnh = 1 trang. Hệ thống tự dò vùng đặt ảnh và tạo khung. Trang đầu là bìa trước, trang cuối là bìa sau.</p>

        {/* Tải các trang — TỰ ĐỘNG TẠO KHUNG */}
        <div className="border border-line rounded-xl p-4 mb-5 bg-cream">
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            <div>
              <div className="font-serif text-base font-bold text-ink flex items-center gap-1.5"><Wand2 size={16} className="text-brass" /> Tải các trang — tự tạo khung chèn ảnh</div>
              {pages.length > 0 && <div className="font-sans text-[12.5px] text-brass font-bold mt-1">{pages.length} trang · {totalSlots} khung</div>}
            </div>
            <div className="flex gap-2">
              {pages.length > 0 && <button onClick={() => setPages([])} className="font-sans text-[13px] text-sub border border-line rounded-full px-3 py-1.5">Xoá hết</button>}
              <button onClick={() => pagesRef.current?.click()} disabled={detecting} className="font-sans text-[13px] text-white bg-brass rounded-full px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-60">
                {detecting ? <><Loader2 size={14} className="animate-spin" /> Đang dò khung…</> : <><Plus size={14} /> Tải ảnh trang</>}
              </button>
            </div>
            <input ref={pagesRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) pickPages(e.target.files); e.currentTarget.value = ""; }} />
          </div>
          {pages.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
              {pages.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-line bg-white">
                  <div className="relative">
                    <img src={p.image} className="w-full block" />
                    {p.slots.map((s, k) => (
                      <div key={k} className="absolute border-2 border-brass bg-brass/20" style={{ left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: s.shape === "circle" ? "50%" : 3 }} />
                    ))}
                  </div>
                  <div className="font-sans text-[10.5px] text-sub text-center py-0.5">{i === 0 ? "Bìa trước" : i === pages.length - 1 ? "Bìa sau" : `Trang ${i + 1}`} · {p.slots.length} khung</div>
                  <button onClick={() => setPages((ps) => ps.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-ink/70 rounded-full w-5 h-5 grid place-items-center"><X size={11} color="#fff" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-x-4">
          <input className={inp} placeholder="Tên template" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className={inp} placeholder="Danh mục (vd: Du lịch)" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        </div>
        <textarea className={inp} rows={2} placeholder="Mô tả" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2.5">
          <input className={inp} type="number" placeholder="Số trang (tự đếm)" value={pages.length} readOnly />
          <input className={inp} placeholder="Từ khóa (cách nhau dấu phẩy)" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
        </div>
        <input className={inp} placeholder="Link Canva (tùy chọn)" value={form.canvaLink} onChange={e => setForm(f => ({ ...f, canvaLink: e.target.value }))} />
        <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Giá theo option</span>
        <div className="grid grid-cols-4 gap-2.5 mt-2 mb-3">
          {([["soft", "Bìa thường"], ["hard", "Bìa cứng"], ["fan", "Gấp quạt"], ["digital", "Digital"]] as const).map(([k, l]) => (
            <div key={k}><div className="font-sans text-[11px] text-sub mb-1">{l}</div><input className={inp} type="number" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
          ))}
        </div>
        <label className="flex items-center gap-2 font-sans text-sm text-ink mb-4"><input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} /> Mẫu nổi bật (carousel trang chủ)</label>
        <button onClick={submit} disabled={saving || detecting} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans font-semibold flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Thêm template
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-line p-5">
        <h3 className="font-serif text-lg text-ink font-bold mb-4">Template ({templates.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {templates.map(t => (
            <div key={t.id} className="border border-line rounded-xl p-2.5">
              <div className="aspect-square rounded-lg overflow-hidden bg-cream">
                {(t.coverImage || t.demoImage || t.blankImage || t.pages?.[0]?.image)
                  ? <img src={(t.coverImage || t.demoImage || t.blankImage || t.pages?.[0]?.image) as string} className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center text-sub"><ImageIcon size={22} /></div>}
              </div>
              <div className="font-serif text-sm text-ink font-semibold mt-2">{t.title}</div>
              <div className="font-sans text-[11px] text-sub">{t.category || "—"} · {t.pageCount ?? t.pages?.length ?? 0} trang</div>
              <button onClick={() => setEditInfo({ id: t.id, title: t.title, description: (t as any).description || "", priceDigital: (t as any).priceDigital ?? 150000, priceSoft: (t as any).priceSoft ?? 290000, priceHard: (t as any).priceHard ?? 450000, priceFan: (t as any).priceFan ?? 520000 })} className="mt-2 w-full bg-cream rounded-lg py-1.5 text-[13px] text-ink font-sans flex items-center justify-center gap-1.5"><Pencil size={13} /> Sửa thông tin</button>
              <button onClick={async () => { try { setEditSlots(await api.template(t.id)); } catch { setEditSlots(t); } }} className="mt-1.5 w-full bg-cream rounded-lg py-1.5 text-[13px] text-ink font-sans flex items-center justify-center gap-1.5"><Wand2 size={13} /> Chỉnh khung</button>
              <button onClick={() => del(t.id)} className="mt-1.5 w-full bg-cream rounded-lg py-1.5 text-[13px] text-[#B05A4A] font-sans flex items-center justify-center gap-1.5"><Trash2 size={13} /> Xóa</button>
            </div>
          ))}
        </div>
      </div>
      {editSlots && <SlotEditor template={editSlots} onClose={() => setEditSlots(null)} onSaved={(u: any) => { setTemplates(ts => ts.map(x => x.id === u.id ? u : x)); }} />}

      {/* MODAL SỬA THÔNG TIN: tên, mô tả, 4 mức giá */}
      {editInfo && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4" style={{ background: "rgba(42,37,32,.55)" }} onClick={() => setEditInfo(null)}>
          <div className="bg-paper rounded-2xl border border-line w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-lg text-ink font-bold">Sửa thông tin template</h3>
              <button onClick={() => setEditInfo(null)} className="w-8 h-8 grid place-items-center rounded-full bg-cream"><X size={15} className="text-ink" /></button>
            </div>
            <div className="font-sans text-sm text-sub mb-1.5">Tên template</div>
            <input className="w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none mb-3" value={editInfo.title} onChange={(e) => setEditInfo((s: any) => ({ ...s, title: e.target.value }))} />
            <div className="font-sans text-sm text-sub mb-1.5">Mô tả</div>
            <textarea rows={3} className="w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none mb-3" value={editInfo.description} onChange={(e) => setEditInfo((s: any) => ({ ...s, description: e.target.value }))} />
            <div className="font-sans text-sm text-sub mb-1.5">Giá theo từng loại (₫)</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[["priceDigital", "Bản digital"], ["priceSoft", "Bìa thường"], ["priceHard", "Bìa cứng"], ["priceFan", "Gấp quạt"]].map(([k, l]) => (
                <div key={k}>
                  <div className="font-sans text-[12px] text-sub mb-1">{l}</div>
                  <input type="number" className="w-full p-2 rounded-lg border border-line font-sans text-sm outline-none" value={editInfo[k]} onChange={(e) => setEditInfo((s: any) => ({ ...s, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button onClick={saveInfo} disabled={savingInfo || !editInfo.title?.trim()} className="mm-btn w-full bg-brass text-white rounded-full py-2.5 font-sans font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {savingInfo ? <Loader2 size={15} className="animate-spin" /> : null} Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
