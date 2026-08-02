import { useMutation, useQuery } from "@tanstack/react-query";
import { createJobCost, deleteJobCost, getJobProfitability, updateJobCost } from "./job-costing.repository";
import type { JobCostInput } from "./job-costing.types";

export const jobCostQueryKeys = {
  profitability: (jobId: string) => ["job-profitability", jobId] as const,
};

export function useJobProfitability(jobId: string) {
  return useQuery({
    queryKey: jobCostQueryKeys.profitability(jobId),
    queryFn: () => getJobProfitability(jobId),
    enabled: !!jobId,
  });
}

export function useCreateJobCost() {
  return useMutation({ mutationFn: ({ jobId, input }: { jobId: string; input: JobCostInput }) => createJobCost(jobId, input) });
}

export function useUpdateJobCost() {
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: JobCostInput }) => updateJobCost(id, input) });
}

export function useDeleteJobCost() {
  return useMutation({ mutationFn: (id: string) => deleteJobCost(id) });
}
