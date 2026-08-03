export type EstimateStatus = "draft" | "sent" | "approved" | "won" | "rejected" | "expired";

export interface EstimateLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Estimate {
  id: string;
  customerId: string | null;
  leadId: string | null;
  customerName: string;
  estimateNumber: string | null;
  title: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: EstimateStatus;
  validUntil: string | null;
  notes: string | null;
  signedBy: string | null;
  signatureDataUrl: string | null;
  signedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

export interface EstimateInput {
  customerId?: string;
  leadId?: string;
  title: string;
  lineItems: EstimateLineItem[];
  taxRate: number;
  validUntil?: string;
  notes?: string;
}

export interface EstimateRow {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  estimate_number: string | null;
  title: string;
  line_items: EstimateLineItem[];
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
  status: EstimateStatus;
  valid_until: string | null;
  notes: string | null;
  signed_by: string | null;
  signature_data_url: string | null;
  signed_at: string | null;
  rejected_at: string | null;
  created_at: string;
  customers: { name: string } | { name: string }[] | null;
  leads: { name: string } | { name: string }[] | null;
}

export interface EstimateAcceptanceInput {
  signedBy: string;
  signatureDataUrl: string;
}
