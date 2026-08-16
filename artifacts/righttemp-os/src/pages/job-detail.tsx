import { CalendarDays, ChevronLeft, Clock3, FileText, UserRound } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJob } from "@/features/jobs/jobs.hooks";
import { JobWalkthroughCard } from "@/components/job-walkthrough-card";
import { EditJobDialog } from "@/components/edit-job-dialog";
import { JobProfitabilityCard } from "@/components/job-profitability-card";
import { JobInvoiceCard } from "@/components/job-invoice-card";
import { ContractVault } from "@/components/contract-vault";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
});

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [, setLocation] = useLocation();
  const { data: job, isLoading, isError } = useJob(id);

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading job...</div>;
  if (!id || isError || !job)
    return <div className="p-8 text-destructive">Unable to load this job.</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setLocation("/jobs")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground mt-1">{job.poNumber}</p>
        </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditJobDialog job={job} onDeleted={() => setLocation("/jobs")} />
          <Button variant="outline" onClick={() => setLocation(`/estimates?customerId=${job.customerId}`)}>
            <FileText className="h-4 w-4 mr-2" /> Create Estimate
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-primary" />
              {job.scheduledStart
                ? dateFormatter.format(new Date(job.scheduledStart))
                : "Not scheduled"}
            </p>
            <p className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-primary" />
              {job.scheduledEnd
                ? `Ends ${dateFormatter.format(new Date(job.scheduledEnd))}`
                : "End time not set"}
            </p>
            <p className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-primary" />
              {job.assignedTo || "Crew not assigned"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="capitalize">{job.status.replace("_", " ")}</p>
            <p className="text-sm capitalize text-muted-foreground">
              {job.priority} priority
            </p>
          </CardContent>
        </Card>
      </div>

      {(job.description || job.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Job Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 whitespace-pre-wrap text-sm">
            {job.description && <p>{job.description}</p>}
            {job.notes && <p>{job.notes}</p>}
          </CardContent>
        </Card>
      )}

      <JobWalkthroughCard jobId={job.id} />
      <Card><CardHeader><CardTitle>Contracts</CardTitle></CardHeader><CardContent><ContractVault jobId={job.id} allowSign /></CardContent></Card>
      <JobInvoiceCard jobId={job.id} />
      <JobProfitabilityCard jobId={job.id} />
    </div>
  );
}
