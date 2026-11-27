/**
 * Temporary-git-repo tests for `ShouldSkipCi.evaluateGitRange`.
 */
import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShouldSkipCi } from "../ShouldSkipCi";
import { ShouldSkipCiFixtures } from "./ShouldSkipCiFixtures";

afterEach(ShouldSkipCiFixtures.cleanupTempDirs);

describe("ShouldSkipCi.evaluateGitRange", () => {
  it("skips a single-commit push tagged [skip deploy]", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "package.json",
      '{"version":"0.15.1-dev"}\n',
    );
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "Bump version to 0.15.1-dev [skip deploy]",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("skips a multi-commit push combining [skip deploy] and safe files", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);

    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "package.json",
      '{"version":"0.15.1-dev"}\n',
    );
    ShouldSkipCiFixtures.commitAll(
      repoDir,
      "Bump version to 0.15.1-dev [skip deploy]",
    );

    ShouldSkipCiFixtures.writeFile(repoDir, "docs/guide.md", "# Guide\n");
    ShouldSkipCiFixtures.writeFile(repoDir, "AGENTS.md", "# Agents\n");
    ShouldSkipCiFixtures.writeSymlink(repoDir, "CLAUDE.md", "AGENTS.md");
    ShouldSkipCiFixtures.writeSymlink(
      repoDir,
      ".agents/skills/my-skill",
      "../../agent-skills/public-skills/skills/my-skill",
    );
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "docs: add guide and skill symlink",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("runs CI when a multi-commit push includes a code commit", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);

    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "package.json",
      '{"version":"0.15.1-dev"}\n',
    );
    ShouldSkipCiFixtures.commitAll(
      repoDir,
      "Bump version to 0.15.1-dev [skip deploy]",
    );

    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "src/app.ts",
      "export const app = 1;\n",
    );
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "feat: add app constant",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("ignores [skip deploy] inside a squash-merge commit body", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "src/login.ts",
      "export const login = true;\n",
    );
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "feat: ship login (#400)\n\n* wip: notes [skip deploy]",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("runs CI when a skill symlink is replaced with a regular file", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    ShouldSkipCiFixtures.writeSymlink(
      repoDir,
      ".agents/skills/my-skill",
      "../../agent-skills/public-skills/skills/my-skill",
    );
    const beforeSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "docs: link skill",
    );

    unlinkSync(join(repoDir, ".agents/skills/my-skill"));
    ShouldSkipCiFixtures.writeFile(
      repoDir,
      ".agents/skills/my-skill",
      "console.log('hi');\n",
    );
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "chore: replace symlink with file",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("skips a push with spaces in safe markdown paths", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "docs/release notes/v1 guide.md",
      "# Release\n",
    );
    const afterSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "docs: add release notes",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("runs CI for a release merge commit changing package.json", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const mainBeforeSha = ShouldSkipCiFixtures.git(repoDir, [
      "rev-parse",
      "HEAD",
    ]);

    ShouldSkipCiFixtures.git(repoDir, ["checkout", "-b", "release-branch"]);
    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "package.json",
      '{"version":"0.15.0-rc1"}\n',
    );
    ShouldSkipCiFixtures.commitAll(repoDir, "Release: v0.15.0 [skip deploy]");

    ShouldSkipCiFixtures.git(repoDir, ["checkout", "develop"]);
    ShouldSkipCiFixtures.git(repoDir, [
      "merge",
      "--no-ff",
      "release-branch",
      "-m",
      "Release 0.15.0",
    ]);
    const afterSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha: mainBeforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("skips a merge commit when all range commits only touch safe docs", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);

    ShouldSkipCiFixtures.git(repoDir, ["checkout", "-b", "docs-branch"]);
    ShouldSkipCiFixtures.writeFile(repoDir, "docs/guide.md", "# Guide\n");
    ShouldSkipCiFixtures.commitAll(repoDir, "docs: add guide");

    ShouldSkipCiFixtures.git(repoDir, ["checkout", "develop"]);
    ShouldSkipCiFixtures.git(repoDir, [
      "merge",
      "--no-ff",
      "docs-branch",
      "-m",
      "Merge branch 'docs-branch'",
    ]);
    const afterSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("fails closed for all-zero, unreachable, or empty-commit pushes", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    ShouldSkipCiFixtures.git(repoDir, [
      "commit",
      "--allow-empty",
      "-m",
      "chore: trigger ci",
    ]);
    const afterSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);

    expect(
      ShouldSkipCi.evaluateGitRange({
        eventName: "push",
        beforeSha: "0".repeat(40),
        afterSha,
        repoDir,
      }).shouldSkip,
    ).toBe(false);

    expect(
      ShouldSkipCi.evaluateGitRange({
        eventName: "push",
        beforeSha: "deadbeef".repeat(5),
        afterSha,
        repoDir,
      }).shouldSkip,
    ).toBe(false);

    expect(
      ShouldSkipCi.evaluateGitRange({
        eventName: "push",
        beforeSha,
        afterSha,
        repoDir,
      }).shouldSkip,
    ).toBe(false);
  });

  it("evaluates pull_request ranges and never skips workflow_dispatch", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const baseSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    ShouldSkipCiFixtures.git(repoDir, ["checkout", "-b", "docs-pr"]);
    ShouldSkipCiFixtures.writeFile(repoDir, "docs/pr.md", "# PR doc\n");
    const docsHeadSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "docs: add pr doc",
    );

    expect(
      ShouldSkipCi.evaluateGitRange({
        eventName: "pull_request",
        prBaseSha: baseSha,
        prHeadSha: docsHeadSha,
        repoDir,
      }).shouldSkip,
    ).toBe(true);

    expect(
      ShouldSkipCi.evaluateGitRange({
        eventName: "workflow_dispatch",
        beforeSha: baseSha,
        afterSha: docsHeadSha,
        repoDir,
      }).shouldSkip,
    ).toBe(false);

    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "src/feature.ts",
      "export const feature = 1;\n",
    );
    const codeHeadSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "feat: add feature",
    );

    expect(
      ShouldSkipCi.evaluateGitRange({
        eventName: "pull_request",
        prBaseSha: baseSha,
        prHeadSha: codeHeadSha,
        repoDir,
      }).shouldSkip,
    ).toBe(false);
  });

  it("handles commits whose raw diff-tree output exceeds 1 MiB", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const beforeSha = ShouldSkipCiFixtures.git(repoDir, ["rev-parse", "HEAD"]);
    const fileEntries = Array.from({ length: 10000 }, (_, fileIndex) => {
      const paddedIndex = String(fileIndex).padStart(5, "0");
      return `M 100644 inline docs/bulk-generated-doc-entry-${paddedIndex}.md\ndata 4\n# x\n`;
    }).join("");
    const fastImportStream = [
      "commit refs/heads/develop",
      "committer Test Bot <test@example.com> 1700000000 +0000",
      "data 22",
      "docs: bulk import docs",
      `from ${beforeSha}`,
      fileEntries,
      "",
    ].join("\n");

    execFileSync("git", ["fast-import", "--quiet"], {
      cwd: repoDir,
      input: fastImportStream,
      encoding: "utf8",
      env: ShouldSkipCiFixtures.GIT_ENV,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const afterSha = ShouldSkipCiFixtures.git(repoDir, [
      "rev-parse",
      "refs/heads/develop",
    ]);

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("fails closed when a force-push drops a still-reachable code commit", () => {
    const repoDir = ShouldSkipCiFixtures.createTempRepo();
    const ancestorSha = ShouldSkipCiFixtures.git(repoDir, [
      "rev-parse",
      "HEAD",
    ]);

    ShouldSkipCiFixtures.writeFile(
      repoDir,
      "src/feature.ts",
      "export const feature = 1;\n",
    );
    const droppedCodeSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "feat: add feature",
    );
    ShouldSkipCiFixtures.git(repoDir, [
      "tag",
      "retained-old-tip",
      droppedCodeSha,
    ]);

    ShouldSkipCiFixtures.git(repoDir, ["reset", "--hard", ancestorSha]);
    ShouldSkipCiFixtures.writeFile(repoDir, "docs/guide.md", "# Guide\n");
    const forcedDocsSha = ShouldSkipCiFixtures.commitAll(
      repoDir,
      "docs: update guide",
    );

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha: droppedCodeSha,
      afterSha: forcedDocsSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });
});
