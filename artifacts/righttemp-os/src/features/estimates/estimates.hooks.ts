import { useMutation, useQuery } from "@tanstack/react-query";
import { createEstimate, deleteEstimate, getEstimates, updateEstimate, updateEstimateStatus } from "./estimates.repository";
import type { EstimateInput, EstimateStatus } from "./estimates.types";

export const estimateQueryKeys = { all: ["estimates"] as const };

export function useEstimates() {
  return useQuery({ queryKey: estimateQueryKeys.all, queryFn: getEstimates });
}

export function useCreateEstimate() {
  return useMutation({ mutationFn: (input: EstimateInput) => createEstimate(input) });
}

export function useUpdateEstimate() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EstimateInput }) =>
      updateEstimate(id, input),
  });
}

export function useDeleteEstimate() {
  return useMutation({ mutationFn: (id: string) => deleteEstimate(id) });
}

export function useUpdateEstimateStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstimateStatus }) =>
      updateEstimateStatus(id, status),
  });
}
