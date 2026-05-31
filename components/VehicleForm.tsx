"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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
  const { vehicleTypes, fuelTypes, vehicleStatuses, drivers, manufacturers } = useStore();
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
          onChange={e => set("manufacturer", e.target.value)}
          error={errors.manufacturer}
        >
          <option value="">בחר יצרן</option>
          {manufacturers.map(m => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </Select>
        {(() => {
          const mfr = manufacturers.find(m => m.name === form.manufacturer);
          const models = mfr?.models ?? [];
          return models.length > 0 ? (
            <Select
              label="דגם"
              value={form.model}
              onChange={e => set("model", e.target.value)}
              error={errors.model}
            >
              <option value="">בחר דגם</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          ) : (
            <Input
              label="דגם"
              value={form.model}
              onChange={e => set("model", e.target.value)}
              error={errors.model}
              placeholder="הכנס דגם ידנית"
            />
          );
        })()}
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
