import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus, Filter, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  dashboardQueryKeys,
  leadQueryKeys,
  useCreateLead,
  useLeads,
} from "@/features/leads/leads.hooks";
import type { LeadInput } from "@/features/leads/leads.types";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  phone: z.string().min(1, "Phone is required"),
  status: z.enum([
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
    "lost",
  ]),
  source: z.enum([
    "website",
    "referral",
    "phone",
    "walk_in",
    "social_media",
    "other",
  ]),
  serviceType: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: leads = [], isLoading } = useLeads();
  const createLead = useCreateLead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "new",
      source: "phone",
      serviceType: "",
    },
  });

  const onSubmit = (data: LeadFormValues) => {
    createLead.mutate(
      { data: data as LeadInput },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: leadQueryKeys.list(),
          });

          queryClient.invalidateQueries({
            queryKey: dashboardQueryKeys.stats,
          });

          setIsCreateOpen(false);
          form.reset();

          toast({
            title: "Lead created",
            description: "The lead has been successfully added.",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to create lead.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    contacted:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    qualified:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    proposal:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(normalizedSearch) ||
      lead.email?.toLowerCase().includes(normalizedSearch) ||
      lead.phone.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track potential customers.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-lead" className="gap-2">
              <Plus className="w-4 h-4" />
              New Lead
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Enter the details of the prospective customer.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="John Doe"
                />
                {form.formState.errors.name && (
                  <span className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="(555) 123-4567"
                  />
                  {form.formState.errors.phone && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.phone.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="john@example.com"
                  />
                  {form.formState.errors.email && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) =>
                      form.setValue(
                        "status",
                        value as LeadFormValues["status"],
                      )
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
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
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={form.watch("source")}
                    onValueChange={(value) =>
                      form.setValue(
                        "source",
                        value as LeadFormValues["source"],
                      )
                    }
                  >
                    <SelectTrigger id="source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="social_media">
                        Social Media
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type Needed</Label>
                <Input
                  id="serviceType"
                  {...form.register("serviceType")}
                  placeholder="e.g. AC Repair, Full Install"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={createLead.isPending}>
                  {createLead.isPending ? "Saving..." : "Save Lead"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or phone..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">
            Loading leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-medium">No leads found</h3>

            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Get started by creating your first lead."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/40 uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Lead</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">
                    Source
                  </th>
                  <th className="px-6 py-4 font-medium hidden lg:table-cell">
                    Created
                  </th>
                  <th className="px-6 py-4 font-medium text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-block group/lead"
                      >
                        <div className="font-medium text-foreground group-hover/lead:text-primary group-hover/lead:underline transition-colors">
                          {lead.name}
                        </div>

                        <div className="text-muted-foreground text-xs truncate max-w-[150px]">
                          {lead.serviceType || "Unspecified service"}
                        </div>
                      </Link>
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="w-3 h-3 mr-1.5" />
                        <span className="font-mono text-xs">
                          {lead.phone}
                        </span>
                      </div>

                      {lead.email && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="w-3 h-3 mr-1.5" />
                          <span className="truncate max-w-[120px] text-xs">
                            {lead.email}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={`capitalize font-medium border-0 ${
                          statusColors[lead.status] ?? ""
                        }`}
                      >
                        {lead.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 capitalize text-muted-foreground hidden md:table-cell">
                      {lead.source.replace("_", " ")}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link href={`/leads/${lead.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3"
                        >
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}