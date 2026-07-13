"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";

// TÙY CHỈNH CÁ NHÂN: đổi tên, SĐT, mật khẩu, ảnh đại diện
export default function ProfilePage() {
  const router = useRouter();
  const { user, token, setAuth, hydrated, hydrate } = useAuth() as any;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [upAv, setUpAv] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { hydrate && hydrate(); }, [hydrate]);
  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
    if (user) { setName(user.name || ""); setPhone(user.phone || ""); setAvatar(user.avatar || null); }
  }, [hydrated, user, router]);

  if (!user) return <div className="p-10 text-center text-sub font-sans">Đang tải…</div>;

  const pickAvatar = async (f: File) => {
    setUpAv(true);
    try {
      if (!f.type.startsWith("image")) { alert("Hãy chọn file ẢNH."); return; }
      const { url } = await api.uploadFile(f);
      setAvatar(url);
    } catch (e: any) { alert("Tải ảnh lỗi: " + (e?.message || "")); }
    finally { setUpAv(false); }
  };

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const body: any = { name: name.trim(), phone: phone.trim(), avatar };
      if (password.trim()) body.password = password.trim();
      const u = await api.updateMe(body);
      setAuth(token, u); // cập nhật ngay avatar/tên trên Header
      setPassword(""); setMsg("Đã lưu ✓");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: any) { alert("Lưu lỗi: " + (e?.message || "") + "\n→ Backend cần bản mới (route /auth/me PUT)."); }
    finally { setSaving(false); }
  };

  const inp = "w-full p-2.5 rounded-lg border border-line font-sans text-sm outline-none";
  return (
    <div className="mm-page max-w-md mx-auto px-5 py-10">
      <h1 className="font-serif text-2xl text-ink font-bold mb-1">Tùy chỉnh cá nhân</h1>
      <p className="font-sans text-[13px] text-sub mb-6">Đổi ảnh đại diện, tên hiển thị, số điện thoại hoặc mật khẩu.</p>

      {/* AVATAR */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          {avatar
            ? <img src={avatar} className="w-20 h-20 rounded-full object-cover border border-line" alt="avatar" />
            : <span className="w-20 h-20 rounded-full bg-brass text-white grid place-items-center font-serif font-bold text-3xl">{(name || "?")[0]?.toUpperCase()}</span>}
          <button onClick={() => fileRef.current?.click()} disabled={upAv} title="Thay ảnh đại diện"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-ink grid place-items-center border-2 border-paper">
            {upAv ? <Loader2 size={14} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAvatar(f); e.currentTarget.value = ""; }} />
        </div>
        <div className="font-sans text-[13px] text-sub">Bấm biểu tượng máy ảnh để thay ảnh đại diện.<br />{avatar && <button onClick={() => setAvatar(null)} className="text-[#B05A4A] mt-1">Gỡ ảnh (dùng chữ cái)</button>}</div>
      </div>

      <div className="space-y-4">
        <div><div className="font-sans text-sm text-sub mb-1.5">Họ và tên</div><input className={inp} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><div className="font-sans text-sm text-sub mb-1.5">Số điện thoại</div><input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><div className="font-sans text-sm text-sub mb-1.5">Mật khẩu mới (bỏ trống nếu không đổi)</div><input type="password" className={inp} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" /></div>
        <div><div className="font-sans text-sm text-sub mb-1.5">Email (không đổi được)</div><input className={inp + " bg-cream/60 text-sub"} value={user.email} disabled /></div>
      </div>

      <button onClick={save} disabled={saving || !name.trim()} className="mm-btn mt-6 w-full bg-brass text-white rounded-full py-3 font-sans font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {msg || "Lưu thay đổi"}
      </button>
    </div>
  );
}
