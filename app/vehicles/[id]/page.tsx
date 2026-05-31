"use client";
import { use, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Edit, Wrench, AlertTriangle, FileText, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Vehicle } from "@/types";

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const {
    vehicles, drivers, serviceRecords, accidentCards, documents,
    vehicleStatuses, vehicleTypes, fuelTypes,
    updateVehicle, deleteVehicle, deleteServiceRecord, deleteAccidentCard, deleteDocument, addDocument,
  } = useStore();

  const vehicle = vehicles.find(v => v.id === id);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteVehicleConfirm, setDeleteVehicleConfirm] = useState(false);
  const [deleteSr, setDeleteSr] = useState<string | null>(null);
  const [deleteAcc, setDeleteAcc] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<string | null>(null);

  if (!vehicle) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-500">Vehicle not found.</p>
      <Link href="/vehicles"><Button variant="outline">Back to Vehicles</Button></Link>
    </div>
  );

  const mainDriver = drivers.find(d => d.id === vehicle.mainDriverId);
  const secondDriver = vehicle.secondaryDriverIds?.[0] ? drivers.find(d => d.id === vehicle.secondaryDriverIds[0]) : null;
  const status = vehicleStatuses.find(s => s.id === vehicle.statusId);
  const vtype = vehicleTypes.find(t => t.id === vehicle.vehicleTypeId);
  const ftype = fuelTypes.find(f => f.id === vehicle.fuelTypeId);
  const vServiceRecords = serviceRecords.filter(sr => sr.vehicleId === id).sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
  const vAccidents = accidentCards.filter(a => a.vehicleId === id).sort((a, b) => b.accidentDate.localeCompare(a.accidentDate));
  const vDocuments = documents.filter(d => d.relatedEntityId === id && d.relatedEntityType === "vehicle");

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

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vehicles">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft size={18} /></button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#032147]">{vehicle.manufacturer} {vehicle.model}</h1>
          <p className="text-sm text-[#888888]">{vehicle.licensePlate} · {vehicle.year}</p>
        </div>
        <div className="flex items-center gap-2">
          {status && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: status.color + "20", color: status.color }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.name}
          </div>}
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Edit size={14} /> Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteVehicleConfirm(true)}><Trash2 size={14} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Details */}
        <Card className="md:col-span-2">
          <CardHeader><h2 className="text-sm font-semibold text-[#032147]">Vehicle Details</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: "Manufacturer", value: vehicle.manufacturer },
                { label: "Model", value: vehicle.model },
                { label: "Year", value: String(vehicle.year) },
                { label: "License Plate", value: vehicle.licensePlate },
                { label: "Vehicle Type", value: vtype?.name },
                { label: "Fuel Type", value: ftype?.name },
                { label: "Mileage", value: `${vehicle.mileage.toLocaleString()} km` },
                { label: "Ownership", value: vehicle.ownershipType === "company_owned" ? "Company Owned" : "Leasing" },
                ...(vehicle.leasingCompanyName ? [{ label: "Leasing Company", value: vehicle.leasingCompanyName }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-sm font-medium text-gray-800 mt-0.5">{value ?? "-"}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Drivers */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-[#032147]">Assigned Drivers</h2></CardHeader>
          <CardBody className="space-y-3">
            {[mainDriver, secondDriver].filter(Boolean).map((d, i) => d && (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#032147]/10 flex items-center justify-center text-[#032147] font-bold text-sm">
                  {d.firstName[0]}{d.lastName[0]}
                </div>
                <div>
                  <Link href={`/drivers/${d.id}`} className="text-sm font-medium text-[#032147] hover:text-[#209dd7]">{d.fullName}</Link>
                  <div className="text-xs text-gray-400">{i === 0 ? "Main Driver" : "Secondary Driver"}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Service Records */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-[#209dd7]" />
            <h2 className="text-sm font-semibold text-[#032147]">Service History ({vServiceRecords.length})</h2>
          </div>
          <Link href={`/services?vehicleId=${id}`}>
            <Button variant="outline" size="sm">Add Service</Button>
          </Link>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {vServiceRecords.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No service records.</div>}
          {vServiceRecords.map(sr => (
            <div key={sr.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-800">{sr.serviceType}</div>
                <div className="text-xs text-gray-500">{sr.providerName} · {formatDate(sr.serviceDate)} · {sr.mileage.toLocaleString()} km</div>
                <div className="text-xs text-gray-400 mt-0.5">{sr.description}</div>
                {sr.nextRecommendedServiceDate && (
                  <div className="text-xs text-[#209dd7] mt-0.5">Next: {formatDate(sr.nextRecommendedServiceDate)}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#032147]">{formatCurrency(sr.cost)}</span>
                <button onClick={() => setDeleteSr(sr.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Accidents */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-[#032147]">Accident Cards ({vAccidents.length})</h2>
          </div>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {vAccidents.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No accident records.</div>}
          {vAccidents.map(a => {
            const driver = drivers.find(d => d.id === a.driverId);
            const { label, variant } = accidentBadge(a.status);
            return (
              <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">{a.shortDescription}</div>
                  <div className="text-xs text-gray-500">{driver?.fullName} · {formatDate(a.accidentDate)} · {a.location}</div>
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
            <FileText size={16} className="text-purple-500" />
            <h2 className="text-sm font-semibold text-[#032147]">Documents ({vDocuments.length})</h2>
          </div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700">
              <Upload size={14} /> Upload
            </span>
            <input type="file" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              addDocument({
                name: file.name.replace(/\.[^.]+$/, ""),
                type: "other",
                relatedEntityType: "vehicle",
                relatedEntityId: id,
                fileName: file.name,
              });
              e.target.value = "";
            }} />
          </label>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {vDocuments.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No documents attached.</div>}
          {vDocuments.map(doc => (
            <div key={doc.id} className="px-5 py-3 flex items-center justify-between gap-3">
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

      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit Vehicle" size="lg">
        <VehicleForm
          initial={vehicle}
          onSave={data => { updateVehicle(id, data); setShowEdit(false); }}
          onCancel={() => setShowEdit(false)}
        />
      </Dialog>

      <ConfirmDialog open={deleteVehicleConfirm} onClose={() => setDeleteVehicleConfirm(false)}
        onConfirm={() => { deleteVehicle(id); router.push("/vehicles"); }}
        title="Delete Vehicle" description={`Delete ${vehicle.manufacturer} ${vehicle.model}? All associated records will be removed. This cannot be undone.`}
        confirmLabel="Delete" danger />

      <ConfirmDialog open={!!deleteSr} onClose={() => setDeleteSr(null)}
        onConfirm={() => { if (deleteSr) deleteServiceRecord(deleteSr); }}
        title="Delete Service Record" description="This service record will be permanently deleted." confirmLabel="Delete" danger />

      <ConfirmDialog open={!!deleteAcc} onClose={() => setDeleteAcc(null)}
        onConfirm={() => { if (deleteAcc) deleteAccidentCard(deleteAcc); }}
        title="Delete Accident Card" description="This accident card will be permanently deleted." confirmLabel="Delete" danger />

      <ConfirmDialog open={!!deleteDoc} onClose={() => setDeleteDoc(null)}
        onConfirm={() => { if (deleteDoc) deleteDocument(deleteDoc); }}
        title="Remove Document" description="This document will be removed. This cannot be undone." confirmLabel="Remove" danger />
    </div>
  );
}
