import { CalendarDays, Plus, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useJobs } from "@/features/jobs/jobs.hooks";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function JobsPage() {
  const { data: jobs, isLoading, isError } = useJobs();
  const safeJobs = jobs ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Scheduled installs and active jobs.
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Link>
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-10 text-center">
            Loading jobs...
          </CardContent>
        </Card>
      )}
      {isError && (
        <Card>
          <CardContent className="py-10 text-center text-destructive">
            Unable to load jobs.
          </CardContent>
        </Card>
      )}
      {!isLoading && !isError && safeJobs.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No scheduled jobs yet.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && safeJobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {safeJobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-lg">{job.title}</h2>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {job.priority} priority
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
                      {job.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {job.scheduledStart
                        ? dateFormatter.format(new Date(job.scheduledStart))
                        : "Not scheduled"}
                    </p>
                    <p className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      {job.assignedTo || "Crew not assigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
