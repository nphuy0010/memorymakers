"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";

type Phase = "form" | "otp" | "forgot" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [phase, setPhase] = useState<Phase>("form");
  const [pwd2, setPwd2] = useState(""); // nhập lại mật khẩu khi đăng ký
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [userId, setUserId] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const inp = "w-full p-3 rounded-lg border border-line font-sans text-sm outline-none mb-3";

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (tab === "register") {
        if (form.password !== pwd2) { setErr("Mật khẩu nhập lại không khớp."); setBusy(false); return; }
        const r = await api.register(form);
        setUserId(r.userId); setDevOtp(r.devOtp || ""); setPhase("otp");
      } else {
        const r = await api.login({ email: form.email, password: form.password });
        setAuth(r.token, r.user); router.push("/account");
      }
    } catch (e: any) {
      if (e.data?.needPhoneVerify) { setUserId(e.data.userId); setDevOtp(e.data.devOtp || ""); setPhase("otp"); setErr("Cần xác thực SĐT trước."); }
      else setErr(e.message || "Có lỗi xảy ra");
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await api.verifyPhone({ userId, code: otp });
      setAuth(r.token, r.user); router.push("/account");
    } catch (e: any) { setErr(e.message || "OTP không đúng"); } finally { setBusy(false); }
  };

  const sendForgot = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await api.forgotPassword({ identifier: form.email.trim() });
      setUserId(r.userId); setDevOtp(r.devOtp || ""); setPhoneHint(r.phoneHint || "");
      setOtp(""); setNewPwd(""); setNewPwd2(""); setPhase("reset");
    } catch (e: any) { setErr(e.message || "Không gửi được OTP"); } finally { setBusy(false); }
  };

  const doReset = async () => {
    setErr("");
    if (newPwd.length < 6) return setErr("Mật khẩu mới tối thiểu 6 ký tự.");
    if (newPwd !== newPwd2) return setErr("Mật khẩu nhập lại không khớp.");
    setBusy(true);
    try {
      const r = await api.resetPassword({ userId, code: otp, newPassword: newPwd });
      setAuth(r.token, r.user); router.push("/account");
    } catch (e: any) { setErr(e.message || "OTP không đúng"); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-[400px] mx-auto my-16 bg-white rounded-2xl border border-line p-8">
      {phase === "form" && (
        <>
          <div className="flex gap-2 mb-5 bg-cream rounded-full p-1">
            {(["login", "register"] as const).map(k => (
              <button key={k} onClick={() => { setTab(k); setErr(""); }} className={`flex-1 py-2.5 rounded-full font-sans font-semibold text-sm ${tab === k ? "bg-ink text-paper" : "text-sub"}`}>{k === "login" ? "Đăng nhập" : "Đăng ký"}</button>
            ))}
          </div>
          <h1 className="font-serif text-2xl text-ink font-bold mb-1">{tab === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}</h1>
          <p className="font-sans text-sm text-sub mb-5">{tab === "login" ? "Đăng nhập để xem dự án của bạn." : "Đăng ký + xác thực SĐT để tránh tài khoản ảo."}</p>
          {tab === "register" && <input className={inp} placeholder="Họ và tên" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
          <input className={inp} placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          {tab === "register" && <input className={inp} placeholder="Số điện thoại" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />}
          <input className={inp} type="password" placeholder="Mật khẩu" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          {tab === "register" && <input className={inp} type="password" placeholder="Nhập lại mật khẩu" value={pwd2} onChange={e => setPwd2(e.target.value)} />}
          {tab === "login" && <div className="text-right -mt-1 mb-3"><button onClick={() => { setErr(""); setPhase("forgot"); }} className="text-brass font-sans text-sm font-semibold">Quên mật khẩu?</button></div>}
          {err && <div className="font-sans text-sm text-[#B05A4A] mb-3">{err}</div>}
          <button disabled={busy} onClick={submit} className="w-full bg-brass text-white rounded-full py-3 font-sans font-semibold disabled:opacity-50">{busy ? "Đang xử lý…" : tab === "login" ? "Đăng nhập" : "Đăng ký & gửi OTP"}</button>
        </>
      )}

      {phase === "otp" && (
        <>
          <h1 className="font-serif text-2xl text-ink font-bold mb-1">Xác thực SĐT</h1>
          <p className="font-sans text-sm text-sub mb-2">Nhập mã OTP 6 số đã gửi tới điện thoại của bạn.</p>
          {devOtp && <div className="font-sans text-xs text-brass mb-3 bg-cream rounded-lg p-2">DEV: mã OTP của bạn là <b>{devOtp}</b> (production sẽ gửi qua SMS)</div>}
          <input className={inp + " text-center tracking-[6px] text-lg"} placeholder="••••••" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
          {err && <div className="font-sans text-sm text-[#B05A4A] mb-3">{err}</div>}
          <button disabled={busy} onClick={verify} className="w-full bg-brass text-white rounded-full py-3 font-sans font-semibold disabled:opacity-50">{busy ? "Đang kiểm tra…" : "Xác thực"}</button>
          <button onClick={() => api.resendOtp({ userId }).then((r: any) => setDevOtp(r.devOtp || ""))} className="w-full mt-2 text-sub font-sans text-sm">Gửi lại OTP</button>
        </>
      )}

      {phase === "forgot" && (
        <>
          <h1 className="font-serif text-2xl text-ink font-bold mb-1">Quên mật khẩu</h1>
          <p className="font-sans text-sm text-sub mb-4">Nhập <b>email hoặc số điện thoại</b> tài khoản. Hệ thống kiểm tra và gửi mã OTP về SĐT đã đăng ký để đặt lại mật khẩu.</p>
          <input className={inp} placeholder="Email hoặc số điện thoại" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          {err && <div className="font-sans text-sm text-[#B05A4A] mb-3">{err}</div>}
          <button disabled={busy} onClick={sendForgot} className="w-full bg-brass text-white rounded-full py-3 font-sans font-semibold disabled:opacity-50">{busy ? "Đang gửi…" : "Gửi OTP về SĐT"}</button>
          <button onClick={() => { setErr(""); setPhase("form"); }} className="w-full mt-2 text-sub font-sans text-sm">← Về đăng nhập</button>
        </>
      )}

      {phase === "reset" && (
        <>
          <h1 className="font-serif text-2xl text-ink font-bold mb-1">Đặt lại mật khẩu</h1>
          <p className="font-sans text-sm text-sub mb-2">Mã OTP đã gửi tới SĐT {phoneHint}.</p>
          {devOtp && <div className="font-sans text-xs text-brass mb-3 bg-cream rounded-lg p-2">DEV: mã OTP của bạn là <b>{devOtp}</b> (production sẽ gửi qua SMS)</div>}
          <input className={inp + " text-center tracking-[6px] text-lg"} placeholder="Mã OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
          <input className={inp} type="password" placeholder="Mật khẩu mới" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          <input className={inp} type="password" placeholder="Nhập lại mật khẩu mới" value={newPwd2} onChange={e => setNewPwd2(e.target.value)} />
          {err && <div className="font-sans text-sm text-[#B05A4A] mb-3">{err}</div>}
          <button disabled={busy} onClick={doReset} className="w-full bg-brass text-white rounded-full py-3 font-sans font-semibold disabled:opacity-50">{busy ? "Đang đổi…" : "Đổi mật khẩu & đăng nhập"}</button>
          <button onClick={() => api.forgotPassword({ identifier: form.email.trim() }).then((r: any) => setDevOtp(r.devOtp || "")).catch(() => {})} className="w-full mt-2 text-sub font-sans text-sm">Gửi lại OTP</button>
        </>
      )}
    </div>
  );
}
