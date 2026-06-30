"use client";
import { create } from "zustand";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mm_token", token);
      localStorage.setItem("mm_user", JSON.stringify(user));
    }
    set({ token, user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mm_token");
      localStorage.removeItem("mm_user");
    }
    set({ token: null, user: null });
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return;
    const token = localStorage.getItem("mm_token");
    const u = localStorage.getItem("mm_user");
    if (token && u) { try { set({ token, user: JSON.parse(u), hydrated: true }); return; } catch {} }
    set({ hydrated: true });
  },
}));
