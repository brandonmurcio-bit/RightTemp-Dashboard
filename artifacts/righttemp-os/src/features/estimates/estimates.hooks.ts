import { useMutation, useQuery } from "@tanstack/react-query";
import { createEstimate, getEstimates, updateEstimateStatus } from "./estimates.repository";
import type { EstimateInput, EstimateStatus } from "./estimates.types";

export const estimateQueryKeys = { all: ["estimates"] as const };

export function useEstimates() {
  return useQuery({ queryKey: estimateQueryKeys.all, queryFn: getEstimates });
}

export function useCreateEstimate() {
  return useMutation({ mutationFn: (input: EstimateInput) => createEstimate(input) });
}

export function useUpdateEstimateStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstimateStatus }) =>
      updateEstimateStatus(id, status),
  });
}
