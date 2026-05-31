"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref, deleteObject } from "firebase/storage";
import { useAuth } from "./auth";
import type {
  AppState,
  Vehicle,
  Driver,
  ServiceRecord,
  AccidentCard,
  DocumentRecord,
  VehicleStatus,
  VehicleType,
  FuelType,
  Manufacturer,
  AssignmentLog,
} from "@/types";

// ── Default seed data for new tenants ──────────────────────────────────────────
const DEFAULT_STATUSES: Omit<VehicleStatus, "id">[] = [
  { name: "זמין", color: "#22c55e", isDefault: true, sortOrder: 0 },
  { name: "בשימוש", color: "#209dd7", isDefault: false, sortOrder: 1 },
  { name: "בטיפול", color: "#f59e0b", isDefault: false, sortOrder: 2 },
  { name: "מושבת", color: "#ef4444", isDefault: false, sortOrder: 3 },
];
const DEFAULT_VEHICLE_TYPES = ["רכב פרטי", "רכב מסחרי", "משאית", "אוטובוס", "קטנוע"];
const DEFAULT_FUEL_TYPES = ["בנזין", "דיזל", "חשמלי", "היברידי", "גז"];
const DEFAULT_MANUFACTURERS = ["טויוטה", "יונדאי", "פורד", "קיה", "מאזדה", "ניסאן", "פולקסווגן", "מיצובישי"];

const today = () => new Date().toISOString().slice(0, 10);

// ── Context type ───────────────────────────────────────────────────────────────
type StoreContextType = AppState & {
  storeLoading: boolean;
  addVehicle: (v: Omit<Vehicle, "id">) => Promise<void>;
  updateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  moveVehicleStatus: (vehicleId: string, statusId: string) => Promise<void>;
  addDriver: (d: Omit<Driver, "id" | "fullName">) => Promise<void>;
  updateDriver: (id: string, d: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  addServiceRecord: (s: Omit<ServiceRecord, "id">) => Promise<void>;
  updateServiceRecord: (id: string, s: Partial<ServiceRecord>) => Promise<void>;
  deleteServiceRecord: (id: string) => Promise<void>;
  addAccidentCard: (a: Omit<AccidentCard, "id">) => Promise<void>;
  updateAccidentCard: (id: string, a: Partial<AccidentCard>) => Promise<void>;
  deleteAccidentCard: (id: string) => Promise<void>;
  addDocument: (d: Omit<DocumentRecord, "id" | "uploadedAt">) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  saveVehicleAssignment: (vehicleId: string, mainDriverId: string, secondaryDriverIds: string[]) => Promise<void>;
  updateStatus: (id: string, s: Partial<VehicleStatus>) => Promise<void>;
  addStatus: (s: Omit<VehicleStatus, "id">) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  reorderStatuses: (orderedIds: string[]) => Promise<void>;
  addVehicleType: (name: string) => Promise<void>;
  updateVehicleType: (id: string, name: string) => Promise<void>;
  deleteVehicleType: (id: string) => Promise<void>;
  addFuelType: (name: string) => Promise<void>;
  updateFuelType: (id: string, name: string) => Promise<void>;
  deleteFuelType: (id: string) => Promise<void>;
  addManufacturer: (name: string) => Promise<void>;
  updateManufacturer: (id: string, name: string) => Promise<void>;
  deleteManufacturer: (id: string) => Promise<void>;
  addModelToManufacturer: (manufacturerId: string, model: string) => Promise<void>;
  removeModelFromManufacturer: (manufacturerId: string, model: string) => Promise<void>;
  assignDriverToVehicle: (driverId: string, vehicleId: string) => Promise<void>;
  unassignDriverFromVehicle: (driverId: string, vehicleId: string) => Promise<void>;
};

const StoreContext = createContext<StoreContextType | null>(null);

const emptyState: AppState = {
  vehicles: [],
  drivers: [],
  serviceRecords: [],
  accidentCards: [],
  documents: [],
  vehicleStatuses: [],
  vehicleTypes: [],
  fuelTypes: [],
  manufacturers: [],
  assignmentLogs: [],
};

// ── Helper: map Firestore doc to typed object ──────────────────────────────────
function mapDocs<T>(snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] }): T[] {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

// ── Seed a new tenant with default data ────────────────────────────────────────
export async function seedTenant(tenantId: string) {
  const batch = writeBatch(db);
  const base = `tenants/${tenantId}`;

  DEFAULT_STATUSES.forEach((s, i) => {
    const ref = doc(collection(db, `${base}/vehicleStatuses`));
    batch.set(ref, { ...s, sortOrder: i });
  });
  DEFAULT_VEHICLE_TYPES.forEach(name => {
    const ref = doc(collection(db, `${base}/vehicleTypes`));
    batch.set(ref, { name });
  });
  DEFAULT_FUEL_TYPES.forEach(name => {
    const ref = doc(collection(db, `${base}/fuelTypes`));
    batch.set(ref, { name });
  });
  DEFAULT_MANUFACTURERS.forEach(name => {
    const ref = doc(collection(db, `${base}/manufacturers`));
    batch.set(ref, { name });
  });

  await batch.commit();
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenantId;

  const [state, setState] = useState<AppState>(emptyState);
  const [storeLoading, setStoreLoading] = useState(true);

  // Subscribe to all collections when tenantId is known
  useEffect(() => {
    if (!tenantId) {
      setStoreLoading(false);
      return;
    }

    setStoreLoading(true);
    const base = `tenants/${tenantId}`;
    const unsubs: Unsubscribe[] = [];

    const sub = (col: string, key: keyof AppState) => {
      const unsub = onSnapshot(collection(db, `${base}/${col}`), snap => {
        setState(s => ({ ...s, [key]: mapDocs(snap) }));
      });
      unsubs.push(unsub);
    };

    sub("vehicles", "vehicles");
    sub("drivers", "drivers");
    sub("serviceRecords", "serviceRecords");
    sub("accidentCards", "accidentCards");
    sub("documents", "documents");
    sub("assignmentLogs", "assignmentLogs");
    sub("vehicleStatuses", "vehicleStatuses");
    sub("vehicleTypes", "vehicleTypes");
    sub("fuelTypes", "fuelTypes");
    sub("manufacturers", "manufacturers");

    setStoreLoading(false);

    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const col = useCallback((name: string) => {
    if (!tenantId) throw new Error("No tenant");
    return collection(db, `tenants/${tenantId}/${name}`);
  }, [tenantId]);

  const docRef = useCallback((colName: string, id: string) => {
    if (!tenantId) throw new Error("No tenant");
    return doc(db, `tenants/${tenantId}/${colName}/${id}`);
  }, [tenantId]);

  // ── Vehicles ──────────────────────────────────────────────────────────────────
  const addVehicle = useCallback(async (v: Omit<Vehicle, "id">) => {
    const ref = await addDoc(col("vehicles"), v);
    // Update assigned drivers
    const driverIds = [v.mainDriverId, ...v.secondaryDriverIds].filter(Boolean);
    for (const dId of driverIds) {
      const d = state.drivers.find(x => x.id === dId);
      if (d) {
        await updateDoc(docRef("drivers", dId), {
          assignedVehicleIds: [...d.assignedVehicleIds, ref.id],
        });
      }
    }
  }, [col, docRef, state.drivers]);

  const updateVehicle = useCallback(async (id: string, v: Partial<Vehicle>) => {
    await updateDoc(docRef("vehicles", id), v as Record<string, unknown>);
  }, [docRef]);

  const deleteVehicle = useCallback(async (id: string) => {
    await deleteDoc(docRef("vehicles", id));
  }, [docRef]);

  const moveVehicleStatus = useCallback(async (vehicleId: string, statusId: string) => {
    await updateDoc(docRef("vehicles", vehicleId), { statusId });
  }, [docRef]);

  // ── Drivers ───────────────────────────────────────────────────────────────────
  const addDriver = useCallback(async (d: Omit<Driver, "id" | "fullName">) => {
    const fullName = `${d.firstName} ${d.lastName}`;
    await addDoc(col("drivers"), { ...d, fullName });
  }, [col]);

  const updateDriver = useCallback(async (id: string, d: Partial<Driver>) => {
    const updates: Partial<Driver> = { ...d };
    if (d.firstName !== undefined || d.lastName !== undefined) {
      const existing = state.drivers.find(x => x.id === id);
      if (existing) {
        const fn = d.firstName ?? existing.firstName;
        const ln = d.lastName ?? existing.lastName;
        updates.fullName = `${fn} ${ln}`;
      }
    }
    await updateDoc(docRef("drivers", id), updates as Record<string, unknown>);
  }, [docRef, state.drivers]);

  const deleteDriver = useCallback(async (id: string) => {
    await deleteDoc(docRef("drivers", id));
  }, [docRef]);

  // ── Service Records ───────────────────────────────────────────────────────────
  const addServiceRecord = useCallback(async (s: Omit<ServiceRecord, "id">) => {
    await addDoc(col("serviceRecords"), s);
  }, [col]);

  const updateServiceRecord = useCallback(async (id: string, s: Partial<ServiceRecord>) => {
    await updateDoc(docRef("serviceRecords", id), s as Record<string, unknown>);
  }, [docRef]);

  const deleteServiceRecord = useCallback(async (id: string) => {
    await deleteDoc(docRef("serviceRecords", id));
  }, [docRef]);

  // ── Accident Cards ────────────────────────────────────────────────────────────
  const addAccidentCard = useCallback(async (a: Omit<AccidentCard, "id">) => {
    await addDoc(col("accidentCards"), a);
  }, [col]);

  const updateAccidentCard = useCallback(async (id: string, a: Partial<AccidentCard>) => {
    await updateDoc(docRef("accidentCards", id), a as Record<string, unknown>);
  }, [docRef]);

  const deleteAccidentCard = useCallback(async (id: string) => {
    await deleteDoc(docRef("accidentCards", id));
  }, [docRef]);

  // ── Documents ─────────────────────────────────────────────────────────────────
  const addDocument = useCallback(async (d: Omit<DocumentRecord, "id" | "uploadedAt">) => {
    await addDoc(col("documents"), { ...d, uploadedAt: today() });
  }, [col]);

  const deleteDocument = useCallback(async (id: string) => {
    // Also delete from Firebase Storage if storagePath exists
    const docSnap = state.documents.find(d => d.id === id);
    if (docSnap?.storagePath) {
      try { await deleteObject(ref(storage, docSnap.storagePath)); } catch { /* ignore if already deleted */ }
    }
    await deleteDoc(docRef("documents", id));
  }, [docRef, state.documents]);

  // ── Assignments ───────────────────────────────────────────────────────────────
  const assignDriverToVehicle = useCallback(async (driverId: string, vehicleId: string) => {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    const driver = state.drivers.find(d => d.id === driverId);
    if (!vehicle || !driver) return;
    await updateDoc(docRef("vehicles", vehicleId), { mainDriverId: driverId });
    if (!driver.assignedVehicleIds.includes(vehicleId)) {
      await updateDoc(docRef("drivers", driverId), {
        assignedVehicleIds: [...driver.assignedVehicleIds, vehicleId],
      });
    }
    await addDoc(col("assignmentLogs"), { driverId, vehicleId, startDate: today() });
  }, [col, docRef, state.vehicles, state.drivers]);

  const unassignDriverFromVehicle = useCallback(async (driverId: string, vehicleId: string) => {
    const driver = state.drivers.find(d => d.id === driverId);
    if (!driver) return;
    await updateDoc(docRef("drivers", driverId), {
      assignedVehicleIds: driver.assignedVehicleIds.filter(id => id !== vehicleId),
    });
    const log = state.assignmentLogs.find(l => l.driverId === driverId && l.vehicleId === vehicleId && !l.endDate);
    if (log) await updateDoc(docRef("assignmentLogs", log.id), { endDate: today() });
  }, [docRef, state.drivers, state.assignmentLogs]);

  const saveVehicleAssignment = useCallback(async (
    vehicleId: string,
    newMainId: string,
    newSecondaryIds: string[],
  ) => {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    const oldAll = [vehicle.mainDriverId, ...vehicle.secondaryDriverIds].filter(Boolean);
    const newAll = [newMainId, ...newSecondaryIds].filter(Boolean);
    const removed = oldAll.filter(id => !newAll.includes(id));
    const added = newAll.filter(id => !oldAll.includes(id));

    await updateDoc(docRef("vehicles", vehicleId), {
      mainDriverId: newMainId,
      secondaryDriverIds: newSecondaryIds,
    });

    for (const dId of removed) {
      const d = state.drivers.find(x => x.id === dId);
      if (d) {
        await updateDoc(docRef("drivers", dId), {
          assignedVehicleIds: d.assignedVehicleIds.filter(id => id !== vehicleId),
        });
      }
      const log = state.assignmentLogs.find(l => l.driverId === dId && l.vehicleId === vehicleId && !l.endDate);
      if (log) await updateDoc(docRef("assignmentLogs", log.id), { endDate: today() });
    }

    for (const dId of added) {
      const d = state.drivers.find(x => x.id === dId);
      if (d && !d.assignedVehicleIds.includes(vehicleId)) {
        await updateDoc(docRef("drivers", dId), {
          assignedVehicleIds: [...d.assignedVehicleIds, vehicleId],
        });
      }
      await addDoc(col("assignmentLogs"), { driverId: dId, vehicleId, startDate: today() });
    }
  }, [col, docRef, state.vehicles, state.drivers, state.assignmentLogs]);

  // ── Statuses ──────────────────────────────────────────────────────────────────
  const addStatus = useCallback(async (s: Omit<VehicleStatus, "id">) => {
    await addDoc(col("vehicleStatuses"), s);
  }, [col]);

  const updateStatus = useCallback(async (id: string, s: Partial<VehicleStatus>) => {
    await updateDoc(docRef("vehicleStatuses", id), s as Record<string, unknown>);
  }, [docRef]);

  const deleteStatus = useCallback(async (id: string) => {
    await deleteDoc(docRef("vehicleStatuses", id));
  }, [docRef]);

  const reorderStatuses = useCallback(async (orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await updateDoc(docRef("vehicleStatuses", orderedIds[i]), { sortOrder: i });
    }
  }, [docRef]);

  // ── Vehicle Types ─────────────────────────────────────────────────────────────
  const addVehicleType = useCallback(async (name: string) => {
    await addDoc(col("vehicleTypes"), { name });
  }, [col]);

  const updateVehicleType = useCallback(async (id: string, name: string) => {
    await updateDoc(docRef("vehicleTypes", id), { name });
  }, [docRef]);

  const deleteVehicleType = useCallback(async (id: string) => {
    await deleteDoc(docRef("vehicleTypes", id));
  }, [docRef]);

  // ── Fuel Types ────────────────────────────────────────────────────────────────
  const addFuelType = useCallback(async (name: string) => {
    await addDoc(col("fuelTypes"), { name });
  }, [col]);

  const updateFuelType = useCallback(async (id: string, name: string) => {
    await updateDoc(docRef("fuelTypes", id), { name });
  }, [docRef]);

  const deleteFuelType = useCallback(async (id: string) => {
    await deleteDoc(docRef("fuelTypes", id));
  }, [docRef]);

  // ── Manufacturers ─────────────────────────────────────────────────────────────
  const addManufacturer = useCallback(async (name: string) => {
    await addDoc(col("manufacturers"), { name });
  }, [col]);

  const updateManufacturer = useCallback(async (id: string, name: string) => {
    await updateDoc(docRef("manufacturers", id), { name });
  }, [docRef]);

  const deleteManufacturer = useCallback(async (id: string) => {
    await deleteDoc(docRef("manufacturers", id));
  }, [docRef]);

  const addModelToManufacturer = useCallback(async (manufacturerId: string, model: string) => {
    const mfr = state.manufacturers.find(m => m.id === manufacturerId);
    const existing = mfr?.models ?? [];
    if (existing.includes(model)) return;
    await updateDoc(docRef("manufacturers", manufacturerId), { models: [...existing, model] });
  }, [docRef, state.manufacturers]);

  const removeModelFromManufacturer = useCallback(async (manufacturerId: string, model: string) => {
    const mfr = state.manufacturers.find(m => m.id === manufacturerId);
    const existing = mfr?.models ?? [];
    await updateDoc(docRef("manufacturers", manufacturerId), { models: existing.filter(m => m !== model) });
  }, [docRef, state.manufacturers]);

  const value: StoreContextType = {
    ...state,
    storeLoading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    moveVehicleStatus,
    addDriver,
    updateDriver,
    deleteDriver,
    addServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
    addAccidentCard,
    updateAccidentCard,
    deleteAccidentCard,
    addDocument,
    deleteDocument,
    saveVehicleAssignment,
    assignDriverToVehicle,
    unassignDriverFromVehicle,
    updateStatus,
    addStatus,
    deleteStatus,
    reorderStatuses,
    addVehicleType,
    updateVehicleType,
    deleteVehicleType,
    addFuelType,
    updateFuelType,
    deleteFuelType,
    addManufacturer,
    updateManufacturer,
    deleteManufacturer,
    addModelToManufacturer,
    removeModelFromManufacturer,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
