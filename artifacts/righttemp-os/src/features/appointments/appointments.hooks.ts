import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAppointment, getAppointments, updateAppointmentStatus } from "./appointments.repository";
import type { AppointmentInput, AppointmentStatus } from "./appointments.types";

export const appointmentQueryKeys = { all: ["sales-appointments"] as const };
export function useAppointments() { return useQuery({ queryKey: appointmentQueryKeys.all, queryFn: getAppointments }); }
export function useCreateAppointment() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: AppointmentInput) => createAppointment(input), onSuccess: () => client.invalidateQueries({ queryKey: appointmentQueryKeys.all }) });
}
export function useUpdateAppointmentStatus() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) => updateAppointmentStatus(id, status), onSuccess: () => client.invalidateQueries({ queryKey: appointmentQueryKeys.all }) });
}
