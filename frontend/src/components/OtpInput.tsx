"use client";
// 6 Ô OTP kiểu chuẩn: auto-focus ô kế khi gõ, Backspace lùi ô, dán cả mã 6 số,
// kèm nút "Gửi lại mã" có đếm ngược 60s. Dùng chung cho xác thực đăng ký + quên mật khẩu.
import React, { useEffect, useRef, useState } from "react";

export function maskEmail(email: string) {
  const [u, d] = (email || "").split("@");
  if (!d) return email;
  const head = u.slice(0, Math.min(2, u.length));
  return `${head}${"*".repeat(Math.max(3, u.length - 2))}@${d}`;
}
export function maskPhone(phone: string) {
  const p = (phone || "").replace(/\s+/g, "");
  return p.length >= 6 ? p.slice(0, 3) + "****" + p.slice(-3) : p;
}

export default function OtpInput({ value, onChange, onResend, resendSeconds = 60, autoFocus = true }: {
  value: string;                       // chuỗi tối đa 6 số
  onChange: (v: string) => void;
  onResend?: () => void | Promise<void>;
  resendSeconds?: number;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(resendSeconds);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);
  useEffect(() => { if (autoFocus) refs.current[0]?.focus(); }, [autoFocus]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const setDigit = (i: number, d: string) => {
    const clean = d.replace(/\D/g, "").slice(-1); // chỉ nhận 1 chữ số cuối
    const next = digits.slice();
    next[i] = clean;
    onChange(next.join(""));
    if (clean && i < 5) refs.current[i + 1]?.focus(); // auto sang ô kế
  };
  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) { const next = digits.slice(); next[i] = ""; onChange(next.join("")); }
      else if (i > 0) { refs.current[i - 1]?.focus(); const next = digits.slice(); next[i - 1] = ""; onChange(next.join("")); }
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };
  const resend = async () => {
    if (countdown > 0 || !onResend) return;
    await onResend();
    setCountdown(resendSeconds);
  };

  return (
    <div>
      <div className="flex gap-2 justify-center mb-3" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className="w-11 h-13 md:w-12 md:h-14 text-center font-sans text-xl font-bold text-ink rounded-xl outline-none transition-colors"
            style={{ border: "1.5px solid #D1D5DB", height: 52 }}
            onFocusCapture={(e) => (e.target.style.borderColor = "#B8924A")}
            onBlurCapture={(e) => (e.target.style.borderColor = "#D1D5DB")}
          />
        ))}
      </div>
      {onResend && (
        <div className="text-center mb-1">
          {countdown > 0
            ? <span className="font-sans text-[13px] text-sub cursor-not-allowed">Gửi lại ({countdown}s)</span>
            : <button onClick={resend} className="font-sans text-[13px] font-semibold text-brass hover:underline">Gửi lại mã</button>}
        </div>
      )}
    </div>
  );
}
