import { useState } from "react";
import { useLocation } from "wouter";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewJobPage() {
  const [, setLocation] = useLocation();
  const leadId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("leadId");
  }, []);
  const [installDate, setInstallDate] = useState("");
  const [installTime, setInstallTime] = useState("");
  const [crewLead, setCrewLead] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Schedule Installation
        </h1>

        <p className="text-muted-foreground mt-2">
          Create a new installation job.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Installation Details</CardTitle>
          {leadId && (
            <p className="text-sm text-muted-foreground">
              Lead ID: {leadId}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Install Date</Label>

            <Input
              type="date"
              value={installDate}
              onChange={(e) => setInstallDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Install Time</Label>

            <Input
              type="time"
              value={installTime}
              onChange={(e) => setInstallTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Crew Lead</Label>

            <Input
              placeholder="John"
              value={crewLead}
              onChange={(e) => setCrewLead(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Estimated Hours</Label>

            <Input
              type="number"
              placeholder="8"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/jobs")}>
              Cancel
            </Button>

            <Button>
              Create Job
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}