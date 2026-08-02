import { supabase } from "./supabase";

export async function getCurrentOrganizationId(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Unable to verify the current user: ${authError.message}`);
  }

  if (!user) {
    throw new Error("User is not authenticated");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Unable to load organization membership: ${membershipError.message}`
    );
  }

  if (!membership?.organization_id) {
    throw new Error(
      "No organization membership found for the authenticated user"
    );
  }

  return membership.organization_id;
}