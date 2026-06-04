"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Car, CheckCircle, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode") ?? "";

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);
  const [codeValid, setCodeValid]   = useState<boolean | null>(null);
  const [errCode, setErrCode]       = useState("");

  useEffect(() => {
    if (!oobCode) { setErrCode("missing-code"); setCodeValid(false); return; }
    verifyPasswordResetCode(auth, oobCode)
      .then(em => { setEmail(em); setCodeValid(true); })
      .catch((e: unknown) => {
        const code = (e as { code?: string })?.code ?? "unknown";
        console.error("verifyPasswordResetCode failed:", code, e);
        setErrCode(code);
        setCodeValid(false);
      });
  }, [oobCode]);

  const reasonFor = (c: string) =>
    c === "auth/expired-action-code" ? "הקישור פג תוקף (הונפק לפני יותר משעה)."
    : c === "auth/invalid-action-code" ? "הקישור כבר שומש, או שנשלח אחריו קישור חדש יותר."
    : c === "auth/user-disabled" ? "חשבון המשתמש מושבת — פנה למנהל המערכת."
    : c === "auth/user-not-found" ? "לא נמצא חשבון תואם לקישור."
    : c === "missing-code" ? "הקישור חסר קוד אימות."
    : "הקישור אינו תקף או כבר נעשה בו שימוש.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    if (password !== confirm) { setError("הסיסמאות אינן תואמות"); return; }
    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? "";
      console.error("confirmPasswordReset failed:", code, e);
      setError(code ? reasonFor(code) : "שגיאה באיפוס הסיסמה");
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Loading */}
          {codeValid === null && (
            <div className="flex justify-center py-6">
              <div className="w-7 h-7 rounded-full border-2 border-[#032147]/20 border-t-[#032147] animate-spin" />
            </div>
          )}

          {/* Invalid / expired link */}
          {codeValid === false && (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <Car size={20} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#032147] mb-1">הקישור אינו תקף</h1>
                <p className="text-sm text-gray-400">{reasonFor(errCode)}</p>
                {errCode && <p className="text-[10px] text-gray-300 mt-1">קוד: {errCode}</p>}
              </div>
              <a href="/forgot-password"
                className="inline-block text-sm font-semibold text-[#209dd7] hover:text-[#1880b0] transition-colors">
                שלח קישור חדש
              </a>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={22} className="text-emerald-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#032147] mb-1">הסיסמה עודכנה!</h1>
                <p className="text-sm text-gray-400">אפשר להתחבר עם הסיסמה החדשה.</p>
              </div>
              <a href="/login"
                className="mt-2 h-10 px-6 rounded-xl bg-[#032147] text-white text-sm font-semibold hover:bg-[#032147]/90 transition-all flex items-center">
                כניסה למערכת
              </a>
            </div>
          )}

          {/* Form */}
          {codeValid === true && !done && (
            <>
              <h1 className="text-xl font-bold text-[#032147] mb-1">קביעת סיסמה חדשה</h1>
              <p className="text-sm text-gray-400 mb-6">
                {email && <span>עבור <span className="font-medium text-[#032147]">{email}</span></span>}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">סיסמה חדשה</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      autoFocus
                      className="w-full h-10 px-3 pr-10 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-[#032147] focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
                      placeholder="לפחות 6 תווים"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">אימות סיסמה</label>
                  <div className="relative">
                    <input
                      type={showConf ? "text" : "password"}
                      required
                      className="w-full h-10 px-3 pr-10 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm text-[#032147] focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7] transition-all"
                      placeholder="הזן שוב את הסיסמה"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
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
                  {busy ? "שומר..." : "שמור סיסמה חדשה"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          benjaminz-ai · All Rights Reserved
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#032147]/20 border-t-[#032147] animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
