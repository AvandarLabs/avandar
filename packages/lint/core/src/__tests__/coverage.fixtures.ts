import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { loadRuleCatalog } from "../catalog/index";
import type { RuleCatalog } from "../catalog/RuleCatalog.types";

const directories: string[] = [];
afterEach(() => {
  return directories.splice(0).forEach((directory) => {
    return rmSync(directory, { recursive: true, force: true });
  });
});
/**
 * Creates a temporary directory path for coverage tests, cleaned up after each
 * test.
 * Use it, for example, when a coverage test needs a directory for input files.
 */
export function createCoverageDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "avandar-coverage-"));
  directories.push(directory);
  return directory;
}
/** Minimal catalog used to isolate coverage classification behavior. */
export const COVERAGE_CATALOG: RuleCatalog = {
  version: 1 as const,
  languages: ["typescript", "json"],
  rules: [
    loadRuleCatalog().rules.find((entry) => {
      return entry.id === "avlint-ts-001";
    })!,
  ],
};
