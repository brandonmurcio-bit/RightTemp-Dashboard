import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createJob,
  getJobs,
} from "./jobs.repository";

export const jobQueryKeys = {
  all: ["jobs"] as const,
  list: () => [...jobQueryKeys.all, "list"] as const,
};

export function useJobs() {
  return useQuery({
    queryKey: jobQueryKeys.list(),
    queryFn: getJobs,
  });
}

export function useCreateJob() {
  return useMutation({
    mutationFn: createJob,
  });
}