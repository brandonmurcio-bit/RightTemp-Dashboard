import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  customerQueryKeys,
  dashboardQueryKeys,
  useCustomer,
  useUpdateCustomer,
} from "@/features/customers/customers.hooks";
import type { CustomerInput } from "@/features/customers/customers.types";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ChevronLeft,
  Save,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  MapPin,
  Building,
  Wrench,
  ShieldAlert,
  FileText,
  Download,
  Upload,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  customerDocumentQueryKeys,
  useCustomerDocuments,
  useDeleteCustomerDocument,
  useUploadCustomerDocument,
} from "@/features/customer-documents/customer-documents.hooks";
import { openCustomerDocument } from "@/features/customer-documents/customer-documents.repository";
import { useJobs } from "@/features/jobs/jobs.hooks";

const customerUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().or(z.literal("")),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  serviceType: z.enum([
    "hvac_install",
    "hvac_repair",
    "maintenance",
    "inspection",
    "emergency",
    "other",
  ]),
  notes: z.string().optional(),
});

type CustomerUpdateValues = z.infer<typeof customerUpdateSchema>;

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customer, isLoading, isError } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const { data: documents, isLoading: documentsLoading } = useCustomerDocuments(id);
  const uploadDocument = useUploadCustomerDocument();
  const deleteDocument = useDeleteCustomerDocument();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<CustomerUpdateValues>({
    resolver: zodResolver(customerUpdateSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "active",
      serviceType: "hvac_install",
      notes: "",
    },
  });

  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (customer && initializedForId.current !== id) {
      initializedForId.current = id;
      form.reset({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
        address: customer.address || "",
        status: customer.status,
        serviceType: customer.serviceType,
        notes: customer.notes || "",
      });
    }
  }, [customer, id, form]);

  const onSubmit = (data: CustomerUpdateValues) => {
    const input: CustomerInput = data;
    updateCustomer.mutate(
      { id, data: input },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(customerQueryKeys.detail(id), updated);
          queryClient.invalidateQueries({ queryKey: customerQueryKeys.list() });
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
          form.reset(data);
          toast({
            title: "Customer updated",
            description: "Changes saved successfully.",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to update customer.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleArchiveToggle = () => {
    if (!customer) return;
    const nextStatus = customer.status === "active" ? "inactive" : "active";
    updateCustomer.mutate({
      id,
      data: {
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone,
        address: customer.address ?? undefined,
        city: customer.city ?? undefined,
        state: customer.state ?? undefined,
        zip: customer.zip ?? undefined,
        status: nextStatus,
        serviceType: customer.serviceType,
        notes: customer.notes ?? undefined,
      },
    }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(customerQueryKeys.detail(id), updated);
        queryClient.invalidateQueries({ queryKey: customerQueryKeys.list() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
        toast({
          title: nextStatus === "inactive" ? "Customer archived" : "Customer restored",
          description: nextStatus === "inactive"
            ? "The customer is hidden from active operations. All history was preserved."
            : "The customer is active again.",
        });
        if (nextStatus === "inactive") setLocation("/customers");
      },
      onError: (error) => {
        toast({
          title: nextStatus === "inactive" ? "Unable to archive" : "Unable to restore",
          description:
            error instanceof Error
              ? error.message
              : "Customer status could not be changed.",
          variant: "destructive",
        });
      },
    });
  };

  const handleContractUpload = () => {
    if (!selectedFile) return;
    uploadDocument.mutate(
      { customerId: id, file: selectedFile },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: customerDocumentQueryKeys.list(id) });
          setSelectedFile(null);
          toast({ title: "Contract uploaded", description: "The document is saved in this customer profile." });
        },
        onError: (error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const handleOpenDocument = async (storagePath: string) => {
    try {
      const url = await openCustomerDocument(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open document",
        description: error instanceof Error ? error.message : "Download failed.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse text-muted-foreground">
        Loading customer file...
      </div>
    );
  }

  if (!id || isError) {
    return (
      <div className="p-8 text-destructive">Unable to load this customer.</div>
    );
  }

  if (!customer) {
    return <div className="p-8 text-destructive">Customer not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/customers")}
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                Customer {customer.customerNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${customer.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {customer.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/estimates?customerId=${customer.id}`)}
          >
            <FileText className="w-4 h-4 mr-2" /> Create Estimate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/jobs/new?customerId=${customer.id}`)}
          >
            <Calendar className="w-4 h-4 mr-2" /> Schedule Job
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={customer.status === "active" ? "text-amber-400 border-amber-500/20 hover:bg-amber-500/10" : "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"}
              >
                {customer.status === "active" ? <Archive className="w-4 h-4 mr-2" /> : <ArchiveRestore className="w-4 h-4 mr-2" />}
                {customer.status === "active" ? "Archive" : "Restore"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{customer.status === "active" ? "Archive Customer?" : "Restore Customer?"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {customer.status === "active"
                    ? "This removes the customer from active operations while preserving every job, estimate, invoice, payment, photo, receipt, and contract."
                    : "This returns the customer to active operations. Their complete history is already preserved."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchiveToggle}
                  className={customer.status === "active" ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}
                >
                  {customer.status === "active" ? "Archive Customer" : "Restore Customer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            onClick={form.handleSubmit(onSubmit)}
            disabled={!form.formState.isDirty || updateCustomer.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateCustomer.isPending ? "Saving..." : "Save File"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form id="customer-form" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Customer Name</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      className="text-lg font-medium"
                    />
                    {form.formState.errors.name && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Primary Phone</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      className="font-mono"
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
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="address">Service Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      {...form.register("address")}
                      className="pl-9 min-h-[80px]"
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" /> Equipment & Service
                Notes
              </CardTitle>
              <CardDescription>
                Document HVAC units, filter sizes, access codes, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                {...form.register("notes")}
                rows={8}
                className="resize-none font-mono text-sm"
                placeholder="Make/Model: Carrier XYZ&#10;Filter Size: 20x20x1&#10;Access: Side gate code 1234"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Contracts & Documents
              </CardTitle>
              <CardDescription>
                Private contracts, proposals, warranties, and permits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <Button type="button" onClick={handleContractUpload} disabled={!selectedFile || uploadDocument.isPending}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadDocument.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>

              {documentsLoading && <p className="text-sm text-muted-foreground">Loading documents...</p>}
              {!documentsLoading && (documents ?? []).length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No contracts uploaded yet.
                </p>
              )}
              <div className="space-y-2">
                {(documents ?? []).map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{document.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(document.createdAt).toLocaleDateString()}
                        {document.fileSize ? ` · ${(document.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleOpenDocument(document.storagePath)}>
                        <Download className="w-4 h-4 mr-2" /> Open
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        disabled={deleteDocument.isPending}
                        onClick={() => {
                          if (!window.confirm(`Delete ${document.fileName}?`)) return;
                          deleteDocument.mutate(document, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: customerDocumentQueryKeys.list(id) }),
                            onError: (error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" /> Job Purchase Orders
              </CardTitle>
              <CardDescription>
                Every purchase order issued for this customer's jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobsLoading && (
                <p className="text-sm text-muted-foreground">Loading job POs...</p>
              )}
              {!jobsLoading &&
                (jobs ?? []).filter((job) => job.customerId === id).length === 0 && (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No job purchase orders yet.
                  </p>
                )}
              {(jobs ?? [])
                .filter((job) => job.customerId === id)
                .map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {job.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold text-primary">
                      {job.poNumber}
                    </span>
                  </button>
                ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-lg">Service Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-3">
                <Label>Account Status</Label>
                <Select
                  onValueChange={(v) => {
                    form.setValue("status", v as any, { shouldDirty: true });
                  }}
                  value={form.watch("status")}
                >
                  <SelectTrigger
                    className={
                      form.watch("status") === "active"
                        ? "border-primary/50"
                        : ""
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Account</SelectItem>
                    <SelectItem value="inactive">Inactive Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Service Category</Label>
                <Select
                  onValueChange={(v) => {
                    form.setValue("serviceType", v as any, {
                      shouldDirty: true,
                    });
                  }}
                  value={form.watch("serviceType")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hvac_install">Installation</SelectItem>
                    <SelectItem value="hvac_repair">Repair Services</SelectItem>
                    <SelectItem value="maintenance">
                      Maintenance Plan
                    </SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="emergency">
                      Emergency Response
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {form.watch("serviceType") === "emergency" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-destructive">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Emergency Protocol</p>
                <p className="opacity-90 mt-1">
                  This customer requires prioritized response. Ensure rapid
                  dispatch.
                </p>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-center justify-center gap-2 p-4">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Customer since {new Date(customer.createdAt).getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
