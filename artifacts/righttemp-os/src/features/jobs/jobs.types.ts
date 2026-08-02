export type JobStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Job {
  id: string;

  organizationId: string;

  leadId: string | null;
  customerId: string | null;

  title: string;

  estimatePrice: number | null;

  equipment: string | null;

  scopeOfWork: string | null;

  scheduledDate: string | null;
  scheduledTime: string | null;

  estimatedHours: number | null;

  crewLead: string | null;

  installStatus: JobStatus;

  notes: string | null;

  createdAt: string;
}

export interface JobRow {
  id: string;

  organization_id: string;

  lead_id: string | null;
  customer_id: string | null;

  title: string;

  estimate_price: number | null;

  equipment: string | null;

  scope_of_work: string | null;

  scheduled_date: string | null;
  scheduled_time: string | null;

  estimated_hours: number | null;

  crew_lead: string | null;

  install_status: JobStatus;

  notes: string | null;

  created_at: string;
}