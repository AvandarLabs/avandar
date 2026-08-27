import type { Database } from "$/types/database.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AvaSupabaseDBClient = SupabaseClient<Database>;
