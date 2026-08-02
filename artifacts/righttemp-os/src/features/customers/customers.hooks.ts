import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createCustomer,
  getCustomers,
} from "./customers.repository";
import type { CustomerInput } from "./customers.types";

export const customerQueryKeys = {
  all: ["customers"] as const,
  list: () => [...customerQueryKeys.all, "list"] as const,
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
    mutationFn: ({
      data,
    }: {
      data: CustomerInput;
    }) => createCustomer(data),
  });
}