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

  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const monthDate = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}-01`;
  const todayDate = `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, "0")}-${String(startOfToday.getDate()).padStart(2, "0")}`;

  const [leadStatusesResult, recentLeadsResult, customersResult, jobsResult, estimatesResult, costsResult, collectedResult, invoicesResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, status, created_at")
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
        .select("id, lead_id, customer_id, status, scheduled_start, completed_at, po_amount")
        .eq("organization_id", organizationId),
      supabase
        .from("estimates")
        .select("job_id, total, status")
        .eq("organization_id", organizationId),
      supabase
        .from("job_costs")
        .select("job_id, total_cost")
        .eq("organization_id", organizationId),
      supabase
        .from("payment_transactions")
        .select("amount, payment_date")
        .eq("organization_id", organizationId)
        .gte("payment_date", monthDate),
      supabase
        .from("payments")
        .select("total, amount_paid, status, created_at")
        .eq("organization_id", organizationId),
    ]);

  const firstError = [
    leadStatusesResult.error,
    recentLeadsResult.error,
    customersResult.error,
    jobsResult.error,
    estimatesResult.error,
    costsResult.error,
    collectedResult.error,
    invoicesResult.error,
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
  const estimates = estimatesResult.data ?? [];
  const costs = costsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const collected = collectedResult.data ?? [];
  const todayStartMs = startOfToday.getTime();
  const tomorrowStartMs = startOfTomorrow.getTime();
  const openJobs = jobs.filter((row) => ["scheduled", "in_progress", "on_hold"].includes(row.status));
  const activeCustomerIds = new Set(
    openJobs.map((row) => row.customer_id).filter((id): id is string => Boolean(id)),
  );
  const jobsByLeadId = new Set(jobs.map((row) => row.lead_id).filter(Boolean));
  const jobIdsWithCosts = new Set(costs.map((row) => row.job_id));
  const openEstimates = estimates.filter((row) => ["draft", "sent"].includes(row.status));
  const wonCount = leadsByStatus.won;
  const lostCount = leadsByStatus.lost;
  const completedThisMonth = new Set(
    jobs
      .filter((row) => row.status === "completed" && row.completed_at && new Date(row.completed_at) >= startOfMonth)
      .map((row) => row.id),
  );
  const monthlyRevenue = estimates
    .filter((row) => row.job_id && completedThisMonth.has(row.job_id) && ["won", "approved"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.total), 0);
  const monthlyPoCost = jobs
    .filter((row) => completedThisMonth.has(row.id))
    .reduce((sum, row) => sum + Number(row.po_amount ?? 0), 0);
  const monthlyManualCost = costs
    .filter((row) => completedThisMonth.has(row.job_id))
    .reduce((sum, row) => sum + Number(row.total_cost), 0);
  const monthlyCost = monthlyPoCost + monthlyManualCost;
  const monthlyProfit = monthlyRevenue - monthlyCost;
  const monthlyCollected = collected.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );
  const collectedToday = collected
    .filter((row) => row.payment_date === todayDate)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const openInvoices = invoices.filter((row) => !["paid", "void"].includes(row.status));
  const outstandingInvoiceTotal = openInvoices.reduce(
    (sum, row) => sum + Math.max(Number(row.total) - Number(row.amount_paid), 0),
    0,
  );
  const overdueInvoices = openInvoices.filter((row) => {
    if (!["sent", "partial"].includes(row.status)) return false;
    const due = new Date(row.created_at);
    due.setDate(due.getDate() + 30);
    return due < startOfToday;
  });

  return {
    totalLeads: leadStatusesResult.data?.length ?? 0,
    totalCustomers: customers.length,
    activeCustomers: activeCustomerIds.size,
    activePipelineCount: leadStatusesResult.data?.filter((row) => !["won", "lost"].includes(row.status)).length ?? 0,
    activePipelineValue: openEstimates.reduce((sum, row) => sum + Number(row.total), 0),
    openEstimateCount: openEstimates.length,
    conversionRate: wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0,
    newLeadsToday: leadStatusesResult.data?.filter((row) => {
      const created = new Date(row.created_at).getTime();
      return created >= todayStartMs && created < tomorrowStartMs;
    }).length ?? 0,
    scheduledJobs: jobs.filter((row) => row.status === "scheduled").length,
    jobsToday: jobs.filter((row) => {
      if (!row.scheduled_start) return false;
      const scheduledTime = new Date(row.scheduled_start).getTime();
      return scheduledTime >= todayStartMs && scheduledTime < tomorrowStartMs;
    }).length,
    collectedToday,
    outstandingInvoiceTotal,
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceTotal: overdueInvoices.reduce((sum, row) => sum + Math.max(Number(row.total) - Number(row.amount_paid), 0), 0),
    unscheduledWonLeads: leadStatusesResult.data?.filter((row) => row.status === "won" && !jobsByLeadId.has(row.id)).length ?? 0,
    jobsMissingCosts: jobs.filter((row) =>
      !["cancelled"].includes(row.status) &&
      Number(row.po_amount ?? 0) === 0 &&
      !jobIdsWithCosts.has(row.id),
    ).length,
    pendingEstimateCount: openEstimates.length,
    monthlyRevenue,
    monthlyCollected,
    monthlyCost,
    monthlyProfit,
    monthlyMarginPercent:
      monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : null,
    leadsByStatus,
    recentLeads: (recentLeadsResult.data ?? []) as DashboardLead[],
  };
}
