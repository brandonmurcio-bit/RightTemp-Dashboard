import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { Estimate, EstimateInput, EstimateRow, EstimateStatus } from "./estimates.types";

const estimateSelect = `
  id, customer_id, lead_id, estimate_number, title, line_items, subtotal, tax_rate,
  tax_amount, total, status, valid_until, notes, created_at,
  customers!estimates_customer_id_fkey(name), leads!estimates_lead_id_fkey(name)
`;

function mapEstimate(row: EstimateRow): Estimate {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
  return {
    id: row.id,
    customerId: row.customer_id,
    leadId: row.lead_id,
    customerName: customer?.name ?? lead?.name ?? "Unknown contact",
    estimateNumber: row.estimate_number,
    title: row.title,
    lineItems: row.line_items ?? [],
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    status: row.status,
    validUntil: row.valid_until,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getEstimates(): Promise<Estimate[]> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("estimates")
    .select(estimateSelect)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load estimates: ${error.message}`);
  return ((data ?? []) as unknown as EstimateRow[]).map(mapEstimate);
}

export async function createEstimate(input: EstimateInput): Promise<Estimate> {
  const organizationId = await getCurrentOrganizationId();
  const subtotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * input.taxRate;
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      organization_id: organizationId,
      customer_id: input.customerId || null,
      lead_id: input.leadId || null,
      title: input.title,
      line_items: input.lineItems,
      subtotal,
      tax_rate: input.taxRate,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      status: "draft",
      valid_until: input.validUntil || null,
      notes: input.notes || null,
    })
    .select(estimateSelect)
    .single();
  if (error) throw new Error(`Unable to create estimate: ${error.message}`);
  return mapEstimate(data as unknown as EstimateRow);
}

export async function updateEstimate(id: string, input: EstimateInput): Promise<Estimate> {
  const organizationId = await getCurrentOrganizationId();
  const subtotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * input.taxRate;
  const { data, error } = await supabase
    .from("estimates")
    .update({
      customer_id: input.customerId || null,
      lead_id: input.leadId || null,
      title: input.title,
      line_items: input.lineItems,
      subtotal,
      tax_rate: input.taxRate,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      valid_until: input.validUntil || null,
      notes: input.notes || null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(estimateSelect)
    .single();
  if (error) throw new Error(`Unable to update estimate: ${error.message}`);
  return mapEstimate(data as unknown as EstimateRow);
}

export async function deleteEstimate(id: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase
    .from("estimates")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to delete estimate: ${error.message}`);
}

export async function updateEstimateStatus(id: string, status: EstimateStatus): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const timestamps = {
    ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
    ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}),
  };
  const { error } = await supabase
    .from("estimates")
    .update({ status, ...timestamps })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to update estimate: ${error.message}`);
}
