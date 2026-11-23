import { GetProdVersionCli } from "@ava-cli/ReleaseCli/GetProdVersionCli";
import {
  findUnknownReleaseFlags,
  wantsHelp,
} from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { ReleaseNotesCli } from "@ava-cli/ReleaseCli/ReleaseNotesCli/ReleaseNotesCli";
import { runRelease } from "@ava-cli/ReleaseCli/runRelease/runRelease";
import { printError, printInfo } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

const USAGE = `ava release: publish a new release of the Avandar app.

  Run it on alpha-dev to release alpha (production, app.avandarlabs.com), or
  on develop to release mainline (main). Any other branch is refused.

  The target branch becomes an exact copy of the source branch (a straight
  cut, never a merge, so it cannot conflict), tagged vX.Y.Z on mainline or
  vX.Y.Z-alpha on alpha. The source branch then moves on to its next dev
  version (-dev on develop, -alpha-dev on alpha-dev). Type versions as
  X.Y.Z: the suffixes are added for you.

  Before anything changes, the source branch's CI verdict on the commit
  being released is checked. On alpha-dev, anything but a pass (failed,
  pending, missing, or unknown) refuses the release, even with --yes, and
  refuses --dry-run too: wait for green, or pass --skip-ci-check to deploy
  production without it. On develop, a non-passing verdict asks first, and
  --yes proceeds.

Usage
  ava release get-prod-version                  print the version on origin/main
  ava release notes --version 0.13.3            (re-)publish release notes
  ava release                                   ask for both versions
  ava release --version 0.11.0                  ask only for the next version
  ava release --version 0.11.0 --next 0.11.1 --yes
  ava release --dry-run                         print commands, change nothing

Options
  --version, -v  X.Y.Z to release. Asked for when omitted.
  --next, -n     X.Y.Z the source branch moves to; gains -dev or -alpha-dev.
                 Asked for when omitted.
  --yes, -y      Take every suggestion and skip confirmations. Never
                 overrides a non-passing alpha-dev CI verdict.
  --dry-run      Print every mutating command and run none of them. Still
                 makes one real OpenAI call to preview the release notes.
                 On alpha-dev, refused while CI is not green unless
                 --skip-ci-check is passed.
  --skip-ci-check  Do not check the source branch's CI. On alpha-dev this
                 deploys production without alpha-dev's CI verdict.
  --skip-changelog  Do not generate or publish GitHub release notes.
  --help, -h     This text.`;

/** The parsed `ava release` options, as Acclimate hands them to the action. */
type ReleaseCliArgs = {
  version?: string;
  next?: string;
  yes: boolean;
  dryRun: boolean;
  skipCiCheck: boolean;
  skipChangelog: boolean;
};

/**
 * `ava release`: publish a new release of the Avandar app.
 *
 * `--version` and `--next` are optional on purpose: when either is missing the
 * command prints the versions that currently exist and asks. See
 * `releasePromptHelpers.ts` for why the asking happens inside the action rather
 * than through `askIfEmpty`.
 */
export const ReleaseCli = Acclimate.createCLI("release")
  .addCommand("get-prod-version", GetProdVersionCli)
  .addCommand("notes", ReleaseNotesCli)
  .description(
    "Publish a new release of the Avandar app. Run it on alpha-dev to " +
      "release alpha (production, app.avandarlabs.com), or on develop to " +
      "release mainline (main). Any other branch is refused. The target " +
      "branch becomes an exact copy of the source branch (a straight cut, " +
      "never a merge, so it cannot conflict), tagged vX.Y.Z on mainline or " +
      "vX.Y.Z-alpha on alpha. The source branch then moves on to its next " +
      "dev version (-dev on develop, -alpha-dev on alpha-dev). Type versions " +
      "as X.Y.Z: the suffixes are added for you.",
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
      "X.Y.Z the source branch moves to; gains -dev or -alpha-dev. Asked for " +
      "when omitted.",
  })
  .addOption({
    name: "--yes",
    aliases: ["-y"] as const,
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Take every suggested version and skip all confirmations. " +
      "This releases without asking anything, except that it never " +
      "overrides a non-passing alpha-dev CI verdict.",
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
      "Do not check the source branch's CI. On alpha-dev, which refuses " +
      "any verdict but a pass, this deploys production without " +
      "alpha-dev's CI verdict.",
  })
  .addOption({
    name: "--skip-changelog",
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Do not generate or publish GitHub release notes for this release.",
  })
  .action((args: Readonly<ReleaseCliArgs>) => {
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
      skipCiCheck: args.skipCiCheck,
      skipChangelog: args.skipChangelog,
    }).catch((error: unknown) => {
      printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });
