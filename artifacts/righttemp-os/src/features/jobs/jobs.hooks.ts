import { useMutation, useQuery } from "@tanstack/react-query";
import { createJob, getJob, getJobs } from "./jobs.repository";
import type { JobInput } from "./jobs.types";

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
