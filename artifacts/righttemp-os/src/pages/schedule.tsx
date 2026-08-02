import { useMemo, useState } from "react";
import { addMonths, format, isSameDay, startOfDay } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers } from "@/features/customers/customers.hooks";
import { useJobs } from "@/features/jobs/jobs.hooks";
import type { JobStatus } from "@/features/jobs/jobs.types";

const statusStyles: Record<JobStatus, string> = {
  scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  on_hold: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-400",
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export default function SchedulePage() {
  const { data: jobs, isLoading, isError } = useJobs();
  const { data: customers } = useCustomers();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfDay(new Date()));

  const scheduledJobs = useMemo(
    () => (jobs ?? []).filter((job) => job.scheduledStart),
    [jobs],
  );
  const datesWithJobs = useMemo(
    () => scheduledJobs.map((job) => startOfDay(new Date(job.scheduledStart!))),
    [scheduledJobs],
  );
  const selectedJobs = useMemo(
    () =>
      scheduledJobs
        .filter((job) => isSameDay(new Date(job.scheduledStart!), selectedDate))
        .sort(
          (a, b) =>
            new Date(a.scheduledStart!).getTime() -
            new Date(b.scheduledStart!).getTime(),
        ),
    [scheduledJobs, selectedDate],
  );
  const customerNames = useMemo(
    () => new Map((customers ?? []).map((customer) => [customer.id, customer.name])),
    [customers],
  );

  const chooseToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setVisibleMonth(today);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="mt-2 text-muted-foreground">Tap a date to view installs and service jobs.</p>
        </div>
        <Button asChild>
          <Link href={`/jobs/new?date=${format(selectedDate, "yyyy-MM-dd")}`}>
            <Plus className="mr-2 h-4 w-4" /> Schedule Job
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <Button type="button" size="icon" variant="outline" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">{format(visibleMonth, "MMMM yyyy")}</p>
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={chooseToday}>Today</Button>
              </div>
              <Button type="button" size="icon" variant="outline" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(startOfDay(date))}
              modifiers={{ hasJobs: datesWithJobs }}
              modifiersClassNames={{
                hasJobs:
                  "[&>button]:font-bold [&>button]:text-primary [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:h-1 [&>button]:after:w-1 [&>button]:after:rounded-full [&>button]:after:bg-primary",
              }}
              className="w-full [--cell-size:2.7rem] sm:[--cell-size:3rem]"
              classNames={{
                root: "w-full",
                month: "w-full",
                month_caption: "hidden",
                button_previous: "hidden",
                button_next: "hidden",
              }}
            />
            <div className="mt-4 flex flex-wrap gap-3 border-t pt-4 text-[11px] text-muted-foreground">
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-400" />Scheduled</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />In progress</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Completed</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Daily schedule</p>
            <h2 className="mt-1 text-2xl font-bold">{format(selectedDate, "EEEE, MMMM d")}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedJobs.length} {selectedJobs.length === 1 ? "job" : "jobs"} scheduled
            </p>
          </div>

          {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground">Loading schedule...</CardContent></Card>}
          {isError && <Card><CardContent className="py-12 text-center text-destructive">Unable to load the schedule.</CardContent></Card>}
          {!isLoading && !isError && selectedJobs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No jobs scheduled</p>
                <p className="mt-1 text-sm text-muted-foreground">This day is open.</p>
                <Button className="mt-5" variant="outline" asChild>
                  <Link href={`/jobs/new?date=${format(selectedDate, "yyyy-MM-dd")}`}>Schedule this day</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedJobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{job.title}</p>
                      <p className="text-sm text-muted-foreground">{customerNames.get(job.customerId) ?? "Customer"}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[job.status]}`}>
                      {job.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      {timeFormatter.format(new Date(job.scheduledStart!))}
                      {job.scheduledEnd ? ` – ${timeFormatter.format(new Date(job.scheduledEnd))}` : ""}
                    </p>
                    <p className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-primary" />
                      {job.assignedTo || "Crew not assigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
