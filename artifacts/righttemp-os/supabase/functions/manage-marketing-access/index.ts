import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function getAuthorizedContext(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");

  if (!url || !anonKey || !serviceKey || !authorization) {
    throw new Error("Service unavailable");
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) throw new Error("Authentication required");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userData.user.id)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) throw new Error("Owner or admin access required");

  return { admin, user: userData.user, organizationId: membership.organization_id };
}

async function listMarketingMembers(admin: ReturnType<typeof createClient>, organizationId: string) {
  const [{ data: memberships, error: membershipError }, { data: profiles, error: profileError }, { data: users, error: userError }] = await Promise.all([
    admin
      .from("organization_members")
      .select("id, user_id, role, joined_at")
      .eq("organization_id", organizationId)
      .eq("role", "marketing")
      .order("joined_at", { ascending: false }),
    admin.from("profiles").select("id, full_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (membershipError || profileError || userError) throw new Error("Unable to load marketing access");

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const userById = new Map((users?.users ?? []).map((user) => [user.id, user]));

  return (memberships ?? []).map((membership) => ({
    membershipId: membership.id,
    userId: membership.user_id,
    email: userById.get(membership.user_id)?.email ?? null,
    fullName: profileById.get(membership.user_id)?.full_name ?? null,
    role: membership.role,
    joinedAt: membership.joined_at,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const context = await getAuthorizedContext(req);
    const payload = await req.json().catch(() => ({}));
    const action = clean(payload.action, 20);

    if (action === "list") {
      return json(req, { members: await listMarketingMembers(context.admin, context.organizationId) });
    }

    if (action === "invite") {
      const email = clean(payload.email, 320).toLowerCase();
      const fullName = clean(payload.fullName, 120);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(req, { error: "Enter a valid email address" }, 422);
      }

      const { data: users, error: userListError } = await context.admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (userListError) throw userListError;

      let targetUser = users.users.find((user) => user.email?.toLowerCase() === email);
      let invited = false;

      if (!targetUser) {
        const origin = req.headers.get("origin") ?? "";
        const { data: invitedData, error: inviteError } = await context.admin.auth.admin.inviteUserByEmail(email, {
          data: fullName ? { full_name: fullName } : undefined,
          redirectTo: origin ? `${origin}/app` : undefined,
        });
        if (inviteError || !invitedData.user) {
          throw inviteError ?? new Error("Unable to send invitation");
        }
        targetUser = invitedData.user;
        invited = true;
      }

      const { data: existingMembership } = await context.admin
        .from("organization_members")
        .select("id, role")
        .eq("organization_id", context.organizationId)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (existingMembership) {
        if (existingMembership.role === "marketing") {
          return json(req, { error: "This user already has marketing access" }, 409);
        }
        return json(req, { error: "This user already has a RightTemp team role" }, 409);
      }

      const { data: membership, error: membershipError } = await context.admin
        .from("organization_members")
        .insert({
          organization_id: context.organizationId,
          user_id: targetUser.id,
          role: "marketing",
          invited_by: context.user.id,
        })
        .select("id, user_id, role, joined_at")
        .single();

      if (membershipError || !membership) throw membershipError ?? new Error("Unable to grant marketing access");

      if (fullName) {
        await context.admin.from("profiles").upsert({ id: targetUser.id, full_name: fullName }, { onConflict: "id" });
      }

      return json(req, {
        invited,
        message: invited ? "Invitation sent and marketing access prepared." : "Marketing access granted to the existing account.",
        member: {
          membershipId: membership.id,
          userId: membership.user_id,
          email: targetUser.email ?? email,
          fullName: fullName || null,
          role: membership.role,
          joinedAt: membership.joined_at,
        },
      }, 201);
    }

    if (action === "revoke") {
      const membershipId = clean(payload.membershipId, 80);
      if (!membershipId) return json(req, { error: "A membership is required" }, 422);

      const { data: membership, error: lookupError } = await context.admin
        .from("organization_members")
        .select("id, role")
        .eq("id", membershipId)
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      if (lookupError || !membership || membership.role !== "marketing") {
        return json(req, { error: "Marketing access was not found" }, 404);
      }

      const { error: revokeError } = await context.admin
        .from("organization_members")
        .delete()
        .eq("id", membershipId)
        .eq("organization_id", context.organizationId);
      if (revokeError) throw revokeError;

      return json(req, { ok: true });
    }

    return json(req, { error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("Marketing access error", error);
    return json(req, {
      error: error instanceof Error ? error.message : "Unable to manage marketing access",
    }, 400);
  }
});