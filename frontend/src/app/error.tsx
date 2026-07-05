"use client";
// Chặn 1 lỗi component làm trắng cả trang — hiện thông báo + nút thử lại
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center py-24 px-5">
      <h2 className="font-serif text-2xl text-ink font-bold mb-3">Có lỗi xảy ra</h2>
      <p className="font-sans text-sm text-sub mb-5">{error?.message || "Lỗi không xác định."}</p>
      <button onClick={reset} className="bg-brass text-white rounded-full px-6 py-3 font-sans font-semibold">Thử lại</button>
    </div>
  );
}
