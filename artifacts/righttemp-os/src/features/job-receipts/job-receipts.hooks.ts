import { useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteJobReceipt,
  getJobReceipts,
  uploadJobReceipt,
} from "./job-receipts.repository";
import type { JobReceipt } from "./job-receipts.types";

export const jobReceiptQueryKeys = {
  list: (jobId: string) => ["job-receipts", jobId] as const,
};

export function useJobReceipts(jobId: string) {
  return useQuery({
    queryKey: jobReceiptQueryKeys.list(jobId),
    queryFn: () => getJobReceipts(jobId),
    enabled: !!jobId,
  });
}

export function useUploadJobReceipt() {
  return useMutation({ mutationFn: uploadJobReceipt });
}

export function useDeleteJobReceipt() {
  return useMutation({ mutationFn: (receipt: JobReceipt) => deleteJobReceipt(receipt) });
}
