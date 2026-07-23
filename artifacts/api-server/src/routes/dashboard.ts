import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, leadsTable, customersTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeDate<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    result[key] = val instanceof Date ? val.toISOString() : val;
  }
  return result as T;
}

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [leads, customers] = await Promise.all([
    db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt)),
    db.select().from(customersTable).orderBy(desc(customersTable.createdAt)),
  ]);

  const leadsByStatus = {
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal: 0,
    won: 0,
    lost: 0,
  };

  for (const lead of leads) {
    const s = lead.status as keyof typeof leadsByStatus;
    if (s in leadsByStatus) leadsByStatus[s]++;
  }

  const activeCustomers = customers.filter((c) => c.status === "active").length;

  const stats = {
    totalLeads: leads.length,
    totalCustomers: customers.length,
    activeCustomers,
    leadsByStatus,
    recentLeads: leads.slice(0, 5).map(serializeDate),
    recentCustomers: customers.slice(0, 5).map(serializeDate),
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
