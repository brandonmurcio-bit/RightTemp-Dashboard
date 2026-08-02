export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "void";
export type PaymentMethod = "cash" | "check" | "card" | "ach" | "financing" | "other";

export interface PaymentTransaction {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface JobInvoice {
  id: string;
  jobId: string;
  customerId: string;
  estimateId: string | null;
  invoiceNumber: string;
  title: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  sentAt: string | null;
  paidAt: string | null;
  notes: string | null;
  transactions: PaymentTransaction[];
}

export interface PaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
}
