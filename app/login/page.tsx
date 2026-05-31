"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, profile, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === "super_admin") router.replace("/admin");
      else router.replace("/");
    }
  }, [profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch {
      setError("אימייל או סיסמה שגויים");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#032147] flex items-center justify-center">
            <Car size={18} className="text-[#ecad0a]" />
          </div>
          <div>
            <div className="text-[#032147] font-bold text-lg leading-tight">ניהול צי רכבים</div>
            <div className="text-[#ecad0a] text-[10px] font-semibold tracking-widest uppercase">Fleet Manager</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#032147] mb-1">כניסה למערכת</h1>
          <p className="text-sm text-gray-400 mb-6">הזן את פרטי הכניסה שלך</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">אימייל</label>
              <input
                type="email"
                required
                autoFocus
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-[#032147] focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">סיסמה</label>
              <input
                type="password"
                required
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-[#032147] focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-xl bg-[#032147] text-white text-sm font-semibold hover:bg-[#032147]/90 disabled:opacity-50 transition-all mt-1"
            >
              {busy ? "מתחבר..." : "כניסה"}
            </button>

            <div className="text-center">
              <a
                href="/forgot-password"
                className="text-xs text-[#209dd7] hover:text-[#1880b0] transition-colors"
              >
                שכחתי סיסמה
              </a>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          benjaminz-ai · All Rights Reserved
        </p>
      </div>
    </div>
  );
}
