import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/releaseCommands";

/**
 * The staging CI verdict for the commit about to be released.
 *
 * Pushing `main` deploys production and pushes migrations to the production
 * database, so the last chance to notice a red build is before the release, not
 * after it.
 */

/** The workflow that gates develop. See .github/workflows/staging.yaml. */
const STAGING_WORKFLOW = "staging.yaml";

export type CIStatus =
  /** The run for this exact commit finished successfully. */
  | Readonly<{ kind: "passed"; url: string }>
  /** The run for this exact commit finished, but not successfully. */
  | Readonly<{ kind: "failed"; conclusion: string; url: string }>
  /** A run exists for this commit but has not finished. */
  | Readonly<{ kind: "pending"; status: string; url: string }>
  /** No run exists for this commit yet. */
  | Readonly<{ kind: "missing" }>
  /** The check could not be performed (no `gh`, not logged in, offline). */
  | Readonly<{ kind: "unknown"; reason: string }>;

type WorkflowRun = Readonly<{
  headSha: string;
  status: string;
  conclusion: string;
  url: string;
}>;

function parseRuns(json: string): readonly WorkflowRun[] | undefined {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ?
        (parsed as readonly WorkflowRun[])
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Asks the GitHub CLI about the staging run for `commitSHA`.
 *
 * A missing or unusable `gh` is reported as "unknown" rather than treated as a
 * failure: it is a gap in our information, and the caller decides whether to
 * proceed. It is never reported as a pass.
 */
export function checkDevelopCI(
  git: ReleaseCommands,
  options: { commitSHA: string; branch: string },
): CIStatus {
  const { commitSHA, branch } = options;

  const result = git.mutateQuietly("gh", [
    "run",
    "list",
    "--branch",
    branch,
    "--workflow",
    STAGING_WORKFLOW,
    "--limit",
    "20",
    "--json",
    "headSha,status,conclusion,url",
  ]);

  if (!result.ok) {
    return {
      kind: "unknown",
      reason:
        result.stderr.length > 0 ?
          (result.stderr.split("\n")[0] ?? result.stderr)
        : "the gh CLI could not list workflow runs",
    };
  }

  const runs = parseRuns(result.stdout);
  if (runs === undefined) {
    return { kind: "unknown", reason: "could not parse the gh CLI response" };
  }

  const run = runs.find((candidate) => {
    return candidate.headSha === commitSHA;
  });
  if (run === undefined) {
    return { kind: "missing" };
  }
  if (run.status !== "completed") {
    return { kind: "pending", status: run.status, url: run.url };
  }
  if (run.conclusion === "success") {
    return { kind: "passed", url: run.url };
  }
  return { kind: "failed", conclusion: run.conclusion, url: run.url };
}

/** A one-line description of a CI status, for printing. */
export function describeCIStatus(status: CIStatus): string {
  switch (status.kind) {
    case "passed":
      return "Staging CI passed.";
    case "failed":
      return `Staging CI did not pass (${status.conclusion}): ${status.url}`;
    case "pending":
      return `Staging CI has not finished (${status.status}): ${status.url}`;
    case "missing":
      return "No staging CI run was found for this commit.";
    case "unknown":
      return `Could not check staging CI: ${status.reason}`;
  }
}
