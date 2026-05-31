"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Check, X } from "lucide-react";
import type { Vehicle } from "@/types";

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
};

export function VehicleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Vehicle>;
  onSave: (data: VehicleFormData) => void;
  onCancel: () => void;
}) {
  const { vehicleTypes, fuelTypes, vehicleStatuses, drivers, manufacturers, addModelToManufacturer } = useStore();
  const [addingModel, setAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");
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

  function set(k: keyof VehicleFormData, v: string | number) {
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
    const data = { ...form, secondaryDriverIds: [] };
    if (data.ownershipType === "company_owned") data.leasingCompanyName = "";
    onSave(data);
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
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">ביטול</Button>
        <Button type="submit">שמור רכב</Button>
      </div>
    </form>
  );
}
