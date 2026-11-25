/**
 * Runs `ShouldSkipCiCli.ts` directly under Node and checks its GITHUB_OUTPUT.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShouldSkipCiFixtures } from "./ShouldSkipCiFixtures";

const SCRIPT_PATH = resolve(import.meta.dirname, "../ShouldSkipCiCli.ts");

afterEach(ShouldSkipCiFixtures.cleanupTempDirs);

describe("ShouldSkipCi CLI execution", () => {
  it("runs directly via Node 24 and writes GITHUB_OUTPUT", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    ShouldSkipCiFixtures.writeFile(repoDir, "docs/cli.md", "# CLI\n");
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "docs: verify cli",
    );
    const githubOutputPath = join(repoDir, "github-output.txt");
    writeFileSync(githubOutputPath, "");

    execFileSync(
      "node",
      [
        SCRIPT_PATH,
        "--event-name",
        "push",
        "--before-sha",
        beforeSha,
        "--after-sha",
        afterSha,
        "--pr-base-sha",
        "",
        "--github-output-path",
        githubOutputPath,
      ],
      { cwd: repoDir, encoding: "utf8", env: ShouldSkipCiFixtures.GIT_ENV },
    );

    const output = readFileSync(githubOutputPath, "utf8");
    expect(output).toContain("should-skip=true\n");
    expect(output).toMatch(/reason=.+\n/);
  });
});
