import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { describeCommandFailure } from "@ava-cli/ReleaseCli/describeCommandFailure/describeCommandFailure";
import {
  collectReleaseChangelogCommits,
  getPreviousReleaseTagFromTag,
} from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import { generateReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/generateReleaseNotes/generateReleaseNotes";
import { RELEASE_CHANGELOG_MODEL } from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
import {
  getGitHubRepoSlug,
  localTagExists,
  remoteTagExists,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

export type PublishReleaseNotesOutcome =
  | { kind: "published"; url: string }
  | { kind: "previewed"; notes: string }
  | { kind: "already-exists"; url: string }
  | { kind: "no-changes" }
  | { kind: "tag-not-found" }
  | { kind: "failed"; reason: string };

/** The `url` field of a `gh release view --json url` response, if parseable. */
function _parseReleaseUrl(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as { url?: unknown };
    return typeof parsed.url === "string" ? parsed.url : undefined;
  } catch {
    return undefined;
  }
}

/** The best URL we can report for a tag, falling back to the tag name. */
function _releaseUrl(
  git: ReleaseCommands,
  releaseTag: string,
  parsedUrl: string | undefined,
): string {
  if (parsedUrl !== undefined) {
    return parsedUrl;
  }
  const repoSlug = getGitHubRepoSlug(git);
  return repoSlug !== undefined
    ? `https://github.com/${repoSlug}/releases/tag/${releaseTag}`
    : releaseTag;
}

/** Options accepted by {@link publishReleaseNotes}. */
export type PublishReleaseNotesOptions = Readonly<{
  releaseTag: string;
  /**
   * The commit to diff from the previous tag, when it differs from
   * `releaseTag` itself. Only a `--dry-run` preview needs this: the tag
   * does not exist yet, so the develop commit that would become the
   * release stands in for it.
   */
  headRevision?: string;
  dryRun: boolean;
  /**
   * Skips the "does this tag exist" and "does it already have a release"
   * checks. Only a `--dry-run` preview sets this, since in that case the
   * tag is intentionally not created yet.
   */
  skipExistenceChecks?: boolean;
  /** Overrides `fetch` for the OpenAI call. For tests. */
  fetchImpl?: typeof fetch;
}>;

/**
 * Checks whether `releaseTag` exists and whether it already has a GitHub
 * Release, returning the outcome to short-circuit on, or `undefined` to
 * continue with generating notes.
 */
function _checkExistingRelease(
  git: ReleaseCommands,
  releaseTag: string,
): PublishReleaseNotesOutcome | undefined {
  if (!localTagExists(git, releaseTag) && !remoteTagExists(git, releaseTag)) {
    return { kind: "tag-not-found" };
  }
  const viewResult = git.readCommand("gh", [
    "release",
    "view",
    releaseTag,
    "--json",
    "url",
  ]);
  if (viewResult.ok) {
    return {
      kind: "already-exists",
      url: _releaseUrl(git, releaseTag, _parseReleaseUrl(viewResult.stdout)),
    };
  }
  return undefined;
}

/**
 * Generates and publishes a GitHub Release's notes for `releaseTag`.
 *
 * Never throws: every expected failure (missing tag, existing release, no
 * commits, an OpenAI or `gh` failure) comes back as a typed outcome, so the
 * two callers, the automatic publish inside `ava release`, and the
 * standalone `ava release notes` retry command, can each decide how loudly
 * to report the same condition.
 */
export async function publishReleaseNotes(
  git: ReleaseCommands,
  options: PublishReleaseNotesOptions,
): Promise<PublishReleaseNotesOutcome> {
  const { releaseTag, dryRun, fetchImpl } = options;
  const headRevision = options.headRevision ?? releaseTag;
  const skipExistenceChecks = options.skipExistenceChecks ?? false;

  git.tryGit(["fetch", "--quiet", "--tags", "origin"]);

  if (!skipExistenceChecks) {
    const existingOutcome = _checkExistingRelease(git, releaseTag);
    if (existingOutcome !== undefined) {
      return existingOutcome;
    }
  }

  const previousTag = getPreviousReleaseTagFromTag(git, releaseTag);
  const commits = collectReleaseChangelogCommits(git, {
    previousTag,
    headRevision,
  });
  if (commits.length === 0) {
    return { kind: "no-changes" };
  }

  let notes: string;
  try {
    notes = await generateReleaseNotes({
      releaseVersion: releaseTag.replace(/^v/, ""),
      commits,
      apiKey: AvaEnv.requireVar("OPENAI_API_KEY"),
      model: RELEASE_CHANGELOG_MODEL,
      fetchImpl,
    });
  } catch (error: unknown) {
    return {
      kind: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (notes.trim().length === 0) {
    return { kind: "no-changes" };
  }

  if (dryRun) {
    return { kind: "previewed", notes };
  }

  const createResult = git.mutate("gh", [
    "release",
    "create",
    releaseTag,
    "--title",
    releaseTag,
    "--notes",
    notes,
    "--verify-tag",
  ]);
  if (!createResult.ok) {
    return {
      kind: "failed",
      reason: describeCommandFailure(createResult, "gh gave no reason"),
    };
  }
  return { kind: "published", url: _releaseUrl(git, releaseTag, undefined) };
}
