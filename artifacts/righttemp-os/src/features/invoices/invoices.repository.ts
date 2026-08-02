import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { JobInvoice, PaymentInput, PaymentMethod, PaymentTransaction } from "./invoices.types";

function mapTransaction(row: any): PaymentTransaction {
  return {
    id: row.id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method as PaymentMethod,
    paymentDate: row.payment_date,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getJobInvoice(jobId: string): Promise<JobInvoice | null> {
  const organizationId = await getCurrentOrganizationId();
  const { data: invoice, error } = await supabase
    .from("payments")
    .select("id, job_id, customer_id, estimate_id, receipt_number, line_items, total, amount_paid, status, sent_at, paid_at, notes, created_at")
    .eq("organization_id", organizationId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Unable to load invoice: ${error.message}`);
  if (!invoice) return null;

  const { data: transactions, error: transactionError } = await supabase
    .from("payment_transactions")
    .select("id, amount, payment_method, payment_date, reference, notes, created_at")
    .eq("organization_id", organizationId)
    .eq("invoice_id", invoice.id)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (transactionError) throw new Error(`Unable to load payment history: ${transactionError.message}`);

  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const firstDescription = lineItems[0] && typeof lineItems[0] === "object" && "description" in lineItems[0]
    ? String(lineItems[0].description)
    : "Job invoice";
  const total = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  return {
    id: invoice.id,
    jobId: invoice.job_id,
    customerId: invoice.customer_id,
    estimateId: invoice.estimate_id,
    invoiceNumber: invoice.receipt_number ?? "Invoice",
    title: firstDescription,
    total,
    amountPaid,
    balanceDue: Math.max(total - amountPaid, 0),
    status: invoice.status,
    sentAt: invoice.sent_at,
    paidAt: invoice.paid_at,
    notes: invoice.notes,
    transactions: (transactions ?? []).map(mapTransaction),
  };
}

export async function createInvoiceFromJob(jobId: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const [{ data: job, error: jobError }, { data: estimate, error: estimateError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from("jobs").select("customer_id, title, po_number").eq("organization_id", organizationId).eq("id", jobId).single(),
    supabase.from("estimates").select("id, line_items, subtotal, tax_rate, tax_amount, total, notes, updated_at").eq("organization_id", organizationId).eq("job_id", jobId).in("status", ["won", "approved"]).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("payments").select("id").eq("organization_id", organizationId).eq("job_id", jobId).neq("status", "void").limit(1),
  ]);
  if (jobError) throw new Error(`Unable to load job: ${jobError.message}`);
  if (estimateError) throw new Error(`Unable to load won estimate: ${estimateError.message}`);
  if (existingError) throw new Error(`Unable to check invoices: ${existingError.message}`);
  if (existing?.length) throw new Error("This job already has an active invoice.");
  if (!estimate) throw new Error("Mark an estimate Won before creating the invoice.");

  const { error } = await supabase.from("payments").insert({
    organization_id: organizationId,
    job_id: jobId,
    customer_id: job.customer_id,
    estimate_id: estimate.id,
    line_items: estimate.line_items,
    subtotal: estimate.subtotal,
    tax_rate: estimate.tax_rate,
    tax_amount: estimate.tax_amount,
    total: estimate.total,
    status: "draft",
    notes: [job.po_number ? `Job PO: ${job.po_number}` : "", estimate.notes ?? ""].filter(Boolean).join("\n"),
  });
  if (error) throw new Error(`Unable to create invoice: ${error.message}`);
}

export async function markInvoiceSent(invoiceId: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase.from("payments").update({ status: "sent", sent_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("id", invoiceId).eq("status", "draft");
  if (error) throw new Error(`Unable to mark invoice sent: ${error.message}`);
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { data: transactions, error: transactionError } = await supabase.from("payment_transactions").select("id").eq("organization_id", organizationId).eq("invoice_id", invoiceId).limit(1);
  if (transactionError) throw new Error(`Unable to verify payments: ${transactionError.message}`);
  if (transactions?.length) throw new Error("An invoice with payments cannot be voided until those payments are removed.");
  const { error } = await supabase.from("payments").update({ status: "void" }).eq("organization_id", organizationId).eq("id", invoiceId);
  if (error) throw new Error(`Unable to void invoice: ${error.message}`);
}

export async function recordPayment(invoice: JobInvoice, input: PaymentInput): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("You must be signed in to record a payment.");
  const { error } = await supabase.from("payment_transactions").insert({
    organization_id: organizationId,
    invoice_id: invoice.id,
    job_id: invoice.jobId,
    amount: input.amount,
    payment_method: input.paymentMethod,
    payment_date: input.paymentDate,
    reference: input.reference || null,
    notes: input.notes || null,
    created_by: authData.user.id,
  });
  if (error) throw new Error(`Unable to record payment: ${error.message}`);
}

export async function deletePaymentTransaction(id: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase.from("payment_transactions").delete().eq("organization_id", organizationId).eq("id", id).select("id");
  if (error) throw new Error(`Unable to remove payment: ${error.message}`);
  if (!data?.length) throw new Error("Only an organization admin can remove payments.");
}
