import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/features/customers/customers.hooks";
import {
  estimateQueryKeys,
  useCreateEstimate,
  useEstimates,
  useUpdateEstimateStatus,
} from "@/features/estimates/estimates.hooks";
import type { EstimateStatus } from "@/features/estimates/estimates.types";
import { useToast } from "@/hooks/use-toast";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const statusColors: Record<EstimateStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  expired: "bg-amber-500/10 text-amber-400",
};

export default function EstimatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: estimates, isLoading, isError } = useEstimates();
  const { data: customers } = useCustomers();
  const createEstimate = useCreateEstimate();
  const updateStatus = useUpdateEstimateStatus();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("HVAC System Proposal");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const requestedCustomerId = new URLSearchParams(window.location.search).get("customerId");
    if (requestedCustomerId) {
      setCustomerId(requestedCustomerId);
      setOpen(true);
    }
  }, []);

  const subtotal = useMemo(
    () => (Number(quantity) || 0) * (Number(unitPrice) || 0),
    [quantity, unitPrice],
  );
  const total = subtotal * (1 + (Number(taxPercent) || 0) / 100);

  const submit = () => {
    if (!customerId || !title.trim() || !description.trim() || subtotal <= 0) {
      toast({ title: "Missing estimate details", description: "Choose a customer and enter a priced line item.", variant: "destructive" });
      return;
    }
    createEstimate.mutate(
      {
        customerId,
        title: title.trim(),
        lineItems: [{
          description: description.trim(),
          quantity: Number(quantity),
          unit_price: Number(unitPrice),
          total: subtotal,
        }],
        taxRate: (Number(taxPercent) || 0) / 100,
        validUntil,
        notes,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all });
          setOpen(false);
          setDescription("");
          setUnitPrice("");
          setNotes("");
          toast({ title: "Estimate created", description: "The proposal was saved as a draft." });
        },
        onError: (error) => toast({ title: "Estimate failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const changeStatus = (id: string, status: EstimateStatus) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all }),
      onError: (error) => toast({ title: "Status update failed", description: error.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimates</h1>
          <p className="text-muted-foreground mt-2">Build and track customer proposals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Estimate</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Estimate</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2"><Label>Customer</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{(customers ?? []).map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Proposal title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Line item</Label><Input placeholder="3-ton Daikin FIT system with installation" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                <div className="space-y-2"><Label>Unit price</Label><Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
                <div className="space-y-2"><Label>Tax %</Label><Input type="number" min="0" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></div>
              </div>
              <div className="rounded-lg border p-4 flex justify-between"><span className="text-muted-foreground">Estimate total</span><strong className="text-xl">{money.format(total)}</strong></div>
              <div className="space-y-2"><Label>Valid until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
              <div className="space-y-2"><Label>Customer notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Warranty, payment schedule, exclusions..." /></div>
              <Button className="w-full" onClick={submit} disabled={createEstimate.isPending}>{createEstimate.isPending ? "Saving..." : "Save Draft Estimate"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center">Loading estimates...</CardContent></Card>}
      {isError && <Card><CardContent className="py-12 text-center text-destructive">Unable to load estimates.</CardContent></Card>}
      {!isLoading && !isError && (estimates ?? []).length === 0 && <Card><CardContent className="py-14 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />No estimates yet. Create your first customer proposal.</CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {(estimates ?? []).map((estimate) => (
          <Card key={estimate.id}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-semibold text-lg">{estimate.title}</h2><p className="text-sm text-muted-foreground">{estimate.customerName}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColors[estimate.status]}`}>{estimate.status}</span>
              </div>
              <div className="flex items-end justify-between"><div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{money.format(estimate.total)}</p></div><p className="text-xs text-muted-foreground">{estimate.validUntil ? `Valid until ${estimate.validUntil}` : "No expiration"}</p></div>
              <div className="flex gap-2">
                {estimate.status === "draft" && <Button size="sm" variant="outline" onClick={() => changeStatus(estimate.id, "sent")}><Send className="h-4 w-4 mr-2" />Mark Sent</Button>}
                {estimate.status === "sent" && <Button size="sm" onClick={() => changeStatus(estimate.id, "approved")}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</Button>}
                {estimate.status === "sent" && <Button size="sm" variant="outline" onClick={() => changeStatus(estimate.id, "rejected")}>Reject</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
