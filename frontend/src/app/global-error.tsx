"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi"><body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "80px 20px" }}>
      <h2>Có lỗi nghiêm trọng</h2>
      <p style={{ color: "#6B6258" }}>{error?.message || ""}</p>
      <button onClick={reset} style={{ background: "#B08D57", color: "#fff", border: "none", borderRadius: 999, padding: "12px 24px", cursor: "pointer" }}>Tải lại</button>
    </body></html>
  );
}
