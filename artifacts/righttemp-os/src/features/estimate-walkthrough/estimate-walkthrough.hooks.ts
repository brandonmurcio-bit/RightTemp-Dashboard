import { useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteWalkthroughPhoto,
  getJobWalkthrough,
  getWalkthroughPhotos,
  uploadWalkthroughPhoto,
} from "./estimate-walkthrough.repository";
import type { WalkthroughPhoto } from "./estimate-walkthrough.types";

export const walkthroughQueryKeys = {
  photos: (estimateId: string) => ["estimate-walkthrough", estimateId] as const,
  job: (jobId: string) => ["job-walkthrough", jobId] as const,
};

export function useWalkthroughPhotos(estimateId: string) {
  return useQuery({
    queryKey: walkthroughQueryKeys.photos(estimateId),
    queryFn: () => getWalkthroughPhotos(estimateId),
    enabled: !!estimateId,
  });
}

export function useUploadWalkthroughPhoto() {
  return useMutation({
    mutationFn: ({ estimateId, file }: { estimateId: string; file: File }) =>
      uploadWalkthroughPhoto(estimateId, file),
  });
}

export function useDeleteWalkthroughPhoto() {
  return useMutation({ mutationFn: (photo: WalkthroughPhoto) => deleteWalkthroughPhoto(photo) });
}

export function useJobWalkthrough(jobId: string) {
  return useQuery({
    queryKey: walkthroughQueryKeys.job(jobId),
    queryFn: () => getJobWalkthrough(jobId),
    enabled: !!jobId,
  });
}
