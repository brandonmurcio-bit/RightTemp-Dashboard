import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { JobCost, JobCostInput, JobProfitability } from "./job-costing.types";

function mapCost(row: any): JobCost {
  return {
    id: row.id,
    jobId: row.job_id,
    category: row.category,
    description: row.description,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getJobProfitability(jobId: string): Promise<JobProfitability> {
  const organizationId = await getCurrentOrganizationId();
  const [costsResult, jobResult, estimateResult] = await Promise.all([
    supabase
      .from("job_costs")
      .select("id, job_id, category, description, quantity, unit_cost, total_cost, notes, created_at")
      .eq("organization_id", organizationId)
      .eq("job_id", jobId)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("po_amount")
      .eq("organization_id", organizationId)
      .eq("id", jobId)
      .single(),
    supabase
      .from("estimates")
      .select("title, total, updated_at")
      .eq("organization_id", organizationId)
      .eq("job_id", jobId)
      .in("status", ["won", "approved"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (costsResult.error) throw new Error(`Unable to load job costs: ${costsResult.error.message}`);
  if (jobResult.error) throw new Error(`Unable to load PO cost: ${jobResult.error.message}`);
  if (estimateResult.error) throw new Error(`Unable to load contract revenue: ${estimateResult.error.message}`);

  const costs = (costsResult.data ?? []).map(mapCost);
  const revenue = Number(estimateResult.data?.total ?? 0);
  const poCost = Number(jobResult.data?.po_amount ?? 0);
  const manualCost = costs.reduce((sum, cost) => sum + cost.totalCost, 0);
  const totalCost = poCost + manualCost;
  const grossProfit = revenue - totalCost;
  return {
    revenue,
    poCost,
    manualCost,
    totalCost,
    grossProfit,
    marginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : null,
    estimateTitle: estimateResult.data?.title ?? null,
    costs,
  };
}

export async function createJobCost(jobId: string, input: JobCostInput): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase.from("job_costs").insert({
    organization_id: organizationId,
    job_id: jobId,
    category: input.category,
    description: input.description,
    quantity: input.quantity,
    unit_cost: input.unitCost,
    notes: input.notes || null,
  });
  if (error) throw new Error(`Unable to add job cost: ${error.message}`);
}

export async function updateJobCost(id: string, input: JobCostInput): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase
    .from("job_costs")
    .update({
      category: input.category,
      description: input.description,
      quantity: input.quantity,
      unit_cost: input.unitCost,
      notes: input.notes || null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to update job cost: ${error.message}`);
}

export async function deleteJobCost(id: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();
  const { error } = await supabase
    .from("job_costs")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Unable to delete job cost: ${error.message}`);
}
