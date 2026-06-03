export type OwnershipType = "company_owned" | "leasing";

export type AccidentStatus =
  | "new_report"
  | "under_review"
  | "sent_to_insurance"
  | "in_repair"
  | "closed";

export type DocumentType =
  | "vehicle_license"
  | "insurance_certificate"
  | "leasing_agreement"
  | "driver_license_copy"
  | "service_invoice"
  | "accident_report"
  | "police_report"
  | "insurance_correspondence"
  | "other";

export type RelatedEntityType =
  | "vehicle"
  | "driver"
  | "service_record"
  | "accident_card";

export type Vehicle = {
  id: string;
  licensePlate: string;
  manufacturer: string;
  model: string;
  year: number;
  vehicleTypeId: string;
  fuelTypeId: string;
  ownershipType: OwnershipType;
  leasingCompanyName?: string;
  mainDriverId: string;
  secondaryDriverIds: string[];
  statusId: string;
  mileage: number;
  licenseExpiry?: string;   // תאריך מבחן רישוי
  alertsEnabled?: boolean;  // התראות לביטוח/רישוי
  notes?: string;           // הערות / טקסט חופשי (קוד כניסה, מידע נוסף)
  serviceRecordIds: string[];
  accidentIds: string[];
  documentIds: string[];
};

export type InsuranceCompany = {
  id: string;
  name: string;
};

export type InsuranceType = {
  id: string;
  name: string;
};

export type VehicleInsurance = {
  id: string;
  vehicleId: string;
  insuranceTypeId: string;
  insuranceCompanyId: string;
  startDate: string;
  endDate: string;
  notes?: string;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  uniqueId: string;
  email?: string;          // כתובת מייל לדיוור
  dateOfBirth: string;
  driverLicenseNumber: string;
  assignedVehicleIds: string[];
  accidentIds: string[];
  documentIds: string[];
};

export type ServiceRecord = {
  id: string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  providerName: string;
  mileage: number;
  description: string;
  cost: number;
  nextRecommendedServiceDate?: string;
  documentIds: string[];
};

export type AccidentCard = {
  id: string;
  driverId: string;
  vehicleId?: string;
  accidentDate: string;
  location: string;
  shortDescription: string;
  damageDescription: string;
  hasThirdParty: boolean;
  thirdPartyDetails?: string;
  policeReportNumber?: string;
  insuranceClaimNumber?: string;
  status: AccidentStatus;
  documentIds: string[];
};

export type DocumentRecord = {
  id: string;
  name: string;
  type: DocumentType;
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string;
  uploadedAt: string;
  fileName: string;
  fileUrl?: string;       // Firebase Storage download URL
  storagePath?: string;   // Firebase Storage path (for deletion)
  notes?: string;
};

export type VehicleStatus = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  isOperational?: boolean; // true = הרכב זמין תפעולית (זמין/בשימוש), false = לא זמין (בטיפול/מושבת)
};

export type VehicleType = {
  id: string;
  name: string;
};

export type FuelType = {
  id: string;
  name: string;
};

export type Manufacturer = {
  id: string;
  name: string;
  models?: string[];
};

export type AppState = {
  assignmentLogs: AssignmentLog[];
  vehicles: Vehicle[];
  drivers: Driver[];
  serviceRecords: ServiceRecord[];
  accidentCards: AccidentCard[];
  documents: DocumentRecord[];
  vehicleInsurances: VehicleInsurance[];
  vehicleStatuses: VehicleStatus[];
  vehicleTypes: VehicleType[];
  fuelTypes: FuelType[];
  manufacturers: Manufacturer[];
  insuranceCompanies: InsuranceCompany[];
  insuranceTypes: InsuranceType[];
};

export type AssignmentLog = {
  id: string;
  driverId: string;
  vehicleId: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  role?: "main" | "secondary";
};
