export type JobStatus =
  "scheduled" | "in_progress" | "on_hold" | "completed" | "cancelled";
export type JobPriority = "low" | "medium" | "high" | "urgent";

export interface Job {
  id: string;
  organizationId: string;
  leadId: string | null;
  customerId: string;
  title: string;
  description: string | null;
  serviceType: string | null;
  status: JobStatus;
  priority: JobPriority;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  poNumber: string;
}

export interface JobRow {
  id: string;
  organization_id: string;
  lead_id: string | null;
  customer_id: string;
  title: string;
  description: string | null;
  service_type: string | null;
  status: JobStatus;
  priority: JobPriority;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  po_number: string;
}

export interface JobInput {
  leadId?: string;
  customerId: string;
  title: string;
  description?: string;
  serviceType?: string;
  priority: JobPriority;
  scheduledStart?: string;
  scheduledEnd?: string;
  assignedTo?: string;
  notes?: string;
}
