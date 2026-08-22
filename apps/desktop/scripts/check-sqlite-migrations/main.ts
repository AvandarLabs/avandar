/*
 * Entry point for `pnpm desktop:sqlite:check-migrations`. Generates a
 * fresh batch of `.gen.sql` into a temp directory using the same code
 * path as the gen script, then diffs against the committed
 * `apps/desktop/migrations/*.gen.sql` files. Exits non-zero on any
 * mismatch so CI fails the PR.
 *
 * Has the same `uv` + sqlglot prerequisite as the gen script. Not
 * imported from any runtime code; only the matching pnpm script
 * invokes it.
 *
 * Note: when a `.gen.sql` has been hand-edited (per the gen script's
 * yellow `needs hand-edit` warning), this check WILL report drift on
 * that file because the fresh regen does not preserve the hand-edit.
 * That's expected; the diff serves as a "manual-edit ledger" until a
 * preserve-hand-edits mechanism lands.
 */

import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runGenerator } from "../gen-sqlite-migrations/runGenerator/runGenerator";
import { compare, formatDiff } from "./compare";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..", "..");
const PG_MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const COMMITTED_DIR = join(REPO_ROOT, "apps", "desktop", "migrations");

function readGeneratedFiles(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(dir)) {
    return out;
  }
  readdirSync(dir).forEach((name) => {
    if (!name.endsWith(".gen.sql")) {
      return;
    }
    out.set(name, readFileSync(join(dir, name), "utf8"));
  });
  return out;
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "ava-sqlite-mig-check-"));
try {
  runGenerator({
    sourceDirectory: PG_MIGRATIONS_DIR,
    outputDirectory: temporaryDirectory,
  });
  const committed = readGeneratedFiles(COMMITTED_DIR);
  const fresh = readGeneratedFiles(temporaryDirectory);
  const diffs = compare({ committed, fresh });

  if (diffs.length === 0) {
    console.log("[check-sqlite-migrations] clean: no drift");
    process.exit(0);
  }

  console.error(
    "[check-sqlite-migrations] drift detected; run `pnpm desktop:sqlite:gen-migrations` and commit the result:",
  );
  diffs.forEach((entry) => {
    console.error(`  ${formatDiff(entry)}`);
  });
  process.exit(1);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
