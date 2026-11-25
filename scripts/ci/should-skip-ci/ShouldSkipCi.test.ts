/**
 * Unit and temporary-git-repo tests for `ShouldSkipCi`, verifying safe
 * doc/skill path matching, raw git diff/log parsing, git range inspection,
 * and direct Node 24 CLI execution.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ShouldSkipCi } from "./ShouldSkipCi";
import type { CommitRecord, FileChangeEntry } from "./ShouldSkipCi";

const SCRIPT_PATH = resolve(import.meta.dirname, "ShouldSkipCi.ts");
const tempDirs: string[] = [];

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test Bot",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test Bot",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function _git(repoDir: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args],
    {
      cwd: repoDir,
      encoding: "utf8",
      env: GIT_ENV,
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function _createTempRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), "should-skip-ci-"));
  tempDirs.push(repoDir);
  _git(repoDir, ["init", "-b", "develop"]);
  _writeFile(repoDir, "package.json", '{"version":"0.15.0"}\n');
  _git(repoDir, ["add", "."]);
  _git(repoDir, ["commit", "-m", "chore: initial commit"]);
  return repoDir;
}

function _writeFile(repoDir: string, relativePath: string, body: string): void {
  const fullPath = join(repoDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, body);
}

function _writeSymlink(
  repoDir: string,
  relativePath: string,
  target: string,
): void {
  const fullPath = join(repoDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  symlinkSync(target, fullPath);
}

function _commitAll(repoDir: string, message: string): string {
  _git(repoDir, ["add", "-A"]);
  _git(repoDir, ["commit", "-m", message]);
  return _git(repoDir, ["rev-parse", "HEAD"]);
}

afterEach(() => {
  tempDirs.splice(0).forEach((dirPath) => {
    rmSync(dirPath, { recursive: true, force: true });
  });
});

function _makeFileEntry(
  filePath: string,
  overrides: Partial<Omit<FileChangeEntry, "filePath">> = {},
): FileChangeEntry {
  return {
    oldMode: overrides.oldMode ?? "100644",
    newMode: overrides.newMode ?? "100644",
    status: overrides.status ?? "M",
    filePath,
  };
}

describe("ShouldSkipCi.isSafeFileChange", () => {
  it("allows markdown files under allowed doc and skill roots", () => {
    const allowedPaths = [
      "docs/guide.md",
      "docs/superpowers/specs/2026-11-25-design.md",
      "docs/release notes/v1 guide.md",
      "agent-skills/README.md",
      "agent-skills/public-skills/skills/diff-review/SKILL.md",
      ".agents/skills/brainstorming/SKILL.md",
      ".claude/skills/react-doctor/SKILL.md",
      ".cursor/skills/impeccable/reference/layout.md",
      ".opencode/skills/my-skill/SKILL.md",
    ];

    allowedPaths.forEach((filePath) => {
      expect(ShouldSkipCi.isSafeFileChange(_makeFileEntry(filePath))).toBe(
        true,
      );
    });
  });

  it("allows AGENTS.md, CLAUDE.md, and README.md at any depth", () => {
    const entries: FileChangeEntry[] = [
      _makeFileEntry("AGENTS.md"),
      _makeFileEntry("CLAUDE.md", { oldMode: "120000", newMode: "120000" }),
      _makeFileEntry("README.md"),
      _makeFileEntry("packages/web/ui/README.md"),
      _makeFileEntry("apps/ava-video-producer/AGENTS.md"),
      _makeFileEntry("apps/ava-video-producer/CLAUDE.md", {
        oldMode: "000000",
        newMode: "120000",
        status: "A",
      }),
    ];

    entries.forEach((entry) => {
      expect(ShouldSkipCi.isSafeFileChange(entry)).toBe(true);
    });
  });

  it("allows direct skill directory symlinks across agent skill dirs", () => {
    const entries: FileChangeEntry[] = [
      _makeFileEntry(".agents/skills/diff-review", {
        oldMode: "000000",
        newMode: "120000",
        status: "A",
      }),
      _makeFileEntry(".claude/skills/diff-review", {
        oldMode: "120000",
        newMode: "120000",
        status: "M",
      }),
      _makeFileEntry(".cursor/skills/diff-review", {
        oldMode: "120000",
        newMode: "000000",
        status: "D",
      }),
      _makeFileEntry(".opencode/skills/diff-review", {
        oldMode: "000000",
        newMode: "120000",
        status: "A",
      }),
    ];

    entries.forEach((entry) => {
      expect(ShouldSkipCi.isSafeFileChange(entry)).toBe(true);
    });
  });

  it("rejects markdown files outside allowed doc and skill roots", () => {
    const rejectedPaths = [
      "plugins/mozambique/content/intro.md",
      "public/help.md",
      "DESIGN.md",
      "CHANGELOG.md",
      "apps/ava-video-producer/docs/guide.md",
      "src/components/Help/notes.md",
    ];

    rejectedPaths.forEach((filePath) => {
      expect(ShouldSkipCi.isSafeFileChange(_makeFileEntry(filePath))).toBe(
        false,
      );
    });
  });

  it("rejects non-markdown files inside allowed doc and skill roots", () => {
    const rejectedPaths = [
      "docs/ai-agent/eval-runs/r1/summary.json",
      "agent-skills/symlink-skills-dirs.sh",
      "agent-skills/public-skills/skills/diff-review/scripts/dif/src/cli.rs",
      ".agents/skills/impeccable/scripts/impeccable",
      ".claude/skills/foo/script.js",
      "docs/page.mdx",
    ];

    rejectedPaths.forEach((filePath) => {
      expect(ShouldSkipCi.isSafeFileChange(_makeFileEntry(filePath))).toBe(
        false,
      );
    });
  });

  it("rejects symlink type-changes and nested non-markdown symlinks", () => {
    const rejectedEntries: FileChangeEntry[] = [
      _makeFileEntry(".agents/skills/my-skill", {
        oldMode: "120000",
        newMode: "100644",
        status: "T",
      }),
      _makeFileEntry(".agents/skills/my-skill", {
        oldMode: "100644",
        newMode: "120000",
        status: "T",
      }),
      _makeFileEntry(".agents/skills/my-skill/nested-link", {
        oldMode: "000000",
        newMode: "120000",
        status: "A",
      }),
      _makeFileEntry("docs/../src/app.md"),
      _makeFileEntry("/docs/guide.md"),
    ];

    rejectedEntries.forEach((entry) => {
      expect(ShouldSkipCi.isSafeFileChange(entry)).toBe(false);
    });
  });
});

describe("ShouldSkipCi.parseDiffTreeRaw", () => {
  it("parses NUL-delimited diff-tree records including spaces in paths", () => {
    const rawOutput = [
      ":100644 100644 aaaaaaa bbbbbbb M",
      "docs/release notes/v1 guide.md",
      ":000000 120000 0000000 ccccccc A",
      ".agents/skills/new-skill",
      "",
    ].join("\0");

    expect(ShouldSkipCi.parseDiffTreeRaw(rawOutput)).toEqual([
      {
        oldMode: "100644",
        newMode: "100644",
        status: "M",
        filePath: "docs/release notes/v1 guide.md",
      },
      {
        oldMode: "000000",
        newMode: "120000",
        status: "A",
        filePath: ".agents/skills/new-skill",
      },
    ]);
  });

  it("returns an empty array for empty raw diff-tree output", () => {
    expect(ShouldSkipCi.parseDiffTreeRaw("")).toEqual([]);
  });
});

describe("ShouldSkipCi.parseCommitLog", () => {
  it("parses root, single-parent, and merge commit log lines", () => {
    const logOutput = [
      "aaa111\x1fbbb222 ccc333\x1fRelease 0.15.0",
      "bbb222\x1fddd444\x1fdocs: update guide",
      "ddd444\x1f\x1fInitial commit",
    ].join("\n");

    expect(ShouldSkipCi.parseCommitLog(logOutput)).toEqual([
      {
        sha: "aaa111",
        parentShas: ["bbb222", "ccc333"],
        subject: "Release 0.15.0",
      },
      {
        sha: "bbb222",
        parentShas: ["ddd444"],
        subject: "docs: update guide",
      },
      {
        sha: "ddd444",
        parentShas: [],
        subject: "Initial commit",
      },
    ]);
  });
});

describe("ShouldSkipCi.isCommitSkippable", () => {
  it("skips a commit whose subject contains [skip deploy]", () => {
    const commit: CommitRecord = {
      sha: "a1",
      subject: "Bump version to 0.15.1-dev [skip deploy]",
      changes: [_makeFileEntry("package.json")],
    };

    expect(ShouldSkipCi.isCommitSkippable(commit)).toBe(true);
  });

  it("skips an empty commit only when subject contains [skip deploy]", () => {
    expect(
      ShouldSkipCi.isCommitSkippable({
        sha: "a1",
        subject: "chore: empty [skip deploy]",
        changes: [],
      }),
    ).toBe(true);
    expect(
      ShouldSkipCi.isCommitSkippable({
        sha: "a2",
        subject: "chore: trigger rebuild",
        changes: [],
      }),
    ).toBe(false);
  });

  it("skips an untagged commit only when every changed file is safe", () => {
    expect(
      ShouldSkipCi.isCommitSkippable({
        sha: "a1",
        subject: "docs: explain architecture",
        changes: [_makeFileEntry("docs/arch.md"), _makeFileEntry("AGENTS.md")],
      }),
    ).toBe(true);

    expect(
      ShouldSkipCi.isCommitSkippable({
        sha: "a2",
        subject: "docs: explain architecture",
        changes: [_makeFileEntry("docs/arch.md"), _makeFileEntry("src/app.ts")],
      }),
    ).toBe(false);
  });
});

describe("ShouldSkipCi.shouldSkipCommits", () => {
  it("fails closed when the commit list is empty", () => {
    expect(ShouldSkipCi.shouldSkipCommits([]).shouldSkip).toBe(false);
  });

  it("skips when every commit qualifies via tag or safe files", () => {
    const decision = ShouldSkipCi.shouldSkipCommits([
      {
        sha: "c1",
        subject: "Bump version to 0.15.1-dev [skip deploy]",
        changes: [_makeFileEntry("package.json")],
      },
      {
        sha: "c2",
        subject: "docs: clarify rules",
        changes: [_makeFileEntry("docs/rules.md")],
      },
    ]);

    expect(decision.shouldSkip).toBe(true);
  });

  it("runs CI when any commit in a multi-commit push does not qualify", () => {
    const decision = ShouldSkipCi.shouldSkipCommits([
      {
        sha: "c1",
        subject: "Bump version to 0.15.1-dev [skip deploy]",
        changes: [_makeFileEntry("package.json")],
      },
      {
        sha: "c2",
        subject: "fix: guard null value",
        changes: [_makeFileEntry("src/app.ts")],
      },
    ]);

    expect(decision.shouldSkip).toBe(false);
  });
});

describe("ShouldSkipCi.evaluateGitRange", () => {
  it("skips a single-commit push tagged [skip deploy]", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);
    _writeFile(repoDir, "package.json", '{"version":"0.15.1-dev"}\n');
    const afterSha = _commitAll(
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
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);

    _writeFile(repoDir, "package.json", '{"version":"0.15.1-dev"}\n');
    _commitAll(repoDir, "Bump version to 0.15.1-dev [skip deploy]");

    _writeFile(repoDir, "docs/guide.md", "# Guide\n");
    _writeFile(repoDir, "AGENTS.md", "# Agents\n");
    _writeSymlink(repoDir, "CLAUDE.md", "AGENTS.md");
    _writeSymlink(
      repoDir,
      ".agents/skills/my-skill",
      "../../agent-skills/public-skills/skills/my-skill",
    );
    const afterSha = _commitAll(repoDir, "docs: add guide and skill symlink");

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("runs CI when a multi-commit push includes a code commit", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);

    _writeFile(repoDir, "package.json", '{"version":"0.15.1-dev"}\n');
    _commitAll(repoDir, "Bump version to 0.15.1-dev [skip deploy]");

    _writeFile(repoDir, "src/app.ts", "export const app = 1;\n");
    const afterSha = _commitAll(repoDir, "feat: add app constant");

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("ignores [skip deploy] inside a squash-merge commit body", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);
    _writeFile(repoDir, "src/login.ts", "export const login = true;\n");
    const afterSha = _commitAll(
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
    const repoDir = _createTempRepo();
    _writeSymlink(
      repoDir,
      ".agents/skills/my-skill",
      "../../agent-skills/public-skills/skills/my-skill",
    );
    const beforeSha = _commitAll(repoDir, "docs: link skill");

    unlinkSync(join(repoDir, ".agents/skills/my-skill"));
    _writeFile(repoDir, ".agents/skills/my-skill", "console.log('hi');\n");
    const afterSha = _commitAll(repoDir, "chore: replace symlink with file");

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("skips a push with spaces in safe markdown paths", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);
    _writeFile(repoDir, "docs/release notes/v1 guide.md", "# Release\n");
    const afterSha = _commitAll(repoDir, "docs: add release notes");

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("runs CI for a release merge commit changing package.json", () => {
    const repoDir = _createTempRepo();
    const mainBeforeSha = _git(repoDir, ["rev-parse", "HEAD"]);

    _git(repoDir, ["checkout", "-b", "release-branch"]);
    _writeFile(repoDir, "package.json", '{"version":"0.15.0-rc1"}\n');
    _commitAll(repoDir, "Release: v0.15.0 [skip deploy]");

    _git(repoDir, ["checkout", "develop"]);
    _git(repoDir, [
      "merge",
      "--no-ff",
      "release-branch",
      "-m",
      "Release 0.15.0",
    ]);
    const afterSha = _git(repoDir, ["rev-parse", "HEAD"]);

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha: mainBeforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });

  it("skips a merge commit when all range commits only touch safe docs", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);

    _git(repoDir, ["checkout", "-b", "docs-branch"]);
    _writeFile(repoDir, "docs/guide.md", "# Guide\n");
    _commitAll(repoDir, "docs: add guide");

    _git(repoDir, ["checkout", "develop"]);
    _git(repoDir, [
      "merge",
      "--no-ff",
      "docs-branch",
      "-m",
      "Merge branch 'docs-branch'",
    ]);
    const afterSha = _git(repoDir, ["rev-parse", "HEAD"]);

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("fails closed for all-zero, unreachable, or empty-commit pushes", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);
    _git(repoDir, ["commit", "--allow-empty", "-m", "chore: trigger ci"]);
    const afterSha = _git(repoDir, ["rev-parse", "HEAD"]);

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
    const repoDir = _createTempRepo();
    const baseSha = _git(repoDir, ["rev-parse", "HEAD"]);
    _git(repoDir, ["checkout", "-b", "docs-pr"]);
    _writeFile(repoDir, "docs/pr.md", "# PR doc\n");
    const docsHeadSha = _commitAll(repoDir, "docs: add pr doc");

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

    _writeFile(repoDir, "src/feature.ts", "export const feature = 1;\n");
    const codeHeadSha = _commitAll(repoDir, "feat: add feature");

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
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);
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
      env: GIT_ENV,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const afterSha = _git(repoDir, ["rev-parse", "refs/heads/develop"]);

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha,
      afterSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(true);
  });

  it("fails closed when a force-push drops a still-reachable code commit", () => {
    const repoDir = _createTempRepo();
    const ancestorSha = _git(repoDir, ["rev-parse", "HEAD"]);

    _writeFile(repoDir, "src/feature.ts", "export const feature = 1;\n");
    const droppedCodeSha = _commitAll(repoDir, "feat: add feature");
    _git(repoDir, ["tag", "retained-old-tip", droppedCodeSha]);

    _git(repoDir, ["reset", "--hard", ancestorSha]);
    _writeFile(repoDir, "docs/guide.md", "# Guide\n");
    const forcedDocsSha = _commitAll(repoDir, "docs: update guide");

    const decision = ShouldSkipCi.evaluateGitRange({
      eventName: "push",
      beforeSha: droppedCodeSha,
      afterSha: forcedDocsSha,
      repoDir,
    });

    expect(decision.shouldSkip).toBe(false);
  });
});

describe("ShouldSkipCi CLI execution", () => {
  it("runs directly via Node 24 and writes GITHUB_OUTPUT", () => {
    const repoDir = _createTempRepo();
    const beforeSha = _git(repoDir, ["rev-parse", "HEAD"]);
    _writeFile(repoDir, "docs/cli.md", "# CLI\n");
    const afterSha = _commitAll(repoDir, "docs: verify cli");
    const githubOutputPath = join(repoDir, "github-output.txt");
    writeFileSync(githubOutputPath, "");

    execFileSync("node", [SCRIPT_PATH], {
      cwd: repoDir,
      encoding: "utf8",
      env: {
        ...GIT_ENV,
        EVENT_NAME: "push",
        BEFORE_SHA: beforeSha,
        AFTER_SHA: afterSha,
        GITHUB_OUTPUT: githubOutputPath,
      },
    });

    const output = readFileSync(githubOutputPath, "utf8");
    expect(output).toContain("should-skip=true\n");
    expect(output).toMatch(/reason=.+\n/);
  });
});
