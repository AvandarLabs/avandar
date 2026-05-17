/*
 * CI drift check for the Postgres -> SQLite generator.
 *
 * Generates SQLite migrations into a fresh temp directory using the same
 * code path as `pnpm gen:sqlite-migrations`, then diffs the temp output
 * against the committed `apps/desktop/migrations/*.gen.sql` files. Exits
 * non-zero on any mismatch so CI fails the PR.
 *
 * Has the same Python + sqlglot prerequisites as the generator. Not
 * imported from any runtime code; only the matching pnpm script invokes
 * it.
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
import { runGenerator } from "./gen-sqlite-migrations";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
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

function compare(
  committed: ReadonlyMap<string, string>,
  fresh: ReadonlyMap<string, string>,
): string[] {
  const diffs: string[] = [];
  const allNames = new Set<string>([...committed.keys(), ...fresh.keys()]);
  [...allNames].sort().forEach((name) => {
    const committedContent = committed.get(name);
    const freshContent = fresh.get(name);
    if (committedContent === undefined) {
      diffs.push(`+ ${name} (regenerated but not committed)`);
      return;
    }
    if (freshContent === undefined) {
      diffs.push(`- ${name} (committed but no longer generated)`);
      return;
    }
    if (committedContent !== freshContent) {
      diffs.push(`~ ${name} (content differs from regeneration)`);
    }
  });
  return diffs;
}

const tempDir = mkdtempSync(join(tmpdir(), "ava-sqlite-mig-check-"));
try {
  runGenerator(tempDir);
  const committed = readGeneratedFiles(COMMITTED_DIR);
  const fresh = readGeneratedFiles(tempDir);
  const diffs = compare(committed, fresh);

  if (diffs.length === 0) {
    console.log("[check-sqlite-migrations] clean: no drift");
    process.exit(0);
  }

  console.error(
    "[check-sqlite-migrations] drift detected; run `pnpm gen:sqlite-migrations` and commit the result:",
  );
  diffs.forEach((d) => {
    console.error(`  ${d}`);
  });
  process.exit(1);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
