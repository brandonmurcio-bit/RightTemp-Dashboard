import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard.hooks";
import { jobQueryKeys, useDeleteJob, useUpdateJob } from "@/features/jobs/jobs.hooks";
import type { Job, JobPriority, JobStatus } from "@/features/jobs/jobs.types";
import { useToast } from "@/hooks/use-toast";

function localDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function localTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function jobHours(job: Job): string {
  if (!job.scheduledStart || !job.scheduledEnd) return "8";
  const hours =
    (new Date(job.scheduledEnd).getTime() - new Date(job.scheduledStart).getTime()) /
    3_600_000;
  return hours > 0 ? String(hours) : "8";
}

export function EditJobDialog({ job, onDeleted }: { job: Job; onDeleted?: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const [open, setOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [title, setTitle] = useState(job.title);
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [priority, setPriority] = useState<JobPriority>(job.priority);
  const [date, setDate] = useState(localDate(job.scheduledStart));
  const [time, setTime] = useState(localTime(job.scheduledStart));
  const [hours, setHours] = useState(jobHours(job));
  const [crew, setCrew] = useState(job.assignedTo ?? "");
  const [serviceType, setServiceType] = useState(job.serviceType ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [notes, setNotes] = useState(job.notes ?? "");

  const reset = () => {
    setTitle(job.title);
    setStatus(job.status);
    setPriority(job.priority);
    setDate(localDate(job.scheduledStart));
    setTime(localTime(job.scheduledStart));
    setHours(jobHours(job));
    setCrew(job.assignedTo ?? "");
    setServiceType(job.serviceType ?? "");
    setDescription(job.description ?? "");
    setNotes(job.notes ?? "");
  };

  const save = () => {
    if (!title.trim()) {
      toast({ title: "Job title required", variant: "destructive" });
      return;
    }
    let scheduledStart: string | undefined;
    let scheduledEnd: string | undefined;
    if (date && time) {
      const start = new Date(`${date}T${time}`);
      if (Number.isNaN(start.getTime())) {
        toast({ title: "Invalid schedule", variant: "destructive" });
        return;
      }
      scheduledStart = start.toISOString();
      const duration = Number(hours);
      if (duration > 0) {
        scheduledEnd = new Date(start.getTime() + duration * 3_600_000).toISOString();
      }
    }
    updateJob.mutate(
      {
        id: job.id,
        input: {
          title: title.trim(),
          status,
          priority,
          scheduledStart,
          scheduledEnd,
          assignedTo: crew.trim() || undefined,
          serviceType: serviceType.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(jobQueryKeys.detail(job.id), updated);
          queryClient.invalidateQueries({ queryKey: jobQueryKeys.list() });
          setOpen(false);
          toast({ title: "Job updated", description: "Schedule and job details were saved." });
        },
        onError: (error) =>
          toast({ title: "Job update failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const remove = () => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: jobQueryKeys.detail(job.id) });
        queryClient.invalidateQueries({ queryKey: jobQueryKeys.list() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
        setConfirmDeleteOpen(false);
        setOpen(false);
        toast({ title: "Job deleted" });
        onDeleted?.();
      },
      onError: (error) =>
        toast({ title: "Job deletion failed", description: error.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Job</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2"><Label>Job title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as JobStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={(value) => setPriority(value as JobPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            <div className="space-y-2"><Label>Start</Label><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div>
            <div className="space-y-2"><Label>Hours</Label><Input type="number" min="0.5" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Crew lead</Label><Input value={crew} onChange={(event) => setCrew(event.target.value)} placeholder="Technician name" /></div>
            <div className="space-y-2"><Label>Service type</Label><Input value={serviceType} onChange={(event) => setServiceType(event.target.value)} placeholder="Installation, repair..." /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="space-y-2"><Label>Internal job notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          <Button className="w-full" onClick={save} disabled={updateJob.isPending || deleteJob.isPending}><Save className="mr-2 h-4 w-4" />{updateJob.isPending ? "Saving..." : "Save Job Changes"}</Button>
          <div className="border-t pt-4">
            <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmDeleteOpen(true)} disabled={updateJob.isPending || deleteJob.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />{deleteJob.isPending ? "Deleting Job..." : "Delete Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {job.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the job, its costs, receipts, and job files. The customer and estimate remain. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteJob.isPending}>Keep Job</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteJob.isPending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteJob.isPending ? "Deleting Job..." : "Yes, Delete Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
