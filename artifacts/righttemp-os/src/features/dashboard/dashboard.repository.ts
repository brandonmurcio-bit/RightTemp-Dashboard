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

  const [leadStatusesResult, recentLeadsResult, customersResult, jobsResult] =
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
        .select("status, scheduled_start")
        .eq("organization_id", organizationId),
    ]);

  const firstError = [
    leadStatusesResult.error,
    recentLeadsResult.error,
    customersResult.error,
    jobsResult.error,
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
    leadsByStatus,
    recentLeads: (recentLeadsResult.data ?? []) as DashboardLead[],
  };
}
