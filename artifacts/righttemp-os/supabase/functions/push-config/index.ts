import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import webpush from "npm:web-push@3.6.7";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...corsHeaders(req) } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (!["GET", "POST", "DELETE"].includes(req.method)) return json(req, { error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization");
  if (!url || !anonKey || !serviceKey || !authorization) return json(req, { error: "Unauthorized" }, 401);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json(req, { error: "Unauthorized" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: membership } = await admin.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return json(req, { error: "No organization access" }, 403);

  let { data: config } = await admin.from("web_push_config").select("public_key").eq("organization_id", membership.organization_id).maybeSingle();
  if (!config) {
    const keys = webpush.generateVAPIDKeys();
    const { data, error } = await admin.from("web_push_config").insert({
      organization_id: membership.organization_id,
      public_key: keys.publicKey,
      private_key: keys.privateKey,
    }).select("public_key").single();
    if (error || !data) return json(req, { error: "Unable to initialize notifications" }, 500);
    config = data;
  }

  if (req.method === "GET") return json(req, { publicKey: config.public_key });

  let body: { subscription?: PushSubscriptionJSON };
  try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON" }, 400); }
  const subscription = body.subscription;
  if (!subscription?.endpoint) return json(req, { error: "Missing subscription" }, 422);

  if (req.method === "DELETE") {
    await admin.from("web_push_subscriptions").delete().eq("organization_id", membership.organization_id).eq("user_id", user.id).eq("endpoint", subscription.endpoint);
    return json(req, { ok: true });
  }

  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!p256dh || !auth || subscription.endpoint.length > 2000) return json(req, { error: "Invalid subscription" }, 422);
  const { error } = await admin.from("web_push_subscriptions").upsert({
    organization_id: membership.organization_id,
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,endpoint" });

  return error ? json(req, { error: "Unable to save subscription" }, 500) : json(req, { ok: true });
});
