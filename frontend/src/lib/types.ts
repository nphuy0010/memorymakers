export interface Prices { digital: number; soft: number; hard: number; fan: number; }

export interface Slot { x: number; y: number; w: number; h: number; shape?: "rect" | "circle"; rot?: number; }
export interface PageDef { image: string; slots: Slot[]; }

export interface Template {
  id: string;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  blankImage: string | null; // PNG trống để chèn ảnh
  demoImage: string | null;  // ảnh demo để preview
  demoPhotos?: string[];     // ảnh gốc admin up
  demoPages?: string[];      // ảnh đã ghép cho từng trang (hiển thị)
  coverImage?: string | null;
  previewGif?: string | null;   // GIF xem trước
  previewVideo?: string | null; // video mp4 xem trước
  pages: PageDef[];             // mảng { image, slots } -> dựng Flipbook & chèn ảnh
  canvaLink?: string;
  category?: string;
  pageCount?: number;
  slots: number;
  prices: Prices;
  featured: boolean;
  rating: number;
}

export type ProjectStatus = "DESIGNING" | "DESIGNED" | "PURCHASED" | "SHIPPING" | "DELIVERED" | "CANCELLED";

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  photos: string[];
  mode: "digital" | "physical" | null;
  option: string | null;
  amount: number | null;
  address: { name: string; phone: string; address: string } | null;
  template: Template;
}

export interface User {
  id: string; name: string; email: string; phone?: string; phoneVerified: boolean; role: "ADMIN" | "CUSTOMER";
}

export const CATS = [
  { id: "soft", label: "Bìa thường" },
  { id: "hard", label: "Bìa cứng" },
  { id: "fan", label: "Gấp quạt" },
  { id: "digital", label: "Bản digital" },
] as const;

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  DESIGNING: "Đang thiết kế", DESIGNED: "Đã thiết kế", PURCHASED: "Đang xử lý",
  SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
};
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  DESIGNING: "#D9A99E", DESIGNED: "#B08D57", PURCHASED: "#7E9CC4",
  SHIPPING: "#C79BB0", DELIVERED: "#9CA98C", CANCELLED: "#B0A89C",
};

export const vnd = (n: number) => n.toLocaleString("vi-VN") + "₫";
