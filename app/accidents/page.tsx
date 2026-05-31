"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit, Search, MapPin, FileText } from "lucide-react";
import type { AccidentCard, AccidentStatus } from "@/types";

const STATUSES: { value: AccidentStatus; label: string }[] = [
  { value: "new_report",        label: "דיווח חדש" },
  { value: "under_review",      label: "בבדיקה" },
  { value: "sent_to_insurance", label: "הועבר לביטוח" },
  { value: "in_repair",         label: "בתיקון" },
  { value: "closed",            label: "סגור" },
];

function AccidentForm({ initial, onSave, onCancel }: {
  initial?: Partial<AccidentCard>;
  onSave: (a: Omit<AccidentCard, "id" | "documentIds">) => void;
  onCancel: () => void;
}) {
  const { drivers, vehicles } = useStore();
  const [form, setForm] = useState({
    driverId:             initial?.driverId             ?? "",
    vehicleId:            initial?.vehicleId            ?? "",
    accidentDate:         initial?.accidentDate         ?? new Date().toISOString().slice(0, 10),
    location:             initial?.location             ?? "",
    shortDescription:     initial?.shortDescription     ?? "",
    damageDescription:    initial?.damageDescription    ?? "",
    hasThirdParty:        initial?.hasThirdParty        ?? false,
    thirdPartyDetails:    initial?.thirdPartyDetails    ?? "",
    policeReportNumber:   initial?.policeReportNumber   ?? "",
    insuranceClaimNumber: initial?.insuranceClaimNumber ?? "",
    status:               (initial?.status              ?? "new_report") as AccidentStatus,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  function set(k: keyof typeof form, v: string | boolean) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: typeof errors = {};
    if (!form.driverId)              err.driverId         = "שדה חובה";
    if (!form.location.trim())       err.location         = "שדה חובה";
    if (!form.shortDescription.trim()) err.shortDescription = "שדה חובה";
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    onSave({
      driverId:             form.driverId,
      vehicleId:            form.vehicleId || "",
      accidentDate:         form.accidentDate,
      location:             form.location,
      shortDescription:     form.shortDescription,
      damageDescription:    form.damageDescription,
      hasThirdParty:        form.hasThirdParty,
      thirdPartyDetails:    form.hasThirdParty ? form.thirdPartyDetails : "",
      policeReportNumber:   form.policeReportNumber || "",
      insuranceClaimNumber: form.insuranceClaimNumber || "",
      status:               form.status,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="נהג" value={form.driverId} onChange={e => set("driverId", e.target.value)} error={errors.driverId}>
          <option value="">בחר נהג...</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </Select>
        <Select label="רכב (אופציונלי)" value={form.vehicleId} onChange={e => set("vehicleId", e.target.value)}>
          <option value="">ללא רכב</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.manufacturer} {v.model} ({v.licensePlate})</option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="תאריך תאונה" type="date" value={form.accidentDate} onChange={e => set("accidentDate", e.target.value)} />
        <Input label="מיקום" value={form.location} onChange={e => set("location", e.target.value)} error={errors.location} placeholder="כביש, עיר..." />
      </div>
      <Input label="תיאור קצר" value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} error={errors.shortDescription} placeholder="תאר בקצרה את האירוע" />
      <Textarea label="תיאור נזק" value={form.damageDescription} onChange={e => set("damageDescription", e.target.value)} rows={2} placeholder="פרט את הנזקים שנגרמו..." />
      <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
        <input
          type="checkbox"
          id="thirdParty"
          checked={form.hasThirdParty}
          onChange={e => set("hasThirdParty", e.target.checked)}
          className="w-4 h-4 rounded accent-[#753991]"
        />
        <label htmlFor="thirdParty" className="text-sm text-gray-700 font-medium cursor-pointer">
          מעורב צד שלישי
        </label>
      </div>
      {form.hasThirdParty && (
        <Textarea
          label="פרטי צד שלישי"
          value={form.thirdPartyDetails}
          onChange={e => set("thirdPartyDetails", e.target.value)}
          rows={2}
          placeholder="שם, רכב, ביטוח..."
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="מספר דוח משטרה" value={form.policeReportNumber} onChange={e => set("policeReportNumber", e.target.value)} placeholder="אופציונלי" />
        <Input label="מספר תביעת ביטוח" value={form.insuranceClaimNumber} onChange={e => set("insuranceClaimNumber", e.target.value)} placeholder="אופציונלי" />
      </div>
      <Select label="סטטוס" value={form.status} onChange={e => set("status", e.target.value as AccidentStatus)}>
        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">ביטול</Button>
        <Button type="submit">שמור דוח</Button>
      </div>
    </form>
  );
}

const badgeVariant = (s: string): "danger" | "warning" | "blue" | "gray" => ({
  new_report: "danger", under_review: "warning",
  sent_to_insurance: "blue", in_repair: "warning", closed: "gray",
} as Record<string, "danger" | "warning" | "blue" | "gray">)[s] ?? "gray";

export default function AccidentsPage() {
  const { accidentCards, drivers, vehicles, addAccidentCard, updateAccidentCard, deleteAccidentCard } = useStore();
  const [search, setSearch]             = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd]           = useState(false);
  const [editTarget, setEditTarget]     = useState<AccidentCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = accidentCards.filter(a => {
    if (driverFilter && a.driverId !== driverFilter) return false;
    if (statusFilter && a.status !== statusFilter)   return false;
    const driver  = drivers.find(d => d.id === a.driverId);
    const vehicle = vehicles.find(v => v.id === a.vehicleId);
    const q = search.toLowerCase();
    return [a.shortDescription, a.location, driver?.fullName, vehicle?.licensePlate]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  }).sort((a, b) => b.accidentDate.localeCompare(a.accidentDate));

  const openCount = accidentCards.filter(a => a.status !== "closed").length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">דוחות תאונה</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {accidentCards.length} דוחות · {openCount} פתוחים
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> הוסף דוח
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all"
            placeholder="חיפוש..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} className="w-44">
          <option value="">כל הנהגים</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-44">
          <option value="">כל הסטטוסים</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(a => {
          const driver      = drivers.find(d => d.id === a.driverId);
          const vehicle     = vehicles.find(v => v.id === a.vehicleId);
          const statusLabel = STATUSES.find(s => s.value === a.status)?.label ?? a.status;
          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-start justify-between gap-4 group hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-semibold text-[#032147]">{a.shortDescription}</span>
                  <Badge variant={badgeVariant(a.status)} dot>{statusLabel}</Badge>
                  {a.hasThirdParty && (
                    <Badge variant="purple">צד שלישי</Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="font-medium text-gray-700">{driver?.fullName ?? "נהג לא ידוע"}</span>
                  {vehicle && (
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                      {vehicle.licensePlate}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {a.location}
                  </span>
                  <span>{formatDate(a.accidentDate)}</span>
                </div>

                {a.damageDescription && (
                  <p className="text-xs text-gray-500">{a.damageDescription}</p>
                )}

                {(a.policeReportNumber || a.insuranceClaimNumber) && (
                  <div className="flex gap-4 text-xs text-gray-400">
                    {a.policeReportNumber && (
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        משטרה: {a.policeReportNumber}
                      </span>
                    )}
                    {a.insuranceClaimNumber && (
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        ביטוח: {a.insuranceClaimNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditTarget(a)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(a.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-12 text-center text-gray-400 text-sm">
            לא נמצאו דוחות תאונה
          </div>
        )}
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="הוספת דוח תאונה" size="lg">
        <AccidentForm
          onSave={a => { addAccidentCard({ ...a, documentIds: [] }); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="עריכת דוח תאונה" size="lg">
        {editTarget && (
          <AccidentForm
            initial={editTarget}
            onSave={a => { updateAccidentCard(editTarget.id, a); setEditTarget(null); }}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteAccidentCard(deleteTarget); }}
        title="מחיקת דוח תאונה"
        description="דוח התאונה יימחק לצמיתות, כולל כל המסמכים הקשורים. פעולה זו אינה ניתנת לביטול."
        confirmLabel="מחק דוח"
        danger
      />
    </div>
  );
}
