import { thumbUrl } from "@/lib/img";
import type { Template } from "@/lib/types";

const GRADS = ["from-blush to-blushDeep", "from-sage/40 to-sage", "from-cream to-brass", "from-slate-200 to-slate-400"];

// Bìa hiển thị ẢNH PHẲNG: ưu tiên ảnh demo đã ghép sẵn (demoImage) -> bìa -> trang đầu.
export default function TemplateCover({ t, big, kind = "cover" }: { t: Template; big?: boolean; kind?: "cover" | "demo" | "blank" }) {
  const img = kind === "demo" ? t.demoImage : kind === "blank" ? t.blankImage : (t.demoImage || t.coverImage || t.pages?.[0]?.image || t.blankImage);
  if (img) {
    return (
      <div className="mm-cover relative overflow-hidden rounded-2xl shadow-md bg-cream grid place-items-center aspect-[3/4]">
        <img src={thumbUrl(img as string, 640)} alt={t.title} draggable={false} loading="lazy" decoding="async" className="w-full h-full object-cover select-none" />
      </div>
    );
  }
  const g = GRADS[t.title.length % GRADS.length];
  return (
    <div className={`mm-cover relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-br ${g} aspect-[3/4]`}>
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="font-serif text-white font-semibold leading-tight" style={{ fontSize: big ? 26 : 17, textShadow: "0 1px 6px rgba(0,0,0,.25)" }}>{t.title}</div>
        <div className="font-sans text-white/85 text-[11px] tracking-wide mt-1">PHOTOBOOK · {t.pageCount ?? 0} TRANG</div>
      </div>
    </div>
  );
}
