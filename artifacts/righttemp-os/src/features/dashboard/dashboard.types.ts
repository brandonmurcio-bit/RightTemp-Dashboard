import type { LeadStatus } from "@/features/leads/leads.types";

export interface DashboardLead {
  id: string;
  name: string;
  status: LeadStatus;
}

export interface DashboardFollowUp {
  id: string;
  name: string;
  phone: string;
  followUpDate: string;
}

export interface DashboardEstimateAction {
  id: string;
  contactName: string;
  title: string;
  total: number;
  createdAt: string;
}

export interface DashboardWonLead {
  id: string;
  name: string;
  customerId: string | null;
}

export interface DashboardInvoiceAction {
  id: string;
  contactName: string;
  balance: number;
  daysOverdue: number;
}

export interface DashboardTodayJob {
  id: string;
  title: string;
  customerName: string;
  scheduledStart: string;
  status: string;
  assignedTo: string | null;
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
  followUpsDue: DashboardFollowUp[];
  sentEstimates: DashboardEstimateAction[];
  unscheduledWon: DashboardWonLead[];
  overdueInvoices: DashboardInvoiceAction[];
  todaysJobs: DashboardTodayJob[];
}
