import { Acclimate } from "@avandar/acclimate";
import { SupabaseRunCLI } from "./SupabaseRunCLI";

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCLI = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("run", SupabaseRunCLI);
