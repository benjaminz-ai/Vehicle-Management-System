"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Repeat, Plus, CheckCircle2, ArrowLeftRight, X, Calendar, AlertCircle, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { formatDate, daysBetween, COURTESY_REASON_LABELS } from "@/lib/utils";
import type { Vehicle, CourtesyReason } from "@/types";

/**
 * Panel rendered inside the main vehicle's detail page.
 * Shows the active courtesy (if any) prominently + courtesy history.
 */
export function CourtesyPanel({ vehicle }: { vehicle: Vehicle }) {
  const { vehicles, addCourtesyVehicle, markCourtesyReturned, manufacturers, vehicleTypes, fuelTypes, vehicleStatuses, addModelToManufacturer } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState<string | null>(null);

  const courtesies = useMemo(
    () => vehicles.filter(v => v.isCourtesy && v.parentVehicleId === vehicle.id)
                  .sort((a, b) => (b.courtesyStartDate ?? "").localeCompare(a.courtesyStartDate ?? "")),
    [vehicles, vehicle.id]
  );

  const active = courtesies.find(c => !c.courtesyActualReturnDate);
  const history = courtesies.filter(c => c.courtesyActualReturnDate);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-[#032147]">רכב חלופי {courtesies.length > 0 && `(${courtesies.length})`}</h2>
        </div>
        {!active && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> הוסף חלופי
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {active ? (
          <ActiveCourtesyCard courtesy={active} onMarkReturned={() => setConfirmReturn(active.id)} />
        ) : (
          <p className="text-sm text-gray-400">אין רכב חלופי פעיל כעת. לחצו "הוסף חלופי" כשהרכב נדרש להחלפה זמנית.</p>
        )}

        {history.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">היסטוריית חלופיים</h3>
            <div className="space-y-2">
              {history.map(c => (
                <HistoryRow key={c.id} courtesy={c} />
              ))}
            </div>
          </div>
        )}
      </CardBody>

      {showAdd && (
        <AddCourtesyDialog
          parentVehicleId={vehicle.id}
          onClose={() => setShowAdd(false)}
          onSubmit={async data => { await addCourtesyVehicle(vehicle.id, data); setShowAdd(false); }}
          manufacturers={manufacturers}
          vehicleTypes={vehicleTypes}
          fuelTypes={fuelTypes}
          vehicleStatuses={vehicleStatuses}
          addModelToManufacturer={addModelToManufacturer}
        />
      )}

      {confirmReturn && (
        <Dialog open onClose={() => setConfirmReturn(null)} title="סמן כהוחזר ללסינג">
          <p className="text-sm text-gray-600 mb-4">
            הרכב יסומן כהוחזר היום. הוא יישאר במערכת לצורך מעקב היסטורי, אך לא ייספר עוד כרכב פעיל.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmReturn(null)}>ביטול</Button>
            <Button onClick={async () => { await markCourtesyReturned(confirmReturn); setConfirmReturn(null); }}>
              <CheckCircle2 size={14} /> אישור החזרה
            </Button>
          </div>
        </Dialog>
      )}
    </Card>
  );
}

function ActiveCourtesyCard({ courtesy, onMarkReturned }: { courtesy: Vehicle; onMarkReturned: () => void }) {
  const daysActive = courtesy.courtesyStartDate
    ? daysBetween(courtesy.courtesyStartDate, new Date().toISOString().slice(0, 10))
    : 0;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Repeat size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold tracking-wide">
                פעיל
              </span>
              <Link href={`/vehicles/${courtesy.id}`} className="text-sm font-bold text-[#032147] hover:text-amber-600 truncate">
                {courtesy.manufacturer} {courtesy.model}
              </Link>
              <span className="text-xs text-gray-500">· {courtesy.licensePlate}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-gray-400" />
                נכנס: <span className="font-medium text-gray-800">{formatDate(courtesy.courtesyStartDate ?? "")}</span>
              </div>
              {courtesy.courtesyExpectedReturnDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-gray-400" />
                  צפוי להחזרה: <span className="font-medium text-gray-800">{formatDate(courtesy.courtesyExpectedReturnDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <AlertCircle size={11} className="text-gray-400" />
                סיבה: <span className="font-medium text-gray-800">{COURTESY_REASON_LABELS[courtesy.courtesyReason ?? "other"]}</span>
              </div>
            </div>
            <div className="mt-1 text-[11px] text-amber-700">פעיל כבר {daysActive} {daysActive === 1 ? "יום" : "ימים"}</div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/vehicles/${courtesy.id}`}>
            <Button variant="outline" size="sm"><ArrowLeftRight size={13} /> פתח כרטיס</Button>
          </Link>
          <Button size="sm" onClick={onMarkReturned}><CheckCircle2 size={13} /> סמן כהוחזר</Button>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ courtesy }: { courtesy: Vehicle }) {
  const days = daysBetween(courtesy.courtesyStartDate ?? "", courtesy.courtesyActualReturnDate ?? "");
  return (
    <Link href={`/vehicles/${courtesy.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Repeat size={13} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800 group-hover:text-amber-600 truncate">
          {courtesy.manufacturer} {courtesy.model} <span className="text-gray-400">· {courtesy.licensePlate}</span>
        </div>
        <div className="text-[11px] text-gray-500">
          {formatDate(courtesy.courtesyStartDate ?? "")} – {formatDate(courtesy.courtesyActualReturnDate ?? "")} · {days} {days === 1 ? "יום" : "ימים"} · {COURTESY_REASON_LABELS[courtesy.courtesyReason ?? "other"]}
        </div>
      </div>
    </Link>
  );
}

type AddCourtesyData = Parameters<ReturnType<typeof useStore>["addCourtesyVehicle"]>[1];

function AddCourtesyDialog({
  parentVehicleId,
  onClose,
  onSubmit,
  manufacturers,
  vehicleTypes,
  fuelTypes,
  vehicleStatuses,
  addModelToManufacturer,
}: {
  parentVehicleId: string;
  onClose: () => void;
  onSubmit: (data: AddCourtesyData) => Promise<void>;
  manufacturers: { id: string; name: string; models?: string[] }[];
  vehicleTypes: { id: string; name: string }[];
  fuelTypes: { id: string; name: string }[];
  vehicleStatuses: { id: string; name: string; isDefault: boolean }[];
  addModelToManufacturer: (manufacturerId: string, model: string) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultStatus = vehicleStatuses.find(s => s.isDefault);
  const [form, setForm] = useState({
    licensePlate: "",
    manufacturer: manufacturers[0]?.name ?? "",
    model: "",
    year: new Date().getFullYear(),
    vehicleTypeId: vehicleTypes[0]?.id ?? "",
    fuelTypeId: fuelTypes[0]?.id ?? "",
    mileage: 0,
    statusId: defaultStatus?.id ?? "",
    courtesyStartDate: today,
    courtesyExpectedReturnDate: "",
    courtesyReason: "service" as CourtesyReason,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingModel, setAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  const manufacturerObj = manufacturers.find(m => m.name === form.manufacturer);
  const modelOptions = manufacturerObj?.models ?? [];

  // Suppress unused (parentVehicleId is passed for clarity; logic uses it via onSubmit)
  void parentVehicleId;

  async function handleAddNewModel() {
    const name = newModelName.trim();
    if (!name || !manufacturerObj) return;
    await addModelToManufacturer(manufacturerObj.id, name);
    setForm(f => ({ ...f, model: name }));
    setNewModelName("");
    setAddingModel(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.licensePlate.trim() || !form.manufacturer.trim() || !form.model.trim() || !form.courtesyStartDate) {
      setError("לוחית, יצרן, דגם ותאריך כניסה הם שדות חובה");
      return;
    }
    // Validate date logic: expected return must be on or after entry date
    if (form.courtesyExpectedReturnDate && form.courtesyExpectedReturnDate < form.courtesyStartDate) {
      setError("תאריך החזרה צפוי לא יכול להיות לפני תאריך הכניסה");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        licensePlate: form.licensePlate.trim(),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        year: form.year,
        vehicleTypeId: form.vehicleTypeId,
        fuelTypeId: form.fuelTypeId,
        mileage: form.mileage,
        statusId: form.statusId,
        ownershipType: "leasing", // overridden in store from parent
        leasingCompanyName: "",   // overridden in store from parent
        alertsEnabled: false,
        notes: form.notes.trim() || undefined,
        courtesyStartDate: form.courtesyStartDate,
        courtesyExpectedReturnDate: form.courtesyExpectedReturnDate || undefined,
        courtesyReason: form.courtesyReason,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת הרכב החלופי");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="הוספת רכב חלופי" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
          <Repeat size={13} className="shrink-0 mt-0.5" />
          <span>הרכב יקושר לרכב הראשי. הנהגים וחברת הליסינג יורשו אוטומטית.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="לוחית רישוי *"
            value={form.licensePlate}
            onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))}
            placeholder="12-345-67"
          />
          <Input
            label="שנת ייצור"
            type="number"
            value={form.year}
            onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) || new Date().getFullYear() }))}
          />
          <Select
            label="יצרן *"
            value={form.manufacturer}
            onChange={e => { setForm(f => ({ ...f, manufacturer: e.target.value, model: "" })); setAddingModel(false); }}
          >
            {manufacturers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </Select>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">דגם *</label>
            <select
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              disabled={modelOptions.length === 0}
              className={`w-full h-10 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all border-gray-200 ${modelOptions.length === 0 ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "text-gray-800"}`}
            >
              <option value="">{modelOptions.length === 0 ? "אין דגמים — הוסף למטה" : "בחר דגם..."}</option>
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {form.manufacturer && !addingModel && (
              <button
                type="button"
                onClick={() => setAddingModel(true)}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                <Plus size={13} /> הוסף דגם חדש ל{form.manufacturer}
              </button>
            )}

            {addingModel && (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newModelName}
                  onChange={e => setNewModelName(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter") { e.preventDefault(); await handleAddNewModel(); }
                    if (e.key === "Escape") { setAddingModel(false); setNewModelName(""); }
                  }}
                  placeholder="שם הדגם..."
                  className="flex-1 h-8 px-3 rounded-lg border border-amber-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddNewModel}
                  className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white hover:bg-amber-600 transition-colors shrink-0"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingModel(false); setNewModelName(""); }}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <Select
            label="סוג רכב"
            value={form.vehicleTypeId}
            onChange={e => setForm(f => ({ ...f, vehicleTypeId: e.target.value }))}
          >
            {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select
            label="סוג דלק"
            value={form.fuelTypeId}
            onChange={e => setForm(f => ({ ...f, fuelTypeId: e.target.value }))}
          >
            {fuelTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input
            label="ק״מ נוכחי"
            type="number"
            value={form.mileage}
            onChange={e => setForm(f => ({ ...f, mileage: Number(e.target.value) || 0 }))}
          />
          <Select
            label="סטטוס"
            value={form.statusId}
            onChange={e => setForm(f => ({ ...f, statusId: e.target.value }))}
          >
            {vehicleStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
            <Repeat size={12} /> פרטי תקופת החלפה
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="תאריך כניסה *"
              type="date"
              value={form.courtesyStartDate}
              onChange={e => setForm(f => ({ ...f, courtesyStartDate: e.target.value }))}
            />
            <Input
              label="תאריך החזרה צפוי"
              type="date"
              value={form.courtesyExpectedReturnDate}
              min={form.courtesyStartDate}
              onChange={e => setForm(f => ({ ...f, courtesyExpectedReturnDate: e.target.value }))}
            />
            <Select
              label="סיבה"
              value={form.courtesyReason}
              onChange={e => setForm(f => ({ ...f, courtesyReason: e.target.value as CourtesyReason }))}
            >
              <option value="service">טיפול</option>
              <option value="accident">תאונה</option>
              <option value="license">טסט / רישוי</option>
              <option value="other">אחר</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">הערות</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="הערות נוספות (אופציונלי)..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all resize-y"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}><X size={14} /> ביטול</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "שומר..." : <><Plus size={14} /> הוסף רכב חלופי</>}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Visual badge for use in lists/cards/headers. Compact.
 */
export function CourtesyBadge({ variant }: { variant: "is_courtesy" | "has_courtesy" }) {
  const label = variant === "is_courtesy" ? "חלופי" : "בחלופי";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold border border-amber-200">
      <Repeat size={9} />
      {label}
    </span>
  );
}
