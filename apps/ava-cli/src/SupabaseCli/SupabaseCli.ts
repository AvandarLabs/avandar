import { GoogleTokenCli } from "@ava-cli/SupabaseCli/GoogleTokenCli/GoogleTokenCli";
import { SupabaseMigrationsCli } from "@ava-cli/SupabaseCli/SupabaseMigrationsCli/SupabaseMigrationsCli";
import { SupabaseRestoreCli } from "@ava-cli/SupabaseCli/SupabaseRestoreCli";
import { SupabaseRunCli } from "@ava-cli/SupabaseCli/SupabaseRunCli/SupabaseRunCli";
import { SupabaseStatusCli } from "@ava-cli/SupabaseCli/SupabaseStatusCli";
import { SupabaseSwitchCli } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/SupabaseSwitchCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCli = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("google-token", GoogleTokenCli)
  .addCommand("migrations", SupabaseMigrationsCli)
  .addCommand("restore", SupabaseRestoreCli)
  .addCommand("run", SupabaseRunCli)
  .addCommand("status", SupabaseStatusCli)
  .addCommand("switch", SupabaseSwitchCli);
