const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mm_token");
}

// Cache GET để không tải lại dữ liệu đã tải (tăng tốc chuyển trang)
const cache = new Map<string, { exp: number; data: any }>();
export function clearApiCache() { cache.clear(); }

async function req(path: string, opts: RequestInit = {}, cacheTtl = 0) {
  const method = (opts.method || "GET").toUpperCase();
  const key = method + " " + path;
  if (method === "GET" && cacheTtl > 0) {
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) return hit.data;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi"), { data, status: res.status });
  if (method === "GET" && cacheTtl > 0) cache.set(key, { exp: Date.now() + cacheTtl, data });
  else if (method !== "GET") cache.clear(); // có thay đổi dữ liệu -> xoá cache
  return data;
}

export const api = {
  // upload file thật -> trả URL (ảnh hiển thị được ngay)
  uploadFile: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, // KHÔNG set Content-Type để browser tự thêm boundary
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi upload"), { status: res.status });
    return data;
  },
  uploadFiles: async (files: File[]): Promise<{ urls: string[] }> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await fetch(`${BASE}/api/upload/multi`, {
      method: "POST",
      headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi upload"), { status: res.status });
    return data;
  },
  // auth
  register: (b: any) => req("/auth/register", { method: "POST", body: JSON.stringify(b) }),
  verifyPhone: (b: any) => req("/auth/verify-phone", { method: "POST", body: JSON.stringify(b) }),
  resendOtp: (b: any) => req("/auth/resend-otp", { method: "POST", body: JSON.stringify(b) }),
  login: (b: any) => req("/auth/login", { method: "POST", body: JSON.stringify(b) }),
  forgotPassword: (b: any) => req("/auth/forgot-password", { method: "POST", body: JSON.stringify(b) }),
  resetPassword: (b: any) => req("/auth/reset-password", { method: "POST", body: JSON.stringify(b) }),
  me: () => req("/auth/me"),
  // templates (cache 60s để chuyển trang nhanh)
  templates: (q = "") => req(`/templates${q ? `?q=${encodeURIComponent(q)}` : ""}`, {}, 60_000),
  template: (id: string) => req(`/templates/${id}`), // KHÔNG cache — khung phải luôn mới nhất
  templateBySlug: (slug: string) => req(`/templates/slug/${slug}`),
  templateReviews: (id: string) => req(`/templates/${id}/reviews`, {}, 60_000),
  createTemplate: (b: any) => req("/templates", { method: "POST", body: JSON.stringify(b) }),
  updateTemplate: (id: string, b: any) => req(`/templates/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteTemplate: (id: string) => req(`/templates/${id}`, { method: "DELETE" }),
  // projects
  projects: () => req("/projects"),
  getProject: (id: string) => req(`/projects/${id}`),
  createProject: (b: any) => req("/projects", { method: "POST", body: JSON.stringify(b) }),
  updateProject: (id: string, b: any) => req(`/projects/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  orderProject: (id: string, b: any) => req(`/projects/${id}/order`, { method: "POST", body: JSON.stringify(b) }),
  // THANH TOÁN: MoMo thật (verify server-side) hoặc demo có kiểm soát
  momoCreate: (projectId: string, b: any) => req(`/payments/momo/create`, { method: "POST", body: JSON.stringify({ projectId, ...b }) }),
  paymentStatus: (projectId: string) => req(`/payments/status/${projectId}`),
  demoConfirm: (projectId: string, b: any) => req(`/payments/demo-confirm/${projectId}`, { method: "POST", body: JSON.stringify(b) }),
  reviewProject: (id: string, b: { rating: number; review: string }) => req(`/projects/${id}/review`, { method: "POST", body: JSON.stringify(b) }),
  // tin nhắn (khách)
  messages: () => req("/messages"),
  sendMessage: (content: string) => req("/messages", { method: "POST", body: JSON.stringify({ content }) }),
  // tin nhắn (admin)
  adminMessages: () => req("/admin/messages"),
  adminMessagesUnread: () => req("/admin/messages/unread"),
  adminMessageRead: (userId: string) => req(`/admin/messages/${userId}/read`, { method: "POST" }),
  adminReply: (userId: string, content: string) => req("/admin/messages", { method: "POST", body: JSON.stringify({ userId, content }) }),
  cancelProject: (id: string) => req(`/projects/${id}/cancel`, { method: "POST" }),
  deleteProject: (id: string) => req(`/projects/${id}`, { method: "DELETE" }),
  // admin
  adminUsers: () => req("/admin/users"),
  adminCreateUser: (b: any) => req("/admin/users", { method: "POST", body: JSON.stringify(b) }),
  adminDeleteUser: (id: string) => req(`/admin/users/${id}`, { method: "DELETE" }),
  setRole: (id: string, role: string) => req(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  adminOrders: (page = 1, limit = 50) => req(`/admin/orders?page=${page}&limit=${limit}`),
  applyDemo: () => req("/admin/apply-demo", { method: "POST" }),
  adminUpdateOrder: (id: string, body: { status?: string; tracking?: string }) => req(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminStats: () => req("/admin/stats"),
  // settings
  about: () => req("/settings/about", {}, 60_000),
  getDemoPool: () => req("/settings/demo-pool"),
  getStickers: () => req("/settings/stickers", {}, 60_000),
  setStickers: (photos: string[]) => req("/settings/stickers", { method: "PUT", body: JSON.stringify({ photos }) }),
  setDemoPool: (photos: string[]) => req("/settings/demo-pool", { method: "PUT", body: JSON.stringify({ photos }) }),
  saveAbout: (b: any) => req("/settings/about", { method: "PUT", body: JSON.stringify(b) }),
};
