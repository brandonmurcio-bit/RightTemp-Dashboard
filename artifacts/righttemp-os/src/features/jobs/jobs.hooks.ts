import { useMutation, useQuery } from "@tanstack/react-query";
import { createJob, deleteJob, getJob, getJobs, updateJob } from "./jobs.repository";
import type { JobInput, JobUpdateInput } from "./jobs.types";

export const jobQueryKeys = {
  all: ["jobs"] as const,
  list: () => [...jobQueryKeys.all, "list"] as const,
  detail: (id: string) => [...jobQueryKeys.all, "detail", id] as const,
};

export function useJobs() {
  return useQuery({ queryKey: jobQueryKeys.list(), queryFn: getJobs });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: jobQueryKeys.detail(id),
    queryFn: () => getJob(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  return useMutation({ mutationFn: (input: JobInput) => createJob(input) });
}

export function useUpdateJob() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: JobUpdateInput }) =>
      updateJob(id, input),
  });
}

export function useDeleteJob() {
  return useMutation({ mutationFn: (id: string) => deleteJob(id) });
}
