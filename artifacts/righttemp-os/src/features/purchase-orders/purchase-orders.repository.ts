import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { PoEntityType, PurchaseOrder, PurchaseOrderUpdate } from "./purchase-orders.types";

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const organizationId = await getCurrentOrganizationId();
  const [customersResult, jobsResult] = await Promise.all([
    supabase.from("customers").select("id, name, po_number, po_status, po_vendor, po_amount, po_notes, created_at").eq("organization_id", organizationId),
    supabase.from("jobs").select("id, title, po_number, po_status, po_vendor, po_amount, po_notes, created_at, customers!jobs_customer_id_fkey(name)").eq("organization_id", organizationId),
  ]);
  if (customersResult.error) throw new Error(`Unable to load customer POs: ${customersResult.error.message}`);
  if (jobsResult.error) throw new Error(`Unable to load job POs: ${jobsResult.error.message}`);

  const customerOrders: PurchaseOrder[] = (customersResult.data ?? []).map((row) => ({
    id: row.id,
    entityType: "customer",
    poNumber: row.po_number,
    title: "Customer Account",
    customerName: row.name,
    status: row.po_status,
    vendor: row.po_vendor,
    amount: row.po_amount === null ? null : Number(row.po_amount),
    notes: row.po_notes,
    createdAt: row.created_at,
  }));
  const jobOrders: PurchaseOrder[] = (jobsResult.data ?? []).map((row) => {
    const relation = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return {
      id: row.id,
      entityType: "job",
      poNumber: row.po_number,
      title: row.title,
      customerName: relation?.name ?? "Unknown customer",
      status: row.po_status,
      vendor: row.po_vendor,
      amount: row.po_amount === null ? null : Number(row.po_amount),
      notes: row.po_notes,
      createdAt: row.created_at,
    };
  });
  return [...jobOrders, ...customerOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePurchaseOrder(entityType: PoEntityType, id: string, input: PurchaseOrderUpdate): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const table = entityType === "job" ? "jobs" : "customers";
  const { error } = await supabase
    .from(table)
    .update({
      po_status: input.status,
      po_vendor: input.vendor || null,
      po_amount: input.amount ?? null,
      po_notes: input.notes || null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to update PO: ${error.message}`);
}
