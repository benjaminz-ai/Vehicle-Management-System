"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, UserPlus, UserCheck, UserX, KeyRound, Loader2, ShieldCheck, X } from "lucide-react";

type Row = {
  uid: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  isActive?: boolean;
};

async function createAuthUser(email: string, password: string): Promise<string> {
  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "שגיאה ביצירת משתמש");
  return data.uid as string;
}
async function sendPasswordReset(email: string): Promise<void> {
  const res = await fetch("/api/send-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "שגיאה בשליחת איפוס");
  }
}

export default function UsersPage() {
  const { profile, effectiveTenantId, loading } = useAuth();
  const router = useRouter();
  const allowed = !!profile && (profile.role === "tenant_admin" || profile.role === "super_admin");

  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionUid, setActionUid] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile && !allowed) router.replace("/dashboard");
  }, [loading, profile, allowed, router]);

  const load = useCallback(async () => {
    if (!effectiveTenantId) { setRows([]); setLoadingRows(false); return; }
    setLoadingRows(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("tenantId", "==", effectiveTenantId)));
      setRows(snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<Row, "uid">) })));
    } catch (err: unknown) {
      setRows([]);
      setError(err instanceof Error ? "שגיאה בטעינת המשתמשים: " + err.message : "שגיאה בטעינת המשתמשים");
    } finally {
      setLoadingRows(false);
    }
  }, [effectiveTenantId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#032147]" /></div>;
  }
  if (!allowed) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      if (!effectiveTenantId) throw new Error("לא נמצא טננט פעיל");
      if (!form.firstName.trim() || !form.lastName.trim()) throw new Error("נדרשים שם פרטי ושם משפחה");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw new Error("כתובת מייל לא תקינה");
      if (form.password.length < 6) throw new Error("הסיסמה חייבת להכיל לפחות 6 תווים");

      // Guard: don't add an email that already exists in this tenant (checked in-memory
      // against the loaded list — a cross-collection query on email isn't permitted by rules)
      if (rows.some(r => (r.email || "").toLowerCase() === form.email.trim().toLowerCase()))
        throw new Error("כתובת המייל כבר משויכת למשתמש בארגון");

      const uid = await createAuthUser(form.email.trim(), form.password);
      await setDoc(doc(db, "users", uid), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: "tenant_user",
        tenantId: effectiveTenantId,
        tenantName: profile.tenantName ?? "",
        isActive: true,
        createdAt: serverTimestamp(),
      });
      setSuccess(`העובד ${form.email.trim()} נוסף בהצלחה`);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (r: Row) => {
    setActionUid(r.uid); setError(""); setSuccess("");
    try {
      await updateDoc(doc(db, "users", r.uid), { isActive: r.isActive === false ? true : false });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally { setActionUid(null); }
  };

  const resetPwd = async (r: Row) => {
    setActionUid(r.uid); setError(""); setSuccess("");
    try {
      await sendPasswordReset(r.email);
      setSuccess(`קישור איפוס סיסמה נשלח ל-${r.email}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחת איפוס");
    } finally { setActionUid(null); }
  };

  const employees = rows.filter(r => r.role === "tenant_user");
  const managers = rows.filter(r => r.role === "tenant_admin");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">משתמשים</h1>
          <p className="text-sm text-[#888888] mt-0.5">
            ניהול עובדים עבור {profile.tenantName || "הארגון"} — יצירה, השבתה ואיפוס סיסמה.
          </p>
        </div>
        <Button onClick={() => { setShowForm(v => !v); setError(""); setSuccess(""); }}>
          {showForm ? <><X size={15} /> סגור</> : <><Plus size={15} /> עובד חדש</>}
        </Button>
      </div>

      {success && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">{success}</div>}
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="שם פרטי" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="שם פרטי" />
            <Input label="שם משפחה" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="שם משפחה" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="אימייל כניסה" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="employee@example.com" />
            <Input label="סיסמה ראשונית" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="לפחות 6 תווים" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>ביטול</Button>
            <Button type="submit" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} צור עובד</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 text-sm font-semibold text-[#032147]">
          עובדים ({employees.length})
        </div>
        {loadingRows ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#032147]" /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {employees.length === 0 && <div className="px-5 py-6 text-sm text-gray-400 text-center">עדיין אין עובדים. לחץ "עובד חדש" כדי להוסיף.</div>}
            {employees.map(r => {
              const disabled = r.isActive === false;
              const working = actionUid === r.uid;
              return (
                <div key={r.uid} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${disabled ? "bg-gray-100 text-gray-400" : "bg-[#032147]/10 text-[#032147]"}`}>
                    {(r.firstName?.[0] ?? "") + (r.lastName?.[0] ?? "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${disabled ? "text-gray-400" : "text-[#032147]"}`}>
                      {r.firstName} {r.lastName}
                      {disabled && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full mr-2">מושבת</span>}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">{r.email}</div>
                  </div>
                  <button onClick={() => resetPwd(r)} disabled={working}
                    className="flex items-center gap-1 text-xs text-[#209dd7] hover:bg-[#209dd7]/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                    <KeyRound size={13} /> איפוס סיסמה
                  </button>
                  <button onClick={() => toggleActive(r)} disabled={working}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${disabled ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}>
                    {working ? <Loader2 size={13} className="animate-spin" /> : disabled ? <UserCheck size={13} /> : <UserX size={13} />}
                    {disabled ? "הפעל" : "השבת"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {managers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 text-sm font-semibold text-[#032147]">מנהלים ({managers.length})</div>
          <div className="divide-y divide-gray-50">
            {managers.map(r => (
              <div key={r.uid} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#ecad0a]/15 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} className="text-[#ecad0a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#032147]">{r.firstName} {r.lastName} <span className="text-[10px] text-[#ecad0a] bg-[#ecad0a]/10 px-1.5 py-0.5 rounded-full mr-1">מנהל</span></div>
                  <div className="text-xs text-gray-400 font-mono">{r.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
