export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "referral"
  | "phone"
  | "walk_in"
  | "social_media"
  | "other";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  serviceType: string | null;
  createdAt: string;

  estimatePrice: number | null;
  equipment: string | null;
  scopeOfWork: string | null;
}

export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  serviceType?: string;

  estimatePrice?: number;
  equipment?: string;
  scopeOfWork?: string;
}

export interface LeadRow {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source:
    | "referral"
    | "website"
    | "google"
    | "yelp"
    | "phone"
    | "social"
    | "other"
    | null;
  service_type: string | null;
  created_at: string;
  estimate_price: number | null;
  equipment: string | null;
  scope_of_work: string | null;
}

export interface LeadInsert {
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source:
    | "referral"
    | "website"
    | "google"
    | "yelp"
    | "phone"
    | "social"
    | "other";
  service_type: string | null;
  estimate_price: number | null;
  equipment: string | null;
  scope_of_work: string | null;
}