export type LeadStatus =
  "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type LeadSource =
  "website" | "referral" | "phone" | "walk_in" | "social_media" | "other";

export interface Lead {
  id: string;
  customerId: string | null;
  name: string;
  email: string | null;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  serviceType: string | null;
  zip: string | null;
  urgency: string | null;
  notes: string | null;
  attributionSource: string | null;
  attributionCampaign: string | null;
  landingPage: string | null;
  followUpDate: string | null;
  followUpTime: string | null;
  createdAt: string;

  estimatePrice: number | null;
  equipment: string | null;
  scopeOfWork: string | null;
  contactedNotes: string | null;
  qualifiedNotes: string | null;
}

export interface LeadInput {
  name: string;
  email?: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  serviceType?: string;

  estimatePrice?: number;
  equipment?: string;
  scopeOfWork?: string;
  contactedNotes?: string;
  qualifiedNotes?: string;
  followUpDate?: string;
  followUpTime?: string;
}

export interface LeadRow {
  id: string;
  organization_id: string;
  customer_id: string | null;
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
  zip: string | null;
  urgency: string | null;
  notes: string | null;
  attribution_source: string | null;
  attribution_campaign: string | null;
  landing_page: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  created_at: string;
  estimate_price: number | null;
  equipment: string | null;
  scope_of_work: string | null;
  contacted_notes: string | null;
  qualified_notes: string | null;
}

export interface LeadInsert {
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source:
    "referral" | "website" | "google" | "yelp" | "phone" | "social" | "other";
  service_type: string | null;
  estimate_price: number | null;
  equipment: string | null;
  scope_of_work: string | null;
  contacted_notes: string | null;
  qualified_notes: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
}
