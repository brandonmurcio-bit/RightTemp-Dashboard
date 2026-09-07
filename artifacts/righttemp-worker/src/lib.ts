import { createClient } from "@supabase/supabase-js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RIGHTTEMP_ORGANIZATION_ID: string;
  RIGHTTEMP_MCP_TOKEN: string;
  RIGHTTEMP_MCP_PASSWORD: string;
  RIGHTTEMP_MCP_BASE_URL?: string;
  REFRESH_TOKEN_STORE: DurableObjectNamespace;
}

type StringEnvKey = {
  [Key in keyof Env]-?: Env[Key] extends string | undefined ? Key : never;
}[keyof Env];

export function required(env: Env, name: StringEnvKey): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function rightTempDb(env: Env) {
  return createClient(required(env, "SUPABASE_URL"), required(env, "SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const normalizePhone = (value: string) => value.replace(/\D/g, "");

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
