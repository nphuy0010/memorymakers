"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, Wand2, Shuffle, ChevronLeft, ChevronRight, QrCode, CheckCircle2, Download } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import Flipbook from "@/components/Flipbook";
import { CATS, vnd, type Template } from "@/lib/types";

const STEPS = ["Tải ảnh", "AI điền ảnh", "Xem & chỉnh", "Chọn sản phẩm", "Giao hàng & Thanh toán", "Hoàn tất"];

export default function DesignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrate } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [t, setT] = useState<Template | null>(null);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [filled, setFilled] = useState<(string | undefined)[]>([]); // assignments theo chỉ số khung toàn cục
  const [filling, setFilling] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [mode, setMode] = useState<"digital" | "physical" | null>(null);
  const [option, setOption] = useState("hard");
  const [paid, setPaid] = useState(false);
  const [addr, setAddr] = useState({ name: "", phone: "", address: "" });

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { api.template(id).then(setT).catch(() => {}); }, [id]);
  useEffect(() => { if (user === null && typeof window !== "undefined" && !localStorage.getItem("mm_token")) router.push("/login"); }, [user, router]);

  if (!t) return <div className="p-10 text-center text-sub">Đang tải…</div>;
  const price = mode === "digital" ? t.prices.digital : t.prices[option as "soft" | "hard" | "fan"];
  const addrOk = mode !== "physical" || (!!addr.name && !!addr.phone && !!addr.address);

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => { const r = new FileReader(); r.onload = () => setPhotos((p) => [...p, r.result as string]); r.readAsDataURL(f); });
  };

  // AI điền: lặp ảnh để lấp đủ toàn bộ khung của mẫu
  const autoFill = () => {
    if (!photos.length) return;
    setFilling(true);
    setTimeout(async () => {
      const n = Math.max(1, t.slots);
      const f: (string | undefined)[] = Array.from({ length: n }).map((_, i) => photos[i % photos.length]);
      setFilled(f);
      setFilling(false);
      try {
        const p = await api.createProject({ templateId: t.id, photos: f, title: t.title });
        setProjectId(p.id);
        await api.updateProject(p.id, { status: "DESIGNED" });
      } catch {}
      setStep(2);
    }, 1200);
  };
  const shuffle = () => setFilled((f) => { const photosOnly = f.filter(Boolean) as string[]; const sh = [...photosOnly].sort(() => Math.random() - 0.5); return f.map((_, i) => sh[i % sh.length]); });

  const placeOrder = async () => {
    if (!projectId) return;
    try {
      await api.orderProject(projectId, {
        mode, option: mode === "digital" ? "digital" : option,
        address: mode === "physical" ? addr : null,
      });
    } catch {}
    router.push("/account");
  };

  return (
    <div className="max-w-[980px] mx-auto px-5 pt-8 pb-16">
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

      {/* STEP 0 upload */}
      {step === 0 && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl overflow-hidden">
            {(t.coverImage || t.pages?.[0]?.image) ? <img src={(t.coverImage || t.pages?.[0]?.image) as string} className="w-full" /> : <div className="aspect-[4/5] bg-gradient-to-br from-blush to-blushDeep rounded-2xl" />}
          </div>
          <div>
            <h2 className="font-serif text-2xl text-ink font-bold">{t.title}</h2>
            <p className="font-sans text-sm text-sub mt-2 mb-3.5">{t.description} Mẫu có <b>{t.pageCount ?? t.pages?.length ?? 0} trang</b>. Tải ảnh của bạn — AI sẽ điền vào các khung (ảnh có thể lặp lại).</p>
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-blushDeep rounded-xl p-6 text-center cursor-pointer bg-cream">
              <Upload size={22} className="text-brass mx-auto" />
              <div className="font-sans text-sm text-ink mt-2">Tải ảnh của bạn lên <b>({photos.length})</b></div>
              <div className="font-sans text-xs text-sub">Chọn nhiều ảnh cùng lúc</div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" />
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-1.5 mt-3">
                {photos.map((p, i) => <img key={i} src={p} className="w-full aspect-square object-cover rounded-lg" />)}
              </div>
            )}
            <button disabled={photos.length < 1} onClick={() => setStep(1)}
              className="mt-4 w-full bg-brass text-white rounded-full py-3 font-sans font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
              {photos.length < 1 ? "Tải ít nhất 1 ảnh" : <>Tiếp tục <ChevronRight size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 AI fill */}
      {step === 1 && (
        <div className="text-center py-5">
          <h2 className="font-serif text-2xl text-ink font-bold">AI điền ảnh vào mẫu</h2>
          <p className="font-sans text-sm text-sub mt-2 mb-6">AI sắp ảnh vào các khung có sẵn — giữ nguyên thiết kế gốc.</p>
          {filling ? (
            <div className="font-sans text-sub">Đang điền ảnh…</div>
          ) : (
            <>
              <div className="max-w-[420px] mx-auto mb-6 rounded-2xl overflow-hidden">
                {(t.coverImage || t.pages?.[0]?.image) ? <img src={(t.coverImage || t.pages?.[0]?.image) as string} className="w-full" /> : <div className="aspect-[4/5] bg-gradient-to-br from-blush to-blushDeep" />}
              </div>
              <button onClick={autoFill} className="bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold inline-flex items-center gap-2"><Wand2 size={16} /> Điền ảnh tự động</button>
              <div><button onClick={() => setStep(0)} className="mt-3.5 text-sub font-sans text-sm">← Thêm ảnh khác</button></div>
            </>
          )}
        </div>
      )}

      {/* STEP 2 review (Flipbook thật + watermark) */}
      {step === 2 && (
        <div>
          <h2 className="font-serif text-2xl text-ink font-bold mb-1.5">Xem & chỉnh sửa</h2>
          <p className="font-sans text-sm text-sub mb-4">Bản nháp có watermark bảo vệ tới khi thanh toán.</p>
          <Flipbook t={t} assignments={filled} watermark />
          <div className="flex gap-2.5 mt-3.5">
            <button onClick={shuffle} className="bg-cream text-ink rounded-full px-4 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2"><Shuffle size={15} /> Đổi cách sắp</button>
            <button onClick={() => setStep(1)} className="bg-cream text-ink rounded-full px-4 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2"><Wand2 size={15} /> Điền lại</button>
          </div>
          <div className="mt-5 flex justify-between">
            <button onClick={() => router.push("/account")} className="border border-ink text-ink rounded-full px-5 py-2.5 font-sans text-sm font-semibold">Lưu nháp & thoát</button>
            <button onClick={() => setStep(3)} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2">Chọn sản phẩm <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 3 choose product */}
      {step === 3 && (
        <div>
          <h2 className="font-serif text-2xl text-ink font-bold mb-1.5">Chọn sản phẩm</h2>
          <p className="font-sans text-sm text-sub mb-4.5">Bản vật lý in & giao tận nơi (giá cao hơn). Bản digital nhận file ngay.</p>
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <button onClick={() => setMode("digital")} className={`text-left p-4.5 rounded-2xl border-2 ${mode === "digital" ? "border-brass bg-cream" : "border-line bg-white"}`}>
              <div className="font-serif text-lg text-ink font-bold">Bản digital</div>
              <div className="font-sans text-sm text-sub my-1.5">File độ phân giải cao, nhận ngay.</div>
              <div className="font-sans text-lg text-brass font-bold">{vnd(t.prices.digital)}</div>
            </button>
            <button onClick={() => setMode("physical")} className={`text-left p-4.5 rounded-2xl border-2 ${mode === "physical" ? "border-brass bg-cream" : "border-line bg-white"}`}>
              <div className="font-serif text-lg text-ink font-bold">In thực tế (vật lý)</div>
              <div className="font-sans text-sm text-sub my-1.5">Sách in chất lượng cao, giao tận nơi.</div>
              <div className="font-sans text-lg text-brass font-bold">từ {vnd(Math.min(t.prices.soft, t.prices.hard, t.prices.fan))}</div>
            </button>
          </div>
          {mode === "physical" && (
            <div className="mb-5">
              <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Chọn loại bìa</span>
              <div className="grid grid-cols-3 gap-3 mt-2.5">
                {CATS.filter(c => c.id !== "digital").map(c => (
                  <button key={c.id} onClick={() => setOption(c.id)} className={`p-3.5 rounded-xl border-2 ${option === c.id ? "border-brass bg-cream" : "border-line bg-white"}`}>
                    <div className="font-serif text-[15px] text-ink font-semibold">{c.label}</div>
                    <div className="font-sans text-sm text-brass font-bold mt-1">{vnd(t.prices[c.id as "soft" | "hard" | "fan"])}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="border border-ink text-ink rounded-full px-5 py-2.5 font-sans text-sm font-semibold inline-flex items-center gap-2"><ChevronLeft size={16} /> Quay lại</button>
            <button disabled={!mode} onClick={() => setStep(4)} className="bg-brass text-white rounded-full px-5 py-2.5 font-sans text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-2">Tiếp tục {mode ? "· " + vnd(price) : ""} <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 4 ĐỊA CHỈ (bắt buộc với đơn vật lý) + THANH TOÁN */}
      {step === 4 && (
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            {mode === "physical" && (
              <>
                <h2 className="font-serif text-2xl text-ink font-bold">Thông tin giao hàng</h2>
                <p className="font-sans text-sm text-sub mt-2 mb-4">Vui lòng điền đủ thông tin giao hàng trước khi thanh toán.</p>
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
              <div className="w-44 h-44 mx-auto bg-white border border-line rounded-xl grid place-items-center"><QrCode size={120} className="text-ink" /></div>
              <div className="font-serif text-2xl text-ink font-bold mt-4">{vnd(price)}</div>
              <div className="font-sans text-xs text-sub">MEMORY MAKERS · MM{Math.floor(Math.random() * 9000 + 1000)}</div>
            </div>
            <button disabled={!addrOk} onClick={() => { setPaid(true); placeOrder(); setStep(5); }} className="mt-4 w-full bg-brass text-white rounded-full py-3 font-sans font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"><CheckCircle2 size={16} /> {mode === "physical" && !addrOk ? "Điền đủ địa chỉ để thanh toán" : "Tôi đã thanh toán (demo)"}</button>
          </div>
          <div className="bg-cream rounded-2xl p-5">
            <span className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold">Đơn hàng</span>
            <div className="font-serif text-lg text-ink font-semibold mt-3">{t.title}</div>
            <div className="font-sans text-sm text-sub mt-1">{mode === "digital" ? "Bản digital" : CATS.find(c => c.id === option)?.label}</div>
            <div className="border-t border-line mt-4 pt-3.5 flex justify-between font-sans text-[15px] text-ink"><span>Tổng cộng</span><b className="text-brass">{vnd(price)}</b></div>
          </div>
        </div>
      )}

      {/* STEP 5 success */}
      {step === 5 && (
        <div className="max-w-[640px] mx-auto text-center py-5">
          <div className="w-16 h-16 rounded-full bg-sage grid place-items-center mx-auto mb-4"><CheckCircle2 size={34} className="text-white" /></div>
          <h2 className="font-serif text-3xl text-ink font-bold">Đặt hàng thành công!</h2>
          <p className="font-sans text-sm text-sub mt-2.5 mb-5">{mode === "digital" ? "Bản digital đã mở khoá để tải." : "Memory Makers sẽ in và giao tới bạn sớm."}</p>
          <div className="mb-4.5"><Flipbook t={t} assignments={filled} watermark paid /></div>
          {mode === "digital"
            ? <button onClick={() => router.push("/account")} className="bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold inline-flex items-center gap-2"><Download size={16} /> Tải & về dự án</button>
            : <button onClick={() => router.push("/account")} className="border border-ink text-ink rounded-full px-6 py-3 font-sans font-semibold">Xem trong dự án của tôi</button>}
        </div>
      )}
    </div>
  );
}
