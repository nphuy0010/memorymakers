const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mm_token");
}

async function req(path: string, opts: RequestInit = {}) {
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
  // templates
  templates: (q = "") => req(`/templates${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  template: (id: string) => req(`/templates/${id}`),
  templateBySlug: (slug: string) => req(`/templates/slug/${slug}`),
  createTemplate: (b: any) => req("/templates", { method: "POST", body: JSON.stringify(b) }),
  updateTemplate: (id: string, b: any) => req(`/templates/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteTemplate: (id: string) => req(`/templates/${id}`, { method: "DELETE" }),
  // projects
  projects: () => req("/projects"),
  createProject: (b: any) => req("/projects", { method: "POST", body: JSON.stringify(b) }),
  updateProject: (id: string, b: any) => req(`/projects/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  orderProject: (id: string, b: any) => req(`/projects/${id}/order`, { method: "POST", body: JSON.stringify(b) }),
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
  // admin
  adminUsers: () => req("/admin/users"),
  adminCreateUser: (b: any) => req("/admin/users", { method: "POST", body: JSON.stringify(b) }),
  adminDeleteUser: (id: string) => req(`/admin/users/${id}`, { method: "DELETE" }),
  setRole: (id: string, role: string) => req(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  adminOrders: () => req("/admin/orders"),
  adminUpdateOrder: (id: string, body: { status?: string; tracking?: string }) => req(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminStats: () => req("/admin/stats"),
  // settings
  about: () => req("/settings/about"),
  saveAbout: (b: any) => req("/settings/about", { method: "PUT", body: JSON.stringify(b) }),
};
