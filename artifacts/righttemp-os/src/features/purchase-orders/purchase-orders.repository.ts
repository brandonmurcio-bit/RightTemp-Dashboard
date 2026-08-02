import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { PurchaseOrder, PurchaseOrderUpdate } from "./purchase-orders.types";

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const organizationId = await getCurrentOrganizationId();
  const jobsResult = await supabase
    .from("jobs")
    .select("id, title, po_number, po_status, po_vendor, po_amount, po_notes, created_at, customers!jobs_customer_id_fkey(name)")
    .eq("organization_id", organizationId);
  if (jobsResult.error) throw new Error(`Unable to load job POs: ${jobsResult.error.message}`);
  const jobOrders: PurchaseOrder[] = (jobsResult.data ?? []).map((row) => {
    const relation = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return {
      id: row.id,
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
  return jobOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePurchaseOrder(id: string, input: PurchaseOrderUpdate): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase
    .from("jobs")
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
