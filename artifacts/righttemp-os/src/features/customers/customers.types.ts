export type CustomerStatus = "active" | "inactive";

export type CustomerServiceType =
  | "hvac_install"
  | "hvac_repair"
  | "maintenance"
  | "inspection"
  | "emergency"
  | "other";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: CustomerStatus;
  serviceType: CustomerServiceType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customerNumber: string;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: CustomerStatus;
  serviceType: CustomerServiceType;
  notes?: string;
}

export interface CustomerRow {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: CustomerStatus;
  service_type: CustomerServiceType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_number: string;
}

export interface CustomerInsert {
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: CustomerStatus;
  service_type: CustomerServiceType;
  notes: string | null;
}
