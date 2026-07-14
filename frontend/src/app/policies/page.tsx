"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

// 5 mục CỐ ĐỊNH: id + tiêu đề khớp bản gốc; nội dung mặc định lấy từ đề bài, có thể bị admin ghi đè qua Setting `policies`
const DEFAULTS = [
  { id: "muahang", title: "Mua hàng & thiết kế", content: "Chọn mẫu → tải ảnh → AI điền vào khung → xem trước flipbook → đặt hàng. Bạn có thể lưu nháp và quay lại chỉnh sửa bất cứ lúc nào trong \"Dự án của tôi\"." },
  { id: "thanhtoan", title: "Thanh toán", content: "Hỗ trợ MoMo (quét QR) và COD (thanh toán khi nhận hàng, áp dụng cho bản in). Bản digital cần thanh toán online để mở khoá tải về ngay." },
  { id: "doitra", title: "Đổi trả & bảo hành in lỗi", content: "Nếu sản phẩm in bị lỗi do nhà in (lệch màu nặng, rách, sai nội dung đã duyệt), chúng tôi in lại miễn phí trong vòng 7 ngày kể từ khi nhận. Vui lòng quay video mở hộp để đối chiếu." },
  { id: "vanchuyen", title: "Vận chuyển", content: "Giao toàn quốc 2–5 ngày tuỳ khu vực. Miễn phí ship cho đơn từ 500.000₫. Đơn có mã vận đơn để theo dõi." },
  { id: "baomat", title: "Bảo mật hình ảnh", content: "Ảnh của bạn chỉ dùng để in đơn của bạn. Bản xem trước có watermark và cơ chế chống chụp màn hình trước khi thanh toán." },
];

export default function PoliciesPage() {
  const [items, setItems] = useState(DEFAULTS);
  useEffect(() => {
    api.getPolicies().then((remote: any[]) => {
      if (!Array.isArray(remote) || !remote.length) return;
      // hợp nhất theo id: nội dung admin ghi đè mặc định, giữ đúng thứ tự 5 mục
      setItems(DEFAULTS.map((d) => {
        const r = remote.find((x: any) => x.id === d.id);
        return r ? { id: d.id, title: d.title, content: r.content || d.content } : d;
      }));
    }).catch(() => {});
  }, []);

  return (
    <div className="mm-page" style={{ background: "#F5EFE6" }}>
      <section className="max-w-[1080px] mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="text-center mb-10 md:mb-14">
          <div className="font-sans text-[11px] tracking-[2px] uppercase text-brass font-bold mb-3">Chính sách</div>
          <h1 className="font-serif text-3xl md:text-[42px] leading-tight text-ink font-bold mb-3">Chính sách của Memory Makers</h1>
          <p className="font-sans text-[15px] md:text-base text-sub max-w-[560px] mx-auto">Mọi điều bạn cần biết trước khi đặt một cuốn Memory Makers.</p>
        </div>

        {/* GRID 2 CỘT ≥768px, 1 CỘT mobile; 5 thẻ -> thẻ thứ 5 tự nằm cột trái hàng cuối (grid auto-flow row) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {items.map((p) => (
            <article key={p.id} className="bg-white rounded-2xl p-6 md:p-7 border border-line shadow-[0_4px_18px_rgba(42,37,32,.06)]">
              <div className="flex items-start gap-4 mb-3">
                <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: "#F1E4CE" }}>
                  <ShieldCheck size={20} className="text-brass" />
                </div>
                <h2 className="font-serif text-xl md:text-[22px] text-ink font-bold leading-snug pt-1.5">{p.title}</h2>
              </div>
              <p className="font-sans text-[14.5px] leading-relaxed text-sub whitespace-pre-wrap">{p.content}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
