import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export const organizationId = () => required("RIGHTTEMP_ORGANIZATION_ID");

export function rightTempDb() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}

export function confirmationRequired(action: string, preview: Record<string, unknown>) {
  return jsonResult({
    status: "confirmation_required",
    message: `Show this preview and ask the user to confirm before ${action}.`,
    preview,
  });
}
