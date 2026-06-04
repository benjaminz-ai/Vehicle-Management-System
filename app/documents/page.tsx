"use client";
import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Upload, Trash2, Search, FileText, Download, Eye, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth";
import type { DocumentType, RelatedEntityType } from "@/types";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "vehicle_license", label: "רישיון רכב" },
  { value: "insurance_certificate", label: "תעודת ביטוח" },
  { value: "leasing_agreement", label: "הסכם ליסינג" },
  { value: "driver_license_copy", label: "צילום רישיון נהיגה" },
  { value: "service_invoice", label: "חשבונית טיפול" },
  { value: "accident_report", label: "דוח תאונה" },
  { value: "police_report", label: "דוח משטרה" },
  { value: "insurance_correspondence", label: "התכתבות ביטוח" },
  { value: "other", label: "אחר" },
];

function UploadForm({ onSave, onCancel, tenantId }: {
  onSave: (d: { name: string; type: DocumentType; relatedEntityType: RelatedEntityType; relatedEntityId: string; fileName: string; fileUrl: string; storagePath: string; notes?: string }) => void;
  onCancel: () => void;
  tenantId: string;
}) {
  const { vehicles, drivers, serviceRecords, accidentCards } = useStore();
  const [form, setForm] = useState({
    name: "",
    type: "other" as DocumentType,
    relatedEntityType: "vehicle" as RelatedEntityType,
    relatedEntityId: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const entityOptions = () => {
    if (form.relatedEntityType === "vehicle") return vehicles.map(v => ({ id: v.id, label: `${v.manufacturer} ${v.model} (${v.licensePlate})` }));
    if (form.relatedEntityType === "driver") return drivers.map(d => ({ id: d.id, label: d.fullName }));
    if (form.relatedEntityType === "service_record") return serviceRecords.map(sr => {
      const v = vehicles.find(x => x.id === sr.vehicleId);
      return { id: sr.id, label: `${sr.serviceType} - ${v?.licensePlate ?? "?"} (${sr.serviceDate})` };
    });
    return accidentCards.map(a => {
      const d = drivers.find(x => x.id === a.driverId);
      return { id: a.id, label: `${a.shortDescription} - ${d?.fullName ?? "?"} (${a.accidentDate})` };
    });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !form.relatedEntityId) return;
    setError("");
    setUploading(true);

    try {
      const storagePath = `tenants/${tenantId}/documents/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
      onSave({
        ...form,
        name: form.name || file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        fileUrl,
        storagePath,
        notes: form.notes || "",
      });
    } catch {
      setError("שגיאה בהעלאת הקובץ. נסה שנית.");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* File picker */}
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-1">בחר קובץ</span>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#209dd7] transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                if (!form.name) set("name", f.name.replace(/\.[^.]+$/, ""));
              }
            }}
          />
          <FileText size={24} className="mx-auto text-gray-300 mb-2" />
          {file
            ? <span className="text-sm text-[#032147] font-medium">{file.name}</span>
            : <span className="text-sm text-gray-400">לחץ לבחירת קובץ</span>
          }
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>מעלה...</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#209dd7] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="סוג מסמך" value={form.type} onChange={e => set("type", e.target.value as DocumentType)}>
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select label="קשור ל-" value={form.relatedEntityType} onChange={e => { set("relatedEntityType", e.target.value as RelatedEntityType); set("relatedEntityId", ""); }}>
          <option value="vehicle">רכב</option>
          <option value="driver">נהג</option>
          <option value="service_record">רשומת טיפול</option>
          <option value="accident_card">כרטיס תאונה</option>
        </Select>
      </div>
      <Select label="רשומה ספציפית" value={form.relatedEntityId} onChange={e => set("relatedEntityId", e.target.value)}>
        <option value="">בחר...</option>
        {entityOptions().map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Select>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button" disabled={uploading}>ביטול</Button>
        <Button type="submit" disabled={!file || !form.relatedEntityId || uploading}>
          {uploading ? <><Loader2 size={14} className="animate-spin" /> מעלה...</> : <><Upload size={14} /> העלה מסמך</>}
        </Button>
      </div>
    </form>
  );
}

export default function DocumentsPage() {
  const { documents, vehicles, drivers, serviceRecords, accidentCards, addDocument, deleteDocument } = useStore();
  const { effectiveTenantId } = useAuth();
  const tenantId = effectiveTenantId ?? "default";
  const [typeFilter, setTypeFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = documents.filter(d => {
    if (typeFilter && d.type !== typeFilter) return false;
    if (entityFilter && d.relatedEntityType !== entityFilter) return false;
    const q = search.toLowerCase();
    return [d.name, d.fileName, d.type].join(" ").toLowerCase().includes(q);
  }).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const getEntityLabel = (doc: typeof documents[0]) => {
    if (doc.relatedEntityType === "vehicle") {
      const v = vehicles.find(x => x.id === doc.relatedEntityId);
      return v ? `${v.manufacturer} ${v.model} (${v.licensePlate})` : "רכב לא ידוע";
    }
    if (doc.relatedEntityType === "driver") {
      return drivers.find(x => x.id === doc.relatedEntityId)?.fullName ?? "נהג לא ידוע";
    }
    if (doc.relatedEntityType === "service_record") {
      const sr = serviceRecords.find(x => x.id === doc.relatedEntityId);
      const v = sr ? vehicles.find(x => x.id === sr.vehicleId) : null;
      return sr ? `${sr.serviceType} - ${v?.licensePlate ?? "?"}` : "טיפול לא ידוע";
    }
    const a = accidentCards.find(x => x.id === doc.relatedEntityId);
    const d2 = a ? drivers.find(x => x.id === a.driverId) : null;
    return a ? `${a.shortDescription} (${d2?.fullName ?? "?"})` : "תאונה לא ידועה";
  };

  const entityTypeBadge = (t: RelatedEntityType): "blue" | "purple" | "warning" | "danger" => {
    const m: Record<RelatedEntityType, "blue" | "purple" | "warning" | "danger"> = {
      vehicle: "blue", driver: "purple", service_record: "warning", accident_card: "danger",
    };
    return m[t];
  };

  const entityTypeLabel: Record<RelatedEntityType, string> = {
    vehicle: "רכב", driver: "נהג", service_record: "טיפול", accident_card: "תאונה",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">מסמכים</h1>
          <p className="text-sm text-[#888888] mt-0.5">{documents.length} מסמכים בתיק</p>
        </div>
        <Button onClick={() => setShowUpload(true)}><Upload size={16} /> העלה מסמך</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7] bg-white"
            placeholder="חיפוש מסמכים..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-48">
          <option value="">כל הסוגים</option>
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="w-40">
          <option value="">כל הסוגים</option>
          <option value="vehicle">רכב</option>
          <option value="driver">נהג</option>
          <option value="service_record">טיפול</option>
          <option value="accident_card">תאונה</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm min-w-[550px]">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_rgb(0_0_0/0.04)]">
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">שם המסמך</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">סוג</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">קשור ל-</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">רשומה</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">הועלה</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#032147]">{doc.name}</div>
                  <div className="text-xs text-gray-400">{doc.fileName}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{DOC_TYPES.find(t => t.value === doc.type)?.label ?? doc.type}</td>
                <td className="px-4 py-3">
                  <Badge variant={entityTypeBadge(doc.relatedEntityType)}>{entityTypeLabel[doc.relatedEntityType]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{getEntityLabel(doc)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(doc.uploadedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {doc.fileUrl && (
                      <>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="צפה במסמך"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#209dd7] transition-colors"
                        >
                          <Eye size={14} />
                        </a>
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          title="הורד מסמך"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <Download size={14} />
                        </a>
                      </>
                    )}
                    <button onClick={() => setDeleteTarget(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">לא נמצאו מסמכים</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Dialog open={showUpload} onClose={() => setShowUpload(false)} title="העלאת מסמך" size="md">
        <UploadForm
          tenantId={tenantId}
          onSave={d => { addDocument(d); setShowUpload(false); }}
          onCancel={() => setShowUpload(false)}
        />
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteDocument(deleteTarget); }}
        title="מחיקת מסמך"
        description="האם למחוק את המסמך? פעולה זו אינה ניתנת לביטול."
        confirmLabel="מחק מסמך"
        danger
      />
    </div>
  );
}
