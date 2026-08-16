import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/features/customers/customers.hooks";
import { useLeads } from "@/features/leads/leads.hooks";
import {
  estimateQueryKeys,
  useAcceptEstimate,
  useCreateEstimate,
  useDeleteEstimate,
  useEstimates,
  useUpdateEstimate,
  useUpdateEstimateStatus,
} from "@/features/estimates/estimates.hooks";
import type { Estimate, EstimateInput, EstimateStatus } from "@/features/estimates/estimates.types";
import { useToast } from "@/hooks/use-toast";
import { EstimateWalkthroughPhotos } from "@/components/estimate-walkthrough-photos";
import { EstimateProposalDialog } from "@/components/estimate-proposal-dialog";
import { ContractVault } from "@/components/contract-vault";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const statusColors: Record<EstimateStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  won: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  expired: "bg-amber-500/10 text-amber-400",
};

export default function EstimatesPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: estimates, isLoading, isError } = useEstimates();
  const { data: customers } = useCustomers();
  const { data: leads } = useLeads();
  const createEstimate = useCreateEstimate();
  const editEstimate = useUpdateEstimate();
  const deleteEstimate = useDeleteEstimate();
  const updateStatus = useUpdateEstimateStatus();
  const acceptEstimate = useAcceptEstimate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState("HVAC System Proposal");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [previewEstimate, setPreviewEstimate] = useState<Estimate | null>(null);

  useEffect(() => {
    const requestedCustomerId = new URLSearchParams(window.location.search).get("customerId");
    const requestedLeadId = new URLSearchParams(window.location.search).get("leadId");
    if (requestedCustomerId) {
      setCustomerId(requestedCustomerId);
      setOpen(true);
    }
    if (requestedLeadId) {
      setLeadId(requestedLeadId);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const selectedLead = (leads ?? []).find((lead) => lead.id === leadId);
    if (!selectedLead) return;
    if (!description) {
      setDescription(
        [selectedLead.equipment, selectedLead.scopeOfWork]
          .filter(Boolean)
          .join(" — "),
      );
    }
    if (!unitPrice && selectedLead.estimatePrice) {
      setUnitPrice(String(selectedLead.estimatePrice));
    }
  }, [description, leadId, leads, unitPrice]);

  const subtotal = useMemo(
    () => (Number(quantity) || 0) * (Number(unitPrice) || 0),
    [quantity, unitPrice],
  );
  const total = subtotal * (1 + (Number(taxPercent) || 0) / 100);

  const resetForm = () => {
    setEditingId(null);
    setCustomerId("");
    setLeadId("");
    setTitle("HVAC System Proposal");
    setDescription("");
    setQuantity("1");
    setUnitPrice("");
    setTaxPercent("0");
    setValidUntil("");
    setNotes("");
  };

  const beginEdit = (estimate: Estimate) => {
    const firstItem = estimate.lineItems[0];
    setEditingId(estimate.id);
    setCustomerId(estimate.customerId ?? "");
    setLeadId(estimate.leadId ?? "");
    setTitle(estimate.title);
    setDescription(firstItem?.description ?? "");
    setQuantity(String(firstItem?.quantity ?? 1));
    setUnitPrice(String(firstItem?.unit_price ?? 0));
    setTaxPercent(String(estimate.taxRate * 100));
    setValidUntil(estimate.validUntil ?? "");
    setNotes(estimate.notes ?? "");
    setOpen(true);
  };

  const submit = () => {
    if ((!customerId && !leadId) || !title.trim() || !description.trim() || subtotal <= 0) {
      toast({ title: "Missing estimate details", description: "Choose a lead or customer and enter a priced line item.", variant: "destructive" });
      return;
    }
    const input: EstimateInput = {
        customerId: customerId || undefined,
        leadId: leadId || undefined,
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
    };
    const callbacks = {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all });
          setOpen(false);
          resetForm();
          toast({ title: editingId ? "Estimate updated" : "Estimate created", description: editingId ? "Your changes were saved." : "The proposal was saved as a draft." });
        },
        onError: (error: Error) => toast({ title: "Estimate failed", description: error.message, variant: "destructive" }),
    };
    if (editingId) {
      editEstimate.mutate({ id: editingId, input }, callbacks);
    } else {
      createEstimate.mutate(input, callbacks);
    }
  };

  const removeEstimate = (estimate: Estimate) => {
    if (!window.confirm(`Delete ${estimate.title}? This cannot be undone.`)) return;
    deleteEstimate.mutate(estimate.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all });
        toast({ title: "Estimate deleted", description: "The estimate was permanently removed." });
      },
      onError: (error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
    });
  };

  const changeStatus = (id: string, status: EstimateStatus) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all }),
      onError: (error) => toast({ title: "Status update failed", description: error.message, variant: "destructive" }),
    });
  };

  const accept = (acceptance: { signedBy: string; signatureDataUrl: string }) => {
    if (!previewEstimate) return;
    acceptEstimate.mutate({ estimate: previewEstimate, acceptance }, {
      onSuccess: ({ customerId, leadId }) => {
        queryClient.invalidateQueries({ queryKey: estimateQueryKeys.all });
        setPreviewEstimate(null);
        toast({ title: "Estimate accepted", description: "Signature saved. Finish creating and scheduling the job." });
        const params = new URLSearchParams({ customerId });
        if (leadId) params.set("leadId", leadId);
        setLocation(`/jobs/new?${params.toString()}`);
      },
      onError: (error) => toast({ title: "Acceptance failed", description: error.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimates</h1>
          <p className="text-muted-foreground mt-2">Build and track customer proposals.</p>
        </div>
        <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />New Estimate</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Edit Estimate" : "Create Estimate"}</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2"><Label>Customer</Label><Select value={customerId} onValueChange={(value) => { setCustomerId(value); setLeadId(""); }}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{(customers ?? []).map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Or open lead</Label><Select value={leadId} onValueChange={(value) => { setLeadId(value); setCustomerId(""); }}><SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger><SelectContent>{(leads ?? []).filter((lead) => lead.status !== "lost" && lead.status !== "won").map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Proposal title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Line item</Label><Input placeholder="3-ton Daikin FIT system with installation" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                <div className="space-y-2"><Label>Unit price</Label><Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
                <div className="space-y-2"><Label>Tax %</Label><Input type="number" min="0" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></div>
              </div>
              <div className="rounded-lg border p-4 flex justify-between"><span className="text-muted-foreground">Estimate total</span><strong className="text-xl">{money.format(total)}</strong></div>
              <div className="space-y-2"><Label>Valid until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
              <div className="space-y-2"><Label>Walkthrough & customer notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Equipment condition, access, electrical, ductwork, measurements, customer requests..." /></div>
              <Button className="w-full" onClick={submit} disabled={createEstimate.isPending || editEstimate.isPending}>{createEstimate.isPending || editEstimate.isPending ? "Saving..." : editingId ? "Save Changes" : "Save Draft Estimate"}</Button>
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
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewEstimate(estimate)}><Eye className="h-4 w-4 mr-2" />Preview / Sign</Button>
                {estimate.status === "draft" && <Button size="sm" variant="outline" onClick={() => changeStatus(estimate.id, "sent")}><Send className="h-4 w-4 mr-2" />Mark Sent</Button>}
                {estimate.status === "sent" && <Button size="sm" variant="outline" onClick={() => changeStatus(estimate.id, "rejected")}>Reject</Button>}
                <Button size="sm" variant="outline" onClick={() => beginEdit(estimate)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={deleteEstimate.isPending} onClick={() => removeEstimate(estimate)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {estimate.notes && (
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-semibold">Walkthrough Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{estimate.notes}</p>
                </div>
              )}
              <EstimateWalkthroughPhotos estimateId={estimate.id} />
              <ContractVault estimateId={estimate.id} allowUpload />
            </CardContent>
          </Card>
        ))}
      </div>
      <EstimateProposalDialog
        estimate={previewEstimate}
        open={Boolean(previewEstimate)}
        onOpenChange={(nextOpen) => { if (!nextOpen) setPreviewEstimate(null); }}
        onAccept={accept}
        isAccepting={acceptEstimate.isPending}
      />
    </div>
  );
}
