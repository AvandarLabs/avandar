import { GoogleTokenCli } from "@ava-cli/SupabaseCli/GoogleTokenCli/GoogleTokenCli";
import { SupabaseLifecycleCli } from "@ava-cli/SupabaseCli/SupabaseLifecycleCli/SupabaseLifecycleCli";
import { SupabaseMigrationsCli } from "@ava-cli/SupabaseCli/SupabaseMigrationsCli/SupabaseMigrationsCli";
import {
  SupabasePruneCli,
  SupabasePruneHelp,
} from "@ava-cli/SupabaseCli/SupabasePrune/SupabasePruneCli";
import {
  SupabaseRestoreCli,
  SupabaseRestoreHelp,
} from "@ava-cli/SupabaseCli/SupabaseRestoreCli";
import { SupabaseRunCli } from "@ava-cli/SupabaseCli/SupabaseRunCli/SupabaseRunCli";
import {
  SupabaseStatusCli,
  SupabaseStatusHelp,
} from "@ava-cli/SupabaseCli/SupabaseStatusCli";
import {
  SupabaseSwitchCli,
  SupabaseSwitchHelp,
} from "@ava-cli/SupabaseCli/SupabaseSwitchCli/SupabaseSwitchCli";
import { SupabaseSwitchRemoteHelp } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/SupabaseSwitchRemoteCli/SupabaseSwitchRemoteCli";
import { Acclimate } from "@avandar/acclimate";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

/**
 * The `ava supabase` commands with their own `--help` screen, which the entry
 * point also uses to refuse a flag one of them does not accept.
 */
export const SUPABASE_COMMAND_HELP_SPECS: readonly CommandHelpSpec[] = [
  SupabaseLifecycleCli.startHelp,
  SupabaseLifecycleCli.stopHelp,
  SupabasePruneHelp,
  SupabaseRestoreHelp,
  SupabaseStatusHelp,
  SupabaseSwitchHelp,
  SupabaseSwitchRemoteHelp,
];

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCli = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("google-token", GoogleTokenCli)
  .addCommand("migrations", SupabaseMigrationsCli)
  .addCommand("prune", SupabasePruneCli)
  .addCommand("restore", SupabaseRestoreCli)
  .addCommand("run", SupabaseRunCli)
  .addCommand("start", SupabaseLifecycleCli.StartCli)
  .addCommand("status", SupabaseStatusCli)
  .addCommand("stop", SupabaseLifecycleCli.StopCli)
  .addCommand("switch", SupabaseSwitchCli);
