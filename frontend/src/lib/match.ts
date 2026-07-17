import type { Template } from "./types";

// GỢI Ý MẪU THEO DỮ LIỆU THẬT admin điền khi upload — KHÔNG có từ khóa chủ đề cài sẵn trong code:
//  - Danh mục (ô "Danh mục" của template) xuất hiện trong prompt -> +6 (tín hiệu mạnh nhất)
//  - Từ khóa của template xuất hiện trong prompt -> +3 mỗi từ
//  - Từ trong tên mẫu xuất hiện trong prompt -> +1 mỗi từ
export function matchTemplates(prompt: string, templates: Template[]) {
  const text = (prompt || "").toLowerCase();
  return templates
    .map((t) => {
      let score = 0;
      const cat = ((t as any).category || "").toLowerCase().trim();
      if (cat && text.includes(cat)) score += 6;
      for (const w of t.keywords || []) {
        const kw = (w || "").toLowerCase().trim();
        if (kw && text.includes(kw)) score += 3;
      }
      for (const word of (t.title || "").toLowerCase().split(/\s+/)) {
        if (word.length > 2 && text.includes(word)) score += 1;
      }
      return { t, score };
    })
    .sort((a, b) => b.score - a.score);
}
