import type { Template, PageDef, Slot } from "./types";

export interface BuiltPage { image: string | null; slots: (Slot & { g: number })[]; }

/* Dựng pages [{image, slots(g)}] — gán chỉ số khung toàn cục g (xuyên suốt cả cuốn). */
export function buildPages(t: Template): BuiltPage[] {
  const pages = (t.pages || []) as PageDef[];
  if (pages.length && typeof pages[0] === "object" && (pages[0] as PageDef).image) {
    let g = 0;
    return pages.map((p) => ({ image: p.image, slots: (p.slots || []).map((s) => ({ ...s, g: g++ })) }));
  }
  const n = Math.max(t.pageCount || 4, 2);
  return Array.from({ length: n }).map(() => ({ image: null, slots: [] as (Slot & { g: number })[] }));
}

export const FILTERS: Record<string, string> = {
  none: "none", warm: "saturate(1.15) sepia(.15)", cool: "saturate(1.1) hue-rotate(-10deg)",
  bw: "grayscale(1)", vivid: "saturate(1.5) contrast(1.05)", fade: "contrast(.92) brightness(1.05) saturate(.85)",
};
export const FILTER_LABELS: [string, string][] = [["none", "Gốc"], ["warm", "Ấm"], ["cool", "Lạnh"], ["bw", "Đen trắng"], ["vivid", "Rực"], ["fade", "Phai"]];

export type StickerItem = { id: string; url: string; x: number; y: number; w: number; rot?: number }; // vị trí/tâm theo %, w = bề rộng %

export type Edit = { scale?: number; ox?: number; oy?: number; rot?: number; filter?: string };
export function imgStyle(e?: Edit): React.CSSProperties {
  // oy mặc định 38%: lệch LÊN TRÊN (mặt người thường ở nửa trên) -> ảnh chưa dò mặt cũng không cắt mất mặt
  const sc = e?.scale ?? 1, ox = e?.ox ?? 50, oy = e?.oy ?? 38, rot = e?.rot ?? 0;
  // PAN THẬT bằng translate theo mức zoom:
  //  - sc = 1: objectPosition pan theo chiều ảnh tràn (crop chuẩn, không hở mép)
  //  - sc > 1: translate dịch ảnh CẢ NGANG LẪN DỌC. ox=0 -> nhìn mép trái nhất; ox=100 -> mép phải nhất.
  //    (đã kiểm chứng: tx = (50-ox)*(sc-1)% khớp đúng biên ảnh sau khi scale quanh tâm)
  const tx = (50 - ox) * (sc - 1), ty = (50 - oy) * (sc - 1);
  return {
    width: "100%", height: "100%", objectFit: "cover",
    objectPosition: `${ox}% ${oy}%`,
    transformOrigin: "center",
    transform: `translate(${tx}%, ${ty}%) scale(${sc}) rotate(${rot}deg)`,
    filter: FILTERS[e?.filter || "none"] || "none", display: "block",
  };
}

export interface TextItem { id: string; text: string; x: number; y: number; size: number; color: string; font: string; }
