import type { Job, JobRow } from "./jobs.types";

export function mapJobRowToJob(row: JobRow): Job {
  return {
    id: row.id,

    organizationId: row.organization_id,

    leadId: row.lead_id,
    customerId: row.customer_id,

    title: row.title,

    estimatePrice: row.estimate_price,

    equipment: row.equipment,

    scopeOfWork: row.scope_of_work,

    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,

    estimatedHours: row.estimated_hours,

    crewLead: row.crew_lead,

    installStatus: row.install_status,

    notes: row.notes,

    createdAt: row.created_at,
  };
}