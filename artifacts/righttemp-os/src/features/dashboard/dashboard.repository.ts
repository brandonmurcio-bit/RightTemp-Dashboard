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
        .select("id, name, phone, status, created_at, follow_up_date, follow_up_time, customer_id")
        .eq("organization_id", organizationId),
      supabase
        .from("leads")
        .select("id, name, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("customers")
        .select("id, name, status")
        .eq("organization_id", organizationId),
      supabase
        .from("jobs")
        .select("id, title, lead_id, customer_id, status, scheduled_start, completed_at, assigned_to, po_amount")
        .eq("organization_id", organizationId),
      supabase
        .from("estimates")
        .select("id, title, customer_id, lead_id, job_id, total, status, created_at")
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
        .select("id, customer_id, total, amount_paid, status, created_at")
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
  const leads = leadStatusesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const estimates = estimatesResult.data ?? [];
  const costs = costsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const collected = collectedResult.data ?? [];
  const todayStartMs = startOfToday.getTime();
  const tomorrowStartMs = startOfTomorrow.getTime();
  const openJobs = jobs.filter((row) => ["scheduled", "in_progress", "on_hold"].includes(row.status));
  const customerNames = new Map(customers.map((row) => [row.id, row.name]));
  const leadNames = new Map(leads.map((row) => [row.id, row.name]));
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
  const todaysJobs = jobs
    .filter((row) => {
      if (!row.scheduled_start) return false;
      const scheduledTime = new Date(row.scheduled_start).getTime();
      return scheduledTime >= todayStartMs && scheduledTime < tomorrowStartMs;
    })
    .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime());
  const unscheduledWon = leads.filter((row) => row.status === "won" && !jobsByLeadId.has(row.id));

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
    unscheduledWonLeads: unscheduledWon.length,
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
    followUpsDue: leads
      .filter((row) => {
        if (!row.follow_up_date || ["won", "lost"].includes(row.status)) return false;
        const dueAt = new Date(`${row.follow_up_date}T${row.follow_up_time || "09:00"}`);
        return dueAt.getTime() <= Date.now();
      })
      .sort((a, b) => {
        const aDue = `${a.follow_up_date}T${a.follow_up_time || "09:00"}`;
        const bDue = `${b.follow_up_date}T${b.follow_up_time || "09:00"}`;
        return aDue.localeCompare(bDue);
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone ?? "",
        followUpDate: row.follow_up_date!,
        followUpTime: row.follow_up_time?.slice(0, 5) ?? "09:00",
      })),
    sentEstimates: estimates
      .filter((row) => row.status === "sent")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((row) => ({
        id: row.id,
        contactName: (row.customer_id && customerNames.get(row.customer_id)) || (row.lead_id && leadNames.get(row.lead_id)) || "Unknown contact",
        title: row.title,
        total: Number(row.total),
        createdAt: row.created_at,
      })),
    unscheduledWon: unscheduledWon.map((row) => ({ id: row.id, name: row.name, customerId: row.customer_id })),
    overdueInvoices: overdueInvoices.map((row) => {
      const due = new Date(row.created_at);
      due.setDate(due.getDate() + 30);
      return {
        id: row.id,
        contactName: (row.customer_id && customerNames.get(row.customer_id)) || "Unknown customer",
        balance: Math.max(Number(row.total) - Number(row.amount_paid), 0),
        daysOverdue: Math.max(Math.floor((todayStartMs - due.getTime()) / 86_400_000), 1),
      };
    }),
    todaysJobs: todaysJobs.map((row) => ({
      id: row.id,
      title: row.title,
      customerName: (row.customer_id && customerNames.get(row.customer_id)) || "Unknown customer",
      scheduledStart: row.scheduled_start!,
      status: row.status,
      assignedTo: row.assigned_to,
    })),
  };
}
