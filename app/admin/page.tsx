"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection, addDoc, onSnapshot, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { seedTenant } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  Car, Plus, Building2, CheckCircle2, XCircle, LogOut,
  Loader2, Pencil, X, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tenant = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: unknown;
  adminEmail?: string;
  vehicleCount?: number;
  driverCount?: number;
};

type NewTenantForm = {
  tenantName: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
};

async function createAuthUser(email: string, password: string): Promise<string> {
  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "שגיאה ביצירת משתמש");
  return data.uid as string;
}

async function sendPasswordReset(email: string): Promise<void> {
  const res = await fetch("/api/send-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "שגיאה בשליחת המייל");
}

export default function AdminPage() {
  const { profile, logout, enterSupportMode } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTenantForm>({
    tenantName: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ tenantName: "", adminFirstName: "", adminLastName: "", adminEmail: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [fixAuthLoading, setFixAuthLoading] = useState<string | null>(null);
  const [fixAuthEmail, setFixAuthEmail] = useState<{ [tenantId: string]: string }>({});

  // Guard: only super_admin
  useEffect(() => {
    if (profile && profile.role !== "super_admin") router.replace("/dashboard");
  }, [profile, router]);

  // Subscribe to tenants collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tenants"), snap => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant)));
    });
    return unsub;
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      // 1. Create tenant doc
      const tenantRef = await addDoc(collection(db, "tenants"), {
        name: form.tenantName,
        isActive: true,
        adminEmail: form.adminEmail,
        createdAt: serverTimestamp(),
      });

      // 2. Seed default data
      await seedTenant(tenantRef.id);

      // 3. Create Firebase Auth user via REST (doesn't log out current user)
      const uid = await createAuthUser(form.adminEmail, form.adminPassword);

      // 4. Create user profile in Firestore
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "users", uid), {
        firstName: form.adminFirstName,
        lastName: form.adminLastName,
        email: form.adminEmail,
        role: "tenant_admin",
        tenantId: tenantRef.id,
        tenantName: form.tenantName,
        createdAt: serverTimestamp(),
      });

      setSuccess(`לקוח "${form.tenantName}" נוצר בהצלחה!`);
      setForm({ tenantName: "", adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "" });
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (tenant: Tenant) => {
    const nextActive = !tenant.isActive;
    await updateDoc(doc(db, "tenants", tenant.id), { isActive: nextActive });
    // Propagate freeze/unfreeze to every user of this tenant, so login is blocked
    // (frozenByTenant) without needing the client to read the tenant doc.
    const { getDocs, query, where } = await import("firebase/firestore");
    const snap = await getDocs(query(collection(db, "users"), where("tenantId", "==", tenant.id)));
    await Promise.all(
      snap.docs.map(u => updateDoc(doc(db, "users", u.id), { frozenByTenant: !nextActive }))
    );
  };

  const startEdit = (t: Tenant) => {
    setEditingTenant(t.id);
    setEditForm({ tenantName: t.name, adminFirstName: "", adminLastName: "", adminEmail: t.adminEmail ?? "" });
  };

  const handleEdit = async (t: Tenant) => {
    setEditBusy(true);
    setError("");
    try {
      const { setDoc, getDocs, query, where } = await import("firebase/firestore");
      const newEmail = editForm.adminEmail.trim();
      const emailChanged = !!newEmail && newEmail !== (t.adminEmail ?? "");

      // Linked user docs for this tenant (doc id === Firebase Auth uid)
      const q = query(collection(db, "users"), where("tenantId", "==", t.id));
      const snap = await getDocs(q);

      // If the admin email changed, update the REAL Firebase Auth login first —
      // so the old email actually stops working, not just the Firestore label.
      // Only tenant_admin accounts of THIS tenant are touched; super_admin never.
      if (emailChanged) {
        const adminDocs = snap.docs.filter(d => (d.data().role ?? "") === "tenant_admin");
        for (const d of adminDocs) {
          const res = await fetch("/api/update-user-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: d.id, newEmail }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "עדכון מייל ההתחברות נכשל");
          }
        }
      }

      // Update tenant doc
      await updateDoc(doc(db, "tenants", t.id), {
        name: editForm.tenantName,
        adminEmail: newEmail,
      });

      // Keep the Firestore label fields in sync (never touch a super_admin doc)
      const updates: Record<string, string> = {};
      if (newEmail) updates.email = newEmail;
      if (editForm.tenantName) updates.tenantName = editForm.tenantName;
      if (editForm.adminFirstName) updates.firstName = editForm.adminFirstName;
      if (editForm.adminLastName) updates.lastName = editForm.adminLastName;

      if (Object.keys(updates).length > 0) {
        await Promise.all(
          snap.docs
            .filter(userDoc => (userDoc.data().role ?? "") !== "super_admin")
            .map(userDoc => setDoc(doc(db, "users", userDoc.id), updates, { merge: true }))
        );
      }
      setSuccess(`הלקוח "${editForm.tenantName}" עודכן בהצלחה`);
      setEditingTenant(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון");
    } finally {
      setEditBusy(false);
    }
  };

  const handleResetPassword = async (tenant: Tenant) => {
    if (!tenant.adminEmail) return;
    setResetLoading(tenant.id);
    try {
      await sendPasswordReset(tenant.adminEmail);
      setSuccess(`אימייל לאיפוס סיסמה נשלח אל ${tenant.adminEmail}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחת המייל");
    } finally {
      setResetLoading(null);
    }
  };

  const handleFixAuth = async (tenant: Tenant) => {
    const email = fixAuthEmail[tenant.id] ?? tenant.adminEmail ?? "";
    if (!email) return;
    const password = prompt(`סיסמה ראשונית עבור ${email}:`) ?? "";
    if (!password || password.length < 6) {
      setError("סיסמה חייבת להיות לפחות 6 תווים");
      return;
    }
    setFixAuthLoading(tenant.id);
    setError("");
    try {
      const uid = await createAuthUser(email, password);
      // Upsert user doc
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "users", uid), {
        email,
        role: "tenant_admin",
        tenantId: tenant.id,
        tenantName: tenant.name,
      }, { merge: true });
      // Ensure tenant has adminEmail
      await updateDoc(doc(db, "tenants", tenant.id), { adminEmail: email });
      setSuccess(`משתמש Auth נוצר/עודכן עבור ${email}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setFixAuthLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]" dir="rtl">
      {/* Top bar */}
      <div className="bg-[#032147] text-white px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#ecad0a] flex items-center justify-center shrink-0">
          <Car size={14} className="text-[#032147]" />
        </div>
        <div>
          <div className="font-bold text-sm">Fleet Manager</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">Super Admin</div>
        </div>
        <div className="mr-auto flex items-center gap-3">
          <span className="text-sm text-white/60">
            שלום, <span className="text-white font-semibold">{profile?.firstName}</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors"
          >
            <LogOut size={12} />
            יציאה
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#032147]">לוח בקרה — ניהול לקוחות</h1>
            <p className="text-sm text-gray-400 mt-0.5">{tenants.length} לקוחות רשומים</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#032147] text-white text-sm font-semibold hover:bg-[#032147]/90 transition-colors"
          >
            <Plus size={15} />
            לקוח חדש
          </button>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <CheckCircle2 size={15} />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <XCircle size={15} />
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#032147] mb-4">פתיחת סביבה ללקוח חדש</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">שם הארגון / הלקוח</label>
                <input
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                  placeholder="עיריית רמת גן"
                  value={form.tenantName}
                  onChange={e => setForm(f => ({ ...f, tenantName: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">שם פרטי (מנהל)</label>
                  <input
                    required
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                    placeholder="ישראל"
                    value={form.adminFirstName}
                    onChange={e => setForm(f => ({ ...f, adminFirstName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">שם משפחה</label>
                  <input
                    required
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                    placeholder="ישראלי"
                    value={form.adminLastName}
                    onChange={e => setForm(f => ({ ...f, adminLastName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">אימייל כניסה</label>
                <input
                  type="email"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                  placeholder="admin@example.com"
                  value={form.adminEmail}
                  onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">סיסמה ראשונית</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                  placeholder="לפחות 6 תווים"
                  value={form.adminPassword}
                  onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#032147] text-white text-sm font-semibold hover:bg-[#032147]/90 disabled:opacity-50 transition-colors"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {busy ? "יוצר..." : "צור לקוח"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tenants list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 size={32} className="mb-3 opacity-30" />
              <p className="text-sm">אין לקוחות עדיין — לחץ על "לקוח חדש" להתחיל</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_rgb(0_0_0/0.04)]">
                <tr className="border-b border-gray-100">
                  <th className="text-right text-xs font-semibold text-gray-400 px-5 py-3">ארגון</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-5 py-3">סטטוס</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-5 py-3">תאריך יצירה</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <>
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#032147]/10 flex items-center justify-center text-[#032147] text-xs font-bold">
                          {t.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#032147]">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.adminEmail ?? t.id.slice(0, 8) + "..."}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                        t.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", t.isActive ? "bg-green-500" : "bg-gray-400")} />
                        {t.isActive ? "פעיל" : "מושבת"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">
                      {t.createdAt && typeof t.createdAt === "object" && "toDate" in t.createdAt
                        ? (t.createdAt as { toDate: () => Date }).toDate().toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editingTenant === t.id ? setEditingTenant(null) : startEdit(t)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          {editingTenant === t.id ? <X size={11} /> : <Pencil size={11} />}
                          {editingTenant === t.id ? "ביטול" : "עריכה"}
                        </button>
                        {t.adminEmail && (
                          <button
                            onClick={() => handleResetPassword(t)}
                            disabled={resetLoading === t.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg text-[#209dd7] hover:bg-[#209dd7]/10 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {resetLoading === t.id ? <Loader2 size={11} className="animate-spin" /> : null}
                            איפוס סיסמה
                          </button>
                        )}
                        <button
                          onClick={() => handleFixAuth(t)}
                          disabled={fixAuthLoading === t.id}
                          title="צור / תקן משתמש Firebase Auth"
                          className="text-xs font-medium px-3 py-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {fixAuthLoading === t.id ? <Loader2 size={11} className="animate-spin" /> : null}
                          תקן Auth
                        </button>
                        <button
                          onClick={() => {
                            enterSupportMode(t.id, t.name);
                            router.push("/dashboard");
                          }}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-[#753991] hover:bg-[#753991]/10 transition-colors flex items-center gap-1"
                          title="כנס למערכת כאילו אתה הלקוח הזה"
                        >
                          <ShieldAlert size={11} />
                          כנס כלקוח
                        </button>
                        <button
                          onClick={() => toggleActive(t)}
                          className={cn(
                            "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                            t.isActive ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                          )}
                        >
                          {t.isActive ? "השבת" : "הפעל"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingTenant === t.id && (
                    <tr key={t.id + "_edit"} className="bg-[#f8fafc] border-b border-gray-100">
                      <td colSpan={4} className="px-5 py-4">
                        <div className="grid grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">שם ארגון</label>
                            <input className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#209dd7]"
                              value={editForm.tenantName}
                              onChange={e => setEditForm(f => ({ ...f, tenantName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">שם פרטי מנהל</label>
                            <input className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#209dd7]"
                              placeholder="ללא שינוי"
                              value={editForm.adminFirstName}
                              onChange={e => setEditForm(f => ({ ...f, adminFirstName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">שם משפחה</label>
                            <input className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#209dd7]"
                              placeholder="ללא שינוי"
                              value={editForm.adminLastName}
                              onChange={e => setEditForm(f => ({ ...f, adminLastName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">אימייל</label>
                            <input type="email" className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#209dd7]"
                              value={editForm.adminEmail}
                              onChange={e => setEditForm(f => ({ ...f, adminEmail: e.target.value }))} />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleEdit(t)}
                            disabled={editBusy}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#032147] text-white text-xs font-semibold hover:bg-[#032147]/90 disabled:opacity-50 transition-colors"
                          >
                            {editBusy ? <Loader2 size={11} className="animate-spin" /> : null}
                            שמור שינויים
                          </button>
                          <button onClick={() => setEditingTenant(null)}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs hover:bg-gray-50">
                            ביטול
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
