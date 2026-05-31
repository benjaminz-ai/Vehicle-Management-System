"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import {
  Car, Fuel, Tag, Settings, Plus, Pencil, Trash2, Check, X, Circle, Shield, Building2,
  Users, Mail, KeyRound, Loader2, UserCheck, UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Inline editable row ───────────────────────────────────────────────────────
function EditableRow({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#ecad0a]/5 border border-[#ecad0a]/30 rounded-xl">
      <input
        autoFocus
        className="flex-1 bg-transparent text-sm text-[#032147] outline-none placeholder:text-gray-400"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") onSave(text.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        onClick={() => onSave(text.trim())}
        className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80 transition-colors"
      >
        <Check size={13} />
      </button>
      <button
        onClick={onCancel}
        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Generic list manager ──────────────────────────────────────────────────────
function ListManager({
  items,
  onAdd,
  onUpdate,
  onDelete,
  placeholder,
  renderExtra,
}: {
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  renderExtra?: (item: { id: string; name: string }) => React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding]       = useState(false);

  return (
    <div className="space-y-1.5">
      {items.map(item =>
        editingId === item.id ? (
          <EditableRow
            key={item.id}
            value={item.name}
            onSave={v => { if (v) onUpdate(item.id, v); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            key={item.id}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 flex items-center gap-2">
              {renderExtra ? renderExtra(item) : (
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
              )}
              <span className="text-sm text-[#032147] font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingId(item.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      )}

      {adding ? (
        <EditableRow
          value=""
          onSave={v => { if (v) onAdd(v); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors"
        >
          <Plus size={13} />
          {placeholder}
        </button>
      )}
    </div>
  );
}

// ── Status list (special: has color dot + isDefault badge) ────────────────────
function StatusManager() {
  const { vehicleStatuses, addStatus, updateStatus, deleteStatus } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding]       = useState(false);
  const [editColor, setEditColor] = useState("#6b7280");

  const colors = [
    "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
    "#6b7280", "#209dd7", "#f97316", "#ec4899",
  ];

  return (
    <div className="space-y-1.5">
      {[...vehicleStatuses].sort((a, b) => a.sortOrder - b.sortOrder).map(item =>
        editingId === item.id ? (
          <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-[#ecad0a]/5 border border-[#ecad0a]/30 rounded-xl">
            <div className="flex gap-1">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input
              autoFocus
              defaultValue={item.name}
              className="flex-1 bg-transparent text-sm text-[#032147] outline-none"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  updateStatus(item.id, { name: (e.target as HTMLInputElement).value.trim(), color: editColor });
                  setEditingId(null);
                }
                if (e.key === "Escape") setEditingId(null);
              }}
              id={`status-input-${item.id}`}
            />
            <button
              onClick={() => {
                const input = document.getElementById(`status-input-${item.id}`) as HTMLInputElement;
                updateStatus(item.id, { name: input.value.trim(), color: editColor });
                setEditingId(null);
              }}
              className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80"
            >
              <Check size={13} />
            </button>
            <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div key={item.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="flex-1 text-sm text-[#032147] font-medium">{item.name}</span>
            {item.isDefault && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ברירת מחדל</span>
            )}
            {/* Operational toggle */}
            <button
              title={item.isOperational ? "סטטוס תפעולי — לחץ לשינוי" : "סטטוס לא תפעולי — לחץ לשינוי"}
              onClick={() => updateStatus(item.id, { isOperational: !item.isOperational })}
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
                item.isOperational
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                  : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
              )}
            >
              {item.isOperational ? "תפעולי ✓" : "לא תפעולי"}
            </button>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingId(item.id); setEditColor(item.color); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"
              >
                <Pencil size={13} />
              </button>
              {!item.isDefault && (
                <button
                  onClick={() => deleteStatus(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )
      )}

      {adding ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#ecad0a]/5 border border-[#ecad0a]/30 rounded-xl">
          <div className="flex gap-1">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setEditColor(c)}
                className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                style={{ background: c }}
              />
            ))}
          </div>
          <input
            autoFocus
            placeholder="שם סטטוס חדש"
            className="flex-1 bg-transparent text-sm text-[#032147] outline-none placeholder:text-gray-400"
            id="new-status-input"
            onKeyDown={e => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) addStatus({ name: v, color: editColor, isDefault: false, sortOrder: vehicleStatuses.length });
                setAdding(false);
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById("new-status-input") as HTMLInputElement;
              const v = input.value.trim();
              if (v) addStatus({ name: v, color: editColor, isDefault: false, sortOrder: vehicleStatuses.length });
              setAdding(false);
            }}
            className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80"
          >
            <Check size={13} />
          </button>
          <button onClick={() => setAdding(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setAdding(true); setEditColor("#6b7280"); }}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors"
        >
          <Plus size={13} />
          הוסף סטטוס
        </button>
      )}
    </div>
  );
}

// ── Users Manager (tenant_admin only) ────────────────────────────────────────
type TenantUser = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "tenant_admin" | "tenant_user";
  isActive?: boolean;
};

function UsersManager({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState<string | null>(null);

  // Load all users in this tenant
  useEffect(() => {
    const q = query(collection(db, "users"), where("tenantId", "==", tenantId));
    return onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as TenantUser)));
    });
  }, [tenantId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      // Create Firebase Auth user
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");

      // Create Firestore user profile
      await setDoc(doc(db, "users", data.uid), {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: "tenant_user",
        tenantId,
        tenantName,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      setSuccess(`${form.firstName} ${form.lastName} נוסף/ה בהצלחה`);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      setShowAdd(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: TenantUser) {
    await updateDoc(doc(db, "users", u.uid), { isActive: !u.isActive });
  }

  async function sendReset(u: TenantUser) {
    setResetLoading(u.uid);
    try {
      const res = await fetch("/api/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email }),
      });
      if (!res.ok) throw new Error("שגיאה");
      setSuccess(`קישור לאיפוס סיסמה נשלח אל ${u.email}`);
    } catch {
      setError("שגיאה בשליחת המייל");
    } finally {
      setResetLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#032147]">משתמשי הארגון</h2>
          <p className="text-xs text-gray-400 mt-0.5">{users.length} משתמשים רשומים</p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setError(""); setSuccess(""); }}
          className="flex items-center gap-1.5 text-sm font-medium text-[#209dd7] hover:text-[#1a7fb0] transition-colors"
        >
          <Plus size={14} /> הוסף משתמש
        </button>
      </div>

      {/* Feedback */}
      {success && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">{success}</p>}
      {error   && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border border-[#209dd7]/30 bg-[#209dd7]/5 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500">שם פרטי</label>
              <input required className="h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
                value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="ישראל" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500">שם משפחה</label>
              <input required className="h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
                value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="ישראלי" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">אימייל</label>
            <input required type="email" className="h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500">סיסמה זמנית</label>
            <input required type="password" minLength={6} className="h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="מינימום 6 תווים" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#032147] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#032147]/80 transition-colors">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {busy ? "מוסיף..." : "הוסף עובד"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* Users list */}
      <div className="space-y-1.5">
        {users.map(u => (
          <div key={u.uid} className={cn("flex items-center gap-3 px-3 py-3 rounded-xl transition-colors", u.isActive === false ? "bg-gray-50 opacity-60" : "hover:bg-gray-50")}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-xs shrink-0">
              {u.firstName?.[0]}{u.lastName?.[0]}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#032147]">{u.firstName} {u.lastName}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  u.role === "tenant_admin" ? "bg-[#032147]/10 text-[#032147]" : "bg-gray-100 text-gray-500")}>
                  {u.role === "tenant_admin" ? "מנהל" : "משתמש"}
                </span>
                {u.isActive === false && <span className="text-[10px] text-red-500 font-semibold">מושבת</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1">
              <button onClick={() => sendReset(u)} disabled={resetLoading === u.uid} title="שלח איפוס סיסמה"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#209dd7] transition-colors disabled:opacity-50">
                {resetLoading === u.uid ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              </button>
              {u.role !== "tenant_admin" && (
                <button onClick={() => toggleActive(u)} title={u.isActive === false ? "הפעל משתמש" : "השבת משתמש"}
                  className={cn("p-1.5 rounded-lg transition-colors", u.isActive === false
                    ? "hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                    : "hover:bg-red-50 text-gray-400 hover:text-red-500")}>
                  {u.isActive === false ? <UserCheck size={13} /> : <UserX size={13} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const BASE_TABS = [
  { id: "manufacturers",      label: "יצרנים",        icon: Car },
  { id: "vehicleTypes",       label: "סוגי רכב",      icon: Tag },
  { id: "fuelTypes",          label: "סוגי דלק",      icon: Fuel },
  { id: "statuses",           label: "סטטוסים",       icon: Circle },
  { id: "insuranceCompanies", label: "חברות ביטוח",   icon: Building2 },
  { id: "insuranceTypes",     label: "סוגי ביטוח",    icon: Shield },
] as const;

const ADMIN_TAB = { id: "users", label: "משתמשים", icon: Users } as const;

type TabId = typeof BASE_TABS[number]["id"] | "users";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("manufacturers");
  const { profile } = useAuth();
  const isTenantAdmin = profile?.role === "tenant_admin";
  const TABS = isTenantAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const {
    manufacturers, vehicleTypes, fuelTypes, insuranceCompanies, insuranceTypes,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addModelToManufacturer, removeModelFromManufacturer,
    addVehicleType, updateVehicleType, deleteVehicleType,
    addFuelType, updateFuelType, deleteFuelType,
    addInsuranceCompany, updateInsuranceCompany, deleteInsuranceCompany,
    addInsuranceType, updateInsuranceType, deleteInsuranceType,
  } = useStore();
  const [expandedMfr, setExpandedMfr] = useState<string | null>(null);
  const [newModel, setNewModel] = useState("");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#032147] flex items-center justify-center">
          <Settings size={18} className="text-[#ecad0a]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">הגדרות</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול רשימות הגדרה של הצי</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all",
              activeTab === id
                ? "bg-[#032147] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {activeTab === "manufacturers" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">יצרנים ודגמים</h2>
              <p className="text-xs text-gray-400 mt-0.5">{manufacturers.length} יצרנים מוגדרים — לחץ על יצרן לניהול הדגמים שלו</p>
            </div>
            <ListManager
              items={manufacturers}
              onAdd={addManufacturer}
              onUpdate={updateManufacturer}
              onDelete={deleteManufacturer}
              placeholder="הוסף יצרן"
              renderExtra={(item) => (
                <div className="mt-1">
                  <button
                    onClick={() => setExpandedMfr(expandedMfr === item.id ? null : item.id)}
                    className="text-xs text-[#209dd7] hover:underline"
                  >
                    {(item as typeof manufacturers[0]).models?.length ?? 0} דגמים {expandedMfr === item.id ? "▲" : "▼"}
                  </button>
                  {expandedMfr === item.id && (
                    <div className="mt-2 mr-2 space-y-1">
                      {((item as typeof manufacturers[0]).models ?? []).map(m => (
                        <div key={m} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="flex-1">{m}</span>
                          <button
                            onClick={() => removeModelFromManufacturer(item.id, m)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-1 mt-2">
                        <input
                          className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 bg-[#f8fafc] focus:outline-none focus:border-[#209dd7]"
                          placeholder="דגם חדש (למשל Corolla)"
                          value={newModel}
                          onChange={e => setNewModel(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && newModel.trim()) {
                              addModelToManufacturer(item.id, newModel.trim());
                              setNewModel("");
                            }
                          }}
                        />
                        <button
                          onClick={() => { if (newModel.trim()) { addModelToManufacturer(item.id, newModel.trim()); setNewModel(""); } }}
                          className="px-2 h-7 bg-[#032147] text-white text-xs rounded-lg hover:bg-[#032147]/80"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            />
          </>
        )}

        {activeTab === "vehicleTypes" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סוגי רכב</h2>
              <p className="text-xs text-gray-400 mt-0.5">{vehicleTypes.length} סוגים מוגדרים</p>
            </div>
            <ListManager
              items={vehicleTypes}
              onAdd={addVehicleType}
              onUpdate={updateVehicleType}
              onDelete={deleteVehicleType}
              placeholder="הוסף סוג רכב"
            />
          </>
        )}

        {activeTab === "fuelTypes" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סוגי דלק</h2>
              <p className="text-xs text-gray-400 mt-0.5">{fuelTypes.length} סוגים מוגדרים</p>
            </div>
            <ListManager
              items={fuelTypes}
              onAdd={addFuelType}
              onUpdate={updateFuelType}
              onDelete={deleteFuelType}
              placeholder="הוסף סוג דלק"
            />
          </>
        )}

        {activeTab === "statuses" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סטטוסים</h2>
              <p className="text-xs text-gray-400 mt-0.5">לחץ עריכה לשינוי שם/צבע. לחץ על "תפעולי/לא תפעולי" לקביעת הדשבורד. לא ניתן למחוק ברירת מחדל.</p>
            </div>
            <StatusManager />
          </>
        )}

        {activeTab === "insuranceCompanies" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">חברות ביטוח</h2>
              <p className="text-xs text-gray-400 mt-0.5">{insuranceCompanies.length} חברות מוגדרות</p>
            </div>
            <ListManager
              items={insuranceCompanies}
              onAdd={addInsuranceCompany}
              onUpdate={updateInsuranceCompany}
              onDelete={deleteInsuranceCompany}
              placeholder="הוסף חברת ביטוח"
            />
          </>
        )}

        {activeTab === "insuranceTypes" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סוגי ביטוח</h2>
              <p className="text-xs text-gray-400 mt-0.5">{insuranceTypes.length} סוגים מוגדרים (ביטוח חובה, צד ג', מקיף וכו')</p>
            </div>
            <ListManager
              items={insuranceTypes}
              onAdd={addInsuranceType}
              onUpdate={updateInsuranceType}
              onDelete={deleteInsuranceType}
              placeholder="הוסף סוג ביטוח"
            />
          </>
        )}

        {activeTab === "users" && isTenantAdmin && profile?.tenantId && (
          <UsersManager
            tenantId={profile.tenantId}
            tenantName={profile.tenantName ?? ""}
          />
        )}
      </div>
    </div>
  );
}
