import { createClient } from "@supabase/supabase-js";

console.log("get supabase info");
console.log(import.meta.env.VITE_SUPABASE_API_URL);

export const SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_API_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
);
