# Automated GitHub Release Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ava release` automatically publishes an LLM-cleaned-up GitHub Release for the tag it just cut, and a new `ava release notes` command can (re-)publish notes for any tag on demand.

**Architecture:** A new `apps/ava-cli/src/ReleaseCli/releaseChangelog/` module collects the real (non-housekeeping) commits since the previous release tag, sends them to OpenAI for cleanup via one Chat Completions call, deterministically renders the result as flat or sectioned markdown, and publishes it with `gh release create`. The whole pipeline is exposed as one function, `publishReleaseNotes`, that never throws and instead returns a typed outcome, which both `ava release` (best-effort, warn-and-continue) and the new `ava release notes` command (strict, errors on problems) consume differently.

**Tech Stack:** TypeScript, Vitest, `@avandar/acclimate` (this repo's CLI framework), OpenAI Chat Completions via `fetch`, `gh` and `git` CLIs via the existing `ReleaseCommands` abstraction.

**Design doc:** `docs/superpowers/specs/2026-10-13-release-changelog-design.md` — read it first for the full rationale (why not `gh --generate-notes`/`git-cliff`/`release-please`, the render-mode threshold rule, the outcome union).

**Hard requirement:** no test may call the real OpenAI API or the real `gh`/`git` binaries for anything beyond trivial, harmless reads. Every test that reaches `generateReleaseNotes` passes an injected `fetchImpl`; the real `globalThis.fetch` is asserted to never be called in at least one test. Every test that reaches `publishReleaseNotes` or `collectReleaseChangelogCommits` uses a fake `ReleaseCommands`, never a real repository.

---

## Before you start

Run the existing suite once to get a baseline (all 46 files / 345 tests should pass):

```bash
cd apps/ava-cli && pnpm exec vitest run -c vitest.config.ts
```

All commands in this plan are run from `apps/ava-cli/` unless stated otherwise. All file paths are relative to the repo root.

---

### Task 1: Changelog config constants

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/releaseChangelog/releaseChangelogConfig.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the config file**

```ts
/**
 * Tunable constants for the `ava release` / `ava release notes` changelog
 * pipeline. Kept in one small file, deliberately free of any logic, so the
 * model or budget can change without touching the code that uses them.
 */

/**
 * The OpenAI model used to turn a release's raw commits into human-readable
 * release notes. Change this single constant to point both `ava release`
 * and `ava release notes` at a different model.
 */
export const RELEASE_CHANGELOG_MODEL = "gpt-5.6-luna";

/**
 * Reasoning effort for the changelog call. This is more interpretive than a
 * straight transduction task (it has to judge whether a subject is already
 * clear, decide what counts as a "nit", and write original summaries from a
 * diff), so it is left at the model's default "medium" rather than pinned
 * low, unlike the i18n translation script this pattern was copied from.
 */
export const RELEASE_CHANGELOG_REASONING_EFFORT = "medium";

export const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";

/**
 * Per-commit diff character budget. A release can include one huge
 * squash-merge; without a cap, that single commit's diff could dwarf every
 * other commit's context and blow past a reasonable prompt size.
 */
export const MAX_DIFF_CHARS_PER_COMMIT = 4000;

/** The fixed vocabulary the model must classify every bullet into. */
export const RELEASE_NOTE_GROUPS = [
  "Features",
  "Fixes",
  "Chores",
  "Nits",
] as const;
```

- [ ] **Step 2: Add a one-line pointer in `.env.example`**

Find this block in `.env.example`:

```
# ==============================================================================
# OpenAI
# ==============================================================================
OPENAI_API_KEY=
OPEN_ROUTER_API_KEY=
```

Replace it with:

```
# ==============================================================================
# OpenAI
# Used by scripts/i18n/translateWithLlm and `ava release notes` (see
# apps/ava-cli/src/ReleaseCli/releaseChangelog/).
# ==============================================================================
OPENAI_API_KEY=
OPEN_ROUTER_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseChangelog/releaseChangelogConfig.ts .env.example
git commit -m "feat(ava-cli): add config constants for release changelog generation"
```

---

### Task 2: Tag resolution (`listSortedReleaseTags`, `resolvePreviousReleaseTag`)

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.ts`
- Test: `apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  listSortedReleaseTags,
  resolvePreviousReleaseTag,
} from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";
import { describe, expect, it } from "vitest";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/** A fake `ReleaseCommands` whose `readGit` answers from a fixed script. */
function _createFakeGit(
  readGitByArgs: Record<string, string | undefined>,
): ReleaseCommands {
  return {
    repoRoot: "/fake/repo",
    dryRun: false,
    readGit: (args) => {
      return readGitByArgs[args.join(" ")];
    },
    tryGit: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
    readCommand: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
    mutate: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
    mutateQuietly: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
  };
}

const TAG_LIST_ARGS = "tag --list v* --sort=v:refname";

describe("listSortedReleaseTags", () => {
  it("splits the sorted tag list into an array", () => {
    const git = _createFakeGit({
      [TAG_LIST_ARGS]: "v0.1.0\nv0.2.0\nv0.10.0",
    });
    expect(listSortedReleaseTags(git)).toEqual(["v0.1.0", "v0.2.0", "v0.10.0"]);
  });

  it("returns an empty array when there are no tags", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "" });
    expect(listSortedReleaseTags(git)).toEqual([]);
  });
});

describe("resolvePreviousReleaseTag", () => {
  it("returns the tag right before an existing release tag", () => {
    const git = _createFakeGit({
      [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1\nv0.13.0",
    });
    expect(resolvePreviousReleaseTag(git, "v0.12.1")).toBe("v0.12.0");
  });

  it("returns undefined for the oldest known tag", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1" });
    expect(resolvePreviousReleaseTag(git, "v0.12.0")).toBeUndefined();
  });

  it("falls back to the most recent existing tag when the target doesn't exist yet", () => {
    // This is the --dry-run preview case: the new tag has not been created.
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1" });
    expect(resolvePreviousReleaseTag(git, "v0.13.0")).toBe("v0.12.1");
  });

  it("returns undefined when there are no tags at all", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "" });
    expect(resolvePreviousReleaseTag(git, "v0.1.0")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts`
Expected: FAIL — `Cannot find module '@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/**
 * Resolves which commits belong in a release's generated notes: the real
 * (non-housekeeping) commits between the previous version tag and this
 * release.
 */

/** Every `vX.Y.Z` tag that exists locally, oldest first. */
export function listSortedReleaseTags(git: ReleaseCommands): string[] {
  const output = git.readGit(["tag", "--list", "v*", "--sort=v:refname"]);
  return output === undefined || output.length === 0
    ? []
    : output.split("\n");
}

/**
 * The tag immediately before `releaseTag` in semver order.
 *
 * `releaseTag` does not need to exist yet: a `--dry-run` preview passes a tag
 * that has not been created, and the most recent existing tag is then the
 * correct previous one. When it does exist (a real release, or a historical
 * `ava release notes` lookup), the tag immediately before it in the sorted
 * list is used instead, so republishing notes for an old version still finds
 * its real predecessor rather than whatever shipped most recently.
 *
 * Returns `undefined` when there is no earlier tag at all (the first-ever
 * release).
 */
export function resolvePreviousReleaseTag(
  git: ReleaseCommands,
  releaseTag: string,
): string | undefined {
  const tags = listSortedReleaseTags(git);
  const index = tags.indexOf(releaseTag);
  if (index === -1) {
    return tags.at(-1);
  }
  return index === 0 ? undefined : tags[index - 1];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.ts apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts
git commit -m "feat(ava-cli): resolve the previous release tag for changelog generation"
```

---

### Task 3: Commit collection (`collectReleaseChangelogCommits`)

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.ts`
- Modify: `apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to the test file (keep the existing `_createFakeGit`, `TAG_LIST_ARGS`, and both `describe` blocks from Task 2):

```ts
import { MAX_DIFF_CHARS_PER_COMMIT } from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
import { collectReleaseChangelogCommits } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";

const SEP = "\x1f";

describe("collectReleaseChangelogCommits", () => {
  it("drops housekeeping commits and keeps real ones with their stat and diff", () => {
    const log = [
      `aaa1111${SEP}Release: v0.13.3 [skip deploy]`,
      `bbb2222${SEP}Added get-prod-version command to ava CLI (#296)`,
      `ccc3333${SEP}Bump version to 0.13.3-dev [skip deploy]`,
    ].join("\n");

    const git = _createFakeGit({
      "log v0.13.2..v0.13.3 --no-merges --format=%H\x1f%s": log,
      "show --stat --format= bbb2222": " 1 file changed, 2 insertions(+)",
      "show --format= bbb2222": "diff --git a/foo b/foo\n+line",
    });

    const commits = collectReleaseChangelogCommits(git, {
      previousTag: "v0.13.2",
      headRevision: "v0.13.3",
    });

    expect(commits).toEqual([
      {
        sha: "bbb2222",
        shortSha: "bbb2222",
        subject: "Added get-prod-version command to ava CLI (#296)",
        stat: "1 file changed, 2 insertions(+)",
        diff: "diff --git a/foo b/foo\n+line",
      },
    ]);
  });

  it("truncates a diff larger than the configured budget", () => {
    const hugeDiff = "x".repeat(MAX_DIFF_CHARS_PER_COMMIT + 500);
    const git = _createFakeGit({
      "log v0.1.0..v0.2.0 --no-merges --format=%H\x1f%s": `sha1${SEP}A real change`,
      "show --stat --format= sha1": "1 file changed",
      "show --format= sha1": hugeDiff,
    });

    const [commit] = collectReleaseChangelogCommits(git, {
      previousTag: "v0.1.0",
      headRevision: "v0.2.0",
    });

    expect(commit?.diff.length).toBeLessThan(hugeDiff.length);
    expect(commit?.diff).toContain("[diff truncated]");
  });

  it("uses the head revision alone as the range when there is no previous tag", () => {
    const git = _createFakeGit({
      "log v0.1.0 --no-merges --format=%H\x1f%s": `sha1${SEP}First change`,
      "show --stat --format= sha1": "1 file changed",
      "show --format= sha1": "diff",
    });

    const commits = collectReleaseChangelogCommits(git, {
      previousTag: undefined,
      headRevision: "v0.1.0",
    });

    expect(commits).toHaveLength(1);
  });

  it("returns an empty array when the range has no commits", () => {
    const git = _createFakeGit({
      "log v0.1.0..v0.1.1 --no-merges --format=%H\x1f%s": "",
    });

    expect(
      collectReleaseChangelogCommits(git, {
        previousTag: "v0.1.0",
        headRevision: "v0.1.1",
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts`
Expected: FAIL — `collectReleaseChangelogCommits is not a function` / `Cannot find export`

- [ ] **Step 3: Write the minimal implementation**

Add to `collectReleaseChangelogCommits.ts` (keep everything from Task 2):

```ts
import { shortSha } from "@ava-cli/ReleaseCli/releaseGitHelpers";
import { MAX_DIFF_CHARS_PER_COMMIT } from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";

/** One commit's data as handed to the LLM that drafts release notes. */
export type ReleaseChangelogCommitInput = Readonly<{
  sha: string;
  shortSha: string;
  subject: string;
  stat: string;
  diff: string;
}>;

/** Commits generated by `ava release` itself: never real release-note material. */
const HOUSEKEEPING_SUBJECT_PATTERNS = [
  /^Release: v\d+\.\d+\.\d+ \[skip deploy\]$/,
  /^Bump version to \d+\.\d+\.\d+-dev \[skip deploy\]$/,
];

const LOG_FIELD_SEPARATOR = "\x1f";

/** Whether a commit subject is release-flow housekeeping, not real content. */
function _isHousekeepingSubject(subject: string): boolean {
  return HOUSEKEEPING_SUBJECT_PATTERNS.some((pattern) => {
    return pattern.test(subject);
  });
}

/** Truncates a diff to a fixed budget so one huge commit can't blow the prompt. */
function _truncateDiff(diff: string): string {
  if (diff.length <= MAX_DIFF_CHARS_PER_COMMIT) {
    return diff;
  }
  return `${diff.slice(0, MAX_DIFF_CHARS_PER_COMMIT)}\n… [diff truncated]`;
}

/**
 * The real, non-housekeeping commits between `previousTag` and
 * `headRevision`, each carrying enough diff context for an LLM to judge
 * whether its subject is already clear or needs rewriting.
 *
 * `--no-merges` already drops the release command's own two-parent merge
 * commit (see `createReleaseCommit` in `releaseGitHelpers.ts`); the two
 * single-parent housekeeping commits the release flow also creates are
 * filtered out explicitly by subject.
 */
export function collectReleaseChangelogCommits(
  git: ReleaseCommands,
  options: Readonly<{ previousTag: string | undefined; headRevision: string }>,
): ReleaseChangelogCommitInput[] {
  const { previousTag, headRevision } = options;
  const range =
    previousTag !== undefined ? `${previousTag}..${headRevision}` : headRevision;

  const log = git.readGit([
    "log",
    range,
    "--no-merges",
    `--format=%H${LOG_FIELD_SEPARATOR}%s`,
  ]);
  if (log === undefined || log.length === 0) {
    return [];
  }

  return log
    .split("\n")
    .map((line) => {
      const [sha, subject] = line.split(LOG_FIELD_SEPARATOR);
      return sha !== undefined && subject !== undefined
        ? { sha, subject }
        : undefined;
    })
    .filter((entry): entry is { sha: string; subject: string } => {
      return entry !== undefined && !_isHousekeepingSubject(entry.subject);
    })
    .map(({ sha, subject }) => {
      const stat = git.readGit(["show", "--stat", "--format=", sha]) ?? "";
      const diff = git.readGit(["show", "--format=", sha]) ?? "";
      return {
        sha,
        shortSha: shortSha(sha),
        subject,
        stat: stat.trim(),
        diff: _truncateDiff(diff.trim()),
      };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.ts apps/ava-cli/src/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits.test.ts
git commit -m "feat(ava-cli): collect a release's real commits with stat and diff"
```

---

### Task 4: Render rule (`renderReleaseNotes`)

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/releaseChangelog/renderReleaseNotes.ts`
- Test: `apps/ava-cli/src/ReleaseCli/releaseChangelog/renderReleaseNotes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { renderReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes";
import { describe, expect, it } from "vitest";
import type { ReleaseNoteBullet } from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes";

function _bullet(overrides: Partial<ReleaseNoteBullet>): ReleaseNoteBullet {
  return {
    group: "Features",
    text: "Did a thing",
    commits: ["abc1234"],
    ...overrides,
  };
}

describe("renderReleaseNotes", () => {
  it("returns an empty string for no bullets", () => {
    expect(renderReleaseNotes([])).toBe("");
  });

  it("flattens when every group has only one bullet", () => {
    const bullets = [
      _bullet({ group: "Features", text: "Feature A" }),
      _bullet({ group: "Fixes", text: "Fix A" }),
      _bullet({ group: "Chores", text: "Chore A" }),
    ];
    expect(renderReleaseNotes(bullets)).toBe(
      "- Feature A\n- Fix A\n- Chore A",
    );
  });

  it("flattens when only one group has 2+ bullets", () => {
    const bullets = [
      _bullet({ group: "Features", text: "Feature A" }),
      _bullet({ group: "Features", text: "Feature B" }),
      _bullet({ group: "Fixes", text: "Fix A" }),
    ];
    expect(renderReleaseNotes(bullets)).toBe(
      "- Feature A\n- Feature B\n- Fix A",
    );
  });

  it("sections by group when at least 2 groups have 2+ bullets each", () => {
    const bullets = [
      _bullet({ group: "Features", text: "Feature A" }),
      _bullet({ group: "Fixes", text: "Fix A" }),
      _bullet({ group: "Fixes", text: "Fix B" }),
      _bullet({
        group: "Nits",
        text: "Numerous typo fixes",
        commits: ["a1", "b2"],
      }),
      _bullet({ group: "Nits", text: "More formatting", commits: ["c3"] }),
    ];
    expect(renderReleaseNotes(bullets)).toBe(
      [
        "## Features",
        "- Feature A",
        "",
        "## Fixes",
        "- Fix A",
        "- Fix B",
        "",
        "## Nits",
        "- Numerous typo fixes (`a1`, `b2`)",
        "- More formatting",
      ].join("\n"),
    );
  });

  it("appends every commit hash in backticks only when a bullet bundles more than one commit", () => {
    expect(renderReleaseNotes([_bullet({ commits: ["abc1234"] })])).toBe(
      "- Did a thing",
    );
    expect(
      renderReleaseNotes([_bullet({ commits: ["abc1234", "def5678"] })]),
    ).toBe("- Did a thing (`abc1234`, `def5678`)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/renderReleaseNotes.test.ts`
Expected: FAIL — `Cannot find module '@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes'`

- [ ] **Step 3: Write the minimal implementation**

```ts
/** One cleaned-up change in a generated release note. */
export type ReleaseNoteBullet = Readonly<{
  /** One of the fixed vocabulary in `RELEASE_NOTE_GROUPS`. */
  group: string;
  text: string;
  /** Short SHAs contributing to this bullet. */
  commits: readonly string[];
}>;

/** One bullet's rendered markdown line. */
function _renderBullet(bullet: ReleaseNoteBullet): string {
  const hashSuffix =
    bullet.commits.length > 1
      ? ` (${bullet.commits
          .map((sha) => {
            return `\`${sha}\``;
          })
          .join(", ")})`
      : "";
  return `- ${bullet.text}${hashSuffix}`;
}

/**
 * Renders release-note bullets to markdown, deciding between a flat list and
 * grouped sections.
 *
 * Sections are used only when at least 2 distinct groups have 2 or more
 * bullets each; otherwise everything flattens into one list with group
 * labels dropped. A handful of singleton groups reads worse under headers
 * than as a plain list, so the grouping is only worth the extra structure
 * once there is real clustering in at least two categories.
 */
export function renderReleaseNotes(
  bullets: readonly ReleaseNoteBullet[],
): string {
  if (bullets.length === 0) {
    return "";
  }

  const groupOrder: string[] = [];
  const bulletsByGroup = new Map<string, ReleaseNoteBullet[]>();
  for (const bullet of bullets) {
    const existing = bulletsByGroup.get(bullet.group);
    if (existing === undefined) {
      groupOrder.push(bullet.group);
      bulletsByGroup.set(bullet.group, [bullet]);
    } else {
      existing.push(bullet);
    }
  }

  const groupsWithTwoOrMore = groupOrder.filter((group) => {
    return (bulletsByGroup.get(group)?.length ?? 0) >= 2;
  });
  if (groupsWithTwoOrMore.length < 2) {
    return bullets.map(_renderBullet).join("\n");
  }

  return groupOrder
    .map((group) => {
      const groupBullets = bulletsByGroup.get(group) ?? [];
      return [`## ${group}`, ...groupBullets.map(_renderBullet)].join("\n");
    })
    .join("\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/renderReleaseNotes.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseChangelog/renderReleaseNotes.ts apps/ava-cli/src/ReleaseCli/releaseChangelog/renderReleaseNotes.test.ts
git commit -m "feat(ava-cli): render release notes as flat or sectioned markdown"
```

---

### Task 5: OpenAI call (`generateReleaseNotes`)

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/releaseChangelog/generateReleaseNotes.ts`
- Test: `apps/ava-cli/src/ReleaseCli/releaseChangelog/generateReleaseNotes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { generateReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/generateReleaseNotes";
import { describe, expect, it, vi } from "vitest";
import type { ReleaseChangelogCommitInput } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";

function _commit(
  overrides: Partial<ReleaseChangelogCommitInput> = {},
): ReleaseChangelogCommitInput {
  return {
    sha: "abc1234full",
    shortSha: "abc1234",
    subject: "A change",
    stat: "1 file changed",
    diff: "diff --git a/foo b/foo",
    ...overrides,
  };
}

function _fakeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => {
      return body;
    },
    text: async () => {
      return JSON.stringify(body);
    },
  } as Response;
}

describe("generateReleaseNotes", () => {
  it("never calls the real global fetch — every call goes through fetchImpl", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      _fakeResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                bullets: [
                  { group: "Features", text: "Did a thing", commits: ["abc1234"] },
                ],
              }),
            },
          },
        ],
      }),
    );
    const globalFetchSpy = vi.spyOn(globalThis, "fetch");

    const notes = await generateReleaseNotes({
      releaseVersion: "0.14.0",
      commits: [_commit()],
      apiKey: "test-key",
      model: "test-model",
      fetchImpl,
    });

    expect(notes).toBe("- Did a thing");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it("sends the API key as a bearer token and the model in the body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        _fakeResponse({ choices: [{ message: { content: '{"bullets":[]}' } }] }),
      );

    await generateReleaseNotes({
      releaseVersion: "0.14.0",
      commits: [],
      apiKey: "secret-key",
      model: "the-model",
      fetchImpl,
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-key",
    );
    const body = JSON.parse(init.body as string) as { model: string };
    expect(body.model).toBe("the-model");
  });

  it("throws a descriptive error when OpenAI returns a non-ok response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(_fakeResponse("rate limited", false, 429));

    await expect(
      generateReleaseNotes({
        releaseVersion: "0.14.0",
        commits: [],
        apiKey: "k",
        model: "m",
        fetchImpl,
      }),
    ).rejects.toThrow(/OpenAI request failed \(429\)/);
  });

  it("throws when the model's JSON is missing a bullets array", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        _fakeResponse({ choices: [{ message: { content: '{"oops":true}' } }] }),
      );

    await expect(
      generateReleaseNotes({
        releaseVersion: "0.14.0",
        commits: [],
        apiKey: "k",
        model: "m",
        fetchImpl,
      }),
    ).rejects.toThrow(/bullets array/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/generateReleaseNotes.test.ts`
Expected: FAIL — `Cannot find module '@ava-cli/ReleaseCli/releaseChangelog/generateReleaseNotes'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import {
  OPENAI_CHAT_COMPLETIONS_URL,
  RELEASE_CHANGELOG_REASONING_EFFORT,
  RELEASE_NOTE_GROUPS,
} from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
import {
  renderReleaseNotes,
} from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes";
import type { ReleaseChangelogCommitInput } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";
import type { ReleaseNoteBullet } from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes";

function _isReleaseNoteBullet(value: unknown): value is ReleaseNoteBullet {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof ReleaseNoteBullet, unknown>>;
  return (
    typeof candidate.group === "string" &&
    typeof candidate.text === "string" &&
    Array.isArray(candidate.commits) &&
    candidate.commits.every((commit) => {
      return typeof commit === "string";
    })
  );
}

function _parseBullets(content: string): ReleaseNoteBullet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Could not parse JSON from model:\n${content.slice(0, 400)}`,
    );
  }
  const bullets =
    typeof parsed === "object" && parsed !== null
      ? (parsed as { bullets?: unknown }).bullets
      : undefined;
  if (!Array.isArray(bullets) || !bullets.every(_isReleaseNoteBullet)) {
    throw new Error("Model JSON was missing a well-formed bullets array");
  }
  return bullets;
}

function _buildSystemPrompt(releaseVersion: string): string {
  return [
    `You are writing GitHub release notes for the Avandar app, version ${releaseVersion}.`,
    "You are given every commit merged since the previous release: its short SHA, subject line, file-level diffstat, and diff (possibly truncated).",
    'Return a JSON object shaped as {"bullets": [{"group": "...", "text": "...", "commits": ["<short sha>", ...]}]}.',
    "Rules:",
    '- If a commit\'s subject is already a clear, short, human-readable description, reuse it close to verbatim as "text", with "commits" set to that one commit\'s short SHA.',
    '- If a commit\'s subject is unclear, too terse, or overly long, write your own 1-2 sentence summary from its diff instead, with "commits" set to that one commit\'s short SHA.',
    '- Bundle nit-level commits (typo fixes, formatting, comment-only changes, lint fixes) into one bullet per cluster, "group": "Nits", a short "text" like "Numerous typo fixes", and "commits" listing every contributing short SHA.',
    `- Pick exactly one "group" per bullet from: ${RELEASE_NOTE_GROUPS.join(", ")}.`,
    "- Return only the JSON object, no commentary.",
  ].join("\n");
}

/**
 * Turns a release's filtered commits into rendered release-note markdown via
 * one OpenAI Chat Completions call.
 */
export async function generateReleaseNotes(
  options: Readonly<{
    releaseVersion: string;
    commits: readonly ReleaseChangelogCommitInput[];
    apiKey: string;
    model: string;
    /** Overrides `fetch`. Tests must always pass this — see the no-real-API-calls rule. */
    fetchImpl?: typeof fetch;
  }>,
): Promise<string> {
  const { releaseVersion, commits, apiKey, model } = options;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const userPayload = {
    releaseVersion,
    commits: commits.map((commit) => {
      return {
        sha: commit.shortSha,
        subject: commit.subject,
        stat: commit.stat,
        diff: commit.diff,
      };
    }),
  };

  const response = await fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning_effort: RELEASE_CHANGELOG_REASONING_EFFORT,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: _buildSystemPrompt(releaseVersion) },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${body.slice(0, 400)}`,
    );
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing choices[0].message.content");
  }
  return renderReleaseNotes(_parseBullets(content));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/generateReleaseNotes.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseChangelog/generateReleaseNotes.ts apps/ava-cli/src/ReleaseCli/releaseChangelog/generateReleaseNotes.test.ts
git commit -m "feat(ava-cli): generate release notes via one OpenAI call"
```

---

### Task 6: Orchestration (`publishReleaseNotes`)

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/releaseChangelog/publishReleaseNotes.ts`
- Test: `apps/ava-cli/src/ReleaseCli/releaseChangelog/publishReleaseNotes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";

type FakeGitOptions = Readonly<{
  tags?: string;
  ghReleaseView?: CommandResult;
  ghReleaseCreate?: CommandResult;
  log?: string;
  stat?: string;
  diff?: string;
  remoteUrl?: string;
  localTagExistsResult?: CommandResult;
  remoteLsRemoteOutput?: string;
}>;

function _createFakeGit(options: FakeGitOptions = {}): ReleaseCommands {
  const {
    tags = "v0.12.0\nv0.13.0",
    ghReleaseView = { ok: false, stdout: "", stderr: "release not found" },
    ghReleaseCreate = {
      ok: true,
      stdout: "https://github.com/org/repo/releases/tag/v0.13.0",
      stderr: "",
    },
    log = "sha1full\x1fA real change",
    stat = "1 file changed",
    diff = "diff --git a/foo b/foo",
    remoteUrl = "git@github.com:AvandarLabs/avandar.git",
    localTagExistsResult = { ok: true, stdout: "sha1full", stderr: "" },
    remoteLsRemoteOutput = "sha1full\trefs/tags/v0.13.0",
  } = options;

  return {
    repoRoot: "/fake/repo",
    dryRun: false,
    readGit: (args) => {
      const joined = args.join(" ");
      if (joined === "tag --list v* --sort=v:refname") return tags;
      if (joined.startsWith("log ")) return log;
      if (joined.startsWith("show --stat --format= ")) return stat;
      if (joined.startsWith("show --format= ")) return diff;
      if (joined === "remote get-url origin") return remoteUrl;
      if (joined.startsWith("ls-remote --tags origin")) {
        return remoteLsRemoteOutput;
      }
      return undefined;
    },
    tryGit: (args) => {
      if (args.join(" ").startsWith("rev-parse --verify --quiet refs/tags/")) {
        return localTagExistsResult;
      }
      return { ok: true, stdout: "", stderr: "" };
    },
    readCommand: (command, args) => {
      if (command === "gh" && args[0] === "release" && args[1] === "view") {
        return ghReleaseView;
      }
      return { ok: true, stdout: "", stderr: "" };
    },
    mutate: (command, args) => {
      if (command === "gh" && args[0] === "release" && args[1] === "create") {
        return ghReleaseCreate;
      }
      return { ok: true, stdout: "", stderr: "" };
    },
    mutateQuietly: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
  };
}

const FAKE_BULLETS_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          bullets: [
            { group: "Features", text: "Did a thing", commits: ["sha1full"] },
          ],
        }),
      },
    },
  ],
};

function _fetchImpl(): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      return FAKE_BULLETS_RESPONSE;
    },
    text: async () => {
      return "";
    },
  } as unknown as Response) as unknown as typeof fetch;
}

describe("publishReleaseNotes", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("returns tag-not-found when the tag doesn't exist anywhere", async () => {
    const git = _createFakeGit({
      localTagExistsResult: { ok: false, stdout: "", stderr: "" },
      remoteLsRemoteOutput: "",
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v9.9.9",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({ kind: "tag-not-found" });
  });

  it("skips the tag-existence check during a dry-run preview", async () => {
    const git = _createFakeGit({
      localTagExistsResult: { ok: false, stdout: "", stderr: "" },
      remoteLsRemoteOutput: "",
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.14.0",
      headRevision: "develop-head-sha",
      dryRun: true,
      skipExistenceChecks: true,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome.kind).toBe("previewed");
  });

  it("returns already-exists without calling gh release create", async () => {
    const mutateSpy = vi.fn().mockReturnValue({ ok: true, stdout: "", stderr: "" });
    const git = {
      ..._createFakeGit({
        ghReleaseView: {
          ok: true,
          stdout: '{"url":"https://github.com/org/repo/releases/tag/v0.13.0"}',
          stderr: "",
        },
      }),
      mutate: mutateSpy,
    };

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({
      kind: "already-exists",
      url: "https://github.com/org/repo/releases/tag/v0.13.0",
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("returns no-changes when every commit in range is housekeeping", async () => {
    const git = _createFakeGit({
      log: "sha1full\x1fRelease: v0.13.0 [skip deploy]",
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({ kind: "no-changes" });
  });

  it("previews notes on a dry run without calling gh release create", async () => {
    const mutateSpy = vi.fn().mockReturnValue({ ok: true, stdout: "", stderr: "" });
    const git = { ..._createFakeGit(), mutate: mutateSpy };

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: true,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({ kind: "previewed", notes: "- Did a thing" });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("publishes and returns the release URL on success", async () => {
    const git = _createFakeGit();

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({
      kind: "published",
      url: "https://github.com/AvandarLabs/avandar/releases/tag/v0.13.0",
    });
  });

  it("returns failed with gh's stderr when the release can't be created", async () => {
    const git = _createFakeGit({
      ghReleaseCreate: {
        ok: false,
        stdout: "",
        stderr: "HTTP 500: server error\nmore detail",
      },
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({
      kind: "failed",
      reason: "HTTP 500: server error",
    });
  });

  it("returns failed when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    const git = _createFakeGit();

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome.kind).toBe("failed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/publishReleaseNotes.test.ts`
Expected: FAIL — `Cannot find module '@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { describeCommandFailure } from "@ava-cli/ReleaseCli/describeCommandFailure/describeCommandFailure";
import {
  collectReleaseChangelogCommits,
  resolvePreviousReleaseTag,
} from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";
import { generateReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/generateReleaseNotes";
import { RELEASE_CHANGELOG_MODEL } from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
import {
  getGitHubRepoSlug,
  localTagExists,
  remoteTagExists,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

export type PublishReleaseNotesOutcome =
  | Readonly<{ kind: "published"; url: string }>
  | Readonly<{ kind: "previewed"; notes: string }>
  | Readonly<{ kind: "already-exists"; url: string }>
  | Readonly<{ kind: "no-changes" }>
  | Readonly<{ kind: "tag-not-found" }>
  | Readonly<{ kind: "failed"; reason: string }>;

/** The `url` field of a `gh release view --json url` response, if parseable. */
function _parseReleaseUrl(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as { url?: unknown };
    return typeof parsed.url === "string" ? parsed.url : undefined;
  } catch {
    return undefined;
  }
}

/** The best URL we can report for a tag, falling back to the tag name itself. */
function _releaseUrl(
  git: ReleaseCommands,
  releaseTag: string,
  parsedUrl: string | undefined,
): string {
  if (parsedUrl !== undefined) {
    return parsedUrl;
  }
  const repoSlug = getGitHubRepoSlug(git);
  return repoSlug !== undefined
    ? `https://github.com/${repoSlug}/releases/tag/${releaseTag}`
    : releaseTag;
}

/**
 * Generates and publishes a GitHub Release's notes for `releaseTag`.
 *
 * Never throws: every expected failure (missing tag, existing release, no
 * commits, an OpenAI or `gh` failure) comes back as a typed outcome, so the
 * two callers — the automatic publish inside `ava release`, and the
 * standalone `ava release notes` retry command — can each decide how loudly
 * to report the same condition.
 */
export async function publishReleaseNotes(
  git: ReleaseCommands,
  options: Readonly<{
    releaseTag: string;
    /**
     * The commit to diff from the previous tag, when it differs from
     * `releaseTag` itself. Only a `--dry-run` preview needs this: the tag
     * does not exist yet, so the develop commit that would become the
     * release stands in for it.
     */
    headRevision?: string;
    dryRun: boolean;
    /**
     * Skips the "does this tag exist" and "does it already have a release"
     * checks. Only a `--dry-run` preview sets this, since in that case the
     * tag is intentionally not created yet.
     */
    skipExistenceChecks?: boolean;
    /** Overrides `fetch` for the OpenAI call. For tests. */
    fetchImpl?: typeof fetch;
  }>,
): Promise<PublishReleaseNotesOutcome> {
  const { releaseTag, dryRun, fetchImpl } = options;
  const headRevision = options.headRevision ?? releaseTag;
  const skipExistenceChecks = options.skipExistenceChecks ?? false;

  git.tryGit(["fetch", "--quiet", "--tags", "origin"]);

  if (!skipExistenceChecks) {
    if (!localTagExists(git, releaseTag) && !remoteTagExists(git, releaseTag)) {
      return { kind: "tag-not-found" };
    }
    const viewResult = git.readCommand("gh", [
      "release",
      "view",
      releaseTag,
      "--json",
      "url",
    ]);
    if (viewResult.ok) {
      return {
        kind: "already-exists",
        url: _releaseUrl(git, releaseTag, _parseReleaseUrl(viewResult.stdout)),
      };
    }
  }

  const previousTag = resolvePreviousReleaseTag(git, releaseTag);
  const commits = collectReleaseChangelogCommits(git, {
    previousTag,
    headRevision,
  });
  if (commits.length === 0) {
    return { kind: "no-changes" };
  }

  let notes: string;
  try {
    notes = await generateReleaseNotes({
      releaseVersion: releaseTag.replace(/^v/, ""),
      commits,
      apiKey: AvaEnv.requireVar("OPENAI_API_KEY"),
      model: RELEASE_CHANGELOG_MODEL,
      fetchImpl,
    });
  } catch (error: unknown) {
    return {
      kind: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (dryRun) {
    return { kind: "previewed", notes };
  }

  const createResult = git.mutate("gh", [
    "release",
    "create",
    releaseTag,
    "--title",
    releaseTag,
    "--notes",
    notes,
  ]);
  if (!createResult.ok) {
    return {
      kind: "failed",
      reason: describeCommandFailure(createResult, "gh gave no reason"),
    };
  }
  return { kind: "published", url: _releaseUrl(git, releaseTag, undefined) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseChangelog/publishReleaseNotes.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseChangelog/publishReleaseNotes.ts apps/ava-cli/src/ReleaseCli/releaseChangelog/publishReleaseNotes.test.ts
git commit -m "feat(ava-cli): orchestrate release-notes generation and publishing"
```

---

### Task 7: `--skip-changelog` flag

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.ts`
- Modify: `apps/ava-cli/src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.test.ts`

- [ ] **Step 1: Update the failing test**

In `releaseFlagUtils.test.ts`, change the "accepts every supported flag and alias" test:

```ts
describe("findUnknownReleaseFlags", () => {
  it("accepts every supported flag and alias", () => {
    const argv = [
      "release",
      "--version",
      "0.11.0",
      "-n",
      "0.11.1",
      "--yes",
      "--dry-run",
      "--skip-ci-check",
      "--skip-changelog",
    ];

    expect(findUnknownReleaseFlags(argv)).toEqual([]);
  });

  // ... the remaining tests in this describe block are unchanged
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.test.ts`
Expected: FAIL — the new flag is not yet in `RELEASE_FLAGS`, so `--skip-changelog` is reported as unknown

- [ ] **Step 3: Add the flag**

In `releaseFlagUtils.ts`:

```ts
export const RELEASE_FLAGS = [
  "--version",
  "-v",
  "--next",
  "-n",
  "--yes",
  "-y",
  "--dry-run",
  "--skip-ci-check",
  "--skip-changelog",
  "--help",
  "-h",
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.ts apps/ava-cli/src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.test.ts
git commit -m "feat(ava-cli): recognize --skip-changelog on ava release"
```

---

### Task 8: Wire `--skip-changelog` into `ava release`

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/ReleaseCli.ts`
- Modify: `apps/ava-cli/src/ReleaseCli/runRelease/runRelease.ts`

No new test in this task: `ReleaseCliArgs`/`ReleaseOptions` are plumbing types with no behavior of their own yet (the behavior is tested in Task 9, once `runRelease` actually uses the flag).

- [ ] **Step 1: Add the option, usage text, and type to `ReleaseCli.ts`**

Update the `USAGE` constant (add a line after `--skip-ci-check`):

```ts
const USAGE = `ava release: publish a new release of the Avandar app.

  main becomes an exact copy of develop (a straight cut, never a merge, so it
  cannot conflict), tagged vX.Y.Z. develop then moves on to the next -dev
  version. Run it from develop, with a clean tree and nothing unpushed.

Usage
  ava release get-prod-version                  print the version on origin/main
  ava release notes --version 0.13.3            (re-)publish release notes
  ava release                                   ask for both versions
  ava release --version 0.11.0                  ask only for the next version
  ava release --version 0.11.0 --next 0.11.1 --yes
  ava release --dry-run                         print commands, change nothing

Options
  --version, -v  X.Y.Z to release. Asked for when omitted.
  --next, -n     X.Y.Z develop moves to; gains -dev. Asked for when omitted.
  --yes, -y      Take every suggestion and skip confirmations.
  --dry-run      Print every command that would change state, and generate a
                 preview of the release notes, but run nothing else.
  --skip-ci-check  Do not check develop's staging CI.
  --skip-changelog  Do not generate or publish GitHub release notes.
  --help, -h     This text.`;
```

Update `ReleaseCliArgs`:

```ts
type ReleaseCliArgs = {
  version?: string;
  next?: string;
  yes: boolean;
  dryRun: boolean;
  skipCiCheck: boolean;
  skipChangelog: boolean;
};
```

Add the option after `--skip-ci-check`'s `.addOption(...)` block:

```ts
  .addOption({
    name: "--skip-changelog",
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Do not generate or publish GitHub release notes for this release.",
  })
```

Update the call to `runRelease`:

```ts
    return runRelease({
      version: args.version,
      nextVersion: args.next,
      yes: args.yes,
      dryRun: args.dryRun,
      skipCiCheck: args.skipCiCheck,
      skipChangelog: args.skipChangelog,
    }).catch((error: unknown) => {
      printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
```

- [ ] **Step 2: Add the field to `ReleaseOptions` in `runRelease.ts`**

```ts
export type ReleaseOptions = {
  /** Version to release. Prompted for when omitted. */
  version: string | undefined;
  /** Version the source branch moves to; gains `-dev`. Asked for if omitted. */
  nextVersion: string | undefined;
  /** Accept every default and skip confirmations. */
  yes: boolean;
  /** Print every mutating command without running it. */
  dryRun: boolean;
  /** Skip the staging CI check. */
  skipCiCheck: boolean;
  /** Skip generating and publishing GitHub release notes. */
  skipChangelog: boolean;
};
```

(The field is not read yet — that happens in Task 9.)

- [ ] **Step 3: Run the existing suite to confirm nothing broke**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/ReleaseCli.test.ts src/ReleaseCli/releaseFlagUtils/releaseFlagUtils.test.ts`
Expected: PASS (16 tests). TypeScript may flag `skipChangelog` as unused in `runRelease` until Task 9 — that is expected and resolved there.

- [ ] **Step 4: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/ReleaseCli.ts apps/ava-cli/src/ReleaseCli/runRelease/runRelease.ts
git commit -m "feat(ava-cli): plumb --skip-changelog through to runRelease"
```

---

### Task 9: Wire `publishReleaseNotes` into `runRelease`

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/runRelease/releaseStageHelpers.ts`
- Create: `apps/ava-cli/src/ReleaseCli/runRelease/releaseStageHelpers.test.ts`
- Modify: `apps/ava-cli/src/ReleaseCli/runRelease/runRelease.ts`

- [ ] **Step 1: Write the failing test for `reportReleaseNotesOutcome`**

```ts
import { reportReleaseNotesOutcome } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("reportReleaseNotesOutcome", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  function _loggedText(): string {
    return logSpy.mock.calls
      .map((call) => {
        return call
          .map((arg) => {
            return typeof arg === "string" ? arg : JSON.stringify(arg);
          })
          .join(" ");
      })
      .join("\n");
  }

  it("prints nothing when notes were published", () => {
    reportReleaseNotesOutcome(
      { kind: "published", url: "https://github.com/x/y/releases/tag/v1.0.0" },
      "1.0.0",
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("prints the preview notes on a dry run without a retry hint", () => {
    reportReleaseNotesOutcome({ kind: "previewed", notes: "- Did a thing" }, "1.0.0");
    expect(_loggedText()).toContain("Did a thing");
    expect(_loggedText()).not.toContain("ava release notes");
  });

  it("prints an informational line for no-changes", () => {
    reportReleaseNotesOutcome({ kind: "no-changes" }, "1.0.0");
    expect(_loggedText()).toContain("No commits found");
  });

  it("warns and prints the retry command when publishing failed", () => {
    reportReleaseNotesOutcome({ kind: "failed", reason: "network error" }, "1.0.0");
    expect(_loggedText()).toContain("network error");
    expect(_loggedText()).toContain("ava release notes --version 1.0.0");
  });

  it("warns and prints the retry command when a release already exists", () => {
    reportReleaseNotesOutcome(
      {
        kind: "already-exists",
        url: "https://github.com/x/y/releases/tag/v1.0.0",
      },
      "1.0.0",
    );
    expect(_loggedText()).toContain("already exist");
    expect(_loggedText()).toContain("ava release notes --version 1.0.0");
  });

  it("warns and prints the retry command when the tag can't be found", () => {
    reportReleaseNotesOutcome({ kind: "tag-not-found" }, "1.0.0");
    expect(_loggedText()).toContain("ava release notes --version 1.0.0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/runRelease/releaseStageHelpers.test.ts`
Expected: FAIL — `reportReleaseNotesOutcome is not exported`

- [ ] **Step 3: Add `reportReleaseNotesOutcome` to `releaseStageHelpers.ts`**

Add this import at the top (alongside the existing imports):

```ts
import type { PublishReleaseNotesOutcome } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes";
```

Add `printInfo` to the existing `cliOutput` import:

```ts
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
```

Add the function (e.g. after `confirmReleasePlan`):

```ts
/**
 * Reports the outcome of generating and publishing this release's GitHub
 * release notes, called right after the tag and main are pushed (or, on a
 * dry run, right after the preview would have been generated).
 *
 * A failure here never fails the release: main and the tag are already live
 * by the time this runs, so the only thing left to do is tell the user how
 * to retry the one step that didn't finish.
 */
export function reportReleaseNotesOutcome(
  outcome: PublishReleaseNotesOutcome,
  releaseVersion: string,
): void {
  const retryHint = `Retry publishing release notes: ava release notes --version ${releaseVersion}`;

  switch (outcome.kind) {
    case "published":
      return;
    case "previewed":
      printHeading("Release notes (preview)");
      printInfo(outcome.notes);
      return;
    case "no-changes":
      printInfo(
        "No commits found since the previous tag; no release notes to publish.",
      );
      return;
    case "already-exists":
      printWarn(
        `Release notes already exist for v${releaseVersion}: ${outcome.url}`,
      );
      printWarn(retryHint);
      return;
    case "tag-not-found":
      printWarn(`Could not find tag v${releaseVersion} to publish release notes for.`);
      printWarn(retryHint);
      return;
    case "failed":
      printWarn(`Could not publish release notes: ${outcome.reason}`);
      printWarn(retryHint);
      return;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/runRelease/releaseStageHelpers.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire the call into `runRelease.ts`**

Add imports:

```ts
import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes";
```

Add `reportReleaseNotesOutcome` to the existing `releaseStageHelpers` import:

```ts
import {
  assertTagIsUnused,
  bumpDevelopToNextVersion,
  commitReleaseVersionOnDevelop,
  confirmCiVerdict,
  confirmReleasePlan,
  printReleaseSummary,
  publishMainAndTag,
  reportReleaseNotesOutcome,
  updateLocalMainRef,
} from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers";
```

Update the body of `runRelease`:

```ts
export async function runRelease(
  options: Readonly<ReleaseOptions>,
): Promise<void> {
  const { yes, dryRun, skipCiCheck, skipChangelog } = options;

  const git = createReleaseCommands({ repoRoot: _requireRepoRoot(), dryRun });
  if (dryRun) {
    printWarn("Dry run: no local or remote state will change.");
  }

  // Nothing runs until preflight is satisfied, and nothing is pushed until the
  // plan is confirmed.
  const preflight = _requirePreflight(git);
  const { originDevelopSha, originMainSha, localMainSha } = preflight;
  const plan = await _resolvePlan(git, options, preflight);
  assertTagIsUnused(git, plan);
  await confirmCiVerdict(git, {
    commitSha: originDevelopSha,
    assumeYes: yes,
    skip: skipCiCheck,
  });
  await confirmReleasePlan(git, {
    plan,
    originDevelopSha,
    originMainSha,
    assumeYes: yes,
  });

  const releaseSha = commitReleaseVersionOnDevelop(git, {
    plan,
    originDevelopSha,
  });
  const releaseCommitSha = publishMainAndTag(git, {
    plan,
    releaseSha,
    originMainSha,
  });

  if (!skipChangelog) {
    // On a dry run `releaseCommitSha` is undefined (nothing was tagged), so
    // the develop-side commit stands in for the tag, and the existence
    // checks (which only make sense for a tag that actually exists) are
    // skipped.
    const releaseNotesOutcome = await publishReleaseNotes(git, {
      releaseTag: plan.releaseTag,
      dryRun,
      ...(releaseCommitSha === undefined
        ? { headRevision: releaseSha, skipExistenceChecks: true }
        : {}),
    });
    reportReleaseNotesOutcome(releaseNotesOutcome, plan.releaseVersion);
  }

  // A dry run pushes nothing, so there is nothing left to do.
  if (releaseCommitSha === undefined) {
    return;
  }
  updateLocalMainRef(git, { releaseCommitSha, localMainSha, originMainSha });
  bumpDevelopToNextVersion(git, plan);
  printReleaseSummary(git, { plan, releaseSha });
}
```

- [ ] **Step 6: Run the full ReleaseCli suite to confirm nothing broke**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli`
Expected: PASS (every file under `src/ReleaseCli`, including the new ones)

- [ ] **Step 7: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/runRelease/releaseStageHelpers.ts apps/ava-cli/src/ReleaseCli/runRelease/releaseStageHelpers.test.ts apps/ava-cli/src/ReleaseCli/runRelease/runRelease.ts
git commit -m "feat(ava-cli): publish GitHub release notes at the end of ava release"
```

---

### Task 10: `ava release notes` command

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/ReleaseNotesCli.ts`
- Test: `apps/ava-cli/src/ReleaseCli/ReleaseNotesCli.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { ReleaseNotesCli } from "@ava-cli/ReleaseCli/ReleaseNotesCli";
import * as publishReleaseNotesModule from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes";
import * as findRepoRootModule from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes");
vi.mock("@ava-cli/utils/findRepoRoot");

function _loggedText(logSpy: ReturnType<typeof vi.spyOn>): string {
  return logSpy.mock.calls
    .map((call) => {
      return call
        .map((arg) => {
          return typeof arg === "string" ? arg : JSON.stringify(arg);
        })
        .join(" ");
    })
    .join("\n");
}

describe("ava release notes", () => {
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExitCode = process.exitCode;
    process.argv = [process.execPath, "ava", "release", "notes"];
    process.exitCode = undefined;
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue("/fake/repo");
    logSpy = vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it("prints help without needing a repository", async () => {
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue(undefined);
    process.argv.push("--help");

    await ReleaseNotesCli.state.action?.({ dryRun: false });

    expect(_loggedText(logSpy)).toContain("ava release notes");
    expect(process.exitCode).toBeUndefined();
  });

  it("fails outside the repository", async () => {
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue(undefined);

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("repository");
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid version before calling publishReleaseNotes", async () => {
    await ReleaseNotesCli.state.action?.({ version: "v0.13.3", dryRun: false });

    expect(publishReleaseNotesModule.publishReleaseNotes).not.toHaveBeenCalled();
    expect(_loggedText(logSpy)).toContain("must not start");
    expect(process.exitCode).toBe(1);
  });

  it("publishes and prints success", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "published",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain(
      "https://github.com/org/repo/releases/tag/v0.13.3",
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("errors when release notes already exist", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "already-exists",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("already exist");
    expect(process.exitCode).toBe(1);
  });

  it("errors when the tag can't be found", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "tag-not-found",
    });

    await ReleaseNotesCli.state.action?.({ version: "9.9.9", dryRun: false });

    expect(_loggedText(logSpy)).toContain("No release tag");
    expect(process.exitCode).toBe(1);
  });

  it("prints the preview on a dry run without exiting non-zero", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "previewed",
      notes: "- Did a thing",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: true });

    expect(_loggedText(logSpy)).toContain("Did a thing");
    expect(process.exitCode).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/ReleaseNotesCli.test.ts`
Expected: FAIL — `Cannot find module '@ava-cli/ReleaseCli/ReleaseNotesCli'`

- [ ] **Step 3: Write the minimal implementation**

```ts
import { createReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import { wantsHelp } from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { listSortedReleaseTags } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";
import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes";
import { promptForVersion } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  toReleaseTag,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { IAcclimateCLI } from "@avandar/acclimate";

const USAGE = `ava release notes: publish GitHub release notes for an existing release.

  Generates release notes from the commits between the previous version tag
  and the given one, via an LLM, and publishes them as a GitHub Release. Use
  this to retry a notes publish that failed during \`ava release\`, or to
  publish notes for any past release that doesn't have them yet.

Usage
  ava release notes --version 0.13.3             publish notes for v0.13.3
  ava release notes                               ask for a version
  ava release notes --version 0.13.3 --dry-run   preview without publishing

Options
  --version, -v  X.Y.Z to publish notes for. Asked for when omitted.
  --dry-run      Generate and print the notes, but do not publish them.
  --help, -h     This text.`;

/** The parsed `ava release notes` options, as Acclimate hands them to the action. */
type ReleaseNotesCliArgs = {
  version?: string;
  dryRun: boolean;
};

/** Asks which released version to publish notes for, defaulting to the most recent tag. */
async function _promptForReleasedVersion(
  git: ReleaseCommands,
): Promise<string> {
  const tags = listSortedReleaseTags(git);
  const mostRecentTag = tags.at(-1);
  return promptForVersion({
    message: "Which released version should get published notes?",
    defaultValue: mostRecentTag?.replace(/^v/, ""),
    label: "Version",
  });
}

/** `ava release notes`: generate and publish GitHub release notes for a tag. */
async function _runReleaseNotes(
  args: Readonly<ReleaseNotesCliArgs>,
): Promise<void> {
  const repoRoot = findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root. Run this from inside the repository.",
    );
  }
  const git = createReleaseCommands({ repoRoot, dryRun: args.dryRun });

  const version = args.version ?? (await _promptForReleasedVersion(git));
  const validation = validateReleaseVersion(version, "Version");
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  const releaseTag = toReleaseTag(version);

  const outcome = await publishReleaseNotes(git, {
    releaseTag,
    dryRun: args.dryRun,
  });

  switch (outcome.kind) {
    case "tag-not-found":
      throw new Error(
        `No release tag ${releaseTag} exists locally or on origin.`,
      );
    case "already-exists":
      throw new Error(
        `Release notes already exist for ${releaseTag}: ${outcome.url}`,
      );
    case "no-changes":
      printInfo(`No commits found for ${releaseTag}; nothing to publish.`);
      return;
    case "previewed":
      printInfo(
        `Preview for ${releaseTag} (dry run, nothing published):\n\n${outcome.notes}`,
      );
      return;
    case "published":
      printSuccess(`Published release notes for ${releaseTag}: ${outcome.url}`);
      return;
    case "failed":
      throw new Error(
        `Could not publish release notes for ${releaseTag}: ${outcome.reason}`,
      );
  }
}

export const ReleaseNotesCli: IAcclimateCLI = Acclimate.createCLI("notes")
  .description(
    "Generate and publish GitHub release notes for an existing release tag, via an LLM.",
  )
  .addOption({
    name: "--version",
    aliases: ["-v"] as const,
    type: "string",
    required: false,
    description:
      "The X.Y.Z version to publish notes for. Asked for when omitted.",
  })
  .addOption({
    name: "--dry-run",
    type: "boolean",
    required: false,
    defaultValue: false,
    description: "Generate and print the notes, but do not publish them.",
  })
  .action((args: Readonly<ReleaseNotesCliArgs>) => {
    if (wantsHelp(process.argv.slice(2))) {
      printInfo(USAGE);
      return undefined;
    }
    return _runReleaseNotes(args).catch((error: unknown) => {
      printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli/ReleaseNotesCli.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/ReleaseNotesCli.ts apps/ava-cli/src/ReleaseCli/ReleaseNotesCli.test.ts
git commit -m "feat(ava-cli): add ava release notes command"
```

---

### Task 11: Register `ava release notes` on `ava release`

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/ReleaseCli.ts`

- [ ] **Step 1: Add the import and registration**

Add the import alongside the existing `GetProdVersionCli` import:

```ts
import { GetProdVersionCli } from "@ava-cli/ReleaseCli/GetProdVersionCli";
import { ReleaseNotesCli } from "@ava-cli/ReleaseCli/ReleaseNotesCli";
```

Register the command:

```ts
export const ReleaseCli = Acclimate.createCLI("release")
  .addCommand("get-prod-version", GetProdVersionCli)
  .addCommand("notes", ReleaseNotesCli)
  .description(
```

(The usage text already mentions `ava release notes` from Task 8.)

- [ ] **Step 2: Run the full ReleaseCli suite**

Run: `pnpm exec vitest run -c vitest.config.ts src/ReleaseCli`
Expected: PASS (every file under `src/ReleaseCli`)

- [ ] **Step 3: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/ReleaseCli.ts
git commit -m "feat(ava-cli): register ava release notes as a subcommand"
```

---

### Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire ava-cli test suite**

Run: `pnpm exec vitest run -c vitest.config.ts`
Expected: PASS — every pre-existing test still passes (baseline was 46 files / 345 tests), plus the new files from this plan (6 new test files, ~46 new tests).

- [ ] **Step 2: Build the CLI as a compile sanity check**

Run: `pnpm build` (from `apps/ava-cli/`)
Expected: succeeds, producing `dist/main.cjs`. (`tsup` bundles via esbuild and does not perform a full type-check the way `tsc -b` would; this step only catches syntax/bundling errors, not every type error. There is no standalone typecheck script for this package today — rely on careful review of the code in this plan plus the test suite for correctness.)

- [ ] **Step 3: Confirm no real OpenAI calls are reachable from the test suite**

Run: `grep -rn "globalThis.fetch\|: typeof fetch" src/ReleaseCli/releaseChangelog/*.test.ts`
Expected: every test file that touches `generateReleaseNotes` or `publishReleaseNotes` passes an explicit `fetchImpl`; `generateReleaseNotes.test.ts` additionally asserts `globalThis.fetch` was never called.

- [ ] **Step 4: Manually read through the new `--help` output**

Run (from the repo root, with `ava` built per Task 12 Step 2 or via `pnpm build:ava-cli` at the repo root):

```bash
./apps/ava-cli/dist/main.cjs release --help
./apps/ava-cli/dist/main.cjs release notes --help
```

Expected: both print the usage text written in Tasks 8 and 10, with no stack traces.

---

## Self-review notes (for whoever executes this plan)

- Every outcome of `PublishReleaseNotesOutcome` (`published`, `previewed`, `already-exists`, `no-changes`, `tag-not-found`, `failed`) is covered by a `publishReleaseNotes` test (Task 6), a `reportReleaseNotesOutcome` test (Task 9), and a `ReleaseNotesCli` test (Task 10).
- The dry-run preview path (`headRevision` + `skipExistenceChecks` override) is exercised directly in Task 6's "skips the tag-existence check during a dry-run preview" test, and wired end-to-end in Task 9.
- No task calls the real OpenAI API, `gh`, or a real git repository for the changelog logic; `ReleaseCli.test.ts`'s existing real-repo tests (`get-prod-version`) are untouched and keep passing since `ava release notes` is a sibling command, not a modification to that flow.
- `.env.example` and the config file are the only two places the OpenAI model/budget live, per the "easily findable" requirement from the original request.
