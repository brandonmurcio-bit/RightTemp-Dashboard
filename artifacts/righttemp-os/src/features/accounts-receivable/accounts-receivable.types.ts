import type { InvoiceStatus } from "@/features/invoices/invoices.types";

export interface AccountsReceivableInvoice {
  id: string;
  jobId: string;
  invoiceNumber: string;
  customerName: string;
  jobTitle: string;
  poNumber: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus | "overdue";
  createdAt: string;
  dueDate: string;
}
