import React from "react";
import { PushNotifications } from "@/components/push-notifications";
import { useDashboardStats } from "@/features/dashboard/dashboard.hooks";
import { useLeads } from "@/features/leads/leads.hooks";
import { getViewedLeadIds } from "@/features/leads/lead-views";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  BellRing,
  ArrowUpRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  PhoneForwarded,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();
  const { data: leads = [] } = useLeads();

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-pulse">
        <div className="h-72 rounded-3xl bg-muted" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 rounded-2xl bg-muted" />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 h-96 rounded-2xl bg-muted" />
          <div className="h-96 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8 text-destructive">
        Unable to load dashboard statistics.
      </div>
    );
  }

  const totalLeads = stats.totalLeads ?? 0;
  const wonLeads = stats.leadsByStatus.won ?? 0;
  const contactedLeads = stats.leadsByStatus.contacted ?? 0;
  const qualifiedLeads = stats.leadsByStatus.qualified ?? 0;
  const proposalLeads = stats.leadsByStatus.proposal ?? 0;
  const newLeads = stats.leadsByStatus.new ?? 0;
  const lostLeads = stats.leadsByStatus.lost ?? 0;
  const viewedLeadIds = getViewedLeadIds();
  const unreadLeads = leads.filter(
    (lead) => lead.status === "new" && !viewedLeadIds.has(lead.id),
  );

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const chartData = [
    {
      name: "New",
      value: newLeads,
      color: "#ED1C24",
    },
    {
      name: "Contacted",
      value: contactedLeads,
      color: "#F0444B",
    },
    {
      name: "Qualified",
      value: qualifiedLeads,
      color: "#8B5CF6",
    },
    {
      name: "Proposal",
      value: proposalLeads,
      color: "#2C7AF0",
    },
    {
      name: "Won",
      value: wonLeads,
      color: "#1565E8",
    },
    {
      name: "Lost",
      value: lostLeads,
      color: "#71717A",
    },
  ];

  const statusColors: Record<string, string> = {
    new: "bg-red-500/10 text-red-400 border-red-500/20",
    contacted: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    qualified: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    proposal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <PushNotifications />
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 md:p-8 righttemp-glow">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative grid grid-cols-1 xl:grid-cols-[1fr_520px] gap-8 xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-muted-foreground mb-4">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              RightTemp command center
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Business{" "}
              <span className="righttemp-gradient-text">Dashboard</span>
            </h1>

            <p className="text-muted-foreground mt-3 max-w-2xl text-sm md:text-base">
              A real-time view of leads, customers, pipeline activity, and field
              operations.
            </p>

            {/* Priority Action Queue */}
            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Today’s action queue
              </p>

              <div className="grid grid-cols-2 gap-3">
                {unreadLeads.length > 0 && (
                  <Link href="/leads" className="group flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.10] p-4 transition-all hover:border-red-500/50 hover:bg-red-500/[0.16]">
                    <div className="relative rounded-xl bg-red-500/20 p-2.5">
                      <BellRing className="h-5 w-5 text-red-400" />
                      <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unreadLeads.length}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">New Lead Inbound</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{unreadLeads.length === 1 ? unreadLeads[0].name : `${unreadLeads.length} untouched leads`}</p>
                      <p className="mt-2 text-[11px] font-bold text-red-400">View Leads <ArrowUpRight className="inline h-3 w-3" /></p>
                    </div>
                  </Link>
                )}
                <Link
                  href={stats.followUpsDue[0] ? `/leads/${stats.followUpsDue[0].id}` : "/leads"}
                  className="group flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 hover:bg-red-500/[0.12] hover:border-red-500/35 transition-all"
                >
                  <div className="rounded-xl bg-red-500/15 p-2.5">
                    <PhoneForwarded className="w-5 h-5 text-red-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{stats.followUpsDue.length} Follow-ups Due</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {stats.followUpsDue[0]?.name ?? "Nothing overdue"}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-red-400">Open Lead <ArrowUpRight className="inline h-3 w-3" /></p>
                  </div>
                </Link>

                <Link
                  href="/estimates"
                  className="group flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4 hover:bg-blue-500/[0.12] hover:border-blue-500/35 transition-all"
                >
                  <div className="rounded-xl bg-blue-500/15 p-2.5">
                    <BriefcaseBusiness className="w-5 h-5 text-blue-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{stats.sentEstimates.length} Awaiting Decisions</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {stats.sentEstimates[0] ? `${stats.sentEstimates[0].contactName} · ${money.format(stats.sentEstimates[0].total)}` : "No sent estimates waiting"}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-blue-400">Review Estimates <ArrowUpRight className="inline h-3 w-3" /></p>
                  </div>
                </Link>

                <Link
                  href={stats.unscheduledWon[0]?.customerId ? `/jobs/new?leadId=${stats.unscheduledWon[0].id}&customerId=${stats.unscheduledWon[0].customerId}` : stats.unscheduledWon[0] ? `/leads/${stats.unscheduledWon[0].id}` : "/jobs"}
                  className="group flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 hover:bg-amber-500/[0.12] hover:border-amber-500/35 transition-all"
                >
                  <div className="rounded-xl bg-amber-500/15 p-2.5">
                    <CalendarDays className="w-5 h-5 text-amber-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{stats.unscheduledWon.length} Won, Unscheduled</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {stats.unscheduledWon[0]?.name ?? "Every won job is scheduled"}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-amber-400">Schedule Job <ArrowUpRight className="inline h-3 w-3" /></p>
                  </div>
                </Link>

                <Link
                  href="/invoices"
                  className="group flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4 hover:bg-violet-500/[0.12] hover:border-violet-500/35 transition-all"
                >
                  <div className="rounded-xl bg-violet-500/15 p-2.5">
                    <WalletCards className="w-5 h-5 text-violet-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{stats.overdueInvoices.length} Overdue Invoices</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {stats.overdueInvoices[0] ? `${stats.overdueInvoices[0].contactName} · ${money.format(stats.overdueInvoices[0].balance)}` : "No overdue balances"}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-violet-400">Collect Payment <ArrowUpRight className="inline h-3 w-3" /></p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-lg font-bold">Today’s Snapshot</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your daily business overview
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5">
                <Clock3 className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">New Leads Today</p>
                  <Activity className="w-4 h-4 text-red-400" />
                </div>

                <p className="text-2xl font-bold font-mono mt-3">{stats.newLeadsToday}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Added since midnight
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Open Balance</p>
                  <WalletCards className="w-4 h-4 text-blue-400" />
                </div>

                <p className="text-xl md:text-2xl font-bold font-mono mt-3">{money.format(stats.outstandingInvoiceTotal)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across unpaid invoices
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Jobs Today</p>
                  <CalendarDays className="w-4 h-4 text-violet-400" />
                </div>

                <p className="text-2xl font-bold font-mono mt-3">
                  {stats.jobsToday}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Scheduled for today
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Revenue Today</p>
                  <BadgeDollarSign className="w-4 h-4 text-emerald-400" />
                </div>

                <p className="text-xl md:text-2xl font-bold font-mono mt-3">{money.format(stats.collectedToday)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Payments collected today
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Schedule */}
      <section>
        <Card className="border-violet-500/20 bg-card/80 overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-400" />Today’s Schedule</CardTitle>
              <CardDescription>{stats.todaysJobs.length} job{stats.todaysJobs.length === 1 ? "" : "s"} scheduled today</CardDescription>
            </div>
            <Link href="/schedule" className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20 transition-colors">
              View Full Calendar <ArrowUpRight className="inline h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.todaysJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center"><p className="text-sm text-muted-foreground">No jobs are scheduled today.</p><Link href="/schedule" className="mt-3 inline-block text-sm font-bold text-violet-400">Open Calendar to Schedule <ArrowUpRight className="inline h-4 w-4" /></Link></div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {stats.todaysJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="group rounded-xl border border-white/10 bg-white/[0.025] p-4 hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition-all">
                    <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{new Date(job.scheduledStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><p className="mt-1 text-sm font-semibold line-clamp-1">{job.customerName}</p></div><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] capitalize text-violet-300">{job.status.replace("_", " ")}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{job.title}{job.assignedTo ? ` · ${job.assignedTo}` : ""}</p>
                    <p className="mt-3 text-xs font-bold text-violet-400">Open Job <ArrowUpRight className="inline h-3.5 w-3.5" /></p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Main KPI Cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-white/10 bg-card/80">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-700" />

          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>

            <div className="rounded-xl bg-red-500/10 p-2">
              <Activity className="w-4 h-4 text-red-400" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl md:text-4xl font-extrabold font-mono">
              {totalLeads}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              All leads in the system
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/10 bg-card/80">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 to-blue-700" />

          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Active Pipeline
            </CardTitle>

            <div className="rounded-xl bg-blue-500/10 p-2">
              <Gauge className="w-4 h-4 text-blue-400" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-2xl md:text-4xl font-extrabold font-mono">
              {money.format(stats.activePipelineValue)}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {stats.activePipelineCount} open leads · {stats.openEstimateCount} estimates
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/10 bg-card/80">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-700" />

          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Active Customers
            </CardTitle>

            <div className="rounded-xl bg-emerald-500/10 p-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl md:text-4xl font-extrabold font-mono">
              {stats.activeCustomers}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Customers with open jobs
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/10 bg-card/80">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-violet-500 to-blue-600" />

          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>

            <div className="rounded-xl bg-violet-500/10 p-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl md:text-4xl font-extrabold font-mono">
              {Math.round(stats.conversionRate)}%
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Won out of won + lost leads
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Financial + Operations Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link href="/invoices">
        <Card className="cursor-pointer border-white/10 bg-gradient-to-br from-card to-blue-950/20 transition-colors hover:border-blue-500/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold mt-2 text-emerald-400">
                  {money.format(stats.monthlyCollected)}
                </p>
              </div>

              <div className="rounded-xl bg-blue-500/10 p-2.5">
                <BadgeDollarSign className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <p className="text-xs font-semibold text-blue-400 mt-4">
              View Invoices <ArrowUpRight className="inline h-3.5 w-3.5" />
            </p>
          </CardContent>
        </Card>
        </Link>

        <Card className="border-white/10 bg-gradient-to-br from-card to-red-950/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Profit</p>
                <p className={`text-2xl font-bold mt-2 ${stats.monthlyProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {money.format(stats.monthlyProfit)}
                </p>
              </div>

              <div className="rounded-xl bg-red-500/10 p-2.5">
                <WalletCards className="w-5 h-5 text-red-400" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              {money.format(stats.monthlyRevenue)} completed-job revenue · {stats.monthlyMarginPercent === null ? "—" : `${stats.monthlyMarginPercent.toFixed(1)}%`} margin
            </p>
          </CardContent>
        </Card>

        <Link href="/schedule">
        <Card className="h-full border-white/10 bg-card/80 hover:border-violet-500/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Jobs</p>
                <p className="text-2xl font-bold mt-2">{stats.scheduledJobs}</p>
              </div>

              <div className="rounded-xl bg-violet-500/10 p-2.5">
                <CalendarDays className="w-5 h-5 text-violet-400" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              View Calendar <ArrowUpRight className="inline h-3.5 w-3.5" />
            </p>
          </CardContent>
        </Card>
        </Link>

        <Card className="border-white/10 bg-card/80">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold mt-2">
                  {stats.totalCustomers}
                </p>
              </div>

              <div className="rounded-xl bg-cyan-500/10 p-2.5">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              All customer records
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts and Recent Leads */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-white/10 bg-card/80">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Sales Pipeline</CardTitle>
              <CardDescription>
                Lead distribution across each sales stage
              </CardDescription>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">
              <BriefcaseBusiness className="w-3.5 h-3.5 text-blue-400" />
              {totalLeads} total
            </div>
          </CardHeader>

          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 12,
                  right: 8,
                  left: -18,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.06)"
                />

                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />

                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                />

                <Tooltip
                  cursor={{
                    fill: "rgba(255,255,255,0.035)",
                  }}
                  contentStyle={{
                    background: "#0d0d0f",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                    color: "#ffffff",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                  }}
                />

                <Bar dataKey="value" radius={[10, 10, 2, 2]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`pipeline-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/80 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Leads</CardTitle>
                <CardDescription>
                  Latest activity in your pipeline
                </CardDescription>
              </div>

              <div className="rounded-xl bg-blue-500/10 p-2">
                <Clock3 className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1">
            {stats.recentLeads.length === 0 ? (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center">
                <div className="rounded-2xl bg-white/5 p-4 mb-3">
                  <Activity className="w-6 h-6 text-muted-foreground" />
                </div>

                <p className="font-medium">No recent leads</p>

                <p className="text-sm text-muted-foreground mt-1">
                  New lead activity will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentLeads.slice(0, 6).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.025] p-4 hover:bg-white/[0.05] hover:border-blue-500/20 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">
                        {lead.name}
                      </div>

                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${
                            statusColors[lead.status] ??
                            "bg-white/5 text-muted-foreground border-white/10"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] font-bold text-blue-400">
                      Open Lead <ArrowUpRight className="inline w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/leads"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm font-semibold hover:bg-white/[0.05] transition-colors"
            >
              View all leads
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
