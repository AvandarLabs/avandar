import { getAvaEnvTargetFromArgv, loadAvaEnv } from "@ava-cli/avaEnv/avaEnv";
import { DevCLI } from "@ava-cli/DevCLI/DevCLI";
import { NewBoilerplateCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewBoilerplateCLI";
import { PipelineCLI } from "@ava-cli/PipelineCLI/PipelineCLI";
import { PolarCLI } from "@ava-cli/PolarCLI/PolarCLI";
import { ReleaseCLI } from "@ava-cli/ReleaseCLI/ReleaseCLI";
import { SupabaseCLI } from "@ava-cli/SupabaseCLI/SupabaseCLI";
import { assertCLIIsUpToDate } from "@ava-cli/utils/assertCLIIsUpToDate/assertCLIIsUpToDate";
import { printError } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

// Declared globally rather than per command: pointing the CLI at a deployment
// is a property of the invocation, not of any one command, and Acclimate
// rejects an option the command it is parsing has not declared. Acclimate
// propagates these down to every subcommand, so they are legal and documented
// everywhere. The entry point below reads them off argv rather than from a
// parsed action, because the env file has to be chosen before any action runs.
const cli = Acclimate.createCLI("ava")
  .addGlobalOption({
    name: "--staging",
    description:
      "Use .env.staging for this invocation, instead of .env.development. " +
      "Nothing is merged: a variable that file omits is absent.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addGlobalOption({
    name: "--prod",
    description:
      "Use .env.production for this invocation, instead of .env.development. " +
      "Nothing is merged: a variable that file omits is absent.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addCommand("dev", DevCLI)
  .addCommand("new", NewBoilerplateCLI)
  .addCommand("pipeline", PipelineCLI)
  .addCommand("polar", PolarCLI)
  .addCommand("release", ReleaseCLI)
  .addCommand("supabase", SupabaseCLI);

// Nothing rebuilds `ava` automatically, so refuse to run stale code against the
// repository. Acclimate has no pre-command hook, so this guards the entry
// point.
if (!assertCLIIsUpToDate()) {
  process.exit(1);
}

// Exactly one env file is loaded, before any command action runs. A bad flag
// combination is reported here rather than thrown from module scope, so it
// reads as a CLI error instead of a Node stack trace.
try {
  loadAvaEnv({ target: getAvaEnvTargetFromArgv(process.argv.slice(2)) });
} catch (error: unknown) {
  printError(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

Acclimate.run(cli);
