const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// PHÁT HIỆN CẤU HÌNH SAI: chạy trên domain thật (Vercel) nhưng BASE vẫn trỏ localhost
// -> nghĩa là biến NEXT_PUBLIC_API_URL CHƯA set trên Vercel -> MỌI gọi API "Failed to fetch".
export const apiMisconfigured =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  BASE.includes("localhost");

function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mm_token");
}

// Cache GET để không tải lại dữ liệu đã tải (tăng tốc chuyển trang)
const cache = new Map<string, { exp: number; data: any }>();
export function clearApiCache() { cache.clear(); }

// Thông báo NGẮN GỌN cho người dùng; chi tiết kỹ thuật chỉ log ra console cho developer.
function fetchFailMsg() {
  const detail = apiMisconfigured
    ? `[Memory Makers] Thiếu NEXT_PUBLIC_API_URL trên Vercel — frontend đang gọi ${BASE}. Set biến rồi redeploy.`
    : `[Memory Makers] Không gọi được ${BASE}. Kiểm tra: FRONTEND_ORIGIN trên Render (CORS), backend còn chạy không, hoặc mạng.`;
  console.error(detail);
  return "Không kết nối được máy chủ. Vui lòng thử lại.";
}

async function req(path: string, opts: RequestInit = {}, cacheTtl = 0) {
  const method = (opts.method || "GET").toUpperCase();
  const key = method + " " + path;
  if (method === "GET" && cacheTtl > 0) {
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) return hit.data;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch (e: any) {
    throw new Error(fetchFailMsg());
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi"), { data, status: res.status });
  if (method === "GET" && cacheTtl > 0) cache.set(key, { exp: Date.now() + cacheTtl, data });
  else if (method !== "GET") cache.clear(); // có thay đổi dữ liệu -> xoá cache
  return data;
}

export const api = {
  // upload file thật -> trả URL (ảnh hiển thị được ngay)
  uploadFile: async (file: File): Promise<{ url: string }> => {
    // UPLOAD TRỰC TIẾP LÊN CLOUDINARY (không qua backend) — hết lỗi backend timeout/hết RAM.
    // Cần 2 biến trên Vercel: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (unsigned).
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (cloud && preset) {
      const isVideo = file.type.startsWith("video");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", preset);
      const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/${isVideo ? "video" : "image"}/upload`;
      let res: Response;
      try {
        res = await fetch(endpoint, { method: "POST", body: fd });
      } catch {
        throw new Error("Không kết nối được Cloudinary. → Kiểm tra mạng, hoặc cấu hình NEXT_PUBLIC_CLOUDINARY_* trên Vercel.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.secure_url) {
        throw new Error(data?.error?.message || "Upload Cloudinary thất bại. → Kiểm tra upload preset là 'Unsigned' trên Cloudinary.");
      }
      return { url: data.secure_url };
    }

    // FALLBACK: chưa cấu hình Cloudinary trực tiếp -> upload qua backend như cũ
    const fd = new FormData();
    fd.append("file", file);
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/upload`, {
        method: "POST",
        headers: { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, // KHÔNG set Content-Type để browser tự thêm boundary
        body: fd,
      });
    } catch (e: any) {
      throw new Error(fetchFailMsg());
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi upload"), { status: res.status });
    return data;
  },
  uploadFiles: async (files: File[]): Promise<{ urls: string[] }> => {
    // Cloudinary trực tiếp: upload song song từng file (tái dùng uploadFile). Fallback backend multi nếu chưa cấu hình.
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (cloud && preset) {
      const urls = await Promise.all(files.map((f) => api.uploadFile(f).then((r) => r.url)));
      return { urls };
    }
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
  updateMe: (b: any) => req("/auth/me", { method: "PUT", body: JSON.stringify(b) }),
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
  clearMyChat: () => req("/messages", { method: "DELETE" }),
  adminDeleteConversation: (userId: string, mode: "self" | "both") => req(`/admin/messages/${userId}/delete-conversation`, { method: "POST", body: JSON.stringify({ mode }) }),
  grantAdmin: (email: string) => req("/admin/users/grant-admin", { method: "POST", body: JSON.stringify({ email }) }),
  projectFlipbook: (id: string) => req(`/projects/${id}/flipbook`),
  templateUsage: (id: string) => req(`/templates/${id}/usage`),
  cleanupOrphans: () => req("/admin/cleanup-orphans", { method: "POST" }),
  checkDemo: () => req("/admin/apply-demo/check", { method: "POST" }),
  // Frontend ghép ảnh bằng Canvas rồi gửi danh sách URL lên đây (backend chỉ lưu DB)
  saveDemoResult: (templateId: string, pages: string[]) => req("/admin/save-demo-result", { method: "POST", body: JSON.stringify({ templateId, pages }) }),
  adminUpdateOrder: (id: string, body: { status?: string; tracking?: string }) => req(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminStats: () => req("/admin/stats"),
  // settings
  about: () => req("/settings/about", {}, 60_000),
  getDemoPool: () => req("/settings/demo-pool"),
  getStickers: () => req("/settings/stickers", {}, 60_000),
  getPolicies: () => req("/settings/policies", {}, 60_000),
  setPolicies: (policies: any[]) => req("/settings/policies", { method: "PUT", body: JSON.stringify({ policies }) }),
  getHelpVideo: () => req("/settings/help-video", {}, 30_000),
  setHelpVideo: (url: string | null) => req("/settings/help-video", { method: "PUT", body: JSON.stringify({ url }) }),
  getHeroVideo: () => req("/settings/hero-video", {}, 15_000),
  getPaymentQr: () => req("/settings/payment-qr", {}, 15_000),
  setPaymentQr: (url: string | null, note: string) => req("/settings/payment-qr", { method: "PUT", body: JSON.stringify({ url, note }) }),
  getHeroMedia: () => req("/settings/hero-media", {}, 15_000),
  setHeroMedia: (items: { url: string; type: "image" | "video" }[]) => req("/settings/hero-media", { method: "PUT", body: JSON.stringify({ items }) }),
  setHeroVideo: (url: string | null) => req("/settings/hero-video", { method: "PUT", body: JSON.stringify({ url }) }),
  setStickers: (photos: string[]) => req("/settings/stickers", { method: "PUT", body: JSON.stringify({ photos }) }),
  setDemoPool: (photos: string[]) => req("/settings/demo-pool", { method: "PUT", body: JSON.stringify({ photos }) }),
  saveAbout: (b: any) => req("/settings/about", { method: "PUT", body: JSON.stringify(b) }),
};
