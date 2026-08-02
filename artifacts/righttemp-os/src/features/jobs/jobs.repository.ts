import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";

import { mapJobRowToJob } from "./jobs.mappers";
import type { Job, JobRow } from "./jobs.types";

const jobSelect = `
  id,
  organization_id,
  lead_id,
  customer_id,
  title,
  estimate_price,
  equipment,
  scope_of_work,
  scheduled_date,
  scheduled_time,
  estimated_hours,
  crew_lead,
  install_status,
  notes,
  created_at
`;

export async function getJobs(): Promise<Job[]> {
  const organizationId = await getCurrentOrganizationId();

  const { data, error } = await supabase
    .from("jobs")
    .select(jobSelect)
    .eq("organization_id", organizationId)
    .order("scheduled_date", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as JobRow[]).map(mapJobRowToJob);
}

export async function createJob(data: {
  leadId: string;
  customerId?: string;
  title: string;
  estimatePrice?: number;
  equipment?: string;
  scopeOfWork?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedHours?: number;
  crewLead?: string;
  notes?: string;
}) {
  const organizationId = await getCurrentOrganizationId();

  const { error } = await supabase
    .from("jobs")
    .insert({
      organization_id: organizationId,

      lead_id: data.leadId,
      customer_id: data.customerId ?? null,

      title: data.title,

      estimate_price: data.estimatePrice ?? null,
      equipment: data.equipment ?? null,
      scope_of_work: data.scopeOfWork ?? null,

      scheduled_date: data.scheduledDate ?? null,
      scheduled_time: data.scheduledTime ?? null,

      estimated_hours: data.estimatedHours ?? null,
      crew_lead: data.crewLead ?? null,

      install_status: "scheduled",

      notes: data.notes ?? null,
    });

  if (error) {
    throw error;
  }
}