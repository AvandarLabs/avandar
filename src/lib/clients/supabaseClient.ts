import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** The names of the tables in the `public` schema of the database. */
export type DatabaseTableNames = keyof Database["public"]["Tables"];

/**
 * A client for interacting with Supabase.
 * @see {@link https://supabase.com/docs/reference/javascript/start|Supabase JS Docs}
 */
export const supabaseClient = createClient<
  Database,
  "public",
  Database["public"]
>(
  import.meta.env.VITE_SUPABASE_API_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
);
