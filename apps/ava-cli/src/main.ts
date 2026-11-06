import { AvaEnv, DEFAULT_ENV_NAME } from "@ava-cli/AvaEnv/AvaEnv";
import { DevCli } from "@ava-cli/DevCli/DevCli";
import { NewBoilerplateCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewBoilerplateCli";
import { PipelineCli } from "@ava-cli/PipelineCli/PipelineCli";
import { PolarCli } from "@ava-cli/PolarCli/PolarCli";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
import { SupabaseCli } from "@ava-cli/SupabaseCli/SupabaseCli";
import { assertCliIsUpToDate } from "@ava-cli/utils/assertCliIsUpToDate/assertCliIsUpToDate";
import { printError } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

// Declared globally rather than per command: pointing the CLI at a deployment
// is a property of the invocation, not of any one command. Acclimate propagates
// a global option down to every subcommand, so declaring here is what puts
// `--env` in each help screen and hands its parsed value to any action that
// wants it. The declaration is not what makes it accepted: Acclimate ignores an
// option nobody declared, which is why `AvaEnv.getEnvNameFromArgv` refuses the
// removed `--staging` and `--prod` itself.
//
// The entry point below reads `--env` off argv rather than from a parsed
// action, because the env file has to be chosen before any action runs.
const cli = Acclimate.createCLI("ava")
  .addGlobalOption({
    name: "--env",
    description:
      "Load .env.<name> for this invocation, such as --env staging for " +
      ".env.staging or --env demo for .env.demo. Defaults to " +
      `${DEFAULT_ENV_NAME}, which loads .env.${DEFAULT_ENV_NAME}. Nothing is ` +
      "merged: a variable that file omits is absent.",
    required: false,
    defaultValue: DEFAULT_ENV_NAME,
    type: "string",
  })
  .addCommand("dev", DevCli)
  .addCommand("new", NewBoilerplateCli)
  .addCommand("pipeline", PipelineCli)
  .addCommand("polar", PolarCli)
  .addCommand("release", ReleaseCli)
  .addCommand("supabase", SupabaseCli);

// Nothing rebuilds `ava` automatically, so refuse to run stale code against the
// repository. Acclimate has no pre-command hook, so this guards the entry
// point.
if (!assertCliIsUpToDate()) {
  process.exit(1);
}

// Exactly one env file is loaded, before any command action runs. A bad
// `--env` is reported here rather than thrown from module scope, so it reads
// as a CLI error instead of a Node stack trace.
try {
  AvaEnv.load({ envName: AvaEnv.getEnvNameFromArgv(process.argv.slice(2)) });
} catch (error: unknown) {
  printError(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

Acclimate.run(cli);
