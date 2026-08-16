import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Env } from "./lib";
import { confirmationRequired, jsonResult, normalizePhone, required, rightTempDb } from "./lib";

const leadFields = "id, customer_id, name, email, phone, status, source, service_type, notes, follow_up_date, follow_up_time, estimate_price, equipment, scope_of_work, contacted_notes, qualified_notes, created_at";
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const write = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

export function createServer(env: Env) {
  const mcp = new McpServer({ name: "RightTemp OS", version: "1.1.0" });
  const db = () => rightTempDb(env);
  const org = required(env, "RIGHTTEMP_ORGANIZATION_ID");

  mcp.registerTool("search", {
    title: "Search RightTemp",
    description: "Search RightTemp leads and customers by name, phone, or email. Use before creating a lead to detect duplicates.",
    inputSchema: { query: z.string().min(1) }, annotations: readOnly,
  }, async ({ query }) => {
    const term = query.trim().replace(/[,%()]/g, " "); const phone = normalizePhone(query);
    const filter = `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${phone || term}%`;
    const [leads, customers] = await Promise.all([
      db().from("leads").select(leadFields).eq("organization_id", org).or(filter).limit(10),
      db().from("customers").select("id, name, email, phone, address, city, state, zip, status, notes, created_at").eq("organization_id", org).or(filter).limit(10),
    ]);
    if (leads.error) throw leads.error; if (customers.error) throw customers.error;
    return jsonResult({ results: [
      ...(leads.data ?? []).map((item) => ({ id: `lead:${item.id}`, type: "lead", title: item.name, text: `${item.phone ?? ""} · ${item.status}`, data: item })),
      ...(customers.data ?? []).map((item) => ({ id: `customer:${item.id}`, type: "customer", title: item.name, text: `${item.phone ?? ""} · ${item.status}`, data: item })),
    ] });
  });

  mcp.registerTool("fetch", {
    title: "Fetch RightTemp record", description: "Fetch one RightTemp lead or customer using an ID returned by search.",
    inputSchema: { id: z.string().regex(/^(lead|customer):[0-9a-f-]+$/i) }, annotations: readOnly,
  }, async ({ id }) => {
    const [type, recordId] = id.split(":") as ["lead" | "customer", string];
    const query = type === "lead" ? db().from("leads").select(leadFields) : db().from("customers").select("id, name, email, phone, address, city, state, zip, status, service_type, notes, created_at");
    const { data, error } = await query.eq("organization_id", org).eq("id", recordId).single();
    if (error) throw error; return jsonResult({ id, type, title: data.name, data });
  });

  mcp.registerTool("create_lead", {
    title: "Create lead", description: "Create an in-person, phone, referral, website, or other lead. Always call with confirmed=false first; only use true after the user explicitly confirms the preview. Duplicate phone numbers are never inserted.",
    inputSchema: { name: z.string().min(1), phone: z.string().min(7), email: z.string().email().optional(), source: z.enum(["referral", "website", "google", "yelp", "phone", "social", "other"]).default("other"), service_type: z.string().optional(), notes: z.string().optional(), confirmed: z.boolean().default(false) }, annotations: write,
  }, async (input) => {
    const digits = normalizePhone(input.phone);
    const { data: candidates, error: findError } = await db().from("leads").select(leadFields).eq("organization_id", org).limit(100);
    if (findError) throw findError;
    const duplicate = (candidates ?? []).find((lead) => normalizePhone(lead.phone ?? "") === digits);
    if (duplicate) return jsonResult({ status: "duplicate", message: "A lead with this phone number already exists. No new lead was created.", lead: duplicate });
    const preview = { name: input.name, phone: input.phone, email: input.email ?? null, source: input.source, service_type: input.service_type ?? null, notes: input.notes ?? null, status: "new" };
    if (!input.confirmed) return confirmationRequired("creating this lead", preview);
    const { data, error } = await db().from("leads").insert({ organization_id: org, ...preview }).select(leadFields).single();
    if (error) throw error; return jsonResult({ status: "created", lead: data });
  });

  mcp.registerTool("today_schedule", {
    title: "Read today's schedule", description: "Read today's sales calls, in-home estimates, lead follow-ups, and scheduled jobs in chronological order.",
    inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Local date in YYYY-MM-DD") }, annotations: readOnly,
  }, async ({ date }) => {
    const start = `${date}T00:00:00`; const end = `${date}T23:59:59.999`;
    const [appointments, followUps, jobs] = await Promise.all([
      db().from("sales_appointments").select("id, lead_id, appointment_type, status, starts_at, ends_at, address, notes, leads(name, phone)").eq("organization_id", org).gte("starts_at", start).lte("starts_at", end).order("starts_at"),
      db().from("leads").select("id, name, phone, status, follow_up_date, follow_up_time, notes").eq("organization_id", org).eq("follow_up_date", date).order("follow_up_time"),
      db().from("jobs").select("id, title, status, scheduled_start, scheduled_end, customers(name, phone)").eq("organization_id", org).gte("scheduled_start", start).lte("scheduled_start", end).order("scheduled_start"),
    ]);
    for (const result of [appointments, followUps, jobs]) if (result.error) throw result.error;
    const items = [
      ...(appointments.data ?? []).map((x) => ({ kind: "sales_appointment", time: x.starts_at, ...x })),
      ...(followUps.data ?? []).map((x) => ({ kind: "follow_up", time: `${x.follow_up_date}T${x.follow_up_time || "09:00"}`, ...x })),
      ...(jobs.data ?? []).map((x) => ({ kind: "job", time: x.scheduled_start, ...x })),
    ].sort((a, b) => String(a.time).localeCompare(String(b.time)));
    return jsonResult({ date, items });
  });

  mcp.registerTool("update_lead", {
    title: "Update lead workflow", description: "Add notes or change a lead's pipeline stage. Always call with confirmed=false first and only use true after explicit user confirmation.",
    inputSchema: { lead_id: z.string().uuid(), status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(), notes_to_append: z.string().optional(), contacted_notes: z.string().optional(), qualified_notes: z.string().optional(), confirmed: z.boolean().default(false) }, annotations: write,
  }, async (input) => {
    const { data: current, error: readError } = await db().from("leads").select(leadFields).eq("organization_id", org).eq("id", input.lead_id).single();
    if (readError) throw readError;
    const changes = { ...(input.status ? { status: input.status } : {}), ...(input.contacted_notes ? { contacted_notes: input.contacted_notes } : {}), ...(input.qualified_notes ? { qualified_notes: input.qualified_notes } : {}), ...(input.notes_to_append ? { notes: [current.notes, input.notes_to_append].filter(Boolean).join("\n\n") } : {}) };
    if (!input.confirmed) return confirmationRequired("updating this lead", { lead: current.name, changes });
    const { data, error } = await db().from("leads").update(changes).eq("organization_id", org).eq("id", input.lead_id).select(leadFields).single();
    if (error) throw error; return jsonResult({ status: "updated", lead: data });
  });

  mcp.registerTool("create_draft_estimate", {
    title: "Create draft estimate", description: "Create a draft estimate for a lead or customer. Never sends it. Always preview with confirmed=false and require explicit confirmation before true.",
    inputSchema: { lead_id: z.string().uuid().optional(), customer_id: z.string().uuid().optional(), title: z.string().min(1), line_items: z.array(z.object({ description: z.string().min(1), quantity: z.number().positive(), unit_price: z.number().nonnegative() })).min(1), tax_rate: z.number().min(0).max(1).default(0), valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().optional(), confirmed: z.boolean().default(false) }, annotations: write,
  }, async (input) => {
    if (!input.lead_id && !input.customer_id) throw new Error("lead_id or customer_id is required");
    const lineItems = input.line_items.map((x) => ({ ...x, total: x.quantity * x.unit_price }));
    const subtotal = lineItems.reduce((sum, x) => sum + x.total, 0); const taxAmount = subtotal * input.tax_rate;
    const preview = { lead_id: input.lead_id ?? null, customer_id: input.customer_id ?? null, title: input.title, line_items: lineItems, subtotal, tax_rate: input.tax_rate, tax_amount: taxAmount, total: subtotal + taxAmount, valid_until: input.valid_until ?? null, notes: input.notes ?? null, status: "draft" };
    if (!input.confirmed) return confirmationRequired("creating this draft estimate", preview);
    const { data, error } = await db().from("estimates").insert({ organization_id: org, ...preview }).select("id, estimate_number, title, subtotal, tax_amount, total, status, lead_id, customer_id, created_at").single();
    if (error) throw error; return jsonResult({ status: "created", estimate: data });
  });

  mcp.registerTool("schedule_sales_action", {
    title: "Schedule follow-up or appointment", description: "Schedule a lead follow-up, phone call, or in-home estimate. Always preview with confirmed=false and require explicit confirmation before true.",
    inputSchema: { lead_id: z.string().uuid(), kind: z.enum(["follow_up", "phone_call", "in_home_estimate"]), starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }).optional(), address: z.string().optional(), notes: z.string().optional(), confirmed: z.boolean().default(false) }, annotations: write,
  }, async (input) => {
    const preview = { lead_id: input.lead_id, kind: input.kind, starts_at: input.starts_at, ends_at: input.ends_at ?? null, address: input.address ?? null, notes: input.notes ?? null };
    if (!input.confirmed) return confirmationRequired("scheduling this action", preview);
    if (input.kind === "follow_up") {
      const when = new Date(input.starts_at); const date = input.starts_at.slice(0, 10); const time = input.starts_at.slice(11, 16);
      if (Number.isNaN(when.getTime())) throw new Error("Invalid follow-up time");
      const { data, error } = await db().from("leads").update({ follow_up_date: date, follow_up_time: time, ...(input.notes ? { notes: input.notes } : {}) }).eq("organization_id", org).eq("id", input.lead_id).select("id, name, follow_up_date, follow_up_time").single();
      if (error) throw error; return jsonResult({ status: "scheduled", follow_up: data });
    }
    if (!input.ends_at) throw new Error("ends_at is required for appointments");
    const { data, error } = await db().from("sales_appointments").insert({ organization_id: org, lead_id: input.lead_id, appointment_type: input.kind, starts_at: input.starts_at, ends_at: input.ends_at, address: input.address ?? null, notes: input.notes ?? null }).select("id, lead_id, appointment_type, status, starts_at, ends_at, address, notes").single();
    if (error) throw error; return jsonResult({ status: "scheduled", appointment: data });
  });

  return mcp;
}
