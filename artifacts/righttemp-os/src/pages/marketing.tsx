import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Filter,
  Loader2,
  Megaphone,
  Pencil,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";

type DashboardSummary = {
  totalLeads?: number;
  newLeads?: number;
  contactedLeads?: number;
  qualifiedLeads?: number;
  proposalLeads?: number;
  wonLeads?: number;
  lostLeads?: number;
  qualificationRate?: number;
  proposalRate?: number;
  conversionRate?: number;
  estimatedRevenue?: number;
  soldRevenue?: number;
  totalSpend?: number;
  costPerLead?: number;
  roas?: number;
};

type SourcePerformance = {
  label?: string;
  leads?: number;
  won?: number;
  soldRevenue?: number;
};

type CampaignPerformance = {
  label?: string;
  leads?: number;
  qualified?: number;
  won?: number;
  lost?: number;
  estimatedRevenue?: number;
  soldRevenue?: number;
};

type AttributionLead = {
  id: string | number;
  name?: string;
  createdAt?: string;
  status?: string;
  source?: string;
  serviceType?: string;
  urgency?: string;
  attributionSource?: string;
  attributionMedium?: string;
  attributionCampaign?: string;
  attributionContent?: string;
  attributionTerm?: string;
  landingPage?: string;
  referrer?: string;
  clickId?: string;
  estimatedRevenue?: number;
  soldRevenue?: number;
};

type SpendRow = {
  id?: string | number;
  spendDate?: string;
  campaign?: string;
  source?: string;
  medium?: string;
  amount?: number;
  description?: string;
};

type MarketingDashboard = {
  summary?: DashboardSummary;
  bySource?: SourcePerformance[];
  byMedium?: SourcePerformance[];
  byCampaign?: CampaignPerformance[];
  leads?: AttributionLead[];
  spend?: SpendRow[];
};

const today = new Date();
const initialStart = new Date(today);
initialStart.setDate(today.getDate() - 29);

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
});

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const titleCase = (value?: string) =>
  (value || "Unattributed")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const percent = (value: unknown) => `${numberValue(value).toFixed(1)}%`;

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: "red" | "blue" | "amber" | "green";
}) {
  const toneClasses = {
    red: "border-red-500/20 bg-red-500/[0.07] text-red-300",
    blue: "border-sky-500/20 bg-sky-500/[0.07] text-sky-300",
    amber: "border-amber-500/20 bg-amber-500/[0.07] text-amber-300",
    green: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
  }[tone];

  return (
    <Card className={`relative overflow-hidden border-white/10 bg-card/70 ${toneClasses.split(" ").slice(0, 2).join(" ")}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${tone === "red" ? "bg-red-500" : tone === "blue" ? "bg-sky-400" : tone === "amber" ? "bg-amber-400" : "bg-emerald-400"}`} />
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <div className={`rounded-lg border border-current/20 bg-background/20 p-2 ${toneClasses.split(" ").slice(2).join(" ")}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-4 font-mono text-2xl font-bold tracking-tight md:text-3xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function PerformanceTable({
  title,
  description,
  rows,
  kind,
}: {
  title: string;
  description: string;
  rows: SourcePerformance[] | CampaignPerformance[];
  kind: "source" | "campaign";
}) {
  const maxLeads = Math.max(...rows.map((row) => numberValue(row.leads)), 1);

  return (
    <Card className="border-white/10 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No attributed activity in this period.
          </div>
        ) : (
          rows.slice(0, 8).map((row, index) => {
            const campaign = row as CampaignPerformance;
            const source = row as SourcePerformance;
            return (
              <div key={`${row.label || "unknown"}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{titleCase(row.label)}</p>
                    <p className="text-xs text-muted-foreground">
                      {numberValue(row.leads)} leads · {numberValue(row.won)} won
                      {kind === "campaign" && ` · ${numberValue(campaign.qualified)} qualified`}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold text-emerald-300">
                    {compactMoney.format(numberValue(row.soldRevenue))}
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-300 transition-all"
                    style={{ width: `${Math.max((numberValue(row.leads) / maxLeads) * 100, 4)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
      <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-muted/60" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-xl bg-muted/60" />)}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const [startDate, setStartDate] = useState(initialStart.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [dashboard, setDashboard] = useState<MarketingDashboard | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [spendForm, setSpendForm] = useState({
    spendDate: today.toISOString().slice(0, 10),
    campaign: "",
    source: "",
    medium: "",
    amount: "",
    description: "",
  });
  const [spendMessage, setSpendMessage] = useState("");
  const [isSavingSpend, setIsSavingSpend] = useState(false);
  const [editingSpendId, setEditingSpendId] = useState<string | number | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const orgId = organizationId || await getCurrentOrganizationId();
      setOrganizationId(orgId);
      const { data, error: rpcError } = await supabase.rpc("get_marketing_dashboard", {
        p_organization_id: orgId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (rpcError) throw rpcError;
      setDashboard((data || {}) as MarketingDashboard);
      setLastUpdated(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load marketing performance.");
    } finally {
      setIsLoading(false);
    }
  }, [endDate, organizationId, startDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summary = dashboard?.summary || {};
  const leads = dashboard?.leads || [];
  const spend = dashboard?.spend || [];
  const campaignRows = dashboard?.byCampaign || [];
  const isEmpty = !isLoading && !error && !dashboard;

  const visibleSpend = useMemo(
    () => [...spend].sort((a, b) => String(b.spendDate || "").localeCompare(String(a.spendDate || ""))),
    [spend],
  );

  const handleSaveSpend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSpendMessage("");
    const amount = Number(spendForm.amount);
    if (!spendForm.spendDate || !spendForm.campaign.trim() || !Number.isFinite(amount) || amount <= 0) {
      setSpendMessage("Enter a campaign, spend date, and a positive amount.");
      return;
    }
    setIsSavingSpend(true);
    try {
      const orgId = organizationId || await getCurrentOrganizationId();
      const spendPayload = {
        organization_id: orgId,
        spend_date: spendForm.spendDate,
        campaign: spendForm.campaign.trim(),
        source: spendForm.source.trim() || null,
        medium: spendForm.medium.trim() || null,
        amount,
        description: spendForm.description.trim() || null,
      };
      const result = editingSpendId
        ? await supabase.from("marketing_campaign_spend").update(spendPayload).eq("id", editingSpendId).eq("organization_id", orgId)
        : await supabase.from("marketing_campaign_spend").insert(spendPayload);
      if (result.error) throw result.error;
      setSpendForm({ spendDate: endDate, campaign: "", source: "", medium: "", amount: "", description: "" });
      setEditingSpendId(null);
      setSpendMessage(editingSpendId ? "Spend updated. Dashboard totals refreshed." : "Spend recorded. Dashboard totals refreshed.");
      await loadDashboard();
    } catch (caught) {
      setSpendMessage(caught instanceof Error ? caught.message : "Unable to record spend.");
    } finally {
      setIsSavingSpend(false);
    }
  };

  if (isLoading && !dashboard) return <Skeleton />;

  if (error) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center p-6 text-center">
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300"><Megaphone className="h-6 w-6" /></div>
        <h1 className="text-xl font-bold">Marketing data is unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6 gap-2" onClick={() => void loadDashboard()}><RefreshCw className="h-4 w-4" />Try again</Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center p-6 text-center">
        <Target className="mb-4 h-8 w-8 text-red-400" />
        <h1 className="text-2xl font-bold">Your attribution workspace is ready</h1>
        <p className="mt-2 text-sm text-muted-foreground">There is no marketing activity for this organization yet.</p>
        <Button className="mt-6" onClick={() => void loadDashboard()}>Refresh workspace</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:space-y-8 md:p-8">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(120deg,rgba(155,23,30,.28),rgba(19,36,61,.85)_52%,rgba(10,15,26,.92))] p-5 md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-red-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-200">
                <Megaphone className="h-3.5 w-3.5" /> RightTemp Marketing
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-foreground md:text-5xl">Make every lead source answer for itself.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">A focused view of acquisition, pipeline movement, and revenue outcomes for the period you choose.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-background/20 p-3 backdrop-blur-sm sm:flex-row sm:items-end">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="marketing-start" className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
                  <Input id="marketing-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-9 border-white/10 bg-background/40 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="marketing-end" className="text-[10px] uppercase tracking-wider text-muted-foreground">Through</Label>
                  <Input id="marketing-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-9 border-white/10 bg-background/40 text-sm" />
                </div>
              </div>
              <Button variant="secondary" className="h-9 gap-2" onClick={() => void loadDashboard()} disabled={isLoading}><Filter className="h-3.5 w-3.5" />Update view</Button>
            </div>
          </div>
          <div className="relative mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(startDate)} — {formatDate(endDate)}
            {lastUpdated && <span className="text-muted-foreground/60">· refreshed {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Leads captured" value={String(numberValue(summary.totalLeads))} detail={`${numberValue(summary.newLeads)} new in period`} icon={Users} tone="red" />
          <StatCard label="Qualified" value={String(numberValue(summary.qualifiedLeads))} detail={`${percent(summary.qualificationRate)} qualification rate`} icon={Target} tone="blue" />
          <StatCard label="Sold revenue" value={compactMoney.format(numberValue(summary.soldRevenue))} detail={`${numberValue(summary.wonLeads)} won opportunities`} icon={CircleDollarSign} tone="green" />
          <StatCard label="Return on spend" value={`${numberValue(summary.roas).toFixed(2)}x`} detail={`${money.format(numberValue(summary.totalSpend))} tracked spend`} icon={TrendingUp} tone="amber" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <Card className="border-white/10 bg-card/70">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
              <div><CardTitle className="text-base">Pipeline outcomes</CardTitle><CardDescription>Where attributed leads are moving next.</CardDescription></div>
              <Badge variant="outline" className="border-white/10 text-xs">{numberValue(summary.totalLeads)} total</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[
                  ["New", summary.newLeads, "text-red-300"],
                  ["Contacted", summary.contactedLeads, "text-sky-300"],
                  ["Qualified", summary.qualifiedLeads, "text-violet-300"],
                  ["Proposal", summary.proposalLeads, "text-amber-300"],
                  ["Won", summary.wonLeads, "text-emerald-300"],
                  ["Lost", summary.lostLeads, "text-muted-foreground"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className={`mt-2 font-mono text-xl font-bold ${color}`}>{numberValue(value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
                <div><p className="text-xs text-muted-foreground">Proposal rate</p><p className="mt-1 font-mono font-semibold">{percent(summary.proposalRate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Win rate</p><p className="mt-1 font-mono font-semibold">{percent(summary.conversionRate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Estimated value</p><p className="mt-1 font-mono font-semibold text-emerald-300">{money.format(numberValue(summary.estimatedRevenue))}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-card/70">
            <CardHeader className="pb-4"><CardTitle className="text-base">Spend efficiency</CardTitle><CardDescription>Marketing investment against realized outcomes.</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">Cost per lead</p><p className="mt-1 font-mono text-3xl font-bold">{money.format(numberValue(summary.costPerLead))}</p></div><BarChart3 className="mb-1 h-8 w-8 text-amber-300" /></div>
                <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${Math.min(numberValue(summary.roas) * 18, 100)}%` }} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><p className="text-xs text-muted-foreground">Tracked spend</p><p className="mt-1 font-mono font-semibold">{money.format(numberValue(summary.totalSpend))}</p></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><p className="text-xs text-muted-foreground">Sold / spend</p><p className="mt-1 font-mono font-semibold text-emerald-300">{numberValue(summary.roas).toFixed(2)}x</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <PerformanceTable title="By source" description="Lead volume and sold revenue." rows={dashboard?.bySource || []} kind="source" />
          <PerformanceTable title="By medium" description="The channel layer behind each source." rows={dashboard?.byMedium || []} kind="source" />
          <PerformanceTable title="Campaign scoreboard" description="Campaigns with pipeline context." rows={campaignRows} kind="campaign" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <Card className="border-white/10 bg-card/70">
            <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Attributed lead register</CardTitle><CardDescription>Marketing context only — operational contact details stay in Leads.</CardDescription></div><Badge variant="outline" className="border-white/10">{leads.length} records</Badge></CardHeader>
            <CardContent>
              {leads.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">No leads matched this period.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><th className="pb-3 pr-4">Lead</th><th className="pb-3 pr-4">Stage</th><th className="pb-3 pr-4">Attribution</th><th className="pb-3 pr-4">Landing page</th><th className="pb-3 text-right">Value</th></tr></thead>
                    <tbody>{leads.slice(0, 40).map((lead) => (
                      <tr key={String(lead.id)} className="border-b border-white/[0.06] align-top last:border-0">
                        <td className="py-3 pr-4"><p className="font-semibold">{lead.name || "Unnamed lead"}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(lead.createdAt)} · {titleCase(lead.serviceType)}</p></td>
                        <td className="py-3 pr-4"><Badge variant="outline" className="border-white/10 text-[10px]">{titleCase(lead.status)}</Badge><p className="mt-1 text-xs text-muted-foreground">{titleCase(lead.urgency)}</p></td>
                         <td className="py-3 pr-4">
                           <p className="font-medium">{titleCase(lead.attributionSource || lead.source)}</p>
                           <p className="mt-1 text-xs text-muted-foreground">{titleCase(lead.attributionMedium)}{lead.attributionCampaign ? ` · ${lead.attributionCampaign}` : ""}</p>
                           {(lead.attributionContent || lead.attributionTerm || lead.referrer || lead.clickId) && (
                             <p className="mt-1 max-w-[260px] truncate text-[10px] text-muted-foreground/80" title={[lead.attributionContent && `content: ${lead.attributionContent}`, lead.attributionTerm && `term: ${lead.attributionTerm}`, lead.referrer && `referrer: ${lead.referrer}`, lead.clickId && `click: ${lead.clickId}`].filter(Boolean).join(" · ")}>
                               {[lead.attributionContent && `content: ${lead.attributionContent}`, lead.attributionTerm && `term: ${lead.attributionTerm}`, lead.referrer && `referrer: ${lead.referrer}`, lead.clickId && `click: ${lead.clickId}`].filter(Boolean).join(" · ")}
                             </p>
                           )}
                         </td>
                        <td className="max-w-[180px] truncate py-3 pr-4 text-xs text-muted-foreground" title={lead.landingPage || ""}>{lead.landingPage || lead.referrer || "—"}</td>
                        <td className="py-3 text-right"><p className="font-mono font-semibold text-emerald-300">{money.format(numberValue(lead.soldRevenue || lead.estimatedRevenue))}</p><p className="mt-1 text-[10px] text-muted-foreground">{lead.soldRevenue ? "sold" : "estimated"}</p></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="pb-4"><CardTitle className="text-base">{editingSpendId ? "Edit campaign spend" : "Record campaign spend"}</CardTitle><CardDescription>{editingSpendId ? "Correct the selected line item without changing its history." : "Add a spend line to keep CPL and ROAS honest."}</CardDescription></CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleSaveSpend}>
                  <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="spend-date">Date</Label><Input id="spend-date" type="date" value={spendForm.spendDate} onChange={(event) => setSpendForm((current) => ({ ...current, spendDate: event.target.value }))} /></div><div className="space-y-1.5"><Label htmlFor="spend-amount">Amount</Label><Input id="spend-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={spendForm.amount} onChange={(event) => setSpendForm((current) => ({ ...current, amount: event.target.value }))} /></div></div>
                  <div className="space-y-1.5"><Label htmlFor="spend-campaign">Campaign</Label><Input id="spend-campaign" placeholder="Summer tune-up search" value={spendForm.campaign} onChange={(event) => setSpendForm((current) => ({ ...current, campaign: event.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="spend-source">Source</Label><Input id="spend-source" placeholder="Google" value={spendForm.source} onChange={(event) => setSpendForm((current) => ({ ...current, source: event.target.value }))} /></div><div className="space-y-1.5"><Label htmlFor="spend-medium">Medium</Label><Input id="spend-medium" placeholder="Paid search" value={spendForm.medium} onChange={(event) => setSpendForm((current) => ({ ...current, medium: event.target.value }))} /></div></div>
                  <div className="space-y-1.5"><Label htmlFor="spend-description">Note <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="spend-description" rows={2} placeholder="Invoice, placement, or flight note" value={spendForm.description} onChange={(event) => setSpendForm((current) => ({ ...current, description: event.target.value }))} /></div>
                  {spendMessage && <p className={`text-xs ${spendMessage.includes("recorded") ? "text-emerald-300" : "text-red-300"}`}>{spendMessage}</p>}
                  <div className="flex gap-2">
                    {editingSpendId && <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingSpendId(null); setSpendForm({ spendDate: endDate, campaign: "", source: "", medium: "", amount: "", description: "" }); setSpendMessage(""); }}>Cancel edit</Button>}
                    <Button type="submit" className="flex-1" disabled={isSavingSpend}>{isSavingSpend ? <><Loader2 className="h-4 w-4 animate-spin" />Saving</> : editingSpendId ? "Update spend" : "Record spend"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="pb-3"><CardTitle className="text-base">Recent spend</CardTitle><CardDescription>{visibleSpend.length} tracked line items</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {visibleSpend.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-muted-foreground">No spend recorded yet.</p> : visibleSpend.slice(0, 5).map((row, index) => <div key={`${row.id || row.spendDate}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{row.campaign || "Unassigned campaign"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{formatDate(row.spendDate)} · {titleCase(row.source)} / {titleCase(row.medium)}</p></div><div className="flex shrink-0 items-center gap-2"><p className="font-mono text-sm font-semibold">{money.format(numberValue(row.amount))}</p>{row.id && <Button variant="ghost" size="icon" aria-label={`Edit ${row.campaign || "spend line"}`} className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingSpendId(row.id ?? null); setSpendForm({ spendDate: row.spendDate || endDate, campaign: row.campaign || "", source: row.source || "", medium: row.medium || "", amount: String(numberValue(row.amount)), description: row.description || "" }); setSpendMessage(""); }}> <Pencil className="h-3.5 w-3.5" /></Button>}</div></div>)}
              </CardContent>
            </Card>
          </div>
        </section>
        <footer className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-muted-foreground"><span>Attribution workspace · restricted marketing access</span><span className="font-mono">{startDate} → {endDate}</span></footer>
      </div>
    </div>
  );
}