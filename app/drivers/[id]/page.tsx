"use client";
import { use, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, AlertTriangle, FileText, Car, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Driver } from "@/types";

function DriverEditForm({ driver, onSave, onCancel }: { driver: Driver; onSave: (d: Partial<Driver>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    firstName: driver.firstName,
    lastName: driver.lastName,
    uniqueId: driver.uniqueId,
    dateOfBirth: driver.dateOfBirth,
    driverLicenseNumber: driver.driverLicenseNumber,
  });
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...form, fullName: `${form.firstName} ${form.lastName}` });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="First Name" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
        <Input label="Last Name" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
      </div>
      <Input label="Unique ID Number" value={form.uniqueId} onChange={e => set("uniqueId", e.target.value)} />
      <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
      <Input label="Driver License Number" value={form.driverLicenseNumber} onChange={e => set("driverLicenseNumber", e.target.value)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { drivers, vehicles, accidentCards, documents, vehicleStatuses, updateDriver, deleteDriver, deleteAccidentCard, deleteDocument, addDocument } = useStore();

  const driver = drivers.find(d => d.id === id);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteDriverConfirm, setDeleteDriverConfirm] = useState(false);
  const [deleteAcc, setDeleteAcc] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<string | null>(null);

  if (!driver) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-500">Driver not found.</p>
      <Link href="/drivers"><Button variant="outline">Back to Drivers</Button></Link>
    </div>
  );

  const assignedVehicles = vehicles.filter(v => v.mainDriverId === id || v.secondaryDriverIds.includes(id));
  const driverAccidents = accidentCards.filter(a => a.driverId === id).sort((a, b) => b.accidentDate.localeCompare(a.accidentDate));
  const driverDocs = documents.filter(d => d.relatedEntityType === "driver" && d.relatedEntityId === id);

  const accidentBadge = (s: string) => {
    const m: Record<string, { label: string; variant: "danger" | "warning" | "blue" | "gray" }> = {
      new_report: { label: "New Report", variant: "danger" },
      under_review: { label: "Under Review", variant: "warning" },
      sent_to_insurance: { label: "Sent to Insurance", variant: "blue" },
      in_repair: { label: "In Repair", variant: "warning" },
      closed: { label: "Closed", variant: "gray" },
    };
    return m[s] ?? { label: s, variant: "gray" };
  };

  const affectedVehicles = vehicles.filter(v => v.mainDriverId === id || v.secondaryDriverIds.includes(id));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/drivers">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft size={18} /></button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#032147]">{driver.fullName}</h1>
          <p className="text-sm text-[#888888]">ID: {driver.uniqueId} · License: {driver.driverLicenseNumber}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Edit size={14} /> Edit</Button>
        <Button variant="danger" size="sm" onClick={() => setDeleteDriverConfirm(true)}><Trash2 size={14} /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-1">
          <CardHeader><h2 className="text-sm font-semibold text-[#032147]">Driver Details</h2></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: "Full Name", value: driver.fullName },
              { label: "ID Number", value: driver.uniqueId },
              { label: "Date of Birth", value: formatDate(driver.dateOfBirth) },
              { label: "License Number", value: driver.driverLicenseNumber },
              { label: "Assigned Vehicles", value: String(assignedVehicles.length) },
              { label: "Accident Cards", value: String(driver.accidentIds.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-sm font-medium text-gray-800 mt-0.5">{value}</div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Car size={15} className="text-[#209dd7]" />
              <h2 className="text-sm font-semibold text-[#032147]">Assigned Vehicles ({assignedVehicles.length})</h2>
            </div>
          </CardHeader>
          <div className="divide-y divide-gray-50">
            {assignedVehicles.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No vehicles assigned.</div>}
            {assignedVehicles.map(v => {
              const status = vehicleStatuses.find(s => s.id === v.statusId);
              return (
                <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{v.manufacturer} {v.model}</div>
                    <div className="text-xs text-gray-400">{v.licensePlate} · {v.year}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status && <div className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: status.color + "20", color: status.color }}>{status.name}</div>}
                    <Link href={`/vehicles/${v.id}`} className="text-xs text-[#209dd7] hover:underline">View</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Accidents */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" />
            <h2 className="text-sm font-semibold text-[#032147]">Accident Cards ({driverAccidents.length})</h2>
          </div>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {driverAccidents.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No accident records.</div>}
          {driverAccidents.map(a => {
            const vehicle = vehicles.find(v => v.id === a.vehicleId);
            const { label, variant } = accidentBadge(a.status);
            return (
              <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">{a.shortDescription}</div>
                  <div className="text-xs text-gray-500">{formatDate(a.accidentDate)} · {a.location}</div>
                  {vehicle && <div className="text-xs text-gray-400">{vehicle.manufacturer} {vehicle.model} ({vehicle.licensePlate})</div>}
                  <div className="text-xs text-gray-500 mt-1">{a.damageDescription}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={variant}>{label}</Badge>
                  <button onClick={() => setDeleteAcc(a.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-purple-500" />
            <h2 className="text-sm font-semibold text-[#032147]">Documents ({driverDocs.length})</h2>
          </div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700">
              <Upload size={14} /> Upload
            </span>
            <input type="file" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              addDocument({ name: file.name.replace(/\.[^.]+$/, ""), type: "driver_license_copy", relatedEntityType: "driver", relatedEntityId: id, fileName: file.name });
              e.target.value = "";
            }} />
          </label>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {driverDocs.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No documents attached.</div>}
          {driverDocs.map(doc => (
            <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800">{doc.name}</div>
                <div className="text-xs text-gray-400">{doc.fileName} · {formatDate(doc.uploadedAt)}</div>
              </div>
              <button onClick={() => setDeleteDoc(doc.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit Driver">
        <DriverEditForm driver={driver} onSave={d => { updateDriver(id, d); setShowEdit(false); }} onCancel={() => setShowEdit(false)} />
      </Dialog>

      <ConfirmDialog open={deleteDriverConfirm} onClose={() => setDeleteDriverConfirm(false)}
        onConfirm={() => { deleteDriver(id); router.push("/drivers"); }}
        title="Delete Driver"
        description={`Delete ${driver.fullName}?${affectedVehicles.length > 0 ? ` Vehicles affected: ${affectedVehicles.map(v => v.licensePlate).join(", ")}.` : ""} This cannot be undone.`}
        confirmLabel="Delete" danger />

      <ConfirmDialog open={!!deleteAcc} onClose={() => setDeleteAcc(null)}
        onConfirm={() => { if (deleteAcc) deleteAccidentCard(deleteAcc); }}
        title="Delete Accident Card" description="This accident card will be permanently deleted." confirmLabel="Delete" danger />

      <ConfirmDialog open={!!deleteDoc} onClose={() => setDeleteDoc(null)}
        onConfirm={() => { if (deleteDoc) deleteDocument(deleteDoc); }}
        title="Remove Document" description="This document will be removed." confirmLabel="Remove" danger />
    </div>
  );
}
