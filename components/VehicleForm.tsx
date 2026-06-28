"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Check, X, Bell, Shield, Trash2 } from "lucide-react";
import type { Vehicle } from "@/types";

// Insurance entry collected before vehicle ID exists
export type PendingInsurance = {
  insuranceTypeId: string;
  insuranceCompanyId: string;
  startDate: string;
  endDate: string;
};

type VehicleFormData = Omit<Vehicle, "id" | "serviceRecordIds" | "accidentIds" | "documentIds" | "secondaryDriverIds">;

const defaultData: VehicleFormData = {
  licensePlate: "",
  manufacturer: "",
  model: "",
  year: new Date().getFullYear(),
  vehicleTypeId: "",
  fuelTypeId: "",
  ownershipType: "company_owned",
  leasingCompanyName: "",
  mainDriverId: "",
  statusId: "",
  mileage: 0,
  licenseExpiry: "",
  alertsEnabled: true,
  notes: "",
};

export function VehicleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Vehicle>;
  onSave: (data: VehicleFormData, insurances: PendingInsurance[]) => void;
  onCancel: () => void;
}) {
  const { vehicleTypes, fuelTypes, vehicleStatuses, drivers, manufacturers, addModelToManufacturer, insuranceTypes, insuranceCompanies } = useStore();
  const [addingModel, setAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  // Insurance state
  const [pendingInsurances, setPendingInsurances] = useState<PendingInsurance[]>([]);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [insForm, setInsForm] = useState<PendingInsurance>({ insuranceTypeId: "", insuranceCompanyId: "", startDate: "", endDate: "" });
  const defaultStatus = vehicleStatuses.find(s => s.isDefault);

  const [form, setForm] = useState<VehicleFormData>({
    ...defaultData,
    statusId: defaultStatus?.id ?? "",
    vehicleTypeId: vehicleTypes[0]?.id ?? "",
    fuelTypeId: fuelTypes[0]?.id ?? "",
    mainDriverId: "",
    ...initial,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});

  function set(k: keyof VehicleFormData, v: string | number | boolean) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.licensePlate.trim()) e.licensePlate = "שדה חובה";
    if (!form.manufacturer.trim()) e.manufacturer = "שדה חובה";
    if (!form.model.trim())        e.model        = "שדה חובה";
    if (!form.vehicleTypeId)       e.vehicleTypeId = "שדה חובה";
    if (!form.fuelTypeId)          e.fuelTypeId    = "שדה חובה";
    if (form.ownershipType === "leasing" && !form.leasingCompanyName?.trim())
      e.leasingCompanyName = "שדה חובה לליסינג";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const data = { ...form };
    if (data.ownershipType === "company_owned") data.leasingCompanyName = "";
    onSave(data, pendingInsurances);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="לוחית רישוי"
          value={form.licensePlate}
          onChange={e => set("licensePlate", e.target.value)}
          error={errors.licensePlate}
          placeholder="12-345-67"
        />
        <Input
          label="שנה"
          type="number"
          value={form.year}
          onChange={e => set("year", Number(e.target.value))}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="יצרן"
          value={form.manufacturer}
          onChange={e => {
            set("manufacturer", e.target.value);
            set("model", "");
            setAddingModel(false);
            setNewModelName("");
          }}
          error={errors.manufacturer}
        >
          <option value="">בחר יצרן</option>
          {manufacturers.map(m => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </Select>

        {/* Model field */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">דגם</label>
          {(() => {
            const mfr = manufacturers.find(m => m.name === form.manufacturer);
            const models = mfr?.models ?? [];

            return (
              <div className="space-y-2">
                {/* Select dropdown – always shown when manufacturer is chosen */}
                {form.manufacturer ? (
                  <select
                    value={form.model}
                    onChange={e => set("model", e.target.value)}
                    disabled={models.length === 0}
                    className={`w-full h-10 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all ${
                      errors.model ? "border-red-400" : "border-gray-200"
                    } ${models.length === 0 ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "text-gray-800"}`}
                  >
                    <option value="">{models.length === 0 ? "אין דגמים — הוסף למטה" : "בחר דגם"}</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <select disabled className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                    <option>בחר יצרן קודם</option>
                  </select>
                )}
                {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}

                {/* Inline add model */}
                {form.manufacturer && !addingModel && (
                  <button
                    type="button"
                    onClick={() => setAddingModel(true)}
                    className="flex items-center gap-1.5 text-xs text-[#209dd7] hover:text-[#1a7fb0] font-medium transition-colors"
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
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const name = newModelName.trim();
                          if (!name || !mfr) return;
                          await addModelToManufacturer(mfr.id, name);
                          set("model", name);
                          setNewModelName("");
                          setAddingModel(false);
                        }
                        if (e.key === "Escape") { setAddingModel(false); setNewModelName(""); }
                      }}
                      placeholder="שם הדגם..."
                      className="flex-1 h-8 px-3 rounded-lg border border-[#209dd7] text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const name = newModelName.trim();
                        if (!name || !mfr) return;
                        await addModelToManufacturer(mfr.id, name);
                        set("model", name);
                        setNewModelName("");
                        setAddingModel(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-[#209dd7] flex items-center justify-center text-white hover:bg-[#1a7fb0] transition-colors shrink-0"
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
            );
          })()}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="סוג רכב"
          value={form.vehicleTypeId}
          onChange={e => set("vehicleTypeId", e.target.value)}
          error={errors.vehicleTypeId}
        >
          <option value="">בחר סוג</option>
          {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
        </Select>
        <Select
          label="סוג דלק"
          value={form.fuelTypeId}
          onChange={e => set("fuelTypeId", e.target.value)}
          error={errors.fuelTypeId}
        >
          <option value="">בחר דלק</option>
          {fuelTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="בעלות"
          value={form.ownershipType}
          onChange={e => set("ownershipType", e.target.value)}
        >
          <option value="company_owned">בעלות החברה</option>
          <option value="leasing">ליסינג</option>
        </Select>
        {form.ownershipType === "leasing" ? (
          <Input
            label="חברת ליסינג"
            value={form.leasingCompanyName ?? ""}
            onChange={e => set("leasingCompanyName", e.target.value)}
            error={errors.leasingCompanyName}
          />
        ) : <div />}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="נהג ראשי"
          value={form.mainDriverId}
          onChange={e => set("mainDriverId", e.target.value)}
          error={errors.mainDriverId}
        >
          <option value="">בחר נהג</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="סטטוס"
          value={form.statusId}
          onChange={e => set("statusId", e.target.value)}
        >
          {vehicleStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input
          label='ק"מ'
          type="number"
          value={form.mileage}
          onChange={e => set("mileage", Number(e.target.value))}
        />
      </div>
      {/* Insurance section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#209dd7]" />
            <span className="text-sm font-medium text-gray-700">ביטוחים</span>
            {pendingInsurances.length > 0 && (
              <span className="text-[10px] bg-[#209dd7]/10 text-[#209dd7] font-bold px-1.5 py-0.5 rounded-full">{pendingInsurances.length}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowInsuranceForm(v => !v)}
            className="flex items-center gap-1 text-xs text-[#209dd7] hover:text-[#1a7fb0] font-medium transition-colors"
          >
            <Plus size={12} /> הוסף ביטוח
          </button>
        </div>

        {/* Pending insurances list */}
        {pendingInsurances.map((ins, i) => {
          const insType = insuranceTypes.find(t => t.id === ins.insuranceTypeId);
          const insCompany = insuranceCompanies.find(c => c.id === ins.insuranceCompanyId);
          return (
            <div key={i} className="flex items-center gap-2 bg-[#f8fafc] border border-gray-100 rounded-xl px-3 py-2">
              <Shield size={12} className="text-[#209dd7] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-[#032147]">{insType?.name ?? "—"}</span>
                {insCompany && <span className="text-xs text-gray-400 mr-1"> · {insCompany.name}</span>}
                <span className="text-xs text-gray-400 mr-1"> · {ins.startDate} – {ins.endDate}</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingInsurances(list => list.filter((_, j) => j !== i))}
                className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}

        {/* Inline insurance form */}
        {showInsuranceForm && (
          <div className="border border-[#209dd7]/30 bg-[#209dd7]/5 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500">סוג ביטוח</label>
                <select
                  className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 bg-white"
                  value={insForm.insuranceTypeId}
                  onChange={e => setInsForm(f => ({ ...f, insuranceTypeId: e.target.value }))}
                >
                  <option value="">בחר סוג...</option>
                  {insuranceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500">חברת ביטוח</label>
                <select
                  className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 bg-white"
                  value={insForm.insuranceCompanyId}
                  onChange={e => setInsForm(f => ({ ...f, insuranceCompanyId: e.target.value }))}
                >
                  <option value="">בחר חברה...</option>
                  {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500">תאריך התחלה</label>
                <input type="date" className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 bg-white"
                  value={insForm.startDate} onChange={e => setInsForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-500">תאריך פקיעה</label>
                <input type="date" className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 bg-white"
                  value={insForm.endDate} onChange={e => setInsForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!insForm.insuranceTypeId || !insForm.startDate || !insForm.endDate}
                onClick={() => {
                  setPendingInsurances(list => [...list, { ...insForm }]);
                  setInsForm({ insuranceTypeId: "", insuranceCompanyId: "", startDate: "", endDate: "" });
                  setShowInsuranceForm(false);
                }}
                className="h-7 px-3 rounded-lg bg-[#209dd7] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#1a7fb0] transition-colors"
              >
                הוסף
              </button>
              <button
                type="button"
                onClick={() => { setShowInsuranceForm(false); setInsForm({ insuranceTypeId: "", insuranceCompanyId: "", startDate: "", endDate: "" }); }}
                className="h-7 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {/* License expiry + alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="תאריך טסט רישוי"
          type="date"
          value={form.licenseExpiry ?? ""}
          onChange={e => set("licenseExpiry", e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">התראות פקיעה</label>
          <button
            type="button"
            onClick={() => set("alertsEnabled", !form.alertsEnabled)}
            className={`flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-all ${
              form.alertsEnabled
                ? "border-[#209dd7] bg-[#209dd7]/5 text-[#209dd7]"
                : "border-gray-200 text-gray-400 hover:border-gray-300"
            }`}
          >
            <Bell size={14} />
            {form.alertsEnabled ? "התראות פעילות" : "התראות כבויות"}
          </button>
        </div>
      </div>

      {/* Free-text notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">הערות / מלל חופשי</label>
        <textarea
          value={form.notes ?? ""}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          placeholder="לדוגמה: קוד כניסה לרכב, מיקום מפתח, הערות תחזוקה או כל מידע נוסף..."
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 focus:border-[#209dd7] transition-all resize-y"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">ביטול</Button>
        <Button type="submit">שמור רכב</Button>
      </div>
    </form>
  );
}
