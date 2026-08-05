import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import webpush from "npm:web-push@3.6.7";

const ORGANIZATION_NAME = "RightTemp Heating & Air Conditioning";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

type LeadPayload = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  zip?: unknown;
  serviceNeeded?: unknown;
  urgency?: unknown;
  notes?: unknown;
  attribution?: unknown;
  website?: unknown;
  formStartedAt?: unknown;
};

type Attribution = {
  source?: unknown;
  medium?: unknown;
  campaign?: unknown;
  content?: unknown;
  term?: unknown;
  landingPage?: unknown;
  referrer?: unknown;
  clickId?: unknown;
};

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(req) },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendPushNotifications(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  lead: { id: string; name: string; service_type: string; urgency: string },
  appOrigin: string,
) {
  const [{ data: config }, { data: subscriptions }] = await Promise.all([
    supabase.from("web_push_config").select("public_key, private_key, subject").eq("organization_id", organizationId).maybeSingle(),
    supabase.from("web_push_subscriptions").select("id, endpoint, p256dh, auth").eq("organization_id", organizationId),
  ]);

  if (!config || !subscriptions?.length) return;

  webpush.setVapidDetails(config.subject, config.public_key, config.private_key);
  const payload = JSON.stringify({
    title: "New RightTemp lead",
    body: `${lead.name} • ${lead.service_type}${lead.urgency === "emergency" ? " • EMERGENCY" : ""}`,
    url: `${appOrigin}/leads/${lead.id}`,
    tag: `lead-${lead.id}`,
  });

  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("web_push_subscriptions").delete().eq("id", subscription.id);
      }
      console.error("Push delivery failed", statusCode || error);
    }
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 20_000) return json(req, { error: "Request is too large" }, 413);

  let payload: LeadPayload;
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  if (clean(payload.website, 100)) return json(req, { ok: true }, 202);
  const startedAt = Number(payload.formStartedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 1_500 || Date.now() - startedAt > 86_400_000) {
    return json(req, { error: "Please refresh the page and try again" }, 400);
  }

  const name = clean(payload.name, 100);
  const phone = clean(payload.phone, 30);
  const email = clean(payload.email, 160).toLowerCase();
  const zip = clean(payload.zip, 10);
  const serviceNeeded = clean(payload.serviceNeeded, 80);
  const urgency = clean(payload.urgency, 20);
  const notes = clean(payload.notes, 1500);
  const allowedUrgencies = new Set(["emergency", "today", "this_week", "planning"]);

  if (name.length < 2 || phone.replace(/\D/g, "").length < 10 || !/^\d{5}(?:-\d{4})?$/.test(zip) || !serviceNeeded || !allowedUrgencies.has(urgency) || !isEmail(email)) {
    return json(req, { error: "Please check the required fields" }, 422);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(req, { error: "Service unavailable" }, 503);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = req.headers.get("cf-connecting-ip") ?? forwardedFor ?? "unknown";
  const fingerprint = await sha256(`${clientIp}|righttemp-public-leads`);
  const { data: rateAllowed, error: rateError } = await supabase.rpc("check_public_lead_rate_limit", { p_fingerprint: fingerprint });
  if (rateError) {
    console.error("Rate limiter failed", rateError.message);
    return json(req, { error: "Service unavailable" }, 503);
  }
  if (!rateAllowed) return json(req, { error: "Too many requests. Please call us instead." }, 429);

  const { data: organization, error: orgError } = await supabase.from("organizations").select("id").eq("name", ORGANIZATION_NAME).single();
  if (orgError || !organization) return json(req, { error: "Service unavailable" }, 503);

  const attribution = (payload.attribution && typeof payload.attribution === "object" ? payload.attribution : {}) as Attribution;
  const source = clean(attribution.source, 100) || "website";
  const clickId = clean(attribution.clickId, 255);
  const { data: lead, error } = await supabase.from("leads").insert({
    organization_id: organization.id,
    name,
    phone,
    email: email || null,
    zip,
    status: "new",
    source: source.toLowerCase().includes("google") ? "google" : source.toLowerCase().includes("facebook") || source.toLowerCase().includes("instagram") ? "social" : "website",
    service_type: serviceNeeded,
    urgency,
    notes: notes || null,
    attribution_source: source,
    attribution_medium: clean(attribution.medium, 100) || null,
    attribution_campaign: clean(attribution.campaign, 200) || null,
    attribution_content: clean(attribution.content, 200) || null,
    attribution_term: clean(attribution.term, 200) || null,
    landing_page: clean(attribution.landingPage, 500) || null,
    referrer: clean(attribution.referrer, 500) || null,
    click_id: clickId || null,
  }).select("id, name, service_type, urgency").single();

  if (error || !lead) {
    console.error("Lead insert failed", error?.message);
    return json(req, { error: "We could not submit your request. Please call us." }, 500);
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  EdgeRuntime.waitUntil(sendPushNotifications(supabase, organization.id, lead, origin));
  return json(req, { ok: true, leadId: lead.id }, 201);
});
