import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import type { AppointmentInput, AppointmentStatus, AppointmentType, SalesAppointment } from "./appointments.types";

const select = "id, lead_id, appointment_type, status, starts_at, ends_at, address, notes, leads(name, phone)";

function map(row: any): SalesAppointment {
  const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
  return {
    id: row.id,
    leadId: row.lead_id,
    leadName: lead?.name ?? "Lead",
    leadPhone: lead?.phone ?? "",
    appointmentType: row.appointment_type as AppointmentType,
    status: row.status as AppointmentStatus,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    address: row.address,
    notes: row.notes,
  };
}

export async function getAppointments() {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase.from("sales_appointments").select(select).eq("organization_id", organizationId).order("starts_at");
  if (error) throw new Error(`Unable to load appointments: ${error.message}`);
  return (data ?? []).map(map);
}

export async function createAppointment(input: AppointmentInput) {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase.from("sales_appointments").insert({
    organization_id: organizationId,
    lead_id: input.leadId,
    appointment_type: input.appointmentType,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    address: input.address || null,
    notes: input.notes || null,
  }).select(select).single();
  if (error) throw new Error(`Unable to schedule appointment: ${error.message}`);
  return map(data);
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const organizationId = await getCurrentOrganizationId();
  const { data, error } = await supabase.from("sales_appointments").update({ status }).eq("id", id).eq("organization_id", organizationId).select(select).single();
  if (error) throw new Error(`Unable to update appointment: ${error.message}`);
  return map(data);
}
