import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
} from "./customers.repository";
import type { CustomerInput } from "./customers.types";

export const customerQueryKeys = {
  all: ["customers"] as const,
  list: () => [...customerQueryKeys.all, "list"] as const,
  detail: (id: string) => [...customerQueryKeys.all, "detail", id] as const,
};

export const dashboardQueryKeys = {
  stats: ["dashboard", "stats"] as const,
};

export function useCustomers() {
  return useQuery({
    queryKey: customerQueryKeys.list(),
    queryFn: getCustomers,
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: ({ data }: { data: CustomerInput }) => createCustomer(data),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerQueryKeys.detail(id),
    queryFn: () => getCustomer(id),
    enabled: !!id,
  });
}

export function useUpdateCustomer() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerInput }) =>
      updateCustomer(id, data),
  });
}

export function useDeleteCustomer() {
  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
  });
}
