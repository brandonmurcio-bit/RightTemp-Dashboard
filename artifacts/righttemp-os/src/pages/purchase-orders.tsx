import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { purchaseOrderQueryKeys, usePurchaseOrders, useUpdatePurchaseOrder } from "@/features/purchase-orders/purchase-orders.hooks";
import type { PoStatus, PurchaseOrder } from "@/features/purchase-orders/purchase-orders.types";
import { useToast } from "@/hooks/use-toast";

function PurchaseOrderCard({ order }: { order: PurchaseOrder }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateOrder = useUpdatePurchaseOrder();
  const [status, setStatus] = useState<PoStatus>(order.status);
  const [vendor, setVendor] = useState(order.vendor ?? "");
  const [amount, setAmount] = useState(order.amount?.toString() ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");

  const save = () => updateOrder.mutate(
    {
      id: order.id,
      input: { status, vendor, amount: amount ? Number(amount) : undefined, notes },
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.all });
        toast({ title: "PO updated", description: `${order.poNumber} was saved.` });
      },
      onError: (error) => toast({ title: "PO update failed", description: error.message, variant: "destructive" }),
    },
  );

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono font-bold text-primary">{order.poNumber}</p>
            <h2 className="font-semibold">{order.title}</h2>
            <p className="text-sm text-muted-foreground">{order.customerName}</p>
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as PoStatus)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Vendor</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="AC Pro" /></div>
          <div className="space-y-2"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
        </div>
        <div className="space-y-2"><Label>PO Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Equipment ordered, pickup date, model numbers..." /></div>
        <Button size="sm" onClick={save} disabled={updateOrder.isPending}><Save className="h-4 w-4 mr-2" />{updateOrder.isPending ? "Saving..." : "Save PO"}</Button>
      </CardContent>
    </Card>
  );
}

export default function PurchaseOrdersPage() {
  const { data: orders, isLoading, isError } = usePurchaseOrders();
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">PO Tracker</h1><p className="text-muted-foreground mt-2">Track equipment and material purchase orders for every job.</p></div>
      {isLoading && <Card><CardContent className="py-12 text-center">Loading purchase orders...</CardContent></Card>}
      {isError && <Card><CardContent className="py-12 text-center text-destructive">Unable to load purchase orders.</CardContent></Card>}
      {!isLoading && !isError && (orders ?? []).length === 0 && <Card><CardContent className="py-14 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-3" />No purchase orders yet.</CardContent></Card>}
      <div className="grid gap-4 lg:grid-cols-2">{(orders ?? []).map((order) => <PurchaseOrderCard key={order.id} order={order} />)}</div>
    </div>
  );
}
