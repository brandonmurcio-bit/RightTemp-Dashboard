export type AppointmentType = "phone_call" | "in_home_estimate";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "rescheduled" | "cancelled" | "no_show";

export interface SalesAppointment {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  address: string | null;
  notes: string | null;
}

export interface AppointmentInput {
  leadId: string;
  appointmentType: AppointmentType;
  startsAt: string;
  endsAt: string;
  address?: string;
  notes?: string;
}
