import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Banknote, CircleDollarSign, ExternalLink, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountsReceivable } from "@/features/accounts-receivable/accounts-receivable.hooks";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function InvoicesPage() {
  const { data: invoices = [], isLoading, isError } = useAccountsReceivable();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch = !term || [invoice.invoiceNumber, invoice.customerName, invoice.jobTitle, invoice.poNumber].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = status === "all" || (status === "open" ? ["draft", "sent", "partial", "overdue"].includes(invoice.displayStatus) : invoice.displayStatus === status);
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, status]);

  const outstanding = invoices.filter((invoice) => !["paid", "void"].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const overdue = invoices.filter((invoice) => invoice.displayStatus === "overdue").reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const paid = invoices.filter((invoice) => invoice.status !== "void").reduce((sum, invoice) => sum + invoice.amountPaid, 0);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading accounts receivable...</div>;
  if (isError) return <div className="p-8 text-destructive">Unable to load accounts receivable.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div><h1 className="text-3xl font-bold">Invoices & Receivables</h1><p className="mt-1 text-muted-foreground">See what has been billed, collected, and is still owed.</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Outstanding</p><p className="mt-1 text-2xl font-bold">{money.format(outstanding)}</p></div><CircleDollarSign className="h-6 w-6 text-blue-400" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-bold text-red-400">{money.format(overdue)}</p></div><AlertTriangle className="h-6 w-6 text-red-400" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">All-Time Collected</p><p className="mt-1 text-2xl font-bold text-emerald-400">{money.format(paid)}</p></div><Banknote className="h-6 w-6 text-emerald-400" /></CardContent></Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search invoice, customer, job, or PO..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open balances</SelectItem><SelectItem value="all">All invoices</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="void">Void</SelectItem></SelectContent></Select>
      </div>
      <div className="space-y-3">
        {filtered.map((invoice) => (
          <Card key={invoice.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3"><div><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-4 w-4 text-primary" />{invoice.invoiceNumber}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{invoice.customerName} · {invoice.poNumber}</p></div><Badge variant={invoice.displayStatus === "overdue" || invoice.status === "void" ? "destructive" : invoice.status === "paid" ? "default" : "secondary"} className="capitalize">{invoice.displayStatus}</Badge></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-xs text-muted-foreground">Invoice</p><strong>{money.format(invoice.total)}</strong></div><div><p className="text-xs text-muted-foreground">Paid</p><strong className="text-emerald-400">{money.format(invoice.amountPaid)}</strong></div><div><p className="text-xs text-muted-foreground">Balance</p><strong>{money.format(invoice.balanceDue)}</strong></div></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p className="text-sm font-medium">{invoice.jobTitle}</p><p className={`text-xs ${invoice.displayStatus === "overdue" ? "text-red-400" : "text-muted-foreground"}`}>Due {date.format(new Date(`${invoice.dueDate}T12:00:00`))} · Net 30</p></div><Button asChild size="sm" variant="outline"><Link href={`/jobs/${invoice.jobId}`}><ExternalLink className="mr-2 h-4 w-4" />Open Job</Link></Button></div>
            </CardContent>
          </Card>
        ))}
        {!filtered.length && <Card><CardContent className="py-12 text-center text-muted-foreground">No invoices match this view.</CardContent></Card>}
      </div>
    </div>
  );
}
