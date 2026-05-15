import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types.ts";

export type AvaSupabaseDBClient = SupabaseClient<Database>;
