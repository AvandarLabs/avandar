import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { loadRuleCatalog } from "../../../src/catalog/index";

const directories: string[] = [];
afterEach(() => {
  return directories.splice(0).forEach((directory) => {
    return rmSync(directory, { recursive: true, force: true });
  });
});
/** Allocates temporary input directories for coverage contract tests. */
export function createCoverageDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "avandar-coverage-"));
  directories.push(directory);
  return directory;
}
const rule = loadRuleCatalog().rules.find((entry) => {
  return entry.id === "AF-01";
})!;
export const COVERAGE_CATALOG = {
  version: 1 as const,
  languages: ["typescript", "json"],
  rules: [rule],
};
