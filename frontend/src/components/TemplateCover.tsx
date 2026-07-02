import type { Template } from "@/lib/types";

const GRADS = ["from-blush to-blushDeep", "from-sage/40 to-sage", "from-cream to-brass", "from-slate-200 to-slate-400"];

// Bìa: nếu template có ẢNH DEMO -> ghép ảnh vào khung trang bìa (hiển thị bản đã điền ở MỌI nơi).
// Nếu chưa có demo -> hiển thị ảnh bìa/trang trống như cũ.
export default function TemplateCover({ t, big, kind = "cover" }: { t: Template; big?: boolean; kind?: "cover" | "demo" | "blank" }) {
  const cover = t.pages?.[0];
  const dp = (t.demoPhotos || []) as string[];
  const composed = kind === "cover" && cover?.image && (cover.slots?.length || 0) > 0 && dp.length > 0;

  // Bìa ghép ảnh demo vào khung
  if (composed) {
    return (
      <div className="mm-cover relative overflow-hidden rounded-2xl shadow-md bg-white aspect-[3/2]">
        <img src={cover!.image as string} alt={t.title} draggable={false} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover select-none" />
        {cover!.slots.map((s: any, i: number) => (
          <div key={i} className="absolute overflow-hidden" style={{ left: s.x + "%", top: s.y + "%", width: s.w + "%", height: s.h + "%", borderRadius: s.shape === "circle" ? "50%" : 2 }}>
            <img src={dp[i % dp.length]} draggable={false} loading="lazy" decoding="async" className="w-full h-full object-cover select-none" />
          </div>
        ))}
      </div>
    );
  }

  const img = kind === "demo" ? t.demoImage : kind === "blank" ? t.blankImage : (t.demoImage || t.coverImage || t.pages?.[0]?.image || t.blankImage);
  if (img) {
    return (
      <div className="mm-cover relative overflow-hidden rounded-2xl shadow-md bg-cream grid place-items-center aspect-[3/2]">
        <img src={img as string} alt={t.title} draggable={false} loading="lazy" decoding="async" className="w-full h-full object-contain select-none" />
      </div>
    );
  }
  const g = GRADS[t.title.length % GRADS.length];
  return (
    <div className={`mm-cover relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-br ${g} aspect-[3/2]`}>
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="font-serif text-white font-semibold leading-tight" style={{ fontSize: big ? 26 : 17, textShadow: "0 1px 6px rgba(0,0,0,.25)" }}>{t.title}</div>
        <div className="font-sans text-white/85 text-[11px] tracking-wide mt-1">PHOTOBOOK · {t.pageCount ?? 0} TRANG</div>
      </div>
    </div>
  );
}
