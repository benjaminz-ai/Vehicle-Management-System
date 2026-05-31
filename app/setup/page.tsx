"use client";
/**
 * One-time setup page — creates the super_admin account.
 * Navigate to /setup, fill in details, then delete this file.
 */
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SetupPage() {
  const [email, setEmail] = useState("binyamin.zaidner@gmail.com");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("Benjamin");
  const [lastName, setLastName] = useState("Zaidner");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        firstName,
        lastName,
        email,
        role: "super_admin",
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-[#032147] mb-2">Super Admin נוצר!</h1>
        <p className="text-sm text-gray-500">כעת תוכל להתחבר עם הפרטים שהזנת.</p>
        <p className="text-xs text-red-400 mt-4">מחק את קובץ <code>app/setup/page.tsx</code> מהקוד לאחר הגדרה זו.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]" dir="rtl">
      <div className="bg-white rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <h1 className="text-xl font-bold text-[#032147] mb-1">הגדרת Super Admin</h1>
        <p className="text-xs text-red-400 mb-6">דף זה חד-פעמי — מחק אחרי שימוש</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">שם פרטי</label>
            <input className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:border-[#209dd7]"
              value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">שם משפחה</label>
            <input className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:border-[#209dd7]"
              value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">אימייל</label>
            <input type="email" className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:border-[#209dd7]"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">סיסמה</label>
            <input type="password" minLength={6} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:border-[#209dd7]"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full h-10 rounded-xl bg-[#032147] text-white text-sm font-semibold disabled:opacity-50">
            {busy ? "יוצר..." : "צור Super Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
