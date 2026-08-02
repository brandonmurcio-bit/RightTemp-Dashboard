import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import { mapJobRowToJob } from "./jobs.mappers";
import type { Job, JobInput, JobRow } from "./jobs.types";

const jobSelect = `
  id, organization_id, lead_id, customer_id, title, description,
  service_type, status, priority, scheduled_start, scheduled_end,
  completed_at, assigned_to, notes, created_at, updated_at
`;

export async function getJobs(): Promise<Job[]> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("jobs")
    .select(jobSelect)
    .eq("organization_id", organizationId)
    .order("scheduled_start", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Unable to load jobs: ${error.message}`);
  return ((data ?? []) as JobRow[]).map(mapJobRowToJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("jobs")
    .select(jobSelect)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load job: ${error.message}`);
  return data ? mapJobRowToJob(data as JobRow) : null;
}

export async function createJob(input: JobInput): Promise<Job> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      organization_id: organizationId,
      lead_id: input.leadId || null,
      customer_id: input.customerId,
      title: input.title,
      description: input.description || null,
      service_type: input.serviceType || null,
      status: "scheduled",
      priority: input.priority,
      scheduled_start: input.scheduledStart || null,
      scheduled_end: input.scheduledEnd || null,
      assigned_to: input.assignedTo || null,
      notes: input.notes || null,
    })
    .select(jobSelect)
    .single();
  if (error) throw new Error(`Unable to create job: ${error.message}`);
  return mapJobRowToJob(data as JobRow);
}
