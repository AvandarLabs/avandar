import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { DevCli } from "@ava-cli/DevCli/DevCli";
import { NewBoilerplateCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewBoilerplateCli";
import { PipelineCli } from "@ava-cli/PipelineCli/PipelineCli";
import { PolarCli } from "@ava-cli/PolarCli/PolarCli";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
import {
  SUPABASE_COMMAND_HELP_SPECS,
  SupabaseCli,
} from "@ava-cli/SupabaseCli/SupabaseCli";
import { assertCliIsUpToDate } from "@ava-cli/utils/assertCliIsUpToDate/assertCliIsUpToDate";
import { printError } from "@ava-cli/utils/cliOutput/cliOutput";
import { CommandHelp } from "@ava-cli/utils/CommandHelp/CommandHelp";
import { Acclimate } from "@avandar/acclimate";

// Declared globally rather than per command: pointing the CLI at a deployment
// is a property of the invocation, not of any one command. Acclimate propagates
// a global option down to every subcommand, so declaring here is what puts
// these in each help screen and hands their parsed value to any action that
// wants it. The declaration is not what makes them accepted: Acclimate ignores
// an option nobody declared, so an undeclared `--prod` would be
// silently swallowed rather than refused.
//
// The entry point below reads them off argv rather than from a parsed action,
// because the env file has to be chosen before any action runs.
const cli = Acclimate.createCLI("ava")
  .addGlobalOption({
    name: "--staging",
    description:
      "Use .env.staging for this invocation, instead of .env.development. Nothing is merged: a variable that file omits is absent.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addGlobalOption({
    name: "--prod",
    description:
      "Use .env.production for this invocation, instead of .env.development. Nothing is merged: a variable that file omits is absent.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addCommand("dev", DevCli)
  .addCommand("new", NewBoilerplateCli)
  .addCommand("pipeline", PipelineCli)
  .addCommand("polar", PolarCli)
  .addCommand("release", ReleaseCli)
  .addCommand("supabase", SupabaseCli);

// Acclimate runs a command's action for `--help` and drops flags it does not
// know, so commands with a help spec are handled first: help prints and exits
// before any check or side effect, and an unknown flag is refused rather than
// silently ignored. The root's own global options are part of every spec.
const helpOutcome = CommandHelp.handleArgv({
  argv: process.argv.slice(2),
  specs: SUPABASE_COMMAND_HELP_SPECS,
  rootCli: cli,
});
if (helpOutcome !== "continue") {
  process.exit(helpOutcome === "printedHelp" ? 0 : 1);
}

// Nothing rebuilds `ava` automatically, so refuse to run stale code against the
// repository. Acclimate has no pre-command hook, so this guards the entry
// point.
if (!assertCliIsUpToDate()) {
  process.exit(1);
}

// Exactly one env file is loaded, before any command action runs. A bad flag
// combination is reported here rather than thrown from module scope, so it
// reads as a CLI error instead of a Node stack trace.
try {
  AvaEnv.load({ target: AvaEnv.getEnvTargetFromArgv(process.argv.slice(2)) });
} catch (error: unknown) {
  printError(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

Acclimate.run(cli);
