import React, { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  Save,
  Trash2,
  UserRoundCheck,
  FileText,
  Home,
} from "lucide-react";

import {
  dashboardQueryKeys,
  leadQueryKeys,
  useConvertLeadToCustomer,
  useDeleteLead,
  useLead,
  useUpdateLead,
} from "@/features/leads/leads.hooks";
import { customerQueryKeys } from "@/features/customers/customers.hooks";
import { estimateQueryKeys } from "@/features/estimates/estimates.hooks";
import type { Lead, LeadInput, LeadStatus } from "@/features/leads/leads.types";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const leadUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .or(z.literal("")),

  phone: z.string().trim().min(1, "Phone is required"),

  status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]),

  source: z.enum([
    "website",
    "referral",
    "phone",
    "walk_in",
    "social_media",
    "other",
  ]),

  serviceType: z.string().trim().optional(),

  estimatePrice: z.coerce.number().optional(),

  equipment: z.string().optional(),

  scopeOfWork: z.string().optional(),
  contactedNotes: z.string().optional(),
  qualifiedNotes: z.string().optional(),
});

type LeadUpdateValues = z.infer<typeof leadUpdateSchema>;

const pipelineStages: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
];

const replacementLabels: Record<string, string> = {
  "Property owner": "Property Owner",
  "System age": "System Age",
  "Current problem": "Current Problem",
  "Replacement timeline": "Timeline",
  "Financing interest": "Financing",
  "Best contact time": "Best Contact Time",
};

function getReplacementQualification(notes: string | null) {
  if (!notes?.startsWith("REPLACEMENT QUALIFICATION")) return [];

  return notes
    .split("\n")
    .slice(1)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) return null;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      return { label: replacementLabels[key] ?? key, value };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function getLeadFormValues(lead: Lead): LeadUpdateValues {
  return {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    serviceType: lead.serviceType ?? "",

    estimatePrice: lead.estimatePrice ?? undefined,
    equipment: lead.equipment ?? "",
    scopeOfWork: lead.scopeOfWork ?? "",
    contactedNotes: lead.contactedNotes ?? "",
    qualifiedNotes: lead.qualifiedNotes ?? "",
  };
}
export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lead, isLoading, isError } = useLead(id);

  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLeadToCustomer();

  const form = useForm<LeadUpdateValues>({
    resolver: zodResolver(leadUpdateSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "new",
      source: "phone",
      serviceType: "",

      estimatePrice: undefined,
      equipment: "",
      scopeOfWork: "",
      contactedNotes: "",
      qualifiedNotes: "",
    },
  });

  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (lead && initializedForId.current !== id) {
      initializedForId.current = id;
      form.reset(getLeadFormValues(lead));
    }
  }, [form, id, lead]);

  const updateCachedLead = (updatedLead: Lead) => {
    queryClient.setQueryData(leadQueryKeys.detail(updatedLead.id), updatedLead);

    queryClient.setQueryData<Lead[]>(leadQueryKeys.list(), (currentLeads) =>
      currentLeads?.map((currentLead) =>
        currentLead.id === updatedLead.id ? updatedLead : currentLead,
      ),
    );
  };

  const onSubmit = (values: LeadUpdateValues) => {
    const data: LeadInput = {
      ...values,
      email: values.email || undefined,
      serviceType: values.serviceType || undefined,
    };

    updateLead.mutate(
      {
        id,
        data,
      },
      {
        onSuccess: (updatedLead) => {
          updateCachedLead(updatedLead);
          form.reset(getLeadFormValues(updatedLead));

          queryClient.invalidateQueries({
            queryKey: dashboardQueryKeys.stats,
          });

          if (lead?.status !== "won" && updatedLead.status === "won") {
            handleWonLead(updatedLead);
            return;
          }

          toast({
            title: "Lead updated",
            description: "Changes saved successfully.",
          });
        },
        onError: (error) => {
          toast({
            title: "Unable to update lead",
            description:
              error instanceof Error
                ? error.message
                : "Failed to update the lead.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    deleteLead.mutate(id, {
      onSuccess: () => {
        queryClient.removeQueries({
          queryKey: leadQueryKeys.detail(id),
        });

        queryClient.invalidateQueries({
          queryKey: leadQueryKeys.list(),
        });

        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.stats,
        });
        queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all });

        toast({
          title: "Lead deleted",
          description: "The lead has been permanently removed.",
        });

        setLocation("/leads");
      },
      onError: (error) => {
        toast({
          title: "Unable to delete lead",
          description:
            error instanceof Error
              ? error.message
              : "Failed to delete the lead.",
          variant: "destructive",
        });
      },
    });
  };

  const advanceStatus = (newStatus: LeadStatus) => {
    form.setValue("status", newStatus, {
      shouldDirty: true,
      shouldValidate: true,
    });

    void form.handleSubmit(onSubmit)();
  };

  const openJobWizard = (currentLead: Lead, customerId: string) => {
    const params = new URLSearchParams({
      leadId: currentLead.id,
      customerId,
    });
    setLocation(`/jobs/new?${params.toString()}`);
  };

  const handleWonLead = (currentLead: Lead) => {
    if (currentLead.customerId) {
      openJobWizard(currentLead, currentLead.customerId);
      return;
    }

    convertLead.mutate(currentLead.id, {
      onSuccess: (customerId) => {
        const convertedLead: Lead = {
          ...currentLead,
          customerId,
          status: "won",
        };

        updateCachedLead(convertedLead);
        queryClient.invalidateQueries({
          queryKey: customerQueryKeys.list(),
        });
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.stats,
        });

        toast({
          title: "Customer created",
          description: `${currentLead.name} is now linked to a customer record.`,
        });

        openJobWizard(convertedLead, customerId);
      },
      onError: (error) => {
        toast({
          title: "Unable to create customer",
          description:
            error instanceof Error ? error.message : "Lead conversion failed.",
          variant: "destructive",
        });
      },
    });
  };

  if (!id) {
    return <div className="p-8 text-destructive">Invalid lead ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse text-muted-foreground">
        Loading lead details...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-destructive">Unable to load this lead.</div>
    );
  }

  if (!lead) {
    return <div className="p-8 text-destructive">Lead not found.</div>;
  }

  const displayedStatus = form.watch("status");
  const currentStageIndex = pipelineStages.indexOf(displayedStatus);

  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < pipelineStages.length - 1
      ? pipelineStages[currentStageIndex + 1]
      : null;
  const replacementQualification = getReplacementQualification(lead.notes);
  const isReplacementLead =
    lead.serviceType?.toLowerCase() === "system replacement" ||
    replacementQualification.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/leads")}
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">Lead #{lead.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-testid="button-delete-lead"
                variant="outline"
                size="sm"
                disabled={deleteLead.isPending}
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteLead.isPending ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>

                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  lead.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>

                <AlertDialogAction
                  data-testid="button-confirm-delete"
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            data-testid="button-save-lead"
            size="sm"
            onClick={form.handleSubmit(onSubmit)}
            disabled={
              !form.formState.isDirty ||
              updateLead.isPending ||
              deleteLead.isPending
            }
          >
            <Save className="w-4 h-4 mr-2" />
            {updateLead.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-3">Pipeline Status</h3>

              <div className="flex items-center gap-2">
                {pipelineStages.map((stage, index) => (
                  <div
                    key={stage}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      currentStageIndex >= 0 && index <= currentStageIndex
                        ? "bg-primary"
                        : "bg-primary/20"
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between mt-2 px-1">
                {pipelineStages.map((stage) => (
                  <span
                    key={stage}
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      stage === displayedStatus
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stage}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border/50 md:border-t-0 md:border-l md:pl-6">
              {nextStage && displayedStatus !== "lost" && (
                <Button
                  size="sm"
                  disabled={updateLead.isPending}
                  onClick={() =>
                    nextStage === "won"
                      ? handleWonLead(lead)
                      : advanceStatus(nextStage)
                  }
                  className="w-full md:w-auto shadow-sm"
                >
                  Advance to {nextStage}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {displayedStatus === "won" && (
                <Button
                  size="sm"
                  disabled={convertLead.isPending}
                  onClick={() => handleWonLead(lead)}
                  className="w-full md:w-auto shadow-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Create & Schedule Job
                </Button>
              )}

              {displayedStatus !== "won" && displayedStatus !== "lost" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateLead.isPending}
                  onClick={() => advanceStatus("lost")}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  Mark as Lost
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isReplacementLead && (
        <Card className="overflow-hidden border-primary/30">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Replacement Lead</CardTitle>
                <CardDescription>
                  Qualification answers submitted through the replacement funnel.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {replacementQualification.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {replacementQualification.map((item) => (
                  <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This lead requested a system replacement but has no qualification answers.
              </p>
            )}

            {(lead.zip || lead.attributionSource || lead.attributionCampaign) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 text-xs text-muted-foreground">
                {lead.zip && <span>ZIP: {lead.zip}</span>}
                {lead.attributionSource && <span>Source: {lead.attributionSource}</span>}
                {lead.attributionCampaign && <span>Campaign: {lead.attributionCampaign}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {form.watch("status") === "proposal" && (
        <Card>
          <CardHeader>
            <CardTitle>Proposal</CardTitle>
            <CardDescription>
              Estimate details for this customer.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/estimates?leadId=${lead.id}`)}
            >
              <FileText className="w-4 h-4 mr-2" /> Build Full Estimate
            </Button>
            <div className="space-y-2">
              <Label>Estimate Price</Label>
              <Input
                type="number"
                placeholder="12000"
                {...form.register("estimatePrice", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Equipment</Label>
              <Input
                placeholder="Daikin Fit 4 Ton"
                {...form.register("equipment")}
              />
            </div>

            <div className="space-y-2">
              <Label>Scope of Work</Label>
              <Textarea
                rows={6}
                placeholder="Install new condenser, air handler, thermostat, refrigerant lines..."
                {...form.register("scopeOfWork")}
              />
            </div>
          </CardContent>
        </Card>
      )}
      {form.watch("status") === "contacted" && (
        <Card>
          <CardHeader>
            <CardTitle>Contacted Notes</CardTitle>
            <CardDescription>Record the conversation, objections, timing, and next follow-up.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={6}
              placeholder="Spoke with homeowner. System is 18 years old. Comparing options Friday..."
              {...form.register("contactedNotes")}
            />
          </CardContent>
        </Card>
      )}
      {form.watch("status") === "qualified" && (
        <Card>
          <CardHeader>
            <CardTitle>Qualified Notes</CardTitle>
            <CardDescription>Capture budget, decision makers, equipment needs, and buying timeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={6}
              placeholder="Budget approved. Both homeowners decide. Wants inverter system before August..."
              {...form.register("qualifiedNotes")}
            />
          </CardContent>
        </Card>
      )}
      {form.watch("status") === "won" && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 Sale Won</CardTitle>
            <CardDescription>
              Create the job and lock in the installation schedule.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              {lead.customerId && (
                <Button
                  className="flex-1"
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation(`/customers/${lead.customerId}`)}
                >
                  <UserRoundCheck className="mr-2 h-5 w-5" />
                  View Customer
                </Button>
              )}

              <Button
                className="flex-1"
                size="lg"
                disabled={convertLead.isPending || form.formState.isDirty}
                onClick={() => handleWonLead(lead)}
              >
                <Calendar className="mr-2 h-5 w-5" />
                {convertLead.isPending
                  ? "Creating Customer..."
                  : form.formState.isDirty
                    ? "Save Changes First"
                    : "Create & Schedule Job"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>

            <CardContent>
              <form
                id="lead-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register("name")} />

                    {form.formState.errors.name && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Requested</Label>
                    <Input id="serviceType" {...form.register("serviceType")} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...form.register("phone")} />

                    {form.formState.errors.phone && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.phone.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                    />

                    {form.formState.errors.email && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.email.message}
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attributes</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>

                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => {
                    form.setValue(
                      "status",
                      value as LeadUpdateValues["status"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lead Source</Label>

                <Select
                  value={form.watch("source")}
                  onValueChange={(value) => {
                    form.setValue(
                      "source",
                      value as LeadUpdateValues["source"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Created
                </div>

                <div className="font-mono text-foreground">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
