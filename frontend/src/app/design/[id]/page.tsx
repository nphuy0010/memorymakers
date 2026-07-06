"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, QrCode, CheckCircle2, Download } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import Builder from "@/components/Builder";
import Flipbook from "@/components/Flipbook";
import type { Edit, TextItem, StickerItem } from "@/lib/pages";
import { detectFocus } from "@/lib/face";
import { CATS, vnd, type Template } from "@/lib/types";

const STEPS = ["Thiết kế", "Xem trước", "Chọn sản phẩm", "Giao hàng & Thanh toán", "Hoàn tất"];

export default function DesignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectParam = useSearchParams().get("project"); // tiếp tục dự án đã lưu
  const { user, hydrate, hydrated } = useAuth();
  const [saving, setSaving] = useState(false);

  const [t, setT] = useState<Template | null>(null);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<(string | undefined)[]>([]);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [hidden, setHidden] = useState<Record<number, boolean>>({});
  const [texts, setTexts] = useState<Record<number, TextItem[]>>({});
  const [stickers, setStickers] = useState<Record<number, StickerItem[]>>({});
  const [projectId, setProjectId] = useState<string | null>(null);
  const [mode, setMode] = useState<"digital" | "physical" | null>(null);
  const [option, setOption] = useState("hard");
  const [paid, setPaid] = useState(false);
  const [addr, setAddr] = useState({ name: "", phone: "", address: "" });

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { api.template(id).then(setT).catch(() => {}); }, [id]);
  useEffect(() => { if (hydrated && !user) router.push("/login"); }, [hydrated, user, router]);

  // KHÔI PHỤC dự án đã lưu (khi bấm "Tiếp tục" từ Dự án của tôi) — không mất ảnh/thiết kế.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!t || !projectParam || hydratedRef.current) return;
    hydratedRef.current = true;
    api.getProject(projectParam).then((p: any) => {
      setProjectId(p.id);
      if (Array.isArray(p.photos) && p.photos.length) setPhotos(p.photos);
      const L = p.layout || {};
      if (L.assignments) setAssignments(L.assignments);
      if (L.stickers) setStickers(L.stickers);
      if (L.edits) setEdits(L.edits);
      if (L.texts) setTexts(L.texts);
      if (L.hidden) setHidden(L.hidden);
    }).catch(() => {});
  }, [t, projectParam]);

  const layoutObj = () => ({ assignments, edits, texts, hidden, stickers });

  // LƯU DỰ ÁN 1 LẦN (single-flight) — dùng chung cho auto-lưu, xem trước, thanh toán (tránh tạo trùng/đua).
  const draftRef = useRef<Promise<string> | null>(null);
  const ensureProject = (): Promise<string> => {
    if (projectId) return Promise.resolve(projectId);
    if (!draftRef.current) {
      draftRef.current = (async () => {
        const p = await api.createProject({ templateId: t!.id, title: t!.title, photos, layout: layoutObj() });
        if (!p?.id) throw new Error("Máy chủ không trả về dự án");
        setProjectId(p.id);
        await api.updateProject(p.id, { status: "DESIGNED" });
        return p.id as string;
      })();
      draftRef.current.catch(() => { draftRef.current = null; }); // lỗi -> cho thử lại
    }
    return draftRef.current;
  };

  // Tự lưu nháp ngay khi chèn ảnh đầu tiên -> thoát ra vẫn còn trong "Dự án của tôi".
  useEffect(() => {
    if (!t || projectId || !user) return;
    if (assignments.filter(Boolean).length < 1) return;
    ensureProject().catch((e: any) => console.warn("Lưu nháp lỗi:", e?.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, assignments, projectId, user]);

  // DÒ KHUÔN MẶT: khi có ảnh mới vào ô, tự đặt điểm lấy nét (ox,oy) để không cắt mất mặt.
  const focusDone = useRef<Record<string, boolean>>({});
  useEffect(() => {
    assignments.forEach((img, g) => {
      if (!img) return;
      if (edits[g]?.ox !== undefined) return; // khách đã tự chỉnh -> tôn trọng
      const key = g + "|" + img.slice(0, 40);
      if (focusDone.current[key]) return;
      focusDone.current[key] = true;
      detectFocus(img).then(({ ox, oy }) => setEdits((e) => (e[g]?.ox !== undefined ? e : { ...e, [g]: { ...e[g], ox, oy } })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  // TỰ LƯU khi khách sửa (ảnh/bố cục/chữ) — giữ nguyên ảnh khách khi thoát ra rồi vào lại.
  const saveTimer = useRef<any>(null);
  useEffect(() => {
    if (!projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.updateProject(projectId, { photos, layout: layoutObj() }).catch(() => {});
    }, 900);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, photos, assignments, edits, texts, hidden]);

  // Hooks MoMo phải nằm TRƯỚC mọi early-return (quy tắc hooks — tránh lỗi React #310)
  const [momo, setMomo] = useState<{ payUrl?: string; qrCodeUrl?: string; amount?: number } | null>(null);
  const pollRef = useRef<any>(null);
  useEffect(() => () => clearInterval(pollRef.current), []);

  if (!t) return <div className="p-10 text-center text-sub">Đang tải…</div>;
  const price = mode === "digital" ? t.prices.digital : t.prices[option as "soft" | "hard" | "fan"];
  const addrOk = mode !== "physical" || (!!addr.name && !!addr.phone && !!addr.address);
  const placed = assignments.filter(Boolean).length;

  const goPreview = async () => {
    if (!placed) return alert("Hãy chèn ít nhất 1 ảnh vào mẫu trước khi tiếp tục.");
    setStep(1);
    try { await ensureProject(); }
    catch (e: any) { alert("Chưa lưu được dự án: " + (e?.message || "lỗi") + "\n→ Hãy ĐĂNG NHẬP LẠI (nếu vừa reset DB) hoặc kiểm tra backend ở cổng 5000."); }
  };
  // THANH TOÁN: gọi MoMo thật (server tính tiền + verify IPN). Chưa bật MoMo -> demo có kiểm soát.
  const payNow = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const pid = await ensureProject();
      const body = { mode, option: mode === "digital" ? "digital" : option, address: mode === "physical" ? addr : null };
      const r: any = await api.momoCreate(pid, body);
      if (r.demo) {
        // Demo có kiểm soát: server vẫn tự tính tiền + ghi rõ DEMO-PAYMENT
        await api.demoConfirm(pid, body);
        setPaid(true); setStep(4);
        return;
      }
      // MoMo thật: hiện QR + poll trạng thái (chỉ IPN của MoMo mới đánh dấu đã trả tiền)
      setMomo(r);
      if (r.payUrl) window.open(r.payUrl, "_blank");
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const st: any = await api.paymentStatus(pid);
          if (st.status === "PURCHASED") { clearInterval(pollRef.current); setPaid(true); setStep(4); }
        } catch {}
      }, 3000);
    } catch (e: any) {
      alert("Thanh toán thất bại: " + (e?.message || "lỗi không xác định") + "\n→ Đăng nhập lại (nếu vừa reset DB) hoặc kiểm tra backend.");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-[1180px] mx-auto px-5 pt-8 pb-16">
      <div className="flex items-center gap-1.5 mb-7 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full grid place-items-center font-sans text-xs font-bold ${i <= step ? "bg-brass text-white" : "bg-cream text-sub"}`}>{i < step ? "✓" : i + 1}</div>
              <span className={`font-sans text-xs ${i === step ? "text-ink font-bold" : "text-sub"}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-3.5 h-px bg-line" />}
          </div>
        ))}
      </div>

      {/* STEP 0 — TRÌNH THIẾT KẾ (chèn/xoá/kéo ảnh, thêm text, ẩn trang, zoom/xoay/lọc) */}
      {step === 0 && (
        <div className="max-w-none">
          <div className="flex justify-between items-end mb-3 flex-wrap gap-2">
            <div>
              <h2 className="font-serif text-2xl text-ink font-bold">{t.title}</h2>
              <p className="font-sans text-sm text-sub mt-1">Tải ảnh ở cột phải, bấm khung để chèn, kéo ảnh ra ngoài hoặc nhấn Delete để gỡ. Có thể thêm chữ, ẩn trang, chỉnh zoom/xoay/lọc.</p>
            </div>
            <button onClick={goPreview} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2 shrink-0">Xem trước <ChevronRight size={16} /></button>
          </div>
          <Builder t={t} photos={photos} setPhotos={setPhotos} assignments={assignments} setAssignments={setAssignments} edits={edits} setEdits={setEdits} hidden={hidden} setHidden={setHidden} texts={texts} setTexts={setTexts} stickers={stickers} setStickers={setStickers} />
        </div>
      )}

      {/* STEP 1 — XEM TRƯỚC (Flipbook 3D + watermark) */}
      {step === 1 && (
        <div className="max-w-[980px] mx-auto">
          <h2 className="font-serif text-2xl text-ink font-bold mb-1.5">Xem trước cuốn sách</h2>
          <p className="font-sans text-sm text-sub mb-4">Bản nháp có watermark bảo vệ tới khi thanh toán. Lật trang để xem toàn bộ.</p>
          <Flipbook t={t} assignments={assignments} edits={edits} texts={texts} hidden={hidden} stickers={stickers} watermark />
          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep(0)} className="border border-ink text-ink rounded-full px-5 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2"><ChevronLeft size={16} /> Chỉnh tiếp</button>
            <button onClick={() => setStep(2)} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2">Chọn sản phẩm <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 2 — CHỌN SẢN PHẨM (2 thẻ CAO BẰNG NHAU) */}
      {step === 2 && (
        <div className="max-w-[980px] mx-auto">
          <h2 className="font-serif text-2xl text-ink font-bold mb-1.5">Chọn sản phẩm</h2>
          <p className="font-sans text-sm text-sub mb-4.5">Bản vật lý in &amp; giao tận nơi (giá cao hơn). Bản digital nhận file ngay.</p>
          <div className="grid md:grid-cols-2 gap-4 mb-5 items-stretch">
            <button onClick={() => setMode("digital")} className={`text-left p-5 rounded-2xl border-2 h-full flex flex-col ${mode === "digital" ? "border-brass bg-cream" : "border-line bg-white"}`}>
              <div className="font-serif text-lg text-ink font-bold">Bản digital</div>
              <div className="font-sans text-sm text-sub my-1.5 flex-1">File độ phân giải cao, nhận ngay.</div>
              <div className="font-sans text-lg text-brass font-bold mt-auto">{vnd(t.prices.digital)}</div>
            </button>
            <button onClick={() => setMode("physical")} className={`text-left p-5 rounded-2xl border-2 h-full flex flex-col ${mode === "physical" ? "border-brass bg-cream" : "border-line bg-white"}`}>
              <div className="font-serif text-lg text-ink font-bold">In thực tế (vật lý)</div>
              <div className="font-sans text-sm text-sub my-1.5 flex-1">Sách in chất lượng cao, giao tận nơi.</div>
              <div className="font-sans text-lg text-brass font-bold mt-auto">từ {vnd(Math.min(t.prices.soft, t.prices.hard, t.prices.fan))}</div>
            </button>
          </div>
          {mode === "physical" && (
            <div className="mb-5">
              <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Chọn loại bìa</span>
              <div className="grid grid-cols-3 gap-3 mt-2.5 items-stretch">
                {CATS.filter(c => c.id !== "digital").map(c => (
                  <button key={c.id} onClick={() => setOption(c.id)} className={`p-3.5 rounded-xl border-2 h-full flex flex-col ${option === c.id ? "border-brass bg-cream" : "border-line bg-white"}`}>
                    <div className="font-serif text-[15px] text-ink font-semibold">{c.label}</div>
                    <div className="font-sans text-sm text-brass font-bold mt-auto pt-1">{vnd(t.prices[c.id as "soft" | "hard" | "fan"])}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="border border-ink text-ink rounded-full px-5 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2"><ChevronLeft size={16} /> Quay lại</button>
            <button disabled={!mode} onClick={() => setStep(3)} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-2">Tiếp tục {mode ? "· " + vnd(price) : ""} <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 3 — ĐỊA CHỈ (bắt buộc với đơn vật lý) rồi mới THANH TOÁN */}
      {step === 3 && (
        <div className="max-w-[980px] mx-auto grid md:grid-cols-2 gap-8 items-start">
          <div>
            {mode === "physical" && (
              <>
                <h2 className="font-serif text-2xl text-ink font-bold">Thông tin giao hàng</h2>
                <p className="font-sans text-sm text-sub mt-2 mb-4">Điền đủ thông tin giao hàng trước khi thanh toán.</p>
                <div className="bg-white border border-line rounded-2xl p-5 mb-5">
                  {([["name", "Họ và tên"], ["phone", "Số điện thoại"], ["address", "Địa chỉ nhận hàng"]] as const).map(([k, l]) => (
                    <div key={k} className="mb-3.5 last:mb-0">
                      <div className="font-sans text-sm text-sub mb-1.5">{l}</div>
                      <input value={(addr as any)[k]} onChange={(e) => setAddr(a => ({ ...a, [k]: e.target.value }))} className="w-full p-3 rounded-lg border border-line font-sans text-sm outline-none" />
                    </div>
                  ))}
                </div>
              </>
            )}
            <h2 className="font-serif text-2xl text-ink font-bold">Thanh toán qua MoMo</h2>
            <p className="font-sans text-sm text-sub mt-2 mb-4.5">{mode === "physical" && !addrOk ? "Hãy điền đủ địa chỉ ở trên để mở thanh toán." : "Quét mã QR bằng app MoMo để hoàn tất."}</p>
            <div className={`bg-white border border-line rounded-2xl p-6 text-center ${mode === "physical" && !addrOk ? "opacity-40 pointer-events-none" : ""}`}>
              {momo?.qrCodeUrl
                ? <img src={momo.qrCodeUrl} alt="QR MoMo" className="w-44 h-44 mx-auto bg-white border border-line rounded-xl object-contain" />
                : <div className="w-44 h-44 mx-auto bg-white border border-line rounded-xl grid place-items-center"><QrCode size={120} className="text-ink" /></div>}
              {momo && <div className="font-sans text-xs text-sub text-center mt-2">Quét bằng app MoMo — hệ thống tự xác nhận khi bạn trả xong (đang chờ…)</div>}
              <div className="font-serif text-2xl text-ink font-bold mt-4">{vnd(price)}</div>
              <div className="font-sans text-xs text-sub">MEMORY MAKERS · MM{Math.floor(Math.random() * 9000 + 1000)}</div>
            </div>
            <button disabled={!addrOk || saving} onClick={payNow} className="mt-4 w-full bg-brass text-white rounded-full py-3 font-sans font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"><CheckCircle2 size={16} /> {saving ? "Đang xử lý…" : (mode === "physical" && !addrOk ? "Điền đủ địa chỉ để thanh toán" : (momo ? "Mở lại trang MoMo" : "Thanh toán"))}</button>
          </div>
          <div className="bg-cream rounded-2xl p-5">
            <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Đơn hàng</span>
            <div className="font-serif text-lg text-ink font-semibold mt-3">{t.title}</div>
            <div className="font-sans text-sm text-sub mt-1">{mode === "digital" ? "Bản digital" : CATS.find(c => c.id === option)?.label} · {placed} ảnh</div>
            <div className="border-t border-line mt-4 pt-3.5 flex justify-between font-sans text-[15px] text-ink"><span>Tổng cộng</span><b className="text-brass">{vnd(price)}</b></div>
          </div>
        </div>
      )}

      {/* STEP 4 — HOÀN TẤT */}
      {step === 4 && (
        <div className="max-w-[760px] mx-auto text-center py-5">
          <div className="w-16 h-16 rounded-full bg-sage grid place-items-center mx-auto mb-4"><CheckCircle2 size={34} className="text-white" /></div>
          <h2 className="font-serif text-3xl text-ink font-bold">Đặt hàng thành công!</h2>
          <p className="font-sans text-sm text-sub mt-2.5 mb-5">{mode === "digital" ? "Bản digital đã mở khoá để tải." : "Memory Makers sẽ in và giao tới bạn sớm."}</p>
          <div className="mb-4.5"><Flipbook t={t} assignments={assignments} edits={edits} texts={texts} hidden={hidden} stickers={stickers} watermark paid /></div>
          {mode === "digital"
            ? <button onClick={() => router.push("/account")} className="bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold inline-flex items-center gap-2"><Download size={16} /> Tải &amp; về dự án</button>
            : <button onClick={() => router.push("/account")} className="border border-ink text-ink rounded-full px-6 py-3 font-sans font-semibold">Xem trong dự án của tôi</button>}
        </div>
      )}
    </div>
  );
}
