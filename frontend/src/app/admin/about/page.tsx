"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Film, Trash2, Loader2 } from "lucide-react";
import { api, clearApiCache } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

export default function AdminAbout() {
  const [a, setA] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [heroItems, setHeroItems] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [vUp, setVUp] = useState(false);
  const saveHeroItems = async (items: { url: string; type: "image" | "video" }[]) => {
    await api.setHeroMedia(items); clearApiCache(); setHeroItems(items);
  };
  const [pols, setPols] = useState<any[]>([]);
  const [helpUrl, setHelpUrl] = useState("");
  const [helpUp, setHelpUp] = useState(false);
  const [qr, setQr] = useState<{ url: string | null; note: string }>({ url: null, note: "" });
  const [qrUp, setQrUp] = useState(false);
  const [qrSaved, setQrSaved] = useState(false);
  const saveQr = async (next: { url: string | null; note: string }) => {
    await api.setPaymentQr(next.url, next.note); clearApiCache(); setQr(next);
    setQrSaved(true); setTimeout(() => setQrSaved(false), 2000);
  };
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState("");

  useEffect(() => { api.about().then(setA).catch(() => {}); api.getHeroMedia().then((r: any) => setHeroItems(Array.isArray(r?.items) ? r.items : [])).catch(() => {}); api.getPolicies().then(setPols).catch(() => {}); api.getHelpVideo().then((r: any) => setHelpUrl(r?.url || "")).catch(() => {}); api.getPaymentQr().then((r: any) => setQr({ url: r?.url || null, note: r?.note || "" })).catch(() => {}); }, []);

  const savePolicies = async () => {
    setPSaving(true); setPMsg("");
    try { await api.setPolicies(pols); clearApiCache(); setPMsg("Đã lưu ✓"); setTimeout(() => setPMsg(""), 2000); }
    catch (e: any) { alert("Lưu lỗi: " + (e?.message || "") + "\n→ Backend cần bản mới (route /settings/policies)."); }
    finally { setPSaving(false); }
  };
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
          {/* Mỗi kênh 2 ô: TÊN HIỂN THỊ (ra giao diện) + LINK (bấm vào mở). Trống cả 2 -> kênh tự ẩn ngoài web */}
          {([
            ["instagram", "Instagram", "@tên_tài_khoản", "https://instagram.com/..."],
            ["tiktok", "TikTok", "@tên_kênh", "https://tiktok.com/@..."],
            ["hotline", "Hotline", "0909 xxx xxx", "tel:0909xxxxxx"],
          ] as [string, string, string, string][]).map(([key, label, phName, phUrl]) => (
            <div key={key} className="border border-line rounded-xl p-3">
              <div className="font-sans text-[12.5px] font-semibold text-ink mb-2">{label}</div>
              <input className="w-full p-2 rounded-lg border border-line font-sans text-[13px] outline-none mb-2" placeholder={"Tên hiển thị — vd: " + phName}
                value={(a as any)[key] || ""} onChange={(e) => set(key, e.target.value)} />
              <input className="w-full p-2 rounded-lg border border-line font-sans text-[13px] outline-none" placeholder={"Đường dẫn — vd: " + phUrl}
                value={(a as any)[key + "Url"] || ""} onChange={(e) => set(key + "Url", e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* MÃ QR THANH TOÁN: ảnh QR của shop (MoMo / ngân hàng) hiện ở bước thanh toán của khách */}
      <div className="bg-white rounded-2xl border border-line p-5 mt-5">
        <h3 className="font-serif text-lg text-ink font-bold mb-1">Mã QR thanh toán</h3>
        <p className="font-sans text-[13px] text-sub mb-3">Tải ảnh QR của shop (chụp từ app MoMo hoặc ngân hàng). Khách sẽ quét mã này ở bước thanh toán, kèm số tiền và mã đơn để bạn đối chiếu. Chưa có ảnh thì khách thấy ô QR trống như cũ.</p>
        <div className="flex items-start gap-4 flex-wrap">
          {qr.url ? (
            <div className="relative w-36">
              <img src={qr.url} alt="QR thanh toán" className="w-36 h-36 rounded-xl border border-line object-contain bg-white" />
              <button onClick={() => saveQr({ url: null, note: qr.note })} className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-[#B05A4A] text-white text-[10px]">✕</button>
            </div>
          ) : (
            <label className="w-36 h-36 rounded-xl border border-dashed border-brass/60 grid place-items-center cursor-pointer text-brass hover:bg-cream">
              {qrUp ? <Loader2 size={18} className="animate-spin" /> : <span className="font-sans text-[12px] font-semibold text-center leading-tight">+ Tải ảnh<br />QR lên</span>}
              <input type="file" accept="image/*" className="hidden" disabled={qrUp}
                onChange={async (e) => {
                  const f = e.target.files?.[0]; e.currentTarget.value = "";
                  if (!f) return;
                  setQrUp(true);
                  try { const { url } = await api.uploadFile(f); await saveQr({ url, note: qr.note }); }
                  catch (err: any) { alert("Upload lỗi: " + (err?.message || "")); }
                  finally { setQrUp(false); }
                }} />
            </label>
          )}
          <div className="flex-1 min-w-[240px]">
            <div className="font-sans text-sm text-sub mb-1.5">Thông tin nhận tiền (hiện dưới mã QR cho khách)</div>
            <input value={qr.note} onChange={(e) => setQr((q) => ({ ...q, note: e.target.value }))}
              placeholder="VD: Vietcombank · 0123456789 · NGUYEN VAN A"
              className="w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none mb-2" />
            <button onClick={() => saveQr(qr)} className="mm-btn bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold">
              {qrSaved ? "Đã lưu ✓" : "Lưu thông tin"}
            </button>
          </div>
        </div>
      </div>

      {/* MEDIA TRANG CHỦ: nhiều ẢNH + VIDEO — hiển thị carousel vòng tròn (ảnh 3s, video chạy hết) */}
      <div className="bg-white rounded-2xl border border-line p-5 mt-5">
        <div className="flex items-center gap-2 mb-1"><Film size={18} className="text-brass" /><h3 className="font-serif text-lg text-ink font-bold">Ảnh / Video trang chủ (carousel)</h3></div>
        <p className="font-sans text-[13px] text-sub mb-3">Tải nhiều ảnh hoặc video (≤15MB mỗi file, tối đa 10). Trang chủ hiển thị lần lượt theo vòng tròn: đang chiếu nằm trước, các media sau xếp phía sau mờ dần; ảnh chiếu 3 giây, video chạy hết rồi tự chuyển. Trống thì hiển thị bìa mẫu như cũ.</p>
        <div className="flex gap-2.5 flex-wrap items-start mb-3">
          {heroItems.map((it, i) => (
            <div key={i} className="relative w-24">
              <div className="w-24 h-16 rounded-lg overflow-hidden border border-line bg-cream">
                {it.type === "video"
                  ? <video src={it.url} muted className="w-full h-full object-cover" />
                  : <img src={it.url} className="w-full h-full object-cover" />}
              </div>
              <span className="absolute top-1 left-1 bg-black/55 text-white rounded px-1 font-sans text-[9.5px]">{i + 1} · {it.type === "video" ? "video" : "ảnh"}</span>
              <button onClick={() => saveHeroItems(heroItems.filter((_, k) => k !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-[#B05A4A] text-white text-[10px]">✕</button>
            </div>
          ))}
          {heroItems.length < 10 && (
            <label className="w-24 h-16 rounded-lg border border-dashed border-brass/60 grid place-items-center cursor-pointer text-brass hover:bg-cream">
              {vUp ? <Loader2 size={16} className="animate-spin" /> : <span className="font-sans text-[11px] font-semibold text-center leading-tight">+ Thêm<br />ảnh/video</span>}
              <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" disabled={vUp} multiple
                onChange={async (e) => {
                  const fs = Array.from(e.target.files || []); e.currentTarget.value = "";
                  if (!fs.length) return;
                  setVUp(true);
                  try {
                    const added: any[] = [];
                    for (const f of fs.slice(0, 10 - heroItems.length)) {
                      const { url } = await api.uploadFile(f);
                      added.push({ url, type: f.type.startsWith("video") ? "video" : "image" });
                    }
                    await saveHeroItems([...heroItems, ...added]);
                  } catch (err: any) { alert("Upload lỗi: " + (err?.message || "") + "\n→ Mỗi file ≤ 15MB; backend cần bản mới (route hero-media)."); }
                  finally { setVUp(false); }
                }} />
            </label>
          )}
        </div>
        <p className="font-sans text-[11.5px] text-sub">Thứ tự hiển thị = thứ tự trong danh sách. Xoá rồi tải lại để đổi thứ tự.</p>
      </div>
      {/* VIDEO HƯỚNG DẪN (nút ? nổi cạnh chat): UPLOAD trực tiếp — có preview + nút xoá; chưa có video -> nút ? tự ẩn */}
      <div className="bg-white rounded-2xl border border-line p-5 mt-5">
        <h3 className="font-serif text-lg text-ink font-bold mb-1">Video hướng dẫn (nút ?)</h3>
        <p className="font-sans text-[13px] text-sub mb-3">Tải video hướng dẫn (mp4 / webm / mov, ≤15MB). Khách sẽ thấy nút <b>?</b> tròn phía trên nút chat — bấm mở popup xem video. Xoá video để ẩn nút.</p>
        {helpUrl ? (
          <div>
            <video src={helpUrl} controls playsInline preload="metadata" className="w-full max-w-md rounded-xl border border-line" />
            <button onClick={async () => { if (!confirm("Xoá video hướng dẫn? Nút ? sẽ ẩn khỏi trang.")) return; try { await api.setHelpVideo(null); clearApiCache(); setHelpUrl(""); } catch (e: any) { alert(e?.message || "Lỗi"); } }}
              className="mt-3 font-sans text-[13px] text-[#B05A4A] flex items-center gap-1.5">🗑 Xoá video (ẩn nút ?)</button>
          </div>
        ) : (
          <label className="mm-btn inline-flex items-center gap-2 bg-brass text-white rounded-full px-4 py-2 font-sans text-sm font-semibold cursor-pointer">
            {helpUp ? "Đang tải video…" : "Tải video lên"}
            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/*" className="hidden" disabled={helpUp}
              onChange={async (e) => {
                const f = e.target.files?.[0]; e.currentTarget.value = "";
                if (!f) return;
                if (!f.type.startsWith("video")) { alert("Hãy chọn file VIDEO (mp4/webm/mov)."); return; }
                setHelpUp(true);
                try { const { url } = await api.uploadFile(f); await api.setHelpVideo(url); clearApiCache(); setHelpUrl(url); }
                catch (err: any) { alert("Upload lỗi: " + (err?.message || "") + "\n→ Video ≤ 15MB."); }
                finally { setHelpUp(false); }
              }} />
          </label>
        )}
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
