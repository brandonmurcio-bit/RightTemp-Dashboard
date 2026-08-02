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
  activePipelineCount: number;
  activePipelineValue: number;
  openEstimateCount: number;
  conversionRate: number;
  newLeadsToday: number;
  scheduledJobs: number;
  jobsToday: number;
  collectedToday: number;
  outstandingInvoiceTotal: number;
  overdueInvoiceCount: number;
  overdueInvoiceTotal: number;
  unscheduledWonLeads: number;
  jobsMissingCosts: number;
  pendingEstimateCount: number;
  monthlyRevenue: number;
  monthlyCollected: number;
  monthlyCost: number;
  monthlyProfit: number;
  monthlyMarginPercent: number | null;
  leadsByStatus: Record<LeadStatus, number>;
  recentLeads: DashboardLead[];
}
