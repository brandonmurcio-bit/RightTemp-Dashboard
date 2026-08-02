import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DollarSign, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard.hooks";
import {
  jobCostQueryKeys,
  useCreateJobCost,
  useDeleteJobCost,
  useJobProfitability,
  useUpdateJobCost,
} from "@/features/job-costing/job-costing.hooks";
import type { JobCost, JobCostCategory, JobCostInput } from "@/features/job-costing/job-costing.types";
import { useToast } from "@/hooks/use-toast";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function CostDialog({ jobId, cost }: { jobId: string; cost?: JobCost }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<JobCostCategory>(cost?.category ?? "labor");
  const [description, setDescription] = useState(cost?.description ?? "");
  const [quantity, setQuantity] = useState(String(cost?.quantity ?? 1));
  const [unitCost, setUnitCost] = useState(String(cost?.unitCost ?? ""));
  const [notes, setNotes] = useState(cost?.notes ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCost = useCreateJobCost();
  const updateCost = useUpdateJobCost();

  const save = () => {
    const input: JobCostInput = {
      category,
      description: description.trim(),
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      notes: notes.trim() || undefined,
    };
    if (
      !input.description ||
      !Number.isFinite(input.quantity) ||
      !Number.isFinite(input.unitCost) ||
      input.quantity <= 0 ||
      input.unitCost < 0
    ) {
      toast({ title: "Enter a description, quantity, and valid cost.", variant: "destructive" });
      return;
    }
    const callbacks = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: jobCostQueryKeys.profitability(jobId) });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
        setOpen(false);
        toast({ title: cost ? "Cost updated" : "Cost added" });
      },
      onError: (error: Error) =>
        toast({ title: "Unable to save cost", description: error.message, variant: "destructive" }),
    };
    if (cost) updateCost.mutate({ id: cost.id, input }, callbacks);
    else createCost.mutate({ jobId, input }, callbacks);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {cost ? (
          <Button type="button" size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button type="button" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Cost</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{cost ? "Edit Job Cost" : "Add Job Cost"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={(value) => setCategory(value as JobCostCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="labor">Labor</SelectItem><SelectItem value="materials">Extra Materials</SelectItem><SelectItem value="equipment">Additional Equipment</SelectItem><SelectItem value="permit">Permit</SelectItem><SelectItem value="subcontractor">Subcontractor</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Two installers, permit fee, crane..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Quantity / Hours</Label><Input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
            <div className="space-y-2"><Label>Cost Each</Label><Input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></div>
          </div>
          <div className="rounded-lg border p-3 text-sm"><span className="text-muted-foreground">Line total: </span><strong>{money.format((Number(quantity) || 0) * (Number(unitCost) || 0))}</strong></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          <Button className="w-full" onClick={save} disabled={createCost.isPending || updateCost.isPending}>Save Cost</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JobProfitabilityCard({ jobId }: { jobId: string }) {
  const { data, isLoading, isError } = useJobProfitability(jobId);
  const deleteCost = useDeleteJobCost();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return <Card><CardContent className="py-8 text-muted-foreground">Loading profitability...</CardContent></Card>;
  if (isError || !data) return <Card><CardContent className="py-8 text-destructive">Unable to load job profitability.</CardContent></Card>;

  const positive = data.grossProfit >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Job Profitability</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">PO cost is included automatically. Add only costs not already in the PO.</p>
        </div>
        <CostDialog jobId={jobId} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Contract Revenue</p><p className="mt-1 text-xl font-bold">{money.format(data.revenue)}</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Total Cost</p><p className="mt-1 text-xl font-bold">{money.format(data.totalCost)}</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Gross Profit</p><p className={`mt-1 text-xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>{money.format(data.grossProfit)}</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Margin</p><p className={`mt-1 text-xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>{data.marginPercent === null ? "—" : `${data.marginPercent.toFixed(1)}%`}</p></div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex justify-between rounded-lg border p-3 text-sm"><span className="text-muted-foreground">Job PO</span><strong>{money.format(data.poCost)}</strong></div>
          <div className="flex justify-between rounded-lg border p-3 text-sm"><span className="text-muted-foreground">Added Costs</span><strong>{money.format(data.manualCost)}</strong></div>
        </div>

        {data.revenue === 0 && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">No won estimate is linked to this job, so contract revenue is currently $0.</p>
        )}

        <div className="space-y-2">
          {data.costs.map((cost) => (
            <div key={cost.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{cost.description}</p>
                <p className="text-xs capitalize text-muted-foreground">{cost.category} · {cost.quantity} × {money.format(cost.unitCost)}</p>
              </div>
              <div className="flex items-center gap-1">
                <strong className="mr-1 text-sm">{money.format(cost.totalCost)}</strong>
                <CostDialog jobId={jobId} cost={cost} />
                <Button type="button" size="icon" variant="ghost" className="text-destructive" disabled={deleteCost.isPending} onClick={() => {
                  if (!window.confirm(`Delete ${cost.description}?`)) return;
                  deleteCost.mutate(cost.id, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: jobCostQueryKeys.profitability(jobId) });
                      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
                    },
                    onError: (error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
                  });
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {data.costs.length === 0 && <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"><DollarSign className="mx-auto mb-2 h-5 w-5" />No additional costs entered.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
