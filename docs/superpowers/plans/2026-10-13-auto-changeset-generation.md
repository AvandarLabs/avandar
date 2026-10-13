# Auto Changeset Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically generate a Changesets file for every merged PR (or direct push commit) on `develop` that touches `packages/**`, with the semver bump inferred from the PR title/branch name, so `pnpm changeset` never has to be run by hand.

**Architecture:** A new step in `.github/workflows/release-packages.yaml` runs a Node/TypeScript script (`scripts/ci/ensure-changesets/ensureChangesets.ts`) before the existing type-check/test/verify steps. It resolves the push's commits to their merged PRs via the GitHub CLI, infers a bump per PR from small pure functions, writes one `.changeset/auto-pr-<n>.md` file per PR, and commits/pushes them to `develop` before the job continues. A new `lint-pr-title` job in `pr-develop.yaml` enforces the PR title format this depends on, and `AGENTS.md` documents it.

**Tech Stack:** TypeScript (run via `pnpm vite-script`, this repo's existing `vite-node`-based script runner), Vitest, GitHub CLI (`gh`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-13-auto-changeset-generation-design.md`

---

## File Structure

```
scripts/ci/ensure-changesets/
  ensureChangesets.ts                              # orchestration (not unit tested)
  parseConventionalCommitTitle/
    parseConventionalCommitTitle.ts
    parseConventionalCommitTitle.test.ts
  branchNameToCommitType/
    branchNameToCommitType.ts
    branchNameToCommitType.test.ts
  inferBumpType/
    inferBumpType.ts
    inferBumpType.test.ts
  changedFilesToPackageNames/
    changedFilesToPackageNames.ts
    changedFilesToPackageNames.test.ts
  buildChangesetMarkdown/
    buildChangesetMarkdown.ts
    buildChangesetMarkdown.test.ts
.github/workflows/release-packages.yaml            # modified: new step
.github/workflows/pr-develop.yaml                  # modified: new lint-pr-title job
AGENTS.md                                          # modified: new section
```

Each pure function lives in its own folder with a colocated test, matching this repo's existing `scripts/db/*`, `scripts/i18n/*` pattern. `ensureChangesets.ts` is the only file that touches the filesystem, `git`, or `gh`, and per the spec it is exercised by running the real workflow, not by unit tests.

---

### Task 1: `parseConventionalCommitTitle`

**Files:**
- Create: `scripts/ci/ensure-changesets/parseConventionalCommitTitle/parseConventionalCommitTitle.ts`
- Test: `scripts/ci/ensure-changesets/parseConventionalCommitTitle/parseConventionalCommitTitle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseConventionalCommitTitle } from "./parseConventionalCommitTitle";

describe("parseConventionalCommitTitle", () => {
  it("parses a type and description with no scope", () => {
    expect(parseConventionalCommitTitle("feat: add foo")).toEqual({
      type: "feat",
      scope: null,
      breaking: false,
      description: "add foo",
    });
  });

  it("parses a scope in parentheses", () => {
    expect(parseConventionalCommitTitle("fix(ui): correct bug")).toEqual({
      type: "fix",
      scope: "ui",
      breaking: false,
      description: "correct bug",
    });
  });

  it("marks a title with a trailing ! as breaking", () => {
    expect(parseConventionalCommitTitle("feat!: drop old api")).toEqual({
      type: "feat",
      scope: null,
      breaking: true,
      description: "drop old api",
    });
  });

  it("marks a scoped title with a trailing ! as breaking", () => {
    expect(parseConventionalCommitTitle("feat(core)!: drop old api")).toEqual(
      {
        type: "feat",
        scope: "core",
        breaking: true,
        description: "drop old api",
      },
    );
  });

  it("returns null for a title with no Conventional Commit type", () => {
    expect(
      parseConventionalCommitTitle("Added get-prod-version command"),
    ).toBeNull();
  });

  it("returns null for a type with no description", () => {
    expect(parseConventionalCommitTitle("chore:")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/parseConventionalCommitTitle/parseConventionalCommitTitle.test.ts`
Expected: FAIL — `Cannot find module './parseConventionalCommitTitle'` (the implementation file does not exist yet).

- [ ] **Step 3: Write the implementation**

```ts
export type ConventionalCommitTitle = {
  type: string;
  scope: string | null;
  breaking: boolean;
  description: string;
};

const CONVENTIONAL_COMMIT_TITLE_PATTERN =
  /^([a-z]+)(\(([^)]+)\))?(!)?:\s+(.+)$/;

/**
 * Parses a PR title as a Conventional Commit header
 * (`type(scope)!: description`), or returns null when it does not match.
 */
export function parseConventionalCommitTitle(
  title: string,
): ConventionalCommitTitle | null {
  const match = CONVENTIONAL_COMMIT_TITLE_PATTERN.exec(title.trim());
  if (!match) {
    return null;
  }
  const [, type, , scope, breakingMarker, description] = match;
  return {
    type,
    scope: scope ?? null,
    breaking: breakingMarker === "!",
    description,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/parseConventionalCommitTitle/parseConventionalCommitTitle.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/ci/ensure-changesets/parseConventionalCommitTitle
git commit -m "feat(changesets-ci): add parseConventionalCommitTitle"
```

---

### Task 2: `branchNameToCommitType`

**Files:**
- Create: `scripts/ci/ensure-changesets/branchNameToCommitType/branchNameToCommitType.ts`
- Test: `scripts/ci/ensure-changesets/branchNameToCommitType/branchNameToCommitType.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { branchNameToCommitType } from "./branchNameToCommitType";

describe("branchNameToCommitType", () => {
  it.each([
    ["feat/auto-changesets", "feat"],
    ["fix/thing", "fix"],
    ["refactor/cleanup", "refactor"],
    ["chore/bump-deps", "chore"],
    ["docs/readme", "docs"],
    ["test/add-coverage", "test"],
  ])("extracts %s as %s", (branchName, expectedType) => {
    expect(branchNameToCommitType(branchName)).toBe(expectedType);
  });

  it("returns null for a branch with no recognized type prefix", () => {
    expect(branchNameToCommitType("release/1.2.3")).toBeNull();
  });

  it("returns null for a branch name with no slash", () => {
    expect(branchNameToCommitType("develop")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/branchNameToCommitType/branchNameToCommitType.test.ts`
Expected: FAIL — `Cannot find module './branchNameToCommitType'`

- [ ] **Step 3: Write the implementation**

```ts
const CONVENTIONAL_COMMIT_TYPES = [
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "test",
] as const;

export type ConventionalCommitType = (typeof CONVENTIONAL_COMMIT_TYPES)[number];

/**
 * Extracts this repo's Gitflow type prefix from a branch name, e.g.
 * "feat/thing" -> "feat". Returns null when the branch has no recognized
 * prefix.
 */
export function branchNameToCommitType(
  branchName: string,
): ConventionalCommitType | null {
  const [prefix] = branchName.split("/");
  return (CONVENTIONAL_COMMIT_TYPES as readonly string[]).includes(prefix)
    ? (prefix as ConventionalCommitType)
    : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/branchNameToCommitType/branchNameToCommitType.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/ci/ensure-changesets/branchNameToCommitType
git commit -m "feat(changesets-ci): add branchNameToCommitType"
```

---

### Task 3: `inferBumpType`

**Files:**
- Create: `scripts/ci/ensure-changesets/inferBumpType/inferBumpType.ts`
- Test: `scripts/ci/ensure-changesets/inferBumpType/inferBumpType.test.ts`
- Depends on: Task 1, Task 2

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { inferBumpType } from "./inferBumpType";

describe("inferBumpType", () => {
  it.each([
    ["feat: add thing", 0, "minor"],
    ["feat: add thing", 2, "minor"],
    ["fix: correct bug", 0, "patch"],
    ["fix: correct bug", 2, "patch"],
    ["chore: bump deps", 0, "patch"],
    ["refactor: simplify", 2, "patch"],
  ] as const)(
    "infers %s bump for title %s at major %i",
    (prTitle, currentMajorVersion, expectedBump) => {
      expect(
        inferBumpType({
          prTitle,
          prBody: "",
          branchName: "",
          currentMajorVersion,
        }),
      ).toBe(expectedBump);
    },
  );

  it("caps a breaking title's major bump to minor while major is 0", () => {
    const bump = inferBumpType({
      prTitle: "feat!: drop old api",
      prBody: "",
      branchName: "",
      currentMajorVersion: 0,
    });
    expect(bump).toBe("minor");
  });

  it("bumps major for a breaking title once major is at least 1", () => {
    const bump = inferBumpType({
      prTitle: "feat!: drop old api",
      prBody: "",
      branchName: "",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("major");
  });

  it("falls back to the branch prefix when the title does not parse", () => {
    const bump = inferBumpType({
      prTitle: "Add get-prod-version command",
      prBody: "",
      branchName: "feat/get-prod-version",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("minor");
  });

  it("defaults to patch when neither the title nor the branch name parse", () => {
    const bump = inferBumpType({
      prTitle: "Add get-prod-version command",
      prBody: "",
      branchName: "release/1.2.3",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("patch");
  });

  it("detects a breaking change from a BREAKING CHANGE footer even when the title is a fix", () => {
    const bump = inferBumpType({
      prTitle: "fix: correct bug",
      prBody: "BREAKING CHANGE: removes the old endpoint",
      branchName: "",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("major");
  });

  it("caps a footer-detected breaking change to minor while major is 0, even via the branch fallback", () => {
    const bump = inferBumpType({
      prTitle: "Add get-prod-version command",
      prBody: "BREAKING CHANGE: removes the old endpoint",
      branchName: "fix/get-prod-version",
      currentMajorVersion: 0,
    });
    expect(bump).toBe("minor");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/inferBumpType/inferBumpType.test.ts`
Expected: FAIL — `Cannot find module './inferBumpType'`

- [ ] **Step 3: Write the implementation**

```ts
import { branchNameToCommitType } from "../branchNameToCommitType/branchNameToCommitType";
import { parseConventionalCommitTitle } from "../parseConventionalCommitTitle/parseConventionalCommitTitle";

export type SemverBump = "patch" | "minor" | "major";

export type InferBumpTypeInput = {
  prTitle: string;
  prBody: string;
  branchName: string;
  currentMajorVersion: number;
};

const MINOR_TYPES: ReadonlySet<string> = new Set(["feat"]);
const BREAKING_CHANGE_FOOTER_PATTERN = /^BREAKING CHANGE:/m;

function baseBumpForType(type: string): SemverBump {
  return MINOR_TYPES.has(type) ? "minor" : "patch";
}

/**
 * Infers the semver bump for a PR from its title (Conventional Commits),
 * falling back to its branch name prefix when the title does not parse.
 * Caps an inferred major bump to minor while the repo is pre-1.0, since
 * nothing here should cross 0.x to 1.0.0 without a human deciding to.
 */
export function inferBumpType(input: InferBumpTypeInput): SemverBump {
  const { prTitle, prBody, branchName, currentMajorVersion } = input;

  const parsedTitle = parseConventionalCommitTitle(prTitle);
  const type = parsedTitle?.type ?? branchNameToCommitType(branchName);

  if (type === null || type === undefined) {
    return "patch";
  }

  const isBreaking =
    (parsedTitle?.breaking ?? false) ||
    BREAKING_CHANGE_FOOTER_PATTERN.test(prBody);

  const bump: SemverBump = isBreaking ? "major" : baseBumpForType(type);

  return bump === "major" && currentMajorVersion === 0 ? "minor" : bump;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/inferBumpType/inferBumpType.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/ci/ensure-changesets/inferBumpType
git commit -m "feat(changesets-ci): add inferBumpType"
```

---

### Task 4: `changedFilesToPackageNames`

**Files:**
- Create: `scripts/ci/ensure-changesets/changedFilesToPackageNames/changedFilesToPackageNames.ts`
- Test: `scripts/ci/ensure-changesets/changedFilesToPackageNames/changedFilesToPackageNames.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { changedFilesToPackageNames } from "./changedFilesToPackageNames";

describe("changedFilesToPackageNames", () => {
  const packageDirToName = new Map([
    ["packages/web/ui", "@avandar/ui"],
    ["packages/shared/utils", "@avandar/utils"],
  ]);

  it("maps files under one package directory to that package's name", () => {
    const result = changedFilesToPackageNames(
      [
        "packages/web/ui/src/Button.tsx",
        "packages/web/ui/src/Button.test.tsx",
      ],
      packageDirToName,
    );
    expect(result).toEqual(["@avandar/ui"]);
  });

  it("maps files under two different package directories to both names", () => {
    const result = changedFilesToPackageNames(
      [
        "packages/web/ui/src/Button.tsx",
        "packages/shared/utils/src/isDefined.ts",
      ],
      packageDirToName,
    );
    expect(result).toEqual(["@avandar/ui", "@avandar/utils"]);
  });

  it("ignores files outside packages/**", () => {
    const result = changedFilesToPackageNames(
      ["apps/web/src/App.tsx", "docs/readme.md"],
      packageDirToName,
    );
    expect(result).toEqual([]);
  });

  it("ignores a packages/** file whose directory has no known package name", () => {
    const result = changedFilesToPackageNames(
      ["packages/node/unlisted-package/src/index.ts"],
      packageDirToName,
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/changedFilesToPackageNames/changedFilesToPackageNames.test.ts`
Expected: FAIL — `Cannot find module './changedFilesToPackageNames'`

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Maps changed file paths to the npm package names of the
 * `packages/<tier>/<name>` directories they fall under, given a
 * directory-to-name lookup built from each package's package.json. Files
 * outside `packages/**` or under an unrecognized package directory are
 * ignored.
 */
export function changedFilesToPackageNames(
  changedFilePaths: readonly string[],
  packageDirToName: ReadonlyMap<string, string>,
): string[] {
  const packageNames = new Set<string>();
  for (const filePath of changedFilePaths) {
    const segments = filePath.split("/");
    if (segments[0] !== "packages" || segments.length < 3) {
      continue;
    }
    const packageDir = segments.slice(0, 3).join("/");
    const packageName = packageDirToName.get(packageDir);
    if (packageName !== undefined) {
      packageNames.add(packageName);
    }
  }
  return [...packageNames];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/changedFilesToPackageNames/changedFilesToPackageNames.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/ci/ensure-changesets/changedFilesToPackageNames
git commit -m "feat(changesets-ci): add changedFilesToPackageNames"
```

---

### Task 5: `buildChangesetMarkdown`

**Files:**
- Create: `scripts/ci/ensure-changesets/buildChangesetMarkdown/buildChangesetMarkdown.ts`
- Test: `scripts/ci/ensure-changesets/buildChangesetMarkdown/buildChangesetMarkdown.test.ts`
- Depends on: Task 3 (for the `SemverBump` type)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildChangesetMarkdown } from "./buildChangesetMarkdown";

describe("buildChangesetMarkdown", () => {
  it("builds frontmatter and body for a single package", () => {
    const markdown = buildChangesetMarkdown({
      packageNames: ["@avandar/ui"],
      bump: "patch",
      summary: "Fix button alignment (#123)",
    });
    expect(markdown).toBe(
      '---\n"@avandar/ui": patch\n---\n\nFix button alignment (#123)\n',
    );
  });

  it("lists every package on its own frontmatter line, in order", () => {
    const markdown = buildChangesetMarkdown({
      packageNames: ["@avandar/ui", "@avandar/utils"],
      bump: "minor",
      summary: "Add new hook (#124)",
    });
    expect(markdown).toBe(
      '---\n"@avandar/ui": minor\n"@avandar/utils": minor\n---\n\nAdd new hook (#124)\n',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/buildChangesetMarkdown/buildChangesetMarkdown.test.ts`
Expected: FAIL — `Cannot find module './buildChangesetMarkdown'`

- [ ] **Step 3: Write the implementation**

```ts
import type { SemverBump } from "../inferBumpType/inferBumpType";

export type BuildChangesetMarkdownInput = {
  packageNames: readonly string[];
  bump: SemverBump;
  summary: string;
};

/**
 * Builds the contents of a Changesets markdown file naming the given
 * packages at the given bump, with the summary as the changelog body.
 */
export function buildChangesetMarkdown(
  input: BuildChangesetMarkdownInput,
): string {
  const { packageNames, bump, summary } = input;
  const frontmatterLines = packageNames
    .map((packageName) => `"${packageName}": ${bump}`)
    .join("\n");
  return `---\n${frontmatterLines}\n---\n\n${summary}\n`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets/buildChangesetMarkdown/buildChangesetMarkdown.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/ci/ensure-changesets/buildChangesetMarkdown
git commit -m "feat(changesets-ci): add buildChangesetMarkdown"
```

---

### Task 6: `ensureChangesets.ts` orchestration script

**Files:**
- Create: `scripts/ci/ensure-changesets/ensureChangesets.ts`
- Depends on: Task 3, Task 4, Task 5

Per the spec, this file is not unit tested: it is a thin wrapper around `git`, `gh`, and the filesystem, and is exercised by running the real workflow. **Do not run this script locally against the real repository** — on a push with a pending change it ends by pushing a commit directly to `origin/develop`.

- [ ] **Step 1: Write the implementation**

```ts
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { buildChangesetMarkdown } from "./buildChangesetMarkdown/buildChangesetMarkdown";
import { changedFilesToPackageNames } from "./changedFilesToPackageNames/changedFilesToPackageNames";
import { inferBumpType } from "./inferBumpType/inferBumpType";
import type { SemverBump } from "./inferBumpType/inferBumpType";

const REPO_ROOT = process.cwd();
const CHANGESET_DIR = join(REPO_ROOT, ".changeset");
const PACKAGE_TIERS = ["node", "shared", "web"];
const ZERO_SHA = "0000000000000000000000000000000000000000";

type MergedPullRequest = {
  number: number;
  title: string;
  body: string;
  branchName: string;
};

function warn(message: string): void {
  console.log(`::warning::${message}`);
}

function runGit(args: string[]): string {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function runGh(args: string[]): string {
  return execFileSync("gh", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

/** Whether `ancestorSha` is an ancestor of `descendantSha`, i.e. a true fast-forward. */
function isAncestor(ancestorSha: string, descendantSha: string): boolean {
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", ancestorSha, descendantSha],
      { cwd: REPO_ROOT },
    );
    return true;
  } catch {
    return false;
  }
}

/** Maps each `packages/<tier>/<name>` directory to its package.json name. */
function loadPackageDirToName(): Map<string, string> {
  const packageDirToName = new Map<string, string>();
  for (const tier of PACKAGE_TIERS) {
    const tierDir = join(REPO_ROOT, "packages", tier);
    if (!existsSync(tierDir)) {
      continue;
    }
    for (const packageDirName of readdirSync(tierDir)) {
      const packageJsonPath = join(tierDir, packageDirName, "package.json");
      if (!existsSync(packageJsonPath)) {
        continue;
      }
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf8"),
      ) as { name: string };
      packageDirToName.set(
        `packages/${tier}/${packageDirName}`,
        packageJson.name,
      );
    }
  }
  return packageDirToName;
}

/** Reads the current version's major digit from any one fixed-group package, since they're locked together. */
function readCurrentMajorVersion(
  packageDirToName: Map<string, string>,
): number {
  const [firstPackageDir] = packageDirToName.keys();
  if (firstPackageDir === undefined) {
    throw new Error("No packages found under packages/**.");
  }
  const packageJson = JSON.parse(
    readFileSync(join(REPO_ROOT, firstPackageDir, "package.json"), "utf8"),
  ) as { version: string };
  return Number(packageJson.version.split(".")[0]);
}

function hasManualChangeset(changedFiles: string[]): boolean {
  return changedFiles.some(
    (filePath) =>
      filePath.startsWith(".changeset/") && filePath.endsWith(".md"),
  );
}

function writeChangesetFile(
  changesetPath: string,
  packageNames: string[],
  bump: SemverBump,
  summary: string,
): void {
  mkdirSync(CHANGESET_DIR, { recursive: true });
  writeFileSync(
    changesetPath,
    buildChangesetMarkdown({ packageNames, bump, summary }),
  );
}

/** Resolves each commit to its merged PR, bucketing commits with none (a direct push). */
function partitionCommitsByPullRequest(commitShas: string[]): {
  prNumbers: Set<number>;
  unassociatedShas: string[];
} {
  const prNumbers = new Set<number>();
  const unassociatedShas: string[] = [];
  for (const sha of commitShas) {
    const output = runGh([
      "api",
      `repos/${process.env.GITHUB_REPOSITORY}/commits/${sha}/pulls`,
      "--jq",
      ".[] | select(.merged_at != null) | .number",
    ]);
    const matchedNumbers = output.split("\n").filter(Boolean).map(Number);
    if (matchedNumbers.length === 0) {
      unassociatedShas.push(sha);
    } else {
      matchedNumbers.forEach((number) => prNumbers.add(number));
    }
  }
  return { prNumbers, unassociatedShas };
}

function fetchPullRequest(number: number): MergedPullRequest {
  const pullRequest = JSON.parse(
    runGh(["api", `repos/${process.env.GITHUB_REPOSITORY}/pulls/${number}`]),
  ) as { title: string; body: string | null; head: { ref: string } };
  return {
    number,
    title: pullRequest.title,
    body: pullRequest.body ?? "",
    branchName: pullRequest.head.ref,
  };
}

function fetchPullRequestFiles(number: number): string[] {
  return runGh([
    "api",
    `repos/${process.env.GITHUB_REPOSITORY}/pulls/${number}/files`,
    "--paginate",
    "--jq",
    ".[].filename",
  ])
    .split("\n")
    .filter(Boolean);
}

function processPullRequest(
  prNumber: number,
  packageDirToName: Map<string, string>,
  currentMajorVersion: number,
): boolean {
  const changesetPath = join(CHANGESET_DIR, `auto-pr-${prNumber}.md`);
  if (existsSync(changesetPath)) {
    return false;
  }

  const changedFiles = fetchPullRequestFiles(prNumber);
  if (hasManualChangeset(changedFiles)) {
    return false;
  }

  const packageNames = changedFilesToPackageNames(
    changedFiles,
    packageDirToName,
  );
  if (packageNames.length === 0) {
    return false;
  }

  const pullRequest = fetchPullRequest(prNumber);
  const bump = inferBumpType({
    prTitle: pullRequest.title,
    prBody: pullRequest.body,
    branchName: pullRequest.branchName,
    currentMajorVersion,
  });

  writeChangesetFile(
    changesetPath,
    packageNames,
    bump,
    `${pullRequest.title} (#${prNumber})`,
  );
  return true;
}

function processUnassociatedCommit(
  sha: string,
  packageDirToName: Map<string, string>,
  currentMajorVersion: number,
): boolean {
  const shortSha = sha.slice(0, 7);
  const changesetPath = join(CHANGESET_DIR, `auto-commit-${shortSha}.md`);
  if (existsSync(changesetPath)) {
    return false;
  }

  const changedFiles = runGit(["show", "--name-only", "--format=", sha])
    .split("\n")
    .filter(Boolean);
  if (hasManualChangeset(changedFiles)) {
    return false;
  }

  const packageNames = changedFilesToPackageNames(
    changedFiles,
    packageDirToName,
  );
  if (packageNames.length === 0) {
    return false;
  }

  const subject = runGit(["log", "-1", "--format=%s", sha]);
  const bump = inferBumpType({
    prTitle: subject,
    prBody: "",
    branchName: "",
    currentMajorVersion,
  });

  writeChangesetFile(
    changesetPath,
    packageNames,
    bump,
    `${subject} (${shortSha})`,
  );
  return true;
}

function main(): void {
  const beforeSha = process.env.BEFORE_SHA;
  const afterSha = process.env.AFTER_SHA;

  if (!beforeSha || !afterSha || beforeSha === ZERO_SHA) {
    warn(
      "No usable push range (new branch or missing SHAs); skipping auto-changeset generation.",
    );
    return;
  }

  if (!isAncestor(beforeSha, afterSha)) {
    warn(
      "Push range is not a fast-forward (force-push); skipping auto-changeset generation.",
    );
    return;
  }

  const commitShas = runGit(["log", "--format=%H", `${beforeSha}..${afterSha}`])
    .split("\n")
    .filter(Boolean);
  if (commitShas.length === 0) {
    return;
  }

  const packageDirToName = loadPackageDirToName();
  const currentMajorVersion = readCurrentMajorVersion(packageDirToName);
  const { prNumbers, unassociatedShas } =
    partitionCommitsByPullRequest(commitShas);

  const descriptions: string[] = [];

  for (const prNumber of prNumbers) {
    if (processPullRequest(prNumber, packageDirToName, currentMajorVersion)) {
      descriptions.push(`#${prNumber}`);
    }
  }
  for (const sha of unassociatedShas) {
    if (
      processUnassociatedCommit(sha, packageDirToName, currentMajorVersion)
    ) {
      descriptions.push(sha.slice(0, 7));
    }
  }

  if (descriptions.length === 0) {
    return;
  }

  runGit(["add", ".changeset"]);
  runGit([
    "commit",
    "-m",
    `chore: add changesets for ${descriptions.join(", ")} [skip deploy]`,
  ]);
  runGit(["push", "origin", "HEAD:develop"]);
}

try {
  main();
} catch (error) {
  warn(`Auto-changeset generation failed: ${(error as Error).message}`);
}
```

- [ ] **Step 2: Type-check it**

Run: `pnpm type-check`
Expected: No errors reported for `scripts/ci/ensure-changesets/**`.

- [ ] **Step 3: Commit**

```bash
git add scripts/ci/ensure-changesets/ensureChangesets.ts
git commit -m "feat(changesets-ci): add ensureChangesets orchestration script"
```

---

### Task 7: Wire the step into `release-packages.yaml`

**Files:**
- Modify: `.github/workflows/release-packages.yaml:57-58`
- Depends on: Task 6

- [ ] **Step 1: Insert the new steps**

Find this in `.github/workflows/release-packages.yaml`:

```yaml
      - run: pnpm install --frozen-lockfile

      # Gate: never publish something that does not type-check, test, build,
      # and validate as a real tarball.
```

Replace it with:

```yaml
      - run: pnpm install --frozen-lockfile

      - name: Configure git identity for automated changeset commits
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      # Generates a changeset for every merged PR in this push that touches
      # packages/** and has not already added its own, so `pnpm changeset`
      # never has to be run by hand. See AGENTS.md for the PR-title format
      # this reads to infer the version bump.
      - name: Auto-generate changesets for merged PRs
        if: github.event_name == 'push'
        run: pnpm vite-script scripts/ci/ensure-changesets/ensureChangesets.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          BEFORE_SHA: ${{ github.event.before }}
          AFTER_SHA: ${{ github.event.after }}

      # Gate: never publish something that does not type-check, test, build,
      # and validate as a real tarball.
```

- [ ] **Step 2: Verify the YAML still parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-packages.yaml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release-packages.yaml
git commit -m "feat(changesets-ci): auto-generate changesets on push to develop"
```

---

### Task 8: Add `lint-pr-title` to `pr-develop.yaml`

**Files:**
- Modify: `.github/workflows/pr-develop.yaml:15-17`

- [ ] **Step 1: Insert the new job**

Find this in `.github/workflows/pr-develop.yaml`:

```yaml
jobs:
  # ESLint and TypeScript checks.
  lint-typecheck:
```

Replace it with:

```yaml
jobs:
  # Validates that the PR title follows this repo's Conventional Commit
  # format (see AGENTS.md). release-packages.yaml's auto-changeset step
  # reads the title to infer the npm version bump for packages/** changes,
  # so a malformed title must never reach develop.
  lint-pr-title:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      pull-requests: read
    steps:
      - uses: amannn/action-semantic-pull-request@v6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            refactor
            chore
            docs
            test
          requireScope: false

  # ESLint and TypeScript checks.
  lint-typecheck:
```

- [ ] **Step 2: Add the `edited` trigger so a title-only edit re-validates**

Find this in `.github/workflows/pr-develop.yaml`:

```yaml
on:
  pull_request:
    branches:
      - develop
```

Replace it with:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, edited]
    branches:
      - develop
```

- [ ] **Step 3: Verify the YAML still parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-develop.yaml'))" && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pr-develop.yaml
git commit -m "feat(changesets-ci): enforce Conventional Commit PR titles"
```

---

### Task 9: Document the PR title rule in `AGENTS.md`

**Files:**
- Modify: `AGENTS.md:13-15`

- [ ] **Step 1: Insert the new section**

Find this in `AGENTS.md`:

```markdown
- If Context7 MCP is configured, use it to reference the most up-to-date
  documentation of any library when you need it.

## Scope
```

Replace it with:

```markdown
- If Context7 MCP is configured, use it to reference the most up-to-date
  documentation of any library when you need it.

## Commit and PR titles

- PR titles (and commit messages, where a PR is not squash-merged) must
  follow Conventional Commits, using the same six prefixes already used for
  branch names: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Format: `type(optional-scope)!: subject`. Use `!` after the type, or a
  `BREAKING CHANGE:` footer in the PR body, for a breaking change.
  - `feat`: a new capability (bumps the minor version).
  - `fix`, `refactor`, `chore`, `docs`, `test`: everything else (bumps the
    patch version).
  - `!` or a `BREAKING CHANGE:` footer: a breaking change. This bumps the
    major version once an `@avandar/*` package reaches `1.0.0`; before that
    it bumps the minor version instead, since nothing should cross `0.x` to
    `1.0.0` without a human deciding that on purpose.
- This is enforced in CI by `lint-pr-title` in `pr-develop.yaml`. It's also
  what `release-packages.yaml`'s auto-changeset step reads to infer the
  semver bump for a `packages/**` change, so a developer never has to run
  `pnpm changeset` by hand.

## Scope
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document required PR title format for changeset bump inference"
```

---

### Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the new test suite**

Run: `pnpm exec vitest run scripts/ci/ensure-changesets`
Expected: PASS, 5 test files, 32 tests total (6 + 8 + 12 + 4 + 2).

- [ ] **Step 2: Type-check the whole repo**

Run: `pnpm type-check`
Expected: No errors.

- [ ] **Step 3: Lint the whole repo**

Run: `pnpm lint`
Expected: No new errors introduced by `scripts/ci/ensure-changesets/**`, `.github/workflows/*.yaml`, or `AGENTS.md`.

- [ ] **Step 4: Re-check both modified workflow files parse**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-packages.yaml')); yaml.safe_load(open('.github/workflows/pr-develop.yaml'))" && echo OK
```
Expected: `OK`

No new commit is expected from this task; it only confirms the branch built up across Tasks 1-9 is healthy. If any step fails, fix the issue in the relevant task's files and commit the fix before moving on.

---

## Out of scope (do not implement here)

- Running `ensureChangesets.ts` for real: the first real exercise of this script is the first push to `develop` after this branch merges, which this plan does not do.
- Any change to `.changeset/config.json`, `apps/ava-cli`'s release flow, or the root `package.json` version, per the spec's non-goals.
