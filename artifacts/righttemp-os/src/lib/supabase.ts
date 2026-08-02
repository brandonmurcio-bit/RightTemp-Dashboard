import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Key prefix:", supabaseAnonKey?.substring(0, 20));

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not set.");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);