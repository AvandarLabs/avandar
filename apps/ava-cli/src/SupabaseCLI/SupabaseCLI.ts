import { SupabaseMigrationsCLI } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/SupabaseMigrationsCLI";
import { SupabaseRunCLI } from "@ava-cli/SupabaseCLI/SupabaseRunCLI/SupabaseRunCLI";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCLI = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("migrations", SupabaseMigrationsCLI)
  .addCommand("run", SupabaseRunCLI);
