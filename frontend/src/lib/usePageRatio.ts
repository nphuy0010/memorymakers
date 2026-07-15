"use client";
import { useEffect, useState } from "react";

// Đo TỶ LỆ THẬT của ảnh trang (sau khi cắt đôi, trang là dọc ~1000/1300 chứ không còn 2000/1300).
// Container editor/flipbook/preview phải theo tỷ lệ này để không cắt mất đầu/đuôi template.
export function usePageRatio(imageUrl?: string | null, fallback = "2000/1300") {
  const [ratio, setRatio] = useState(fallback);
  useEffect(() => {
    if (!imageUrl) { setRatio(fallback); return; }
    let dead = false;
    const img = new Image();
    img.onload = () => { if (!dead && img.naturalWidth && img.naturalHeight) setRatio(`${img.naturalWidth}/${img.naturalHeight}`); };
    img.src = imageUrl;
    return () => { dead = true; };
  }, [imageUrl, fallback]);
  return ratio;
}
