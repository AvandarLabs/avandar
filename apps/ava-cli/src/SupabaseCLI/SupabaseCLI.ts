import { GoogleTokenCLI } from "@ava-cli/SupabaseCLI/GoogleTokenCLI/GoogleTokenCLI";
import { SupabaseMigrationsCLI } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/SupabaseMigrationsCLI";
import { SupabaseRestoreCli } from "@ava-cli/SupabaseCLI/SupabaseRestoreCli";
import { SupabaseRunCLI } from "@ava-cli/SupabaseCLI/SupabaseRunCLI/SupabaseRunCLI";
import { SupabaseStatusCli } from "@ava-cli/SupabaseCLI/SupabaseStatusCli";
import { SupabaseSwitchCli } from "@ava-cli/SupabaseCLI/SupabaseSwitchCli/SupabaseSwitchCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCLI = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("google-token", GoogleTokenCLI)
  .addCommand("migrations", SupabaseMigrationsCLI)
  .addCommand("restore", SupabaseRestoreCli)
  .addCommand("run", SupabaseRunCLI)
  .addCommand("status", SupabaseStatusCli)
  .addCommand("switch", SupabaseSwitchCli);
