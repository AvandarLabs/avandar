import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const directories: string[] = [];
const SCRIPT: string = resolve(import.meta.dirname, "../benchmarkLint.mjs");

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

it("inserts the completed benchmark into the samples table before its narrative", () => {
  const directory = mkdtempSync(join(tmpdir(), "benchmark-recording-"));
  directories.push(directory);
  mkdirSync(join(directory, "bin"));
  mkdirSync(join(directory, "docs/lint-benchmarks"), { recursive: true });
  writeFileSync(join(directory, "bin/pnpm"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  });
  const destination = join(directory, "docs/lint-benchmarks/oxlint-phase-3.md");
  const narrative =
    "## Explanation\n\nKeep this narrative after the samples.\n";
  writeFileSync(
    destination,
    [
      "# Lint benchmark\n\n## Lint samples\n\n",
      "| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |\n",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n",
      "| prior | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0, 0, 0, 0, 0, 0 |\n\n",
      narrative,
    ].join(""),
  );
  const result = spawnSync(
    process.execPath,
    [SCRIPT, "--label", "fixture-complete"],
    {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${join(directory, "bin")}:${process.env.PATH}`,
      },
    },
  );
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).exitCodes).toEqual([0, 0, 0, 0, 0, 0]);
  const document = readFileSync(destination, "utf8");
  expect(document).toContain("| prior | 1 |");
  expect(document).toContain("| fixture-complete |");
  expect(document.indexOf("| fixture-complete |")).toBeLessThan(
    document.indexOf("## Explanation"),
  );
  expect(document.endsWith(narrative)).toBe(true);
});
