"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  Car, Fuel, Tag, Settings, Plus, Pencil, Trash2, Check, X, Circle,
  Shield, Building2, Users, Mail, Loader2, UserCheck, UserX, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Inline editable row ───────────────────────────────────────────────────────
function EditableRow({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#209dd7]/5 border border-[#209dd7]/25 rounded-xl">
      <input autoFocus className="flex-1 bg-transparent text-sm text-[#032147] outline-none"
        value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSave(text.trim()); if (e.key === "Escape") onCancel(); }} />
      <button onClick={() => onSave(text.trim())} className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80 transition-colors"><Check size={12} /></button>
      <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={12} /></button>
    </div>
  );
}

// ── Generic list manager ──────────────────────────────────────────────────────
function ListManager({ items, onAdd, onUpdate, onDelete, placeholder, renderExtra }: {
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  renderExtra?: (item: { id: string; name: string }) => React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-1">
      {items.map(item => editingId === item.id ? (
        <EditableRow key={item.id} value={item.name}
          onSave={v => { if (v) onUpdate(item.id, v); setEditingId(null); }}
          onCancel={() => setEditingId(null)} />
      ) : (
        <div key={item.id} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          {renderExtra ? renderExtra(item) : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />}
          <span className="flex-1 text-sm text-[#032147] font-medium">{item.name}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditingId(item.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"><Pencil size={12} /></button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
      {adding ? (
        <EditableRow value="" onSave={v => { if (v) onAdd(v); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors mt-1">
          <Plus size={12} /> {placeholder}
        </button>
      )}
    </div>
  );
}

// ── Status Manager ────────────────────────────────────────────────────────────
function StatusManager() {
  const { vehicleStatuses, addStatus, updateStatus, deleteStatus } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editColor, setEditColor] = useState("#6b7280");
  const colors = ["#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280", "#209dd7", "#f97316", "#ec4899"];

  return (
    <div className="space-y-1">
      {[...vehicleStatuses].sort((a, b) => a.sortOrder - b.sortOrder).map(item => editingId === item.id ? (
        <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-[#209dd7]/5 border border-[#209dd7]/25 rounded-xl">
          <div className="flex gap-1 shrink-0">
            {colors.map(c => (
              <button key={c} onClick={() => setEditColor(c)}
                className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                style={{ background: c }} />
            ))}
          </div>
          <input autoFocus defaultValue={item.name} id={`se-${item.id}`}
            className="flex-1 bg-transparent text-sm text-[#032147] outline-none"
            onKeyDown={e => {
              if (e.key === "Enter") { updateStatus(item.id, { name: (e.target as HTMLInputElement).value.trim(), color: editColor }); setEditingId(null); }
              if (e.key === "Escape") setEditingId(null);
            }} />
          <button onClick={() => { const el = document.getElementById(`se-${item.id}`) as HTMLInputElement; updateStatus(item.id, { name: el.value.trim(), color: editColor }); setEditingId(null); }}
            className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80"><Check size={12} /></button>
          <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={12} /></button>
        </div>
      ) : (
        <div key={item.id} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm" style={{ background: item.color }} />
          <span className="flex-1 text-sm text-[#032147] font-medium">{item.name}</span>
          {item.isDefault && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ברירת מחדל</span>}
          <button title={item.isOperational ? "תפעולי" : "לא תפעולי"}
            onClick={() => updateStatus(item.id, { isOperational: !item.isOperational })}
            className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
              item.isOperational ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100")}>
            {item.isOperational ? "✓ תפעולי" : "לא תפעולי"}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setEditingId(item.id); setEditColor(item.color); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"><Pencil size={12} /></button>
            {!item.isDefault && <button onClick={() => deleteStatus(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>}
          </div>
        </div>
      ))}
      {adding ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#209dd7]/5 border border-[#209dd7]/25 rounded-xl">
          <div className="flex gap-1 shrink-0">{colors.map(c => (
            <button key={c} onClick={() => setEditColor(c)} className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === c ? "border-gray-700 scale-110" : "border-transparent")} style={{ background: c }} />
          ))}</div>
          <input autoFocus placeholder="שם סטטוס חדש" id="new-s" className="flex-1 bg-transparent text-sm text-[#032147] outline-none placeholder:text-gray-400"
            onKeyDown={e => {
              if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) addStatus({ name: v, color: editColor, isDefault: false, sortOrder: vehicleStatuses.length, isOperational: false }); setAdding(false); }
              if (e.key === "Escape") setAdding(false);
            }} />
          <button onClick={() => { const v = (document.getElementById("new-s") as HTMLInputElement).value.trim(); if (v) addStatus({ name: v, color: editColor, isDefault: false, sortOrder: vehicleStatuses.length, isOperational: false }); setAdding(false); }}
            className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80"><Check size={12} /></button>
          <button onClick={() => setAdding(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={12} /></button>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditColor("#6b7280"); }}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors mt-1">
          <Plus size={12} /> הוסף סטטוס
        </button>
      )}
    </div>
  );
}

// ── Manufacturers section ─────────────────────────────────────────────────────
function ManufacturersSection() {
  const { manufacturers, addManufacturer, updateManufacturer, deleteManufacturer, addModelToManufacturer, removeModelFromManufacturer } = useStore();
  const [expandedMfr, setExpandedMfr] = useState<string | null>(null);
  const [newModel, setNewModel] = useState<Record<string, string>>({});

  return (
    <ListManager
      items={manufacturers}
      onAdd={addManufacturer}
      onUpdate={updateManufacturer}
      onDelete={deleteManufacturer}
      placeholder="הוסף יצרן"
      renderExtra={(item) => {
        const mfr = manufacturers.find(m => m.id === item.id);
        const models = mfr?.models ?? [];
        const isOpen = expandedMfr === item.id;
        return (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#032147] font-medium">{item.name}</span>
              <button onClick={e => { e.stopPropagation(); setExpandedMfr(isOpen ? null : item.id); }}
                className="flex items-center gap-1 text-xs text-[#209dd7] hover:text-[#1a7fb0] transition-colors">
                <span className="bg-[#209dd7]/10 text-[#209dd7] px-1.5 py-0.5 rounded-full font-semibold text-[10px]">{models.length}</span>
                <ChevronRight size={12} className={cn("transition-transform", isOpen && "rotate-90")} />
              </button>
            </div>
            {isOpen && (
              <div className="mt-2 ml-1 space-y-1 border-r-2 border-gray-100 pr-3">
                {models.length === 0 && <p className="text-xs text-gray-400">אין דגמים עדיין</p>}
                {models.map(m => (
                  <div key={m} className="flex items-center gap-2 group/m">
                    <span className="flex-1 text-xs text-gray-600">{m}</span>
                    <button onClick={() => removeModelFromManufacturer(item.id, m)}
                      className="opacity-0 group-hover/m:opacity-100 text-gray-300 hover:text-red-400 transition-all"><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="flex gap-1 mt-1.5">
                  <input className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#209dd7] focus:ring-1 focus:ring-[#209dd7]/20"
                    placeholder="דגם חדש..." value={newModel[item.id] ?? ""}
                    onChange={e => setNewModel(p => ({ ...p, [item.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter" && newModel[item.id]?.trim()) { addModelToManufacturer(item.id, newModel[item.id].trim()); setNewModel(p => ({ ...p, [item.id]: "" })); } }} />
                  <button onClick={() => { if (newModel[item.id]?.trim()) { addModelToManufacturer(item.id, newModel[item.id].trim()); setNewModel(p => ({ ...p, [item.id]: "" })); } }}
                    className="px-2 h-7 bg-[#032147] text-white text-xs rounded-lg hover:bg-[#032147]/80 transition-colors"><Plus size={11} /></button>
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

// ── Users Manager ─────────────────────────────────────────────────────────────
type TenantUser = { uid: string; email: string; firstName: string; lastName: string; role: "tenant_admin" | "tenant_user"; isActive?: boolean };

function UsersManager({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [resetLoading, setResetLoading] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(db, "users"), where("tenantId", "==", tenantId)),
      snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as TenantUser))));
  }, [tenantId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFeedback(null);
    try {
      const res = await fetch("/api/create-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      await setDoc(doc(db, "users", data.uid), { firstName: form.firstName, lastName: form.lastName, email: form.email, role: "tenant_user", tenantId, tenantName, isActive: true, createdAt: serverTimestamp() });
      setFeedback({ type: "ok", msg: `${form.firstName} ${form.lastName} נוסף/ה בהצלחה` });
      setForm({ firstName: "", lastName: "", email: "", password: "" }); setShowAdd(false);
    } catch (err) { setFeedback({ type: "err", msg: err instanceof Error ? err.message : "שגיאה" }); }
    finally { setBusy(false); }
  }

  async function sendReset(u: TenantUser) {
    setResetLoading(u.uid); setFeedback(null);
    try {
      const res = await fetch("/api/send-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email }) });
      if (!res.ok) throw new Error("שגיאה");
      setFeedback({ type: "ok", msg: `קישור איפוס נשלח אל ${u.email}` });
    } catch { setFeedback({ type: "err", msg: "שגיאה בשליחת המייל" }); }
    finally { setResetLoading(null); }
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={cn("text-xs px-3 py-2 rounded-xl", feedback.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
          {feedback.msg}
        </div>
      )}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-[#f8fafc] border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">עובד חדש</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[11px] text-gray-500 font-medium block mb-1">שם פרטי</label>
              <input required className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="ישראל" /></div>
            <div><label className="text-[11px] text-gray-500 font-medium block mb-1">שם משפחה</label>
              <input required className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
                value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="ישראלי" /></div>
          </div>
          <div><label className="text-[11px] text-gray-500 font-medium block mb-1">אימייל</label>
            <input required type="email" className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" /></div>
          <div><label className="text-[11px] text-gray-500 font-medium block mb-1">סיסמה זמנית</label>
            <input required type="password" minLength={6} className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/25 focus:border-[#209dd7]"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="מינימום 6 תווים" /></div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#032147] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#032147]/80 transition-colors">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} {busy ? "מוסיף..." : "הוסף"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">ביטול</button>
          </div>
        </form>
      )}
      <div className="space-y-1">
        {users.map(u => (
          <div key={u.uid} className={cn("flex items-center gap-3 px-3 py-3 rounded-xl", u.isActive === false ? "opacity-50 bg-gray-50" : "hover:bg-gray-50 transition-colors")}>
            <div className="w-9 h-9 rounded-xl bg-[#032147]/8 bg-[#e8eef4] flex items-center justify-center text-[#032147] font-bold text-xs shrink-0">
              {u.firstName?.[0]}{u.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#032147]">{u.firstName} {u.lastName}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", u.role === "tenant_admin" ? "bg-[#032147]/10 text-[#032147]" : "bg-gray-100 text-gray-500")}>
                  {u.role === "tenant_admin" ? "מנהל" : "משתמש"}
                </span>
                {u.isActive === false && <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full">מושבת</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => sendReset(u)} disabled={resetLoading === u.uid} title="שלח איפוס סיסמה"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-[#209dd7] transition-colors disabled:opacity-40">
                {resetLoading === u.uid ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              </button>
              {u.role !== "tenant_admin" && (
                <button onClick={() => updateDoc(doc(db, "users", u.uid), { isActive: u.isActive !== false ? false : true })}
                  title={u.isActive === false ? "הפעל" : "השבת"}
                  className={cn("p-1.5 rounded-lg transition-colors", u.isActive === false ? "text-gray-300 hover:bg-emerald-50 hover:text-emerald-600" : "text-gray-300 hover:bg-red-50 hover:text-red-500")}>
                  {u.isActive === false ? <UserCheck size={13} /> : <UserX size={13} />}
                </button>
              )}
            </div>
          </div>
        ))}
        {!showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors mt-1">
            <Plus size={12} /> הוסף עובד חדש
          </button>
        )}
      </div>
    </div>
  );
}

// ── Navigation groups ─────────────────────────────────────────────────────────
type SectionId = "manufacturers" | "vehicleTypes" | "fuelTypes" | "statuses" | "insuranceCompanies" | "insuranceTypes" | "users";

const NAV_GROUPS = [
  {
    label: "רכב",
    items: [
      { id: "manufacturers" as SectionId, label: "יצרנים ודגמים", icon: Car },
      { id: "vehicleTypes"  as SectionId, label: "סוגי רכב",      icon: Tag },
      { id: "fuelTypes"     as SectionId, label: "סוגי דלק",      icon: Fuel },
      { id: "statuses"      as SectionId, label: "סטטוסים",       icon: Circle },
    ],
  },
  {
    label: "ביטוח",
    items: [
      { id: "insuranceCompanies" as SectionId, label: "חברות ביטוח", icon: Building2 },
      { id: "insuranceTypes"     as SectionId, label: "סוגי ביטוח",  icon: Shield },
    ],
  },
];

const USERS_ITEM = { id: "users" as SectionId, label: "משתמשים", icon: Users };

// ── Section content ───────────────────────────────────────────────────────────
function SectionContent({ section }: { section: SectionId }) {
  const {
    manufacturers, vehicleTypes, fuelTypes, insuranceCompanies, insuranceTypes,
    addVehicleType, updateVehicleType, deleteVehicleType,
    addFuelType, updateFuelType, deleteFuelType,
    addInsuranceCompany, updateInsuranceCompany, deleteInsuranceCompany,
    addInsuranceType, updateInsuranceType, deleteInsuranceType,
  } = useStore();
  const { profile } = useAuth();

  const sections: Record<SectionId, { title: string; desc: string; content: React.ReactNode }> = {
    manufacturers: {
      title: "יצרנים ודגמים",
      desc: `${manufacturers.length} יצרנים — לחץ על החץ לניהול הדגמים`,
      content: <ManufacturersSection />,
    },
    vehicleTypes: {
      title: "סוגי רכב",
      desc: `${vehicleTypes.length} סוגים מוגדרים`,
      content: <ListManager items={vehicleTypes} onAdd={addVehicleType} onUpdate={updateVehicleType} onDelete={deleteVehicleType} placeholder="הוסף סוג רכב" />,
    },
    fuelTypes: {
      title: "סוגי דלק",
      desc: `${fuelTypes.length} סוגים מוגדרים`,
      content: <ListManager items={fuelTypes} onAdd={addFuelType} onUpdate={updateFuelType} onDelete={deleteFuelType} placeholder="הוסף סוג דלק" />,
    },
    statuses: {
      title: "סטטוסים",
      desc: 'לחץ "תפעולי / לא תפעולי" לקביעת אחוז הזמינות בדשבורד',
      content: <StatusManager />,
    },
    insuranceCompanies: {
      title: "חברות ביטוח",
      desc: `${insuranceCompanies.length} חברות מוגדרות`,
      content: <ListManager items={insuranceCompanies} onAdd={addInsuranceCompany} onUpdate={updateInsuranceCompany} onDelete={deleteInsuranceCompany} placeholder="הוסף חברת ביטוח" />,
    },
    insuranceTypes: {
      title: "סוגי ביטוח",
      desc: "חובה, צד ג׳, מקיף וסוגים נוספים לפי הצורך",
      content: <ListManager items={insuranceTypes} onAdd={addInsuranceType} onUpdate={updateInsuranceType} onDelete={deleteInsuranceType} placeholder="הוסף סוג ביטוח" />,
    },
    users: {
      title: "משתמשי הארגון",
      desc: "ניהול עובדים ושליחת איפוס סיסמה",
      content: profile?.tenantId ? <UsersManager tenantId={profile.tenantId} tenantName={profile.tenantName ?? ""} /> : null,
    },
  };

  const s = sections[section];
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-bold text-[#032147]">{s.title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
      </div>
      {s.content}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>("manufacturers");
  const { profile } = useAuth();
  const isTenantAdmin = profile?.role === "tenant_admin";

  const groups = isTenantAdmin
    ? [...NAV_GROUPS, { label: "צוות", items: [USERS_ITEM] }]
    : NAV_GROUPS;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#032147] flex items-center justify-center shrink-0">
          <Settings size={16} className="text-[#ecad0a]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#032147]">הגדרות</h1>
          <p className="text-xs text-gray-400 mt-0.5">ניהול רשימות הגדרה של הצי</p>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar nav */}
        <aside className="w-48 shrink-0 sticky top-4">
          <nav className="space-y-5">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActive(id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-right",
                        active === id
                          ? "bg-[#032147] text-white shadow-sm"
                          : "text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm"
                      )}>
                      <Icon size={14} className="shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionContent section={active} />
        </div>
      </div>
    </div>
  );
}
