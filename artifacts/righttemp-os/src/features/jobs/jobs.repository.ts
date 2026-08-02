import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import { mapJobRowToJob } from "./jobs.mappers";
import type { Job, JobInput, JobRow, JobUpdateInput } from "./jobs.types";

const jobSelect = `
  id, organization_id, lead_id, customer_id, title, description,
  service_type, status, priority, scheduled_start, scheduled_end,
  completed_at, assigned_to, notes, created_at, updated_at
  ,po_number
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

export async function updateJob(id: string, input: JobUpdateInput): Promise<Job> {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase
    .from("jobs")
    .update({
      title: input.title,
      description: input.description || null,
      service_type: input.serviceType || null,
      status: input.status,
      priority: input.priority,
      scheduled_start: input.scheduledStart || null,
      scheduled_end: input.scheduledEnd || null,
      assigned_to: input.assignedTo || null,
      notes: input.notes || null,
      completed_at:
        input.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(jobSelect)
    .single();
  if (error) throw new Error(`Unable to update job: ${error.message}`);
  return mapJobRowToJob(data as JobRow);
}

export async function deleteJob(id: string): Promise<void> {
  const organizationId = await getCurrentOrganizationId();

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("job_id", id)
    .limit(1);
  if (paymentsError) {
    throw new Error(`Unable to verify job payments: ${paymentsError.message}`);
  }
  if (payments?.length) {
    throw new Error("This job has a payment record. Remove or void that payment before deleting the job.");
  }

  const { data: documents, error: documentsError } = await supabase
    .from("job_documents")
    .select("storage_path")
    .eq("organization_id", organizationId)
    .eq("job_id", id);
  if (documentsError) {
    throw new Error(`Unable to verify job files: ${documentsError.message}`);
  }

  const storagePaths = (documents ?? []).map((document) => document.storage_path);
  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from("job-documents")
      .remove(storagePaths);
    if (storageError) {
      throw new Error(`Unable to remove job files: ${storageError.message}`);
    }
  }

  const { data: deletedJobs, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id");
  if (error) throw new Error(`Unable to delete job: ${error.message}`);
  if (!deletedJobs?.length) {
    throw new Error("The job was not deleted. Only an organization admin can delete jobs.");
  }
}
