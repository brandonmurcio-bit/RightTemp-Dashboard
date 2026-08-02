import React, { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  customerQueryKeys,
  dashboardQueryKeys,
  useCustomer,
  useDeleteCustomer,
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
  Trash2,
  Calendar,
  MapPin,
  Building,
  Wrench,
  ShieldAlert,
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
  const deleteCustomer = useDeleteCustomer();

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

  const handleDelete = () => {
    deleteCustomer.mutate(id, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: customerQueryKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: customerQueryKeys.list() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
        toast({
          title: "Customer deleted",
          description: "Customer record has been removed.",
        });
        setLocation("/customers");
      },
      onError: (error) => {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to delete customer.",
          variant: "destructive",
        });
      },
    });
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
                Customer #{customer.id}
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Customer Record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently erase this customer and all associated
                  history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
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
