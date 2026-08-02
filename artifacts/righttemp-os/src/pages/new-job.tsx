import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  customerQueryKeys,
  useCustomers,
} from "@/features/customers/customers.hooks";
import { jobQueryKeys, useCreateJob } from "@/features/jobs/jobs.hooks";
import type { JobPriority } from "@/features/jobs/jobs.types";
import { useToast } from "@/hooks/use-toast";

export default function NewJobPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const createJob = useCreateJob();
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );

  const leadId = queryParams.get("leadId") ?? undefined;
  const [customerId, setCustomerId] = useState(
    queryParams.get("customerId") ?? "",
  );
  const [title, setTitle] = useState("HVAC Installation");
  const [installDate, setInstallDate] = useState(queryParams.get("date") ?? "");
  const [installTime, setInstallTime] = useState(queryParams.get("date") ? "08:00" : "");
  const [crewLead, setCrewLead] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("8");
  const [priority, setPriority] = useState<JobPriority>("medium");
  const [notes, setNotes] = useState("");

  const selectedCustomer = customers?.find(
    (customer) => customer.id === customerId,
  );

  const handleCreate = () => {
    if (!customerId || !title.trim()) {
      toast({
        title: "Missing required information",
        description: "Choose a customer and enter a job title.",
        variant: "destructive",
      });
      return;
    }

    let scheduledStart: string | undefined;
    let scheduledEnd: string | undefined;
    if (installDate && installTime) {
      const start = new Date(`${installDate}T${installTime}`);
      if (Number.isNaN(start.getTime())) {
        toast({
          title: "Invalid schedule",
          description: "Enter a valid date and time.",
          variant: "destructive",
        });
        return;
      }
      scheduledStart = start.toISOString();
      const hours = Number(estimatedHours);
      if (Number.isFinite(hours) && hours > 0) {
        scheduledEnd = new Date(
          start.getTime() + hours * 3_600_000,
        ).toISOString();
      }
    }

    createJob.mutate(
      {
        leadId,
        customerId,
        title: title.trim(),
        description: selectedCustomer
          ? `Scheduled for ${selectedCustomer.name}`
          : undefined,
        serviceType: selectedCustomer?.serviceType,
        priority,
        scheduledStart,
        scheduledEnd,
        assignedTo: crewLead.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (job) => {
          queryClient.invalidateQueries({ queryKey: jobQueryKeys.list() });
          queryClient.setQueryData(jobQueryKeys.detail(job.id), job);
          queryClient.invalidateQueries({
            queryKey: customerQueryKeys.detail(customerId),
          });
          toast({
            title: "Job scheduled",
            description: `${job.title} was created successfully.`,
          });
          setLocation(`/jobs/${job.id}`);
        },
        onError: (error) => {
          toast({
            title: "Unable to create job",
            description:
              error instanceof Error ? error.message : "Job creation failed.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedule Installation</h1>
        <p className="text-muted-foreground mt-2">
          Create a job tied to a customer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Installation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={customerId}
              onValueChange={setCustomerId}
              disabled={customersLoading || createJob.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer" />
              </SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={createJob.isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Install Date</Label>
              <Input
                type="date"
                value={installDate}
                onChange={(event) => setInstallDate(event.target.value)}
                disabled={createJob.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Install Time</Label>
              <Input
                type="time"
                value={installTime}
                onChange={(event) => setInstallTime(event.target.value)}
                disabled={createJob.isPending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Crew Lead</Label>
              <Input
                placeholder="Technician name"
                value={crewLead}
                onChange={(event) => setCrewLead(event.target.value)}
                disabled={createJob.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                disabled={createJob.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as JobPriority)}
              disabled={createJob.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={createJob.isPending}
              rows={5}
              placeholder="Access instructions, equipment delivery, permit notes..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/jobs")}
              disabled={createJob.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createJob.isPending}>
              {createJob.isPending ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
