import type { Template } from "./types";

// Gợi ý mẫu theo mô tả tự nhiên (client-side, giống bản demo)
const THEME_HINTS: Record<string, string[]> = {
  "du lịch": ["du lịch", "biển", "travel", "phượt", "chuyến đi", "đi chơi", "lữ khách", "beach", "sea", "núi", "khám phá", "vi vu"],
  "tình yêu": ["tình yêu", "người yêu", "cặp đôi", "couple", "hẹn hò", "valentine", "crush", "anniversary", "kỷ niệm yêu"],
  "cưới": ["cưới", "đám cưới", "wedding", "cô dâu", "chú rể", "đính hôn", "vu quy"],
  "gia đình": ["gia đình", "bố", "mẹ", "ba", "con", "family", "ông", "bà", "nhà mình"],
  "sinh nhật": ["sinh nhật", "birthday", "tiệc", "thổi nến", "bánh kem", "mừng tuổi"],
  "tốt nghiệp": ["tốt nghiệp", "ra trường", "kỷ yếu", "graduation", "cử nhân", "lớp"],
  "bạn bè": ["bạn bè", "nhóm bạn", "friends", "hội", "đám bạn", "team"],
  "kỷ niệm": ["kỷ niệm", "khoảnh khắc", "memory", "lưu giữ", "hồi ức", "dấu ấn"],
};

export function matchTemplates(prompt: string, templates: Template[]) {
  const text = (prompt || "").toLowerCase();
  return templates
    .map((t) => {
      let score = 0;
      // DANH MỤC là tín hiệu mạnh nhất: prompt nhắc tới danh mục -> +6; từ khóa chủ đề khớp danh mục -> +5
      const cat = ((t as any).category || "").toLowerCase();
      if (cat && text.includes(cat)) score += 6;
      for (const [canon, hints] of Object.entries(THEME_HINTS)) {
        if (cat && cat.includes(canon) && hints.some((h) => text.includes(h))) score += 5;
      }
      for (const w of t.keywords) if (text.includes(w.toLowerCase())) score += 3;
      for (const [canon, hints] of Object.entries(THEME_HINTS)) {
        if (hints.some((h) => text.includes(h)) && t.keywords.map((k) => k.toLowerCase()).includes(canon)) score += 4;
      }
      for (const word of t.title.toLowerCase().split(/\s+/)) if (word.length > 2 && text.includes(word)) score += 1;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score);
}
