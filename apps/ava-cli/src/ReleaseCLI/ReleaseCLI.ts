import {
  findUnknownReleaseFlags,
  wantsHelp,
} from "@ava-cli/ReleaseCLI/releaseFlagUtils/releaseFlagUtils";
import { runRelease } from "@ava-cli/ReleaseCLI/runRelease/runRelease";
import { printError, printInfo } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

const USAGE = `ava release — publish a new release of the Avandar app.

  main becomes an exact copy of develop (a straight cut, never a merge, so it
  cannot conflict), tagged vX.Y.Z. develop then moves on to the next -dev
  version. Run it from develop, with a clean tree and nothing unpushed.

Usage
  ava release                                   ask for both versions
  ava release --version 0.11.0                  ask only for the next version
  ava release --version 0.11.0 --next 0.11.1 --yes
  ava release --dry-run                         print commands, change nothing

Options
  --version, -v  X.Y.Z to release. Asked for when omitted.
  --next, -n     X.Y.Z develop moves to; gains -dev. Asked for when omitted.
  --yes, -y      Take every suggestion and skip confirmations.
  --dry-run      Print every mutating command and run none of them.
  --skip-ci-check  Do not check develop's staging CI.
  --help, -h     This text.`;

/** The parsed `ava release` options, as Acclimate hands them to the action. */
type ReleaseCLIArgs = {
  version?: string;
  next?: string;
  yes: boolean;
  dryRun: boolean;
  skipCiCheck: boolean;
};

/**
 * `ava release`: publish a new release of the Avandar app.
 *
 * `--version` and `--next` are optional on purpose: when either is missing the
 * command prints the versions that currently exist and asks. See
 * `releasePromptHelpers.ts` for why the asking happens inside the action rather
 * than through `askIfEmpty`.
 */
export const ReleaseCLI = Acclimate.createCLI("release")
  .description(
    "Release the Avandar app: main becomes an exact copy of develop (a " +
      "straight cut, never a merge, so it cannot conflict), tagged " +
      "vX.Y.Z, then develop moves on to the next -dev version. Prompts for " +
      "any version you do not pass.",
  )
  .addOption({
    name: "--version",
    aliases: ["-v"] as const,
    type: "string",
    required: false,
    description: "Version to release, as X.Y.Z. Asked for when omitted.",
  })
  .addOption({
    name: "--next",
    aliases: ["-n"] as const,
    type: "string",
    required: false,
    description:
      "Version develop moves to after the release, as X.Y.Z. It gains the " +
      "-dev suffix automatically. Asked for when omitted.",
  })
  .addOption({
    name: "--yes",
    aliases: ["-y"] as const,
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Take every suggested version and skip all confirmations. " +
      "This releases without asking anything.",
  })
  .addOption({
    name: "--dry-run",
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Print every command that would change local or remote state, and run " +
      "none of them.",
  })
  .addOption({
    name: "--skip-ci-check",
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Do not check whether develop's staging CI passed for the commit being " +
      "released.",
  })
  .action((args: Readonly<ReleaseCLIArgs>) => {
    // Acclimate neither implements --help nor rejects unknown options, and
    // this command is far too consequential to run on a mistyped flag.
    const argv = process.argv.slice(2);
    if (wantsHelp(argv)) {
      printInfo(USAGE);
      return undefined;
    }
    const unknownFlags = findUnknownReleaseFlags(argv);
    if (unknownFlags.length > 0) {
      printError(
        `Unknown option${unknownFlags.length > 1 ? "s" : ""}: ` +
          `${unknownFlags.join(", ")}. Nothing was released; ` +
          "run `ava release --help`.",
      );
      process.exitCode = 1;
      return undefined;
    }

    // Acclimate does not await actions, so failures are reported and the exit
    // code is set here rather than surfacing as an unhandled rejection.
    return runRelease({
      version: args.version,
      nextVersion: args.next,
      yes: args.yes,
      dryRun: args.dryRun,
      skipCICheck: args.skipCiCheck,
    }).catch((error: unknown) => {
      printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });
