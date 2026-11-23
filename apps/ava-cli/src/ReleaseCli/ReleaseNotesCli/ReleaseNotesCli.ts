import { createReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import { MAINLINE_RELEASE_LINE } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { listSortedReleaseTags } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import { wantsHelp } from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { promptForVersion } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  toReleaseTag,
  toReleaseVersion,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import { match } from "ts-pattern";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

const USAGE = `ava release notes: publish GitHub release notes for an existing release.

  Generates release notes from the commits between the previous version tag
  and the given one, via an LLM, and publishes them as a GitHub Release. Use
  this to retry a notes publish that failed during \`ava release\`, or to
  publish notes for any past release that doesn't have them yet.

Usage
  ava release notes --version 0.13.3             publish notes for v0.13.3
  ava release notes --version 0.13.4 --update   replace existing notes
  ava release notes                               ask for a version
  ava release notes --version 0.13.3 --dry-run   preview without publishing

Options
  --version, -v  X.Y.Z to publish notes for. Asked for when omitted.
  --update       Replace notes on an existing release, preserving other metadata.
  --dry-run      Generate and print the notes, but do not publish them.
  --help, -h     This text.`;

/** The parsed `ava release notes` options, as Acclimate hands to the action. */
type ReleaseNotesCliArgs = {
  version?: string;
  dryRun: boolean;
  update?: boolean;
};

/** Every flag `ava release notes` accepts, including aliases. */
const RELEASE_NOTES_FLAGS: ReadonlySet<string> = new Set([
  "--version",
  "-v",
  "--update",
  "--dry-run",
  "--help",
  "-h",
]);

/**
 * Flags in `argv` that `ava release notes` does not accept. Acclimate drops an
 * option it does not recognise, so without this a removed or mistyped flag
 * would publish notes for a tag the user did not ask for.
 */
function _findUnknownReleaseNotesFlags(
  argv: readonly string[],
): readonly string[] {
  return argv.filter((token) => {
    const [flag] = token.split("=");
    return token.startsWith("-") && !RELEASE_NOTES_FLAGS.has(flag ?? token);
  });
}

/**
 * The bare `X.Y.Z` of the newest tag `line` released, or undefined when it has
 * none. A tag belongs to the line when the line would tag that version with
 * it, so `v0.14.2` counts and a suffixed tag such as `v0.15.0-rc` does not.
 */
function _getNewestVersionFromTags(
  options: Readonly<{ tags: readonly string[]; line: ReleaseLine }>,
): string | undefined {
  const { tags, line } = options;
  const lineVersions = tags
    .map((tag) => {
      return { tag, version: toReleaseVersion(tag.replace(/^v/, "")) };
    })
    .filter(({ tag, version }) => {
      return toReleaseTag(version, line) === tag;
    });
  return lineVersions.at(-1)?.version;
}

/**
 * Asks which released version to publish notes for, suggesting the newest
 * release on `line`.
 */
async function _promptForReleasedVersion(
  git: ReleaseCommands,
  line: ReleaseLine,
): Promise<string> {
  return promptForVersion({
    message: "Which released version should get published notes?",
    defaultValue: _getNewestVersionFromTags({
      tags: listSortedReleaseTags(git),
      line,
    }),
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

  const line = MAINLINE_RELEASE_LINE;
  const version = args.version ?? (await _promptForReleasedVersion(git, line));
  const validation = validateReleaseVersion(version, "Version");
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  const releaseTag = toReleaseTag(version, line);

  const outcome = await publishReleaseNotes(git, {
    releaseTag,
    dryRun: args.dryRun,
    update: args.update,
  });

  match(outcome)
    .with({ kind: "tag-not-found" }, () => {
      throw new Error(
        `No release tag ${releaseTag} exists locally or on origin.`,
      );
    })
    .with({ kind: "already-exists" }, (matchedOutcome) => {
      throw new Error(
        `Release notes already exist for ${releaseTag}: ${matchedOutcome.url}`,
      );
    })
    .with({ kind: "no-changes" }, () => {
      printInfo(`No commits found for ${releaseTag}; nothing to publish.`);
    })
    .with({ kind: "previewed" }, (matchedOutcome) => {
      printInfo(
        `Preview for ${releaseTag} (dry run, nothing published):\n\n${matchedOutcome.notes}`,
      );
    })
    .with({ kind: "published" }, (matchedOutcome) => {
      printSuccess(
        `Published release notes for ${releaseTag}: ${matchedOutcome.url}`,
      );
    })
    .with({ kind: "failed" }, (matchedOutcome) => {
      throw new Error(
        `Could not publish release notes for ${releaseTag}: ${matchedOutcome.reason}`,
      );
    })
    .exhaustive();
}

/**
 * `ava release notes`: generate and publish GitHub release notes for an
 * existing release tag.
 */
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
    name: "--update",
    type: "boolean",
    required: false,
    defaultValue: false,
    description: "Replace the notes of an existing GitHub Release.",
  })
  .addOption({
    name: "--dry-run",
    type: "boolean",
    required: false,
    defaultValue: false,
    description: "Generate and print the notes, but do not publish them.",
  })
  .action((args: Readonly<ReleaseNotesCliArgs>) => {
    const argv = process.argv.slice(2);
    if (wantsHelp(argv)) {
      printInfo(USAGE);
      return undefined;
    }
    const unknownFlags = _findUnknownReleaseNotesFlags(argv);
    if (unknownFlags.length > 0) {
      printError(
        `Unknown option${unknownFlags.length > 1 ? "s" : ""}: ` +
          `${unknownFlags.join(", ")}. Nothing was published; ` +
          "run `ava release notes --help`.",
      );
      process.exitCode = 1;
      return undefined;
    }
    return _runReleaseNotes(args).catch((error: unknown) => {
      printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });
