import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  convertLeadToCustomer,
  createLead,
  deleteLead,
  getLead,
  getLeads,
  updateLead,
} from "./leads.repository";
import type { LeadInput } from "./leads.types";

export const leadQueryKeys = {
  all: ["leads"] as const,
  list: () => [...leadQueryKeys.all, "list"] as const,
  detail: (id: string) => [...leadQueryKeys.all, "detail", id] as const,
};

export const dashboardQueryKeys = {
  stats: ["dashboard", "stats"] as const,
};

export function useLeads() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: leadQueryKeys.list(),
    queryFn: getLeads,
  });

  useEffect(() => {
    const channel = supabase
      .channel("righttemp-leads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        void queryClient.invalidateQueries({ queryKey: leadQueryKeys.list() });
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadQueryKeys.detail(id),
    queryFn: () => getLead(id),
    enabled: !!id,
  });
}

export function useCreateLead() {
  return useMutation({
    mutationFn: ({ data }: { data: LeadInput }) => createLead(data),
  });
}

export function useUpdateLead() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LeadInput }) =>
      updateLead(id, data),
  });
}

export function useDeleteLead() {
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
  });
}

export function useConvertLeadToCustomer() {
  return useMutation({
    mutationFn: (id: string) => convertLeadToCustomer(id),
  });
}
