import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { LeadStatus } from "@/features/leads/leads.types";
import type { DashboardLead, DashboardStats } from "./dashboard.types";

const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export async function getDashboardStats(): Promise<DashboardStats> {
  const organizationId = await getCurrentOrganizationId();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [leadStatusesResult, recentLeadsResult, customersResult, jobsResult, estimatesResult, costsResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select("status")
        .eq("organization_id", organizationId),
      supabase
        .from("leads")
        .select("id, name, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("customers")
        .select("status")
        .eq("organization_id", organizationId),
      supabase
        .from("jobs")
        .select("id, status, scheduled_start, completed_at, po_amount")
        .eq("organization_id", organizationId),
      supabase
        .from("estimates")
        .select("job_id, total, status")
        .eq("organization_id", organizationId)
        .not("job_id", "is", null),
      supabase
        .from("job_costs")
        .select("job_id, total_cost")
        .eq("organization_id", organizationId),
    ]);

  const firstError = [
    leadStatusesResult.error,
    recentLeadsResult.error,
    customersResult.error,
    jobsResult.error,
    estimatesResult.error,
    costsResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(`Unable to load dashboard: ${firstError.message}`);
  }

  const leadsByStatus = Object.fromEntries(
    leadStatuses.map((status) => [status, 0]),
  ) as Record<LeadStatus, number>;

  for (const row of leadStatusesResult.data ?? []) {
    if (leadStatuses.includes(row.status as LeadStatus)) {
      leadsByStatus[row.status as LeadStatus] += 1;
    }
  }

  const customers = customersResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const todayStartMs = startOfToday.getTime();
  const tomorrowStartMs = startOfTomorrow.getTime();
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const completedThisMonth = new Set(
    jobs
      .filter((row) => row.status === "completed" && row.completed_at && new Date(row.completed_at) >= startOfMonth)
      .map((row) => row.id),
  );
  const monthlyRevenue = (estimatesResult.data ?? [])
    .filter((row) => row.job_id && completedThisMonth.has(row.job_id) && ["won", "approved"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.total), 0);
  const monthlyPoCost = jobs
    .filter((row) => completedThisMonth.has(row.id))
    .reduce((sum, row) => sum + Number(row.po_amount ?? 0), 0);
  const monthlyManualCost = (costsResult.data ?? [])
    .filter((row) => completedThisMonth.has(row.job_id))
    .reduce((sum, row) => sum + Number(row.total_cost), 0);
  const monthlyCost = monthlyPoCost + monthlyManualCost;
  const monthlyProfit = monthlyRevenue - monthlyCost;

  return {
    totalLeads: leadStatusesResult.data?.length ?? 0,
    totalCustomers: customers.length,
    activeCustomers: customers.filter((row) => row.status === "active").length,
    scheduledJobs: jobs.filter((row) => row.status === "scheduled").length,
    jobsToday: jobs.filter((row) => {
      if (!row.scheduled_start) return false;
      const scheduledTime = new Date(row.scheduled_start).getTime();
      return scheduledTime >= todayStartMs && scheduledTime < tomorrowStartMs;
    }).length,
    monthlyRevenue,
    monthlyCost,
    monthlyProfit,
    monthlyMarginPercent:
      monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : null,
    leadsByStatus,
    recentLeads: (recentLeadsResult.data ?? []) as DashboardLead[],
  };
}
