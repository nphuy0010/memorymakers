"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Film, Trash2, Loader2 } from "lucide-react";
import { api, clearApiCache } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

export default function AdminAbout() {
  const [a, setA] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [heroVideo, setHeroVideo] = useState<string | null>(null);
  const [vUp, setVUp] = useState(false);
  const [pols, setPols] = useState<any[]>([]);
  const [helpUrl, setHelpUrl] = useState("");
  const [helpSaving, setHelpSaving] = useState(false);
  const [helpUp, setHelpUp] = useState(false);
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState("");

  useEffect(() => { api.about().then(setA).catch(() => {}); api.getHeroVideo().then((r: any) => setHeroVideo(r?.url || null)).catch(() => {}); api.getPolicies().then(setPols).catch(() => {}); api.getHelpVideo().then((r: any) => setHelpUrl(r?.url || "")).catch(() => {}); }, []);

  const uploadHero = async (file: File) => {
    setVUp(true);
    try {
      if (!file.type.startsWith("video")) { alert("Hãy chọn file VIDEO (mp4/webm)."); return; }
      const { url } = await api.uploadFile(file); // admin được upload video (giới hạn 15MB)
      await api.setHeroVideo(url);
      clearApiCache(); setHeroVideo(url);
    } catch (e: any) { alert("Upload video lỗi: " + (e?.message || "") + "\n→ Video ≤ 15MB; backend cần bản mới (route hero-video)."); }
    finally { setVUp(false); }
  };
  const saveHelp = async () => {
    setHelpSaving(true);
    try { await api.setHelpVideo(helpUrl.trim() || null); clearApiCache(); alert(helpUrl.trim() ? "Đã lưu video hướng dẫn ✓" : "Đã tắt nút Hướng dẫn ✓"); }
    catch (e: any) { alert("Lưu lỗi: " + (e?.message || "")); }
    finally { setHelpSaving(false); }
  };
  const savePolicies = async () => {
    setPSaving(true); setPMsg("");
    try { await api.setPolicies(pols); clearApiCache(); setPMsg("Đã lưu ✓"); setTimeout(() => setPMsg(""), 2000); }
    catch (e: any) { alert("Lưu lỗi: " + (e?.message || "") + "\n→ Backend cần bản mới (route /settings/policies)."); }
    finally { setPSaving(false); }
  };
  const removeHero = async () => { try { await api.setHeroVideo(null); clearApiCache(); setHeroVideo(null); } catch (e: any) { alert("Lỗi: " + (e?.message || "")); } };
  if (!a) return <AdminShell><div className="p-6 text-sub">Đang tải…</div></AdminShell>;

  const set = (k: string, v: string) => { setA((s: any) => ({ ...s, [k]: v })); setSaved(false); };
  const save = async () => { await api.saveAbout(a); setSaved(true); };

  const inp = "w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none mb-3";
  const field = (k: string, label: string, area = false) => (
    <div>
      <div className="font-sans text-sm text-sub mb-1.5">{label}</div>
      {area ? <textarea rows={4} className={inp} value={a[k] || ""} onChange={e => set(k, e.target.value)} />
            : <input className={inp} value={a[k] || ""} onChange={e => set(k, e.target.value)} />}
    </div>
  );

  return (
    <AdminShell>
      <div className="bg-white rounded-2xl border border-line p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-lg text-ink font-bold">Chỉnh sửa trang About Us</h3>
          <button onClick={save} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans font-semibold inline-flex items-center gap-2"><CheckCircle2 size={16} /> {saved ? "Đã lưu" : "Lưu thay đổi"}</button>
        </div>
        {field("headline", "Tiêu đề lớn")}
        {field("mission", "Sứ mệnh / mô tả shop", true)}
        {field("story", "Câu chuyện", true)}
        {field("values", "Giá trị", true)}
        <div className="grid grid-cols-3 gap-3">
          {field("instagram", "Instagram")}
          {field("tiktok", "TikTok")}
          {field("hotline", "Hotline")}
        </div>
      </div>

      {/* VIDEO TRANG CHỦ: có video -> hero hiển thị video thay cụm bìa mẫu; gỡ -> hiển thị bìa như cũ */}
      <div className="bg-white rounded-2xl border border-line p-5 mt-5">
        <div className="flex items-center gap-2 mb-1"><Film size={18} className="text-brass" /><h3 className="font-serif text-lg text-ink font-bold">Video trang chủ</h3></div>
        <p className="font-sans text-[13px] text-sub mb-3">Upload video (mp4/webm, ≤15MB) — trang chủ sẽ hiển thị video này thay cụm bìa mẫu, cập nhật ngay sau khi tải xong. Không có video thì trang chủ vẫn hiển thị các template như bình thường.</p>
        {heroVideo ? (
          <div>
            <video src={heroVideo} autoPlay muted loop playsInline className="w-full max-w-md rounded-xl border border-line" />
            <button onClick={removeHero} className="mt-3 font-sans text-[13px] text-[#B05A4A] flex items-center gap-1.5"><Trash2 size={14} /> Gỡ video (quay lại hiển thị bìa mẫu)</button>
          </div>
        ) : (
          <label className="mm-btn inline-flex items-center gap-2 bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold cursor-pointer">
            {vUp ? <><Loader2 size={15} className="animate-spin" /> Đang tải video…</> : <><Film size={15} /> Tải video lên</>}
            <input type="file" accept="video/mp4,video/webm,video/*" className="hidden" disabled={vUp} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); e.currentTarget.value = ""; }} />
          </label>
        )}
      </div>
      {/* VIDEO HƯỚNG DẪN (nút ? nổi cạnh chat): dán URL hoặc UPLOAD file; để trống -> ẩn nút */}
      <div className="bg-white rounded-2xl border border-line p-5 mt-5">
        <h3 className="font-serif text-lg text-ink font-bold mb-1">Video hướng dẫn (nút ?)</h3>
        <p className="font-sans text-[13px] text-sub mb-3">Dán link YouTube / Vimeo / mp4 <b>hoặc tải file video lên</b> (≤15MB). Khách sẽ thấy nút <b>?</b> tròn phía trên nút chat — bấm mở popup video. Để trống và Lưu để ẩn nút.</p>
        <div className="flex gap-2 flex-wrap items-center">
          <input className="flex-1 min-w-[240px] p-2.5 rounded-lg border border-line font-sans text-sm outline-none" placeholder="https://www.youtube.com/watch?v=…" value={helpUrl} onChange={(e) => setHelpUrl(e.target.value)} />
          <label className="mm-btn inline-flex items-center gap-1.5 border border-line bg-cream/60 hover:bg-cream text-ink rounded-full px-4 py-2 font-sans text-sm font-semibold cursor-pointer">
            {helpUp ? "Đang tải…" : "Tải video lên"}
            <input type="file" accept="video/mp4,video/webm,video/*" className="hidden" disabled={helpUp}
              onChange={async (e) => {
                const f = e.target.files?.[0]; e.currentTarget.value = "";
                if (!f) return;
                if (!f.type.startsWith("video")) { alert("Hãy chọn file VIDEO (mp4/webm)."); return; }
                setHelpUp(true);
                try { const { url } = await api.uploadFile(f); setHelpUrl(url); await api.setHelpVideo(url); clearApiCache(); alert("Đã tải video và lưu ✓"); }
                catch (err: any) { alert("Upload lỗi: " + (err?.message || "") + "\n→ Video ≤ 15MB."); }
                finally { setHelpUp(false); }
              }} />
          </label>
          <button onClick={saveHelp} disabled={helpSaving} className="mm-btn bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60">{helpSaving ? "Đang lưu…" : "Lưu"}</button>
        </div>
      </div>

      {/* CHÍNH SÁCH: admin chỉnh tiêu đề + nội dung; khách bấm ở footer -> popup */}
      <div className="bg-white rounded-2xl border border-line p-5 mt-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-lg text-ink font-bold">Chính sách</h3>
          <button onClick={savePolicies} disabled={pSaving} className="mm-btn bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60">{pSaving ? "Đang lưu…" : pMsg || "Lưu chính sách"}</button>
        </div>
        <p className="font-sans text-[13px] text-sub mb-4">5 mục cố định giống bản gốc, hiển thị ở chân trang — khách bấm vào sẽ hiện popup. Bạn chỉ cần soạn nội dung.</p>
        <div className="space-y-4">
          {pols.map((p, i) => (
            <div key={p.id} className="border border-line rounded-xl p-3.5">
              <div className="font-sans text-sm font-semibold text-ink mb-2">{p.title}</div>
              <textarea rows={3} className="w-full p-2.5 rounded-lg border border-line font-sans text-[13px] outline-none" placeholder="Nội dung chính sách…" value={p.content} onChange={(e) => setPols(ps => ps.map((x, j) => j === i ? { ...x, content: e.target.value } : x))} />
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
