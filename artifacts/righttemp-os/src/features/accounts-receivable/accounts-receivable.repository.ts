import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { InvoiceStatus } from "@/features/invoices/invoices.types";
import type { AccountsReceivableInvoice } from "./accounts-receivable.types";

function dueDateFromCreatedAt(createdAt: string): string {
  const due = new Date(createdAt);
  due.setDate(due.getDate() + 30);
  return due.toISOString().slice(0, 10);
}

export async function getAccountsReceivable(): Promise<AccountsReceivableInvoice[]> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id, job_id, receipt_number, total, amount_paid, status, created_at,
      customer:customers!payments_customer_id_fkey(name),
      job:jobs!payments_job_id_fkey(title, po_number)
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load invoices: ${error.message}`);

  const today = new Date().toISOString().slice(0, 10);
  return (data ?? []).map((row: any) => {
    const total = Number(row.total);
    const amountPaid = Number(row.amount_paid);
    const balanceDue = Math.max(total - amountPaid, 0);
    const status = row.status as InvoiceStatus;
    const dueDate = dueDateFromCreatedAt(row.created_at);
    const displayStatus =
      dueDate < today && balanceDue > 0 && ["sent", "partial"].includes(status)
        ? "overdue"
        : status;
    return {
      id: row.id,
      jobId: row.job_id,
      invoiceNumber: row.receipt_number ?? "Invoice",
      customerName: row.customer?.name ?? "Unknown customer",
      jobTitle: row.job?.title ?? "Job",
      poNumber: row.job?.po_number ?? "No PO",
      total,
      amountPaid,
      balanceDue,
      status,
      displayStatus,
      createdAt: row.created_at,
      dueDate,
    };
  });
}
