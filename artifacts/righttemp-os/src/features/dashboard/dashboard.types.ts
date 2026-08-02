import type { LeadStatus } from "@/features/leads/leads.types";

export interface DashboardLead {
  id: string;
  name: string;
  status: LeadStatus;
}

export interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  activeCustomers: number;
  scheduledJobs: number;
  jobsToday: number;
  leadsByStatus: Record<LeadStatus, number>;
  recentLeads: DashboardLead[];
}
