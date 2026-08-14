import { readMigrationsSnapshot } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/readMigrationsSnapshot/readMigrationsSnapshot";
import { runMigrationChecks } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/runMigrationChecks/runMigrationChecks";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type {
  MigrationCheckResult,
  MigrationCheckStatus,
  MigrationsSnapshot,
} from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/runMigrationChecks/runMigrationChecks.types";

/** Icon and colour per status, so the terminal reads at a glance. */
const STATUS_STYLES: Record<
  MigrationCheckStatus,
  { icon: string; color: string; label: string }
> = {
  pass: { icon: "✅", color: "|green|", label: "PASS" },
  warn: { icon: "🟡", color: "|yellow|", label: "WARN" },
  fail: { icon: "🔴", color: "|red|", label: "FAIL" },
};

function _printHeader(baseBranch: string, currentBranch: string): void {
  Acclimate.log("");
  Acclimate.log("|cyan|🔍 Validating Supabase migrations");
  Acclimate.log("|gray|─────────────────────────────────────────────");
  Acclimate.log("|gray|   branch:|reset| $currentBranch$", { currentBranch });
  Acclimate.log("|gray|   base:  |reset| $baseBranch$", { baseBranch });
  Acclimate.log("");
}

/** One check: what is being looked at, then how it came out. */
function _printCheck(index: number, result: MigrationCheckResult): void {
  const style = STATUS_STYLES[result.status];

  Acclimate.log("|cyan|[$index$] Checking: |white|$title$", {
    index: String(index),
    title: result.title,
  });
  Acclimate.log("    $icon$ $color$$label$|reset| |gray|·|reset| $summary$", {
    icon: style.icon,
    color: style.color,
    label: style.label,
    summary: result.summary,
  });

  result.details.forEach((detail) => {
    Acclimate.log("       |gray|• $detail$", { detail });
  });

  Acclimate.log("");
}

function _printSummary(results: MigrationCheckResult[]): void {
  const failed = results.filter((result) => {
    return result.status === "fail";
  });
  const warned = results.filter((result) => {
    return result.status === "warn";
  });
  const passed = results.length - failed.length - warned.length;

  Acclimate.log("|gray|─────────────────────────────────────────────");

  if (failed.length > 0) {
    Acclimate.log(
      "|red|🔴 $failed$ check(s) failed|reset| |gray|·|reset| |green|$passed$ passed|reset| |gray|·|reset| |yellow|$warned$ warning(s)",
      {
        failed: String(failed.length),
        passed: String(passed),
        warned: String(warned.length),
      },
    );
    Acclimate.log("");
    failed.forEach((result) => {
      Acclimate.log("|red|   ✗ $title$", { title: result.title });
    });
  } else {
    Acclimate.log(
      "|green|✅ All $passed$ check(s) passed|reset| |gray|·|reset| |yellow|$warned$ warning(s)",
      { passed: String(passed), warned: String(warned.length) },
    );
  }

  Acclimate.log("");
}

/** Prints every check, and reports whether any of them failed. */
function _printAllChecks(snapshot: Readonly<MigrationsSnapshot>): boolean {
  _printHeader(snapshot.baseBranch, snapshot.currentBranch ?? "detached HEAD");

  const results = runMigrationChecks(snapshot);
  results.forEach((result, idx) => {
    _printCheck(idx + 1, result);
  });
  _printSummary(results);

  return results.some((result) => {
    return result.status === "fail";
  });
}

/**
 * Print every check and return the process exit code: 0 when nothing failed,
 * 1 otherwise. Warnings never fail the run, so a flagged statement that turns
 * out to be intended does not block a pipeline.
 */
function _runValidation(): number {
  const repoRoot = findRepoRoot();
  if (repoRoot === undefined) {
    Acclimate.log(
      "|red|🔴 Not inside the Avandar monorepo. Run this from the repository.",
    );
    return 1;
  }

  const snapshot = readMigrationsSnapshot(repoRoot);
  if (snapshot === undefined) {
    Acclimate.log(
      "|red|🔴 Could not find a base branch (looked for origin/develop, develop, origin/main, main).",
    );
    return 1;
  }

  return _printAllChecks(snapshot) ? 1 : 0;
}

/** Validates this branch's Supabase migrations against the base branch. */
export const SupabaseMigrationsValidateCLI = Acclimate.createCLI("validate")
  .description(
    "Check this branch's migrations for ordering conflicts and other common mistakes",
  )
  .action(async () => {
    // Every exit path sets `process.exitCode` explicitly, including the crash
    // path. `Acclimate.run` voids the action's promise, so an uncaught throw
    // would otherwise surface only as an unhandled rejection, and a runner
    // with `--unhandled-rejections=warn` would report a crash as success.
    try {
      process.exitCode = _runValidation();
    } catch (error) {
      Acclimate.log("|red|🔴 Migration validation crashed: $message$", {
        message: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    }
  });
