import { prisma } from "./prisma";
import { listCloudImages, destroyByPublicId } from "../routes/upload.routes";

/* TỰ ĐỘNG DỌN ẢNH KHÁCH TẢI LÊN QUÁ 24 GIỜ (chạy nền, xem lịch ở index.ts).

   PHẠM VI: CHỈ ảnh do KHÁCH tải lên (nằm trong project.photos của dự án chưa thanh toán).
   KHÔNG BAO GIỜ ĐỤNG TỚI:
     • Ảnh của ADMIN: template (trang/bìa/demo), ảnh hero trang chủ, sticker,
       kho ảnh demo, icon website, mã QR thanh toán… (nằm ở bảng Template/Setting)
     • Ảnh của ĐƠN ĐÃ THANH TOÁN (còn phải in & lưu lịch sử đơn)
     • Ảnh đại diện người dùng
   Cách bảo vệ: quét MỌI trường chuỗi của Template/Setting/User + toàn bộ dự án đã thanh toán
   để lập "danh sách phải giữ". Chỉ ảnh nằm ngoài danh sách này mới bị xoá. */

const PAID = ["PURCHASED", "SHIPPING", "DELIVERED"];
const TTL_MS = 24 * 60 * 60 * 1000;
const CLOUD_RE = /https:\/\/res\.cloudinary\.com\/[^\s"'\\)]+/g;

let running = false; // tránh 2 lượt dọn chồng nhau

export async function cleanupExpiredPhotos(): Promise<{ scanned: number; deleted: number; cleanedProjects: number } | null> {
  if (running) return null;
  running = true;
  try {
    const cutoff = Date.now() - TTL_MS;

    const [templates, settings, users, projects] = await Promise.all([
      prisma.template.findMany(),
      prisma.setting.findMany(),
      prisma.user.findMany({ select: { avatar: true } }),
      prisma.project.findMany({ select: { id: true, status: true, photos: true, layout: true } }),
    ]);

    // 1) DANH SÁCH PHẢI GIỮ — quét mọi trường chuỗi (bắt được cả URL nằm sâu trong JSON)
    const keep = new Set<string>();
    const scan = (v: any) => {
      if (typeof v !== "string" || !v) return;
      for (const m of v.match(CLOUD_RE) || []) keep.add(m.split("?")[0]);
    };
    for (const row of [...templates, ...settings] as any[]) for (const v of Object.values(row)) scan(v);
    for (const u of users as any[]) scan(u.avatar);
    for (const p of projects as any[]) {
      if (PAID.includes(p.status)) { scan(p.photos); scan(p.layout); }  // đơn đã trả tiền -> giữ tất
    }

    // Không đọc được tham chiếu nào -> nghi lỗi DB, DỪNG để tránh xoá nhầm hàng loạt
    if (keep.size === 0 && (templates.length > 0 || settings.length > 0)) {
      console.warn("[dọn ảnh 24h] không đọc được tham chiếu nào — bỏ qua lượt này cho an toàn");
      return null;
    }

    // 2) ỨNG VIÊN XOÁ: ảnh khách trong dự án CHƯA thanh toán
    const candidates = new Set<string>();
    for (const p of projects as any[]) {
      if (PAID.includes(p.status)) continue;
      let arr: any[] = [];
      try { arr = JSON.parse(p.photos || "[]"); } catch { continue; }
      for (const u of arr) if (typeof u === "string" && u) candidates.add(u.split("?")[0]);
    }
    if (!candidates.size) return { scanned: 0, deleted: 0, cleanedProjects: 0 };

    // 3) Đối chiếu tuổi ảnh trên Cloudinary -> chỉ xoá ảnh KHÁCH đã quá 24h, ngoài danh sách giữ
    const images = await listCloudImages("memory-makers", 1000);
    const expired = images.filter((im) => {
      const url = (im.url || "").split("?")[0];
      const created = new Date(im.createdAt).getTime();
      if (!created || created > cutoff) return false;   // còn mới -> giữ
      if (keep.has(url)) return false;                  // ảnh admin / đơn đã trả -> giữ
      return candidates.has(url);                       // chỉ xoá ảnh khách tải lên
    });

    let deleted = 0;
    for (const im of expired) if (await destroyByPublicId(im.publicId)) deleted++;

    // 4) Gỡ URL đã xoá khỏi dự án nháp (ảnh + ô đã gán) để không hiện ảnh hỏng
    let cleanedProjects = 0;
    if (expired.length) {
      const gone = new Set(expired.map((e) => (e.url || "").split("?")[0]));
      for (const p of projects as any[]) {
        if (PAID.includes(p.status)) continue;
        let arr: any[] = [];
        try { arr = JSON.parse(p.photos || "[]"); } catch { continue; }
        const left = arr.filter((u: any) => typeof u === "string" && !gone.has(u.split("?")[0]));
        if (left.length === arr.length) continue;

        let layout: any = null;
        try { layout = p.layout ? JSON.parse(p.layout) : null; } catch {}
        if (layout && layout.assignments) {
          for (const k of Object.keys(layout.assignments)) {
            const u = layout.assignments[k];
            if (typeof u === "string" && gone.has(u.split("?")[0])) delete layout.assignments[k];
          }
        }
        await prisma.project.update({
          where: { id: p.id },
          data: { photos: JSON.stringify(left), ...(layout ? { layout: JSON.stringify(layout) } : {}) },
        });
        cleanedProjects++;
      }
    }

    if (deleted || cleanedProjects) {
      console.log(`[dọn ảnh 24h] xoá ${deleted} ảnh khách quá hạn, dọn ${cleanedProjects} dự án nháp (giữ ${keep.size} ảnh được bảo vệ)`);
    }
    return { scanned: images.length, deleted, cleanedProjects };
  } catch (e: any) {
    console.warn("[dọn ảnh 24h] lỗi, bỏ qua lượt này:", e?.message);
    return null;
  } finally {
    running = false;
  }
}

/** Hẹn giờ chạy nền: sau khi khởi động 2 phút, rồi lặp mỗi 6 giờ. */
export function schedulePhotoCleanup() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setTimeout(() => {
    cleanupExpiredPhotos();
    setInterval(cleanupExpiredPhotos, SIX_HOURS);
  }, 2 * 60 * 1000).unref?.();
}
