"use client";
// GIỎ HÀNG — client-side, lưu localStorage. Không đụng backend/routing.
// Mỗi item: template + phiên bản (soft/hard/fan/digital) + trạng thái thiết kế (pending/done)
// projectId có mặt khi khách đã thiết kế xong -> item chuyển sang 'done'.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartOption = "soft" | "hard" | "fan" | "digital";
export type CartItem = {
  id: string;                    // local id
  templateId: string;
  title: string;
  cover?: string | null;         // ảnh bìa để hiển thị
  option: CartOption;
  price: number;
  designStatus: "pending" | "done";
  projectId?: string | null;
  addedAt: number;
};

type CartCtx = {
  items: CartItem[];
  add: (i: Omit<CartItem, "id" | "addedAt" | "designStatus"> & { designStatus?: "pending" | "done"; projectId?: string | null }) => CartItem;
  remove: (id: string) => void;
  clear: () => void;
  markDone: (templateId: string, projectId: string) => void;
  hydrated: boolean;
};
const Ctx = createContext<CartCtx | null>(null);
const KEY = "mm-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} } }, [items, hydrated]);

  const add: CartCtx["add"] = useCallback((p) => {
    const it: CartItem = {
      id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
      templateId: p.templateId, title: p.title, cover: p.cover ?? null,
      option: p.option, price: p.price,
      designStatus: p.designStatus || "pending",
      projectId: p.projectId ?? null,
      addedAt: Date.now(),
    };
    setItems((xs) => [...xs, it]);
    return it;
  }, []);
  const remove = useCallback((id: string) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  // Đánh dấu 'done' cho item của template khi khách hoàn tất thiết kế; ưu tiên item pending, không có thì tạo mới
  const markDone = useCallback((templateId: string, projectId: string) => {
    setItems((xs) => {
      const idx = xs.findIndex((x) => x.templateId === templateId && x.designStatus === "pending");
      if (idx < 0) return xs;
      const next = [...xs]; next[idx] = { ...next[idx], designStatus: "done", projectId }; return next;
    });
  }, []);

  return <Ctx.Provider value={{ items, add, remove, clear, markDone, hydrated }}>{children}</Ctx.Provider>;
}
export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}
