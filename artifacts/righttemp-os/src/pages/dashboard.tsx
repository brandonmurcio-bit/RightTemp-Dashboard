import React from "react";
import { useDashboardStats } from "@/features/dashboard/dashboard.hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  ArrowUpRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  PhoneCall,
  Plus,
  TrendingUp,
  UserPlus,
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

  const activePipeline = Math.max(totalLeads - wonLeads, 0);

  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

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

            {/* Quick Actions */}
            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Quick actions
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/leads"
                  className="group flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 hover:bg-red-500/[0.12] hover:border-red-500/35 transition-all"
                >
                  <div className="rounded-xl bg-red-500/15 p-2.5">
                    <Plus className="w-5 h-5 text-red-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">New Lead</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Open leads
                    </p>
                  </div>
                </Link>

                <Link
                  href="/customers"
                  className="group flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4 hover:bg-blue-500/[0.12] hover:border-blue-500/35 transition-all"
                >
                  <div className="rounded-xl bg-blue-500/15 p-2.5">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Add Customer</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Open customers
                    </p>
                  </div>
                </Link>

                <Link
                  href="/estimates"
                  className="group flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 hover:bg-amber-500/[0.12] hover:border-amber-500/35 transition-all"
                >
                  <div className="rounded-xl bg-amber-500/15 p-2.5">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Create Estimate</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Open estimates
                    </p>
                  </div>
                </Link>

                <Link
                  href="/schedule"
                  className="group flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4 hover:bg-violet-500/[0.12] hover:border-violet-500/35 transition-all"
                >
                  <div className="rounded-xl bg-violet-500/15 p-2.5">
                    <CalendarDays className="w-5 h-5 text-violet-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Schedule</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      View calendar
                    </p>
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
                  <p className="text-xs text-muted-foreground">New Leads</p>
                  <Activity className="w-4 h-4 text-red-400" />
                </div>

                <p className="text-2xl font-bold font-mono mt-3">{newLeads}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Currently marked new
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Calls Today</p>
                  <PhoneCall className="w-4 h-4 text-blue-400" />
                </div>

                <p className="text-2xl font-bold font-mono mt-3">—</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Phone tracking coming soon
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

                <p className="text-2xl font-bold font-mono mt-3">$—</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Invoicing coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
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
            <div className="text-3xl md:text-4xl font-extrabold font-mono">
              {activePipeline}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Leads still in progress
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
              Currently being serviced
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
              {conversionRate}%
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Won leads divided by total leads
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Financial + Operations Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-gradient-to-br from-card to-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold mt-2">$—</p>
              </div>

              <div className="rounded-xl bg-blue-500/10 p-2.5">
                <BadgeDollarSign className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Connect estimates and invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-gradient-to-br from-card to-red-950/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Profit</p>
                <p className="text-2xl font-bold mt-2">$—</p>
              </div>

              <div className="rounded-xl bg-red-500/10 p-2.5">
                <WalletCards className="w-5 h-5 text-red-400" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Available after cost tracking is added
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/80">
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
              Jobs currently scheduled
            </p>
          </CardContent>
        </Card>

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

                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
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

      {/* Bottom Operations Strip */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-red-500/15 bg-red-500/[0.035]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-red-500/10 p-3">
              <Activity className="w-5 h-5 text-red-400" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">New Leads</p>
              <p className="text-2xl font-bold mt-1">{newLeads}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-violet-500/[0.035]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-violet-500/10 p-3">
              <BriefcaseBusiness className="w-5 h-5 text-violet-400" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Proposals Pending</p>
              <p className="text-2xl font-bold mt-1">{proposalLeads}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/15 bg-blue-500/[0.035]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-blue-500/10 p-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Won Leads</p>
              <p className="text-2xl font-bold mt-1">{wonLeads}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
