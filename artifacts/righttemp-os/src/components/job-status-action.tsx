import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard.hooks";
import { jobQueryKeys, useUpdateJobStatus } from "@/features/jobs/jobs.hooks";
import type { Job } from "@/features/jobs/jobs.types";
import { useSettings } from "@/features/settings/settings.context";
import { useToast } from "@/hooks/use-toast";

function statusLabel(status: Job["status"]) {
  return status.replaceAll("_", " ");
}

export function JobStatusAction({ job, compact = false }: { job: Job; compact?: boolean }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useSettings();
  const { toast } = useToast();
  const updateStatus = useUpdateJobStatus();
  const [open, setOpen] = useState(false);

  const isCompleted = job.status === "completed";
  const canComplete = job.status === "scheduled" || job.status === "in_progress";
  const canReopen = isCompleted && isAdmin;

  if (!canComplete && !canReopen) return null;

  const nextStatus = isCompleted
    ? (job.scheduledStart ? "scheduled" : "in_progress")
    : "completed";

  const confirmChange = () => {
    updateStatus.mutate(
      { id: job.id, status: nextStatus },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(jobQueryKeys.detail(job.id), updated);
          queryClient.setQueryData<Job[]>(jobQueryKeys.list(), (current) =>
            current?.map((item) => (item.id === updated.id ? updated : item)),
          );
          queryClient.invalidateQueries({ queryKey: jobQueryKeys.list() });
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
          setOpen(false);
          toast({
            title: isCompleted ? "Job reopened" : "Job marked complete",
            description: isCompleted
              ? `Status restored to ${statusLabel(nextStatus)}.`
              : "The completion time was saved to the job record.",
          });
        },
        onError: (error) => {
          toast({
            title: isCompleted ? "Unable to reopen job" : "Unable to complete job",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant={isCompleted ? "outline" : "default"}
        className={isCompleted ? "gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10" : "gap-2"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        disabled={updateStatus.isPending}
      >
        {isCompleted ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        {isCompleted ? "Reopen job" : "Mark complete"}
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !updateStatus.isPending && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isCompleted ? "Reopen this job?" : "Mark this job complete?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isCompleted
                ? `This restores ${job.title} to ${statusLabel(nextStatus)} and returns it to active scheduling. Existing estimates, contracts, photos, costs, receipts, invoices, purchase orders, notes, and profitability data stay attached.`
                : `This records ${job.title} as completed and removes it from active scheduling counts. All job history and financial records remain available.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateStatus.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmChange();
              }}
            >
              {updateStatus.isPending ? "Saving..." : isCompleted ? "Reopen job" : "Mark complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}