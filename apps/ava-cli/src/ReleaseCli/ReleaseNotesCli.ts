import { createReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import { listSortedReleaseTags } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";
import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes";
import { wantsHelp } from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { promptForVersion } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  toReleaseTag,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

const USAGE = `ava release notes: publish GitHub release notes for an existing release.

  Generates release notes from the commits between the previous version tag
  and the given one, via an LLM, and publishes them as a GitHub Release. Use
  this to retry a notes publish that failed during \`ava release\`, or to
  publish notes for any past release that doesn't have them yet.

Usage
  ava release notes --version 0.13.3             publish notes for v0.13.3
  ava release notes                               ask for a version
  ava release notes --version 0.13.3 --dry-run   preview without publishing

Options
  --version, -v  X.Y.Z to publish notes for. Asked for when omitted.
  --dry-run      Generate and print the notes, but do not publish them.
  --help, -h     This text.`;

/** The parsed `ava release notes` options, as Acclimate hands to the action. */
type ReleaseNotesCliArgs = {
  version?: string;
  dryRun: boolean;
};

/** Asks which released version to publish notes for; defaults to latest. */
async function _promptForReleasedVersion(
  git: ReleaseCommands,
): Promise<string> {
  const tags = listSortedReleaseTags(git);
  const mostRecentTag = tags.at(-1);
  return promptForVersion({
    message: "Which released version should get published notes?",
    defaultValue: mostRecentTag?.replace(/^v/, ""),
    label: "Version",
  });
}

/** `ava release notes`: generate and publish GitHub release notes for a tag. */
async function _runReleaseNotes(
  args: Readonly<ReleaseNotesCliArgs>,
): Promise<void> {
  const repoRoot = findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root. Run this from inside the repository.",
    );
  }
  const git = createReleaseCommands({ repoRoot, dryRun: args.dryRun });

  const version = args.version ?? (await _promptForReleasedVersion(git));
  const validation = validateReleaseVersion(version, "Version");
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  const releaseTag = toReleaseTag(version);

  const outcome = await publishReleaseNotes(git, {
    releaseTag,
    dryRun: args.dryRun,
  });

  switch (outcome.kind) {
    case "tag-not-found":
      throw new Error(
        `No release tag ${releaseTag} exists locally or on origin.`,
      );
    case "already-exists":
      throw new Error(
        `Release notes already exist for ${releaseTag}: ${outcome.url}`,
      );
    case "no-changes":
      printInfo(`No commits found for ${releaseTag}; nothing to publish.`);
      return;
    case "previewed":
      printInfo(
        `Preview for ${releaseTag} (dry run, nothing published):\n\n${outcome.notes}`,
      );
      return;
    case "published":
      printSuccess(
        `Published release notes for ${releaseTag}: ${outcome.url}`,
      );
      return;
    case "failed":
      throw new Error(
        `Could not publish release notes for ${releaseTag}: ${outcome.reason}`,
      );
  }
}

export const ReleaseNotesCli = Acclimate.createCLI("notes")
  .description(
    "Generate and publish GitHub release notes for an existing release tag, via an LLM.",
  )
  .addOption({
    name: "--version",
    aliases: ["-v"] as const,
    type: "string",
    required: false,
    description:
      "The X.Y.Z version to publish notes for. Asked for when omitted.",
  })
  .addOption({
    name: "--dry-run",
    type: "boolean",
    required: false,
    defaultValue: false,
    description: "Generate and print the notes, but do not publish them.",
  })
  .action((args: Readonly<ReleaseNotesCliArgs>) => {
    if (wantsHelp(process.argv.slice(2))) {
      printInfo(USAGE);
      return undefined;
    }
    return _runReleaseNotes(args).catch((error: unknown) => {
      printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });
