import { describeCommandFailure } from "@ava-cli/ReleaseCLI/describeCommandFailure/describeCommandFailure";
import { propEq } from "@avandar/utils";
import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/createReleaseCommands";

/** The workflow that gates develop. See .github/workflows/staging.yaml. */
const STAGING_WORKFLOW = "staging.yaml";

/** The staging CI verdict for one commit. */
export type CIStatus =
  /** The run for this exact commit finished successfully. */
  | { kind: "passed"; url: string }
  /** The run for this exact commit finished, but not successfully. */
  | { kind: "failed"; conclusion: string; url: string }
  /** A run exists for this commit but has not finished. */
  | { kind: "pending"; status: string; url: string }
  /** No run exists for this commit yet. */
  | { kind: "missing" }
  /** The check could not be performed (no `gh`, not logged in, offline). */
  | { kind: "unknown"; reason: string };

/** One row of `gh run list --json headSha,status,conclusion,url`. */
type WorkflowRun = {
  /** Spelled as the `gh` JSON field is, so the mapping stays obvious. */
  headSha: string;
  status: string;
  conclusion: string;
  url: string;
};

/** Whether an unknown value carries every field this module reads. */
function _isWorkflowRun(value: unknown): value is WorkflowRun {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof WorkflowRun, unknown>>;
  return (
    typeof candidate.headSha === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.conclusion === "string" &&
    typeof candidate.url === "string"
  );
}

/**
 * The workflow runs in a `gh` JSON response, or `undefined` when the response
 * is not a list of runs shaped the way this module reads them.
 *
 * Every element is checked rather than asserted: an unrecognised shape has to
 * surface as an honest "unknown" verdict, never as a wrong one.
 */
function _parseRuns(json: string): readonly WorkflowRun[] | undefined {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || !parsed.every(_isWorkflowRun)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Asks the GitHub CLI for the staging CI verdict on `commitSha`, the commit
 * about to be released.
 *
 * Pushing `main` deploys production and pushes migrations to the production
 * database, so the last chance to notice a red build is before the release. A
 * missing or unusable `gh` is reported as "unknown" rather than treated as a
 * failure: it is a gap in our information, and the caller decides whether to
 * proceed. It is never reported as a pass.
 */
export function checkDevelopCI(
  git: ReleaseCommands,
  options: Readonly<{ commitSha: string; branch: string }>,
): CIStatus {
  const { commitSha, branch } = options;

  const result = git.readCommand("gh", [
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
      reason: describeCommandFailure(
        result,
        "the gh CLI could not list workflow runs",
      ),
    };
  }

  const runs = _parseRuns(result.stdout);
  if (runs === undefined) {
    return { kind: "unknown", reason: "could not parse the gh CLI response" };
  }

  const run = runs.find(propEq("headSha", commitSha));
  return (
    run === undefined ? { kind: "missing" }
    : run.status !== "completed" ?
      { kind: "pending", status: run.status, url: run.url }
    : run.conclusion === "success" ? { kind: "passed", url: run.url }
    : { kind: "failed", conclusion: run.conclusion, url: run.url }
  );
}
