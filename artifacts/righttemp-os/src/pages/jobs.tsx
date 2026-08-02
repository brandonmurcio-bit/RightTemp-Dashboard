import React from "react";
import { useJobs } from "@/features/jobs/jobs.hooks";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JobsPage() {
  const { data: jobs, isLoading, isError } = useJobs();

  const safeJobs = jobs ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Jobs
        </h1>

        <p className="text-muted-foreground mt-2">
          Scheduled installs and active jobs.
        </p>
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
        <div className="grid gap-4">
          {safeJobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <p>
                  <strong>Date:</strong>{" "}
                  {job.scheduledDate ?? "Not Scheduled"}
                </p>

                <p>
                  <strong>Time:</strong>{" "}
                  {job.scheduledTime ?? "--"}
                </p>

                <p>
                  <strong>Crew:</strong>{" "}
                  {job.crewLead ?? "--"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {job.installStatus}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}