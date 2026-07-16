// THU NHỎ ảnh Cloudinary on-the-fly cho thumbnail/danh sách — giảm mạnh dung lượng tải trang.
// URL không phải Cloudinary -> trả nguyên (ảnh disk fallback).
export function thumbUrl(url: string | null | undefined, w = 480): string {
  if (!url) return "";
  const i = url.indexOf("/upload/");
  if (!url.includes("res.cloudinary.com") || i < 0) return url;
  return url.slice(0, i + 8) + `w_${w},q_auto,f_auto/` + url.slice(i + 8);
}
