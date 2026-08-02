import type { Job, JobRow } from "./jobs.types";

export function mapJobRowToJob(row: JobRow): Job {
  return {
    id: row.id,
    organizationId: row.organization_id,
    leadId: row.lead_id,
    customerId: row.customer_id,
    title: row.title,
    description: row.description,
    serviceType: row.service_type,
    status: row.status,
    priority: row.priority,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    completedAt: row.completed_at,
    assignedTo: row.assigned_to,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
