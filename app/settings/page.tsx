"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import {
  Car, Fuel, Tag, Settings, Plus, Pencil, Trash2, Check, X, Circle, Shield, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Inline editable row ───────────────────────────────────────────────────────
function EditableRow({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#ecad0a]/5 border border-[#ecad0a]/30 rounded-xl">
      <input
        autoFocus
        className="flex-1 bg-transparent text-sm text-[#032147] outline-none placeholder:text-gray-400"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") onSave(text.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        onClick={() => onSave(text.trim())}
        className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80 transition-colors"
      >
        <Check size={13} />
      </button>
      <button
        onClick={onCancel}
        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Generic list manager ──────────────────────────────────────────────────────
function ListManager({
  items,
  onAdd,
  onUpdate,
  onDelete,
  placeholder,
  renderExtra,
}: {
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  renderExtra?: (item: { id: string; name: string }) => React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding]       = useState(false);

  return (
    <div className="space-y-1.5">
      {items.map(item =>
        editingId === item.id ? (
          <EditableRow
            key={item.id}
            value={item.name}
            onSave={v => { if (v) onUpdate(item.id, v); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            key={item.id}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 flex items-center gap-2">
              {renderExtra ? renderExtra(item) : (
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
              )}
              <span className="text-sm text-[#032147] font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingId(item.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      )}

      {adding ? (
        <EditableRow
          value=""
          onSave={v => { if (v) onAdd(v); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors"
        >
          <Plus size={13} />
          {placeholder}
        </button>
      )}
    </div>
  );
}

// ── Status list (special: has color dot + isDefault badge) ────────────────────
function StatusManager() {
  const { vehicleStatuses, addStatus, updateStatus, deleteStatus } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding]       = useState(false);
  const [editColor, setEditColor] = useState("#6b7280");

  const colors = [
    "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
    "#6b7280", "#209dd7", "#f97316", "#ec4899",
  ];

  return (
    <div className="space-y-1.5">
      {[...vehicleStatuses].sort((a, b) => a.sortOrder - b.sortOrder).map(item =>
        editingId === item.id ? (
          <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-[#ecad0a]/5 border border-[#ecad0a]/30 rounded-xl">
            <div className="flex gap-1">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input
              autoFocus
              defaultValue={item.name}
              className="flex-1 bg-transparent text-sm text-[#032147] outline-none"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  updateStatus(item.id, { name: (e.target as HTMLInputElement).value.trim(), color: editColor });
                  setEditingId(null);
                }
                if (e.key === "Escape") setEditingId(null);
              }}
              id={`status-input-${item.id}`}
            />
            <button
              onClick={() => {
                const input = document.getElementById(`status-input-${item.id}`) as HTMLInputElement;
                updateStatus(item.id, { name: input.value.trim(), color: editColor });
                setEditingId(null);
              }}
              className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80"
            >
              <Check size={13} />
            </button>
            <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div key={item.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="flex-1 text-sm text-[#032147] font-medium">{item.name}</span>
            {item.isDefault && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ברירת מחדל</span>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingId(item.id); setEditColor(item.color); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#209dd7] transition-colors"
              >
                <Pencil size={13} />
              </button>
              {!item.isDefault && (
                <button
                  onClick={() => deleteStatus(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )
      )}

      {adding ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#ecad0a]/5 border border-[#ecad0a]/30 rounded-xl">
          <div className="flex gap-1">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setEditColor(c)}
                className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                style={{ background: c }}
              />
            ))}
          </div>
          <input
            autoFocus
            placeholder="שם סטטוס חדש"
            className="flex-1 bg-transparent text-sm text-[#032147] outline-none placeholder:text-gray-400"
            id="new-status-input"
            onKeyDown={e => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) addStatus({ name: v, color: editColor, isDefault: false, sortOrder: vehicleStatuses.length });
                setAdding(false);
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById("new-status-input") as HTMLInputElement;
              const v = input.value.trim();
              if (v) addStatus({ name: v, color: editColor, isDefault: false, sortOrder: vehicleStatuses.length });
              setAdding(false);
            }}
            className="p-1 rounded-lg bg-[#032147] text-white hover:bg-[#032147]/80"
          >
            <Check size={13} />
          </button>
          <button onClick={() => setAdding(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setAdding(true); setEditColor("#6b7280"); }}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#209dd7] hover:text-[#209dd7] text-sm transition-colors"
        >
          <Plus size={13} />
          הוסף סטטוס
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "manufacturers",      label: "יצרנים",        icon: Car },
  { id: "vehicleTypes",       label: "סוגי רכב",      icon: Tag },
  { id: "fuelTypes",          label: "סוגי דלק",      icon: Fuel },
  { id: "statuses",           label: "סטטוסים",       icon: Circle },
  { id: "insuranceCompanies", label: "חברות ביטוח",   icon: Building2 },
  { id: "insuranceTypes",     label: "סוגי ביטוח",    icon: Shield },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("manufacturers");
  const {
    manufacturers, vehicleTypes, fuelTypes, insuranceCompanies, insuranceTypes,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addModelToManufacturer, removeModelFromManufacturer,
    addVehicleType, updateVehicleType, deleteVehicleType,
    addFuelType, updateFuelType, deleteFuelType,
    addInsuranceCompany, updateInsuranceCompany, deleteInsuranceCompany,
    addInsuranceType, updateInsuranceType, deleteInsuranceType,
  } = useStore();
  const [expandedMfr, setExpandedMfr] = useState<string | null>(null);
  const [newModel, setNewModel] = useState("");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#032147] flex items-center justify-center">
          <Settings size={18} className="text-[#ecad0a]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#032147]">הגדרות</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול רשימות הגדרה של הצי</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all",
              activeTab === id
                ? "bg-[#032147] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {activeTab === "manufacturers" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">יצרנים ודגמים</h2>
              <p className="text-xs text-gray-400 mt-0.5">{manufacturers.length} יצרנים מוגדרים — לחץ על יצרן לניהול הדגמים שלו</p>
            </div>
            <ListManager
              items={manufacturers}
              onAdd={addManufacturer}
              onUpdate={updateManufacturer}
              onDelete={deleteManufacturer}
              placeholder="הוסף יצרן"
              renderExtra={(item) => (
                <div className="mt-1">
                  <button
                    onClick={() => setExpandedMfr(expandedMfr === item.id ? null : item.id)}
                    className="text-xs text-[#209dd7] hover:underline"
                  >
                    {(item as typeof manufacturers[0]).models?.length ?? 0} דגמים {expandedMfr === item.id ? "▲" : "▼"}
                  </button>
                  {expandedMfr === item.id && (
                    <div className="mt-2 mr-2 space-y-1">
                      {((item as typeof manufacturers[0]).models ?? []).map(m => (
                        <div key={m} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="flex-1">{m}</span>
                          <button
                            onClick={() => removeModelFromManufacturer(item.id, m)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-1 mt-2">
                        <input
                          className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 bg-[#f8fafc] focus:outline-none focus:border-[#209dd7]"
                          placeholder="דגם חדש (למשל Corolla)"
                          value={newModel}
                          onChange={e => setNewModel(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && newModel.trim()) {
                              addModelToManufacturer(item.id, newModel.trim());
                              setNewModel("");
                            }
                          }}
                        />
                        <button
                          onClick={() => { if (newModel.trim()) { addModelToManufacturer(item.id, newModel.trim()); setNewModel(""); } }}
                          className="px-2 h-7 bg-[#032147] text-white text-xs rounded-lg hover:bg-[#032147]/80"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            />
          </>
        )}

        {activeTab === "vehicleTypes" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סוגי רכב</h2>
              <p className="text-xs text-gray-400 mt-0.5">{vehicleTypes.length} סוגים מוגדרים</p>
            </div>
            <ListManager
              items={vehicleTypes}
              onAdd={addVehicleType}
              onUpdate={updateVehicleType}
              onDelete={deleteVehicleType}
              placeholder="הוסף סוג רכב"
            />
          </>
        )}

        {activeTab === "fuelTypes" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סוגי דלק</h2>
              <p className="text-xs text-gray-400 mt-0.5">{fuelTypes.length} סוגים מוגדרים</p>
            </div>
            <ListManager
              items={fuelTypes}
              onAdd={addFuelType}
              onUpdate={updateFuelType}
              onDelete={deleteFuelType}
              placeholder="הוסף סוג דלק"
            />
          </>
        )}

        {activeTab === "statuses" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סטטוסים</h2>
              <p className="text-xs text-gray-400 mt-0.5">לחץ עריכה לשינוי שם או צבע. לא ניתן למחוק ברירת מחדל.</p>
            </div>
            <StatusManager />
          </>
        )}

        {activeTab === "insuranceCompanies" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">חברות ביטוח</h2>
              <p className="text-xs text-gray-400 mt-0.5">{insuranceCompanies.length} חברות מוגדרות</p>
            </div>
            <ListManager
              items={insuranceCompanies}
              onAdd={addInsuranceCompany}
              onUpdate={updateInsuranceCompany}
              onDelete={deleteInsuranceCompany}
              placeholder="הוסף חברת ביטוח"
            />
          </>
        )}

        {activeTab === "insuranceTypes" && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#032147]">סוגי ביטוח</h2>
              <p className="text-xs text-gray-400 mt-0.5">{insuranceTypes.length} סוגים מוגדרים (ביטוח חובה, צד ג', מקיף וכו')</p>
            </div>
            <ListManager
              items={insuranceTypes}
              onAdd={addInsuranceType}
              onUpdate={updateInsuranceType}
              onDelete={deleteInsuranceType}
              placeholder="הוסף סוג ביטוח"
            />
          </>
        )}
      </div>
    </div>
  );
}
