/**
 * Unit tests for `ShouldSkipCi`, verifying safe doc/skill path matching, raw
 * git diff/log parsing, and commit skip evaluation.
 */
import { describe, expect, it } from "vitest";
import { ShouldSkipCi } from "../ShouldSkipCi";
import { ShouldSkipCiFixtures } from "./ShouldSkipCiFixtures";
import type { CommitRecord, FileChangeEntry } from "../ShouldSkipCi";

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
      expect(
        ShouldSkipCi.isSafeFileChange(
          ShouldSkipCiFixtures.makeFileEntry(filePath),
        ),
      ).toBe(true);
    });
  });

  it("allows AGENTS.md, CLAUDE.md, and README.md at any depth", () => {
    const entries: FileChangeEntry[] = [
      ShouldSkipCiFixtures.makeFileEntry("AGENTS.md"),
      ShouldSkipCiFixtures.makeFileEntry("CLAUDE.md", {
        oldMode: "120000",
        newMode: "120000",
      }),
      ShouldSkipCiFixtures.makeFileEntry("README.md"),
      ShouldSkipCiFixtures.makeFileEntry("packages/web/ui/README.md"),
      ShouldSkipCiFixtures.makeFileEntry("apps/ava-video-producer/AGENTS.md"),
      ShouldSkipCiFixtures.makeFileEntry("apps/ava-video-producer/CLAUDE.md", {
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
      ShouldSkipCiFixtures.makeFileEntry(".agents/skills/diff-review", {
        oldMode: "000000",
        newMode: "120000",
        status: "A",
      }),
      ShouldSkipCiFixtures.makeFileEntry(".claude/skills/diff-review", {
        oldMode: "120000",
        newMode: "120000",
        status: "M",
      }),
      ShouldSkipCiFixtures.makeFileEntry(".cursor/skills/diff-review", {
        oldMode: "120000",
        newMode: "000000",
        status: "D",
      }),
      ShouldSkipCiFixtures.makeFileEntry(".opencode/skills/diff-review", {
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
      expect(
        ShouldSkipCi.isSafeFileChange(
          ShouldSkipCiFixtures.makeFileEntry(filePath),
        ),
      ).toBe(false);
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
      expect(
        ShouldSkipCi.isSafeFileChange(
          ShouldSkipCiFixtures.makeFileEntry(filePath),
        ),
      ).toBe(false);
    });
  });

  it("rejects symlink type-changes and nested non-markdown symlinks", () => {
    const rejectedEntries: FileChangeEntry[] = [
      ShouldSkipCiFixtures.makeFileEntry(".agents/skills/my-skill", {
        oldMode: "120000",
        newMode: "100644",
        status: "T",
      }),
      ShouldSkipCiFixtures.makeFileEntry(".agents/skills/my-skill", {
        oldMode: "100644",
        newMode: "120000",
        status: "T",
      }),
      ShouldSkipCiFixtures.makeFileEntry(
        ".agents/skills/my-skill/nested-link",
        {
          oldMode: "000000",
          newMode: "120000",
          status: "A",
        },
      ),
      ShouldSkipCiFixtures.makeFileEntry("docs/../src/app.md"),
      ShouldSkipCiFixtures.makeFileEntry("/docs/guide.md"),
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
      changes: [ShouldSkipCiFixtures.makeFileEntry("package.json")],
    };

    expect(ShouldSkipCi.isCommitSkippable(commit)).toBe(true);
  });

  it.each([
    "[skip deploy]",
    "[skip build]",
    "[no deploy]",
    "[no build]",
    "[skipdeploy]",
    "[nobuild]",
    "(skip deploy)",
    "(no build)",
    "(skipbuild)",
  ])("skips a commit whose subject contains %s", (marker) => {
    const commit: CommitRecord = {
      sha: "a",
      subject: `chore: change code ${marker}`,
      changes: [ShouldSkipCiFixtures.makeFileEntry("src/App.tsx")],
    };

    expect(ShouldSkipCi.isCommitSkippable(commit)).toBe(true);
  });

  it.each([
    "skip deploy",
    "[skip  deploy]",
    "[skip-deploy]",
    "[Skip Deploy]",
    "[skip deploy)",
  ])("does not skip a commit whose subject contains %s", (marker) => {
    const commit: CommitRecord = {
      sha: "a",
      subject: `chore: change code ${marker}`,
      changes: [ShouldSkipCiFixtures.makeFileEntry("src/App.tsx")],
    };

    expect(ShouldSkipCi.isCommitSkippable(commit)).toBe(false);
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
        changes: [
          ShouldSkipCiFixtures.makeFileEntry("docs/arch.md"),
          ShouldSkipCiFixtures.makeFileEntry("AGENTS.md"),
        ],
      }),
    ).toBe(true);

    expect(
      ShouldSkipCi.isCommitSkippable({
        sha: "a2",
        subject: "docs: explain architecture",
        changes: [
          ShouldSkipCiFixtures.makeFileEntry("docs/arch.md"),
          ShouldSkipCiFixtures.makeFileEntry("src/app.ts"),
        ],
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
        changes: [ShouldSkipCiFixtures.makeFileEntry("package.json")],
      },
      {
        sha: "c2",
        subject: "docs: clarify rules",
        changes: [ShouldSkipCiFixtures.makeFileEntry("docs/rules.md")],
      },
    ]);

    expect(decision.shouldSkip).toBe(true);
  });

  it("runs CI when any commit in a multi-commit push does not qualify", () => {
    const decision = ShouldSkipCi.shouldSkipCommits([
      {
        sha: "c1",
        subject: "Bump version to 0.15.1-dev [skip deploy]",
        changes: [ShouldSkipCiFixtures.makeFileEntry("package.json")],
      },
      {
        sha: "c2",
        subject: "fix: guard null value",
        changes: [ShouldSkipCiFixtures.makeFileEntry("src/app.ts")],
      },
    ]);

    expect(decision.shouldSkip).toBe(false);
  });
});
