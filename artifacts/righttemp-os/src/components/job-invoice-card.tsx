import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, FileText, Plus, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dashboardQueryKeys } from "@/features/dashboard/dashboard.hooks";
import { accountsReceivableQueryKeys } from "@/features/accounts-receivable/accounts-receivable.hooks";
import { invoiceQueryKeys, useCreateInvoice, useDeletePaymentTransaction, useJobInvoice, useMarkInvoiceSent, useRecordPayment, useVoidInvoice } from "@/features/invoices/invoices.hooks";
import type { JobInvoice, PaymentMethod } from "@/features/invoices/invoices.types";
import { useToast } from "@/hooks/use-toast";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function PaymentDialog({ invoice }: { invoice: JobInvoice }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const recordPayment = useRecordPayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > invoice.balanceDue) {
      toast({ title: "Enter a payment no greater than the remaining balance.", variant: "destructive" });
      return;
    }
    recordPayment.mutate({ invoice, input: { amount: numericAmount, paymentMethod: method, paymentDate: date, reference: reference.trim() || undefined, notes: notes.trim() || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.job(invoice.jobId) });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
        setOpen(false);
        toast({ title: "Payment recorded", description: `${money.format(numericAmount)} added to ${invoice.invoiceNumber}.` });
      },
      onError: (error) => toast({ title: "Payment failed", description: error.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button disabled={invoice.status === "void" || invoice.balanceDue <= 0}><Plus className="mr-2 h-4 w-4" />Record Payment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm"><span className="text-muted-foreground">Balance due: </span><strong>{money.format(invoice.balanceDue)}</strong></div>
          <div className="space-y-2"><Label>Amount</Label><Input type="number" min="0.01" max={invoice.balanceDue} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Method</Label><Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="ach">ACH</SelectItem><SelectItem value="financing">Financing</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Reference / check number</Label><Input value={reference} onChange={(event) => setReference(event.target.value)} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          <Button className="w-full" onClick={save} disabled={recordPayment.isPending}>{recordPayment.isPending ? "Recording..." : "Save Payment"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JobInvoiceCard({ jobId }: { jobId: string }) {
  const { data: invoice, isLoading, isError } = useJobInvoice(jobId);
  const createInvoice = useCreateInvoice();
  const markSent = useMarkInvoiceSent();
  const voidInvoice = useVoidInvoice();
  const deletePayment = useDeletePaymentTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.job(jobId) });
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats });
    queryClient.invalidateQueries({ queryKey: accountsReceivableQueryKeys.all });
  };
  const fail = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "destructive" as const });

  if (isLoading) return <Card><CardContent className="py-8 text-muted-foreground">Loading invoice...</CardContent></Card>;
  if (isError) return <Card><CardContent className="py-8 text-destructive">Unable to load invoice.</CardContent></Card>;
  if (!invoice) return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Invoice & Payments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Create an invoice using the won estimate linked to this job.</p>
        <Button onClick={() => createInvoice.mutate(jobId, { onSuccess: () => { refresh(); toast({ title: "Invoice created" }); }, onError: fail("Invoice creation failed") })} disabled={createInvoice.isPending}><Plus className="mr-2 h-4 w-4" />{createInvoice.isPending ? "Creating..." : "Create Invoice"}</Button>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />{invoice.invoiceNumber}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{invoice.title}</p></div>
        <Badge className="capitalize" variant={invoice.status === "paid" ? "default" : invoice.status === "void" ? "destructive" : "secondary"}>{invoice.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Invoice</p><p className="mt-1 font-bold">{money.format(invoice.total)}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="mt-1 font-bold text-emerald-400">{money.format(invoice.amountPaid)}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Balance</p><p className="mt-1 font-bold">{money.format(invoice.balanceDue)}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentDialog invoice={invoice} />
          {invoice.status === "draft" && <Button variant="outline" onClick={() => markSent.mutate(invoice.id, { onSuccess: () => { refresh(); toast({ title: "Invoice marked sent" }); }, onError: fail("Update failed") })}><Send className="mr-2 h-4 w-4" />Mark Sent</Button>}
          {invoice.status !== "void" && invoice.status !== "paid" && <Button variant="ghost" className="text-destructive" onClick={() => { if (!window.confirm(`Void ${invoice.invoiceNumber}?`)) return; voidInvoice.mutate(invoice.id, { onSuccess: () => { refresh(); toast({ title: "Invoice voided" }); }, onError: fail("Unable to void invoice") }); }}>Void</Button>}
        </div>
        {invoice.status === "paid" && <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />Paid in full</p>}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Payment History</h3>
          {invoice.transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{money.format(transaction.amount)} · <span className="capitalize">{transaction.paymentMethod}</span></p><p className="text-xs text-muted-foreground">{transaction.paymentDate}{transaction.reference ? ` · ${transaction.reference}` : ""}</p></div><Button size="icon" variant="ghost" className="text-destructive" disabled={deletePayment.isPending} onClick={() => { if (!window.confirm(`Remove this ${money.format(transaction.amount)} payment?`)) return; deletePayment.mutate(transaction.id, { onSuccess: () => { refresh(); toast({ title: "Payment removed" }); }, onError: fail("Unable to remove payment") }); }}><Trash2 className="h-4 w-4" /></Button></div>)}
          {!invoice.transactions.length && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No payments recorded.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
