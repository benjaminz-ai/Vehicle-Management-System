"use client";
import { use, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { VehicleForm } from "@/components/VehicleForm";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Edit, Wrench, AlertTriangle, FileText, Trash2, Upload, Eye, Download, Loader2, Shield, Plus, Bell, BellOff, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { Vehicle } from "@/types";

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const {
    vehicles, drivers, serviceRecords, accidentCards, documents,
    vehicleStatuses, vehicleTypes, fuelTypes,
    vehicleInsurances, insuranceTypes, insuranceCompanies,
    updateVehicle, deleteVehicle, deleteServiceRecord, deleteAccidentCard, deleteDocument, addDocument,
    addVehicleInsurance, deleteVehicleInsurance,
  } = useStore();

  const { profile } = useAuth();
  const tenantId = profile?.tenantId ?? "default";

  const vehicle = vehicles.find(v => v.id === id);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteVehicleConfirm, setDeleteVehicleConfirm] = useState(false);
  const [deleteSr, setDeleteSr] = useState<string | null>(null);
  const [deleteAcc, setDeleteAcc] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [insForm, setInsForm] = useState({ insuranceTypeId: "", insuranceCompanyId: "", startDate: "", endDate: "" });

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
          <button
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "מעלה..." : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const storagePath = `tenants/${tenantId}/documents/${Date.now()}_${file.name}`;
              const storageRef = ref(storage, storagePath);
              const task = uploadBytesResumable(storageRef, file);
              await new Promise<void>((res, rej) => task.on("state_changed", undefined, rej, res));
              const fileUrl = await getDownloadURL(task.snapshot.ref);
              await addDocument({
                name: file.name.replace(/\.[^.]+$/, ""),
                type: "other",
                relatedEntityType: "vehicle",
                relatedEntityId: id,
                fileName: file.name,
                fileUrl,
                storagePath,
              });
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }} />
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {vDocuments.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">No documents attached.</div>}
          {vDocuments.map(doc => (
            <div key={doc.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-800">{doc.name}</div>
                <div className="text-xs text-gray-400">{doc.fileName} · {formatDate(doc.uploadedAt)}</div>
              </div>
              <div className="flex items-center gap-1">
                {doc.fileUrl && (
                  <>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" title="צפה" className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-[#209dd7] transition-colors">
                      <Eye size={14} />
                    </a>
                    <a href={doc.fileUrl} download={doc.fileName} title="הורד" className="p-1.5 rounded-lg hover:bg-green-50 text-gray-300 hover:text-green-600 transition-colors">
                      <Download size={14} />
                    </a>
                  </>
                )}
                <button onClick={() => setDeleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Insurance section */}
      {(() => {
        const vInsurances = vehicleInsurances.filter(i => i.vehicleId === id);
        const today = new Date().toISOString().slice(0, 10);
        return (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#209dd7]" />
                <h2 className="text-sm font-semibold text-[#032147]">ביטוחים ({vInsurances.length})</h2>
              </div>
              <button
                onClick={() => setShowAddInsurance(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <Plus size={14} /> הוסף ביטוח
              </button>
            </CardHeader>

            {showAddInsurance && (
              <div className="px-5 py-4 border-b border-gray-50 bg-[#f8fafc] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">סוג ביטוח</label>
                    <select
                      className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
                      value={insForm.insuranceTypeId}
                      onChange={e => setInsForm(f => ({ ...f, insuranceTypeId: e.target.value }))}
                    >
                      <option value="">בחר סוג...</option>
                      {insuranceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">חברת ביטוח</label>
                    <select
                      className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
                      value={insForm.insuranceCompanyId}
                      onChange={e => setInsForm(f => ({ ...f, insuranceCompanyId: e.target.value }))}
                    >
                      <option value="">בחר חברה...</option>
                      {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">תאריך התחלה</label>
                    <input type="date" className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
                      value={insForm.startDate} onChange={e => setInsForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">תאריך פקיעה</label>
                    <input type="date" className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30"
                      value={insForm.endDate} onChange={e => setInsForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!insForm.insuranceTypeId || !insForm.startDate || !insForm.endDate) return;
                      await addVehicleInsurance({ vehicleId: id, ...insForm });
                      setInsForm({ insuranceTypeId: "", insuranceCompanyId: "", startDate: "", endDate: "" });
                      setShowAddInsurance(false);
                    }}
                    disabled={!insForm.insuranceTypeId || !insForm.startDate || !insForm.endDate}
                    className="px-4 h-8 rounded-xl bg-[#032147] text-white text-sm font-medium hover:bg-[#032147]/80 disabled:opacity-40 transition-colors"
                  >שמור ביטוח</button>
                  <button onClick={() => setShowAddInsurance(false)} className="px-4 h-8 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">ביטול</button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {vInsurances.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">אין ביטוחים רשומים לרכב זה.</div>}
              {vInsurances.map(ins => {
                const insType = insuranceTypes.find(t => t.id === ins.insuranceTypeId);
                const insCompany = insuranceCompanies.find(c => c.id === ins.insuranceCompanyId);
                const expired = ins.endDate < today;
                const expiringSoon = !expired && ins.endDate <= new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
                return (
                  <div key={ins.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${expired ? "bg-red-400" : expiringSoon ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <div>
                        <div className="text-sm font-medium text-[#032147]">{insType?.name ?? "—"}</div>
                        <div className="text-xs text-gray-400">
                          {insCompany?.name && <span>{insCompany.name} · </span>}
                          {formatDate(ins.startDate)} — {formatDate(ins.endDate)}
                          {expired && <span className="text-red-500 font-semibold mr-1"> · פג תוקף</span>}
                          {expiringSoon && <span className="text-amber-500 font-semibold mr-1"> · פג בקרוב</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteVehicleInsurance(ins.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* License expiry info */}
      {vehicle.licenseExpiry && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${
          vehicle.licenseExpiry < new Date().toISOString().slice(0,10) ? "bg-red-50 border border-red-100" :
          vehicle.licenseExpiry <= new Date(Date.now() + 30*864e5).toISOString().slice(0,10) ? "bg-amber-50 border border-amber-100" :
          "bg-emerald-50 border border-emerald-100"
        }`}>
          <Calendar size={18} className="shrink-0 text-gray-500" />
          <div>
            <div className="text-sm font-semibold text-[#032147]">טסט רישוי: {formatDate(vehicle.licenseExpiry)}</div>
            <div className="text-xs text-gray-500">
              {vehicle.licenseExpiry < new Date().toISOString().slice(0,10) ? "פג תוקף הרישוי!" :
               vehicle.licenseExpiry <= new Date(Date.now() + 30*864e5).toISOString().slice(0,10) ? "הרישוי פג בקרוב" :
               "הרישוי בתוקף"}
            </div>
          </div>
        </div>
      )}

      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit Vehicle" size="lg">
        <VehicleForm
          initial={vehicle}
          onSave={(data, insurances) => {
            updateVehicle(id, data);
            // Add any new insurances added during edit
            insurances.forEach(ins => addVehicleInsurance({ ...ins, vehicleId: id }));
            setShowEdit(false);
          }}
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
