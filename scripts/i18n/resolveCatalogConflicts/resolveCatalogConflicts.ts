/**
 * Resolve merge conflicts in the Lingui catalogs under `src/i18n/locales/`.
 *
 * Run it through the orchestrator: `pnpm translations resolve`.
 *
 * These files conflict on nearly every merge, and never meaningfully: they are
 * generated. `messages.ts` is one long compiled line, so any two changes
 * collide over the whole file. `messages.po` is kept sorted by message id, so
 * two branches adding different strings interleave their insertions and git
 * reports a textual conflict over changes that do not actually disagree.
 *
 * Because both are derived artifacts, the resolution is mechanical rather than
 * a judgement call:
 *
 *   1. Union the msgstr values from both sides of each conflicted `.po`. That
 *      is the only information in these files that is not recomputable, since
 *      translations are written by the LLM step rather than derived from
 *      source.
 *   2. Re-run `lingui extract --clean`, which rewrites every catalog from the
 *      merged source tree: canonical order, canonical wrapping, correct `#:`
 *      references, and no entry whose string no longer exists in the code.
 *   3. Re-run `lingui compile`, which regenerates `messages.ts` outright. The
 *      conflicted content is never merged, only overwritten.
 *
 * Steps 2 and 3 are what make this deterministic: the merged `.po` written in
 * step 1 only has to be parseable, because extract immediately rewrites it.
 *
 * The one case needing a human is a msgid both branches translated differently
 * for the same locale. Ours is kept and the msgid is printed, because either
 * choice is a guess.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PROJECT_ROOT } from "../translateWithLlm/config";
import { CatalogConflictMerge } from "./catalogConflictMerge";
import type { CatalogSides } from "./catalogConflictMerge";

const CATALOG_DIR = path.join("src", "i18n", "locales");

function _git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function _run(command: string, args: string[]): void {
  execFileSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    encoding: "utf8",
  });
}

function _unmergedPaths(): string[] {
  return _git(["diff", "--name-only", "--diff-filter=U"])
    .split("\n")
    .filter((line) => {
      return line !== "";
    });
}

/**
 * Reads both merge stages from the index. Falls back to splitting the conflict
 * markers in the working file when the stages are gone, which happens when the
 * conflict outlived the merge that produced it.
 */
function _readSides(repoPath: string): CatalogSides | undefined {
  try {
    return {
      ours: _git(["show", `:2:${repoPath}`]),
      theirs: _git(["show", `:3:${repoPath}`]),
    };
  } catch {
    const absolutePath = path.join(PROJECT_ROOT, repoPath);
    if (!existsSync(absolutePath)) {
      return undefined;
    }
    return CatalogConflictMerge.splitConflictMarkers(
      readFileSync(absolutePath, "utf8"),
    );
  }
}

function main(): void {
  const unmerged = _unmergedPaths();
  if (unmerged.length === 0) {
    console.log("No conflicted files. Nothing to resolve.");
    return;
  }

  const catalogPaths = unmerged.filter((repoPath) => {
    return repoPath.startsWith(`${CATALOG_DIR}${path.sep}`);
  });
  const otherPaths = unmerged.filter((repoPath) => {
    return !catalogPaths.includes(repoPath);
  });

  // Extract parses the whole source tree. Conflict markers left in a .ts file
  // would either crash it or, worse, silently drop that file's strings from
  // every catalog, so refuse rather than produce a plausible wrong result.
  if (otherPaths.length > 0) {
    console.error(
      `Refusing to run: ${otherPaths.length} conflicted file(s) outside ` +
        `${CATALOG_DIR}. Resolve these first, then re-run:\n` +
        otherPaths
          .map((repoPath) => {
            return `  ${repoPath}`;
          })
          .join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const poPaths = catalogPaths.filter((repoPath) => {
    return repoPath.endsWith(".po");
  });
  const compiledPaths = catalogPaths.filter((repoPath) => {
    return !repoPath.endsWith(".po");
  });

  const divergentByPath = new Map<string, string[]>();
  poPaths.forEach((repoPath) => {
    const sides = _readSides(repoPath);
    if (sides === undefined) {
      throw new Error(
        `Could not read both merge sides for ${repoPath}. Resolve it by hand.`,
      );
    }
    const merged = CatalogConflictMerge.mergeCatalogs(sides);
    writeFileSync(path.join(PROJECT_ROOT, repoPath), merged.text, "utf8");
    console.log(
      `  ${repoPath}: +${merged.addedFromTheirs.length} incoming entries`,
    );
    if (merged.divergentMsgids.length > 0) {
      divergentByPath.set(repoPath, merged.divergentMsgids);
    }
  });

  if (compiledPaths.length > 0) {
    console.log(
      `  ${compiledPaths.length} compiled catalog(s) will be regenerated.`,
    );
  }

  console.log("\nNormalizing catalogs (lingui extract --clean)...");
  _run("pnpm", ["exec", "lingui", "extract", "--clean"]);

  console.log("\nCompiling catalogs (lingui compile --typescript)...");
  _run("pnpm", ["exec", "lingui", "compile", "--typescript"]);

  _git(["add", "--", CATALOG_DIR]);

  if (divergentByPath.size > 0) {
    console.log(
      "\nBoth branches translated these differently. Ours was kept; " +
        "check them:",
    );
    divergentByPath.forEach((msgids, repoPath) => {
      console.log(`  ${repoPath}`);
      msgids.forEach((msgid) => {
        console.log(`    ${msgid}`);
      });
    });
  }

  console.log(
    "\n✓ Catalogs resolved and staged. Run `pnpm translations` if the " +
      "merge brought in strings that still need translating.",
  );
}

if (!process.env.VITEST) {
  main();
}
