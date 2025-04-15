import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const SupabaseClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_API_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
);
