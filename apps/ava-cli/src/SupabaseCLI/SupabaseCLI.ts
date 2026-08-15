import { SupabaseMigrationsCLI } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/SupabaseMigrationsCLI";
import { SupabaseRestoreCli } from "@ava-cli/SupabaseCLI/SupabaseRestoreCli";
import { SupabaseRunCLI } from "@ava-cli/SupabaseCLI/SupabaseRunCLI/SupabaseRunCLI";
import { SupabaseSwitchCli } from "@ava-cli/SupabaseCLI/SupabaseSwitchCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCLI = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("migrations", SupabaseMigrationsCLI)
  .addCommand("restore", SupabaseRestoreCli)
  .addCommand("run", SupabaseRunCLI)
  .addCommand("switch", SupabaseSwitchCli);
