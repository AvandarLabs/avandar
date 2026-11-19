# Alpha Line Stage 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build everything the alpha line needs before cutover: a two-line `ava release`, the `alpha-dev` and `alpha` CI/CD workflows, the mainline lock-out from production, and the catalog export scripts, without touching production.

**Architecture:** `ava release` gains a `ReleaseLine` value (mainline or alpha) resolved from the current branch, and every hard-coded `develop`/`main`/`-dev`/`staging.yaml` reference reads from it instead. CI/CD gets two new workflows: `alpha-dev.yaml` (the alpha line's staging, replacing `demo.yaml`: gates, then a persistent Supabase branch and an explicit Vercel deploy to alpha.avandarlabs.com) and `alpha.yaml` (production: the same gates, then production migrate and deploy, reached only through `ava release` on `alpha-dev`). Spec: `docs/measles-demo/alpha-launch-plan.md`.

**Tech Stack:** TypeScript, Vitest, Acclimate CLI, GitHub Actions, Supabase CLI 2.114.0, Vercel CLI 64.7.0, bash.

---

## Ground rules for every task

- **Never write to the production Supabase project** (`bwxxhmtynhrysbxxxutu`). No task in this plan needs to. Read-only queries are allowed.
- **Never run** `pnpm db:reset`, `pnpm db:seed`, `supabase start/stop`, or `supabase db diff` in this work. None of it changes the stack.
- **Never push.** Commit locally in the worktree. Pablo pushes.
- Branches: Tasks 1-8 and 10-11 go on `feat/alpha-line`, created with `wt new feat/alpha-line demo/measles` (load the `using-wt` skill first). Task 9 goes on `chore/mainline-lockout`, created with `wt new chore/mainline-lockout develop`.
- Follow `CLAUDE.md` and `docs/rules/`. No em dashes in comments or docs. Docstrings on every export.
- Run ava-cli tests with: `pnpm --filter ava-cli test -- <path>` from the repo root. If the filter name differs, check `apps/ava-cli/package.json` `name` and use it.

## File map

| File | Change | Responsibility |
|---|---|---|
| `apps/ava-cli/src/ReleaseCli/releaseLine/releaseLine.ts` | Create | The two release lines and branch-to-line lookup |
| `apps/ava-cli/src/ReleaseCli/releaseLine/releaseLine.test.ts` | Create | Tests for it |
| `apps/ava-cli/src/ReleaseCli/releaseVersionUtils/releaseVersionUtils.ts` | Modify | Suffixes come from the line |
| `apps/ava-cli/src/ReleaseCli/runPreflight/runPreflight.ts` | Modify | Accept `alpha-dev` or `develop`; return the line |
| `apps/ava-cli/src/ReleaseCli/checkDevelopCi.ts` | Rename to `checkSourceBranchCi.ts` | Workflow comes from the line |
| `apps/ava-cli/src/ReleaseCli/runRelease/*.ts`, `releaseStageHelpers/*.ts` | Modify | Branch names, suffixes, warnings, links from the line; banner |
| `apps/ava-cli/src/ReleaseCli/ReleaseCli.ts` | Modify | Usage text covers both lines |
| `scripts/alpha-dev/ensureSupabaseBranch.sh` | Move from `scripts/demo/` | Persistent `alpha-dev` Supabase branch |
| `.github/workflows/alpha-dev.yaml` | Create (replaces `demo.yaml`) | Gates, then deploy to `alpha.avandarlabs.com` |
| `.github/workflows/alpha.yaml` | Create | Gates, then deploy production |
| `.github/workflows/production.yaml` | Modify (on `chore/mainline-lockout`) | `main` deploys to the `mainline` Vercel env, never production |
| `vercel.json` | Modify (both branches) | Git-integration deploys off for `main`, `alpha`, `alpha-dev` |
| `package.json` | Modify | `0.15.0-alpha-dev` |
| `scripts/alpha/exportCatalogData.sh`, `scripts/alpha/copyCatalogParquet.ts` | Create | Catalog data and Parquet copy |
| `docs/measles-demo/alpha-cutover-runbook.md` | Create | Pablo's cutover runbook |

---

### Task 1: The `ReleaseLine` module

**Files:**
- Create: `apps/ava-cli/src/ReleaseCli/releaseLine/releaseLine.ts`
- Test: `apps/ava-cli/src/ReleaseCli/releaseLine/releaseLine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  ALPHA_RELEASE_LINE,
  MAINLINE_RELEASE_LINE,
  releaseLineFromBranch,
} from "@ava-cli/ReleaseCli/releaseLine/releaseLine";
import { describe, expect, it } from "vitest";

describe("releaseLineFromBranch", () => {
  it("releases mainline from develop", () => {
    expect(releaseLineFromBranch("develop")).toBe(MAINLINE_RELEASE_LINE);
  });

  it("releases alpha from alpha-dev", () => {
    expect(releaseLineFromBranch("alpha-dev")).toBe(ALPHA_RELEASE_LINE);
  });

  it.each(["main", "alpha", "demo/measles", "feat/x", undefined])(
    "refuses %s",
    (branch) => {
      expect(releaseLineFromBranch(branch)).toBeUndefined();
    },
  );
});

describe("release lines", () => {
  it("mainline cuts main from develop with no release suffix", () => {
    expect(MAINLINE_RELEASE_LINE).toMatchObject({
      kind: "mainline",
      sourceBranch: "develop",
      targetBranch: "main",
      releaseSuffix: "",
      devSuffix: "-dev",
      sourceCiWorkflow: "staging.yaml",
      targetDeployWorkflow: "production.yaml",
    });
  });

  it("alpha cuts alpha from alpha-dev with the -alpha suffix", () => {
    expect(ALPHA_RELEASE_LINE).toMatchObject({
      kind: "alpha",
      sourceBranch: "alpha-dev",
      targetBranch: "alpha",
      releaseSuffix: "-alpha",
      devSuffix: "-alpha-dev",
      sourceCiWorkflow: "alpha-dev.yaml",
      targetDeployWorkflow: "alpha.yaml",
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/releaseLine/releaseLine.test.ts`
Expected: FAIL, cannot resolve `@ava-cli/ReleaseCli/releaseLine/releaseLine`.

- [ ] **Step 3: Implement**

```ts
/**
 * The two lines `ava release` can cut. Mainline is the reviewed line
 * (`develop` to `main`). Alpha is the temporary production line
 * (`alpha-dev` to `alpha`). Each line names its branches, its version
 * suffixes, and the workflows that gate and deploy it.
 */
export type ReleaseLine = Readonly<{
  kind: "mainline" | "alpha";
  /** The branch a release is cut from and which `ava release` runs on. */
  sourceBranch: string;
  /** The branch a release publishes to. Pushing it deploys. */
  targetBranch: string;
  /** Appended to a released version, e.g. `0.15.0` becomes `0.15.0-alpha`. */
  releaseSuffix: string;
  /** Carried by the source branch between releases, e.g. `-dev`. */
  devSuffix: string;
  /** The workflow whose verdict on the source branch gates a release. */
  sourceCiWorkflow: string;
  /** The workflow pushing the target branch runs. */
  targetDeployWorkflow: string;
  /** The opening banner's title, e.g. `MAINLINE release`. */
  bannerTitle: string;
  /** The Acclimate color token for the banner title. */
  bannerColor: "bright_cyan" | "bright_yellow";
  /** What pushing the target branch does, warned about before confirming. */
  deployWarning: string;
}>;

/** `develop` to `main`. */
export const MAINLINE_RELEASE_LINE: ReleaseLine = {
  kind: "mainline",
  sourceBranch: "develop",
  targetBranch: "main",
  releaseSuffix: "",
  devSuffix: "-dev",
  sourceCiWorkflow: "staging.yaml",
  targetDeployWorkflow: "production.yaml",
  bannerTitle: "MAINLINE release",
  bannerColor: "bright_cyan",
  deployWarning:
    "Pushing main deploys the mainline test URL. It does not touch production.",
};

/** `alpha-dev` to `alpha`, which serves app.avandarlabs.com. */
export const ALPHA_RELEASE_LINE: ReleaseLine = {
  kind: "alpha",
  sourceBranch: "alpha-dev",
  targetBranch: "alpha",
  releaseSuffix: "-alpha",
  devSuffix: "-alpha-dev",
  sourceCiWorkflow: "alpha-dev.yaml",
  targetDeployWorkflow: "alpha.yaml",
  bannerTitle: "ALPHA release",
  bannerColor: "bright_yellow",
  deployWarning:
    "Pushing alpha deploys PRODUCTION (app.avandarlabs.com) and migrates the production database.",
};

const RELEASE_LINES: readonly ReleaseLine[] = [
  MAINLINE_RELEASE_LINE,
  ALPHA_RELEASE_LINE,
];

/**
 * The line released from `branch`, or `undefined` when releases may not be
 * cut from it. Only source branches qualify: a target branch (`main`,
 * `alpha`) is never released from.
 */
export function releaseLineFromBranch(
  branch: string | undefined,
): ReleaseLine | undefined {
  return RELEASE_LINES.find((line) => {
    return line.sourceBranch === branch;
  });
}

/** The branches `ava release` may run on, for error messages. */
export const RELEASE_SOURCE_BRANCHES: readonly string[] = RELEASE_LINES.map(
  (line) => {
    return line.sourceBranch;
  },
);
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/releaseLine/releaseLine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseLine
git commit -m "feat(ava-cli): add mainline and alpha release lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Version utilities read suffixes from the line

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/releaseVersionUtils/releaseVersionUtils.ts`
- Test: `apps/ava-cli/src/ReleaseCli/releaseVersionUtils/releaseVersionUtils.test.ts`
- Modify callers: `apps/ava-cli/src/ReleaseCli/ReleaseNotesCli/ReleaseNotesCli.ts`

- [ ] **Step 1: Replace the `toDevVersion and toReleaseTag` describe block, and add alpha cases**

```ts
describe("toDevVersion, toPublishedVersion, and toReleaseTag", () => {
  it("uses no release suffix and -dev on mainline", () => {
    expect(toDevVersion("0.10.3", MAINLINE_RELEASE_LINE)).toBe("0.10.3-dev");
    expect(toPublishedVersion("0.10.2", MAINLINE_RELEASE_LINE)).toBe("0.10.2");
    expect(toReleaseTag("0.10.2", MAINLINE_RELEASE_LINE)).toBe("v0.10.2");
  });

  it("uses -alpha and -alpha-dev on alpha", () => {
    expect(toDevVersion("0.15.1", ALPHA_RELEASE_LINE)).toBe("0.15.1-alpha-dev");
    expect(toPublishedVersion("0.15.0", ALPHA_RELEASE_LINE)).toBe(
      "0.15.0-alpha",
    );
    expect(toReleaseTag("0.15.0", ALPHA_RELEASE_LINE)).toBe("v0.15.0-alpha");
  });
});

describe("validateReleaseVersion on alpha", () => {
  it("refuses a typed -alpha suffix, since it is appended automatically", () => {
    const result = validateReleaseVersion("0.15.0-alpha", "Version");
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain(
      "added automatically",
    );
  });
});

describe("toReleaseVersion on alpha-dev", () => {
  it("strips -alpha-dev", () => {
    expect(toReleaseVersion("0.15.1-alpha-dev")).toBe("0.15.1");
  });
});
```

Add the imports `ALPHA_RELEASE_LINE`, `MAINLINE_RELEASE_LINE` from `@ava-cli/ReleaseCli/releaseLine/releaseLine` and `toPublishedVersion` from the utils module.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/releaseVersionUtils`
Expected: FAIL: `toPublishedVersion` is not exported; `toDevVersion` ignores its second argument; `0.15.0-alpha` gets the "X.Y.Z" message.

- [ ] **Step 3: Implement**

In `releaseVersionUtils.ts`:

1. Delete `DEV_SUFFIX`.
2. Add after the `v` check in `validateReleaseVersion`:

```ts
  if (trimmed.endsWith("dev") || trimmed.endsWith("alpha")) {
    return {
      valid: false,
      message: `${label} must not end with "dev" or "alpha" (it is added automatically): ${trimmed}`,
    };
  }
```

and remove the old `endsWith("dev")` block. Update the docstring to say the suffix is added from the release line.

3. Replace `toDevVersion` and `toReleaseTag` with:

```ts
/** The version the source branch moves to, e.g. `0.10.3-dev` or `0.15.1-alpha-dev`. */
export function toDevVersion(version: string, line: ReleaseLine): string {
  return `${version}${line.devSuffix}`;
}

/** The version written to package.json on release, e.g. `0.15.0-alpha`. */
export function toPublishedVersion(version: string, line: ReleaseLine): string {
  return `${version}${line.releaseSuffix}`;
}

/** The git tag for a release, e.g. `v0.10.2` or `v0.15.0-alpha`. */
export function toReleaseTag(version: string, line: ReleaseLine): string {
  return `v${toPublishedVersion(version, line)}`;
}
```

with `import type { ReleaseLine } from "@ava-cli/ReleaseCli/releaseLine/releaseLine";`.

4. `ReleaseNotesCli.ts`: `ava release notes --version X` must accept an alpha release. Add an optional `--alpha` boolean option (description: "The version is an alpha release, tagged vX.Y.Z-alpha."), and call `toReleaseTag(version, args.alpha ? ALPHA_RELEASE_LINE : MAINLINE_RELEASE_LINE)`. Add a test in `ReleaseNotesCli.test.ts` following its existing pattern that `--version 0.15.0 --alpha` targets tag `v0.15.0-alpha`.

- [ ] **Step 4: Run and confirm pass**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/releaseVersionUtils src/ReleaseCli/ReleaseNotesCli`
Expected: PASS. Type errors in other ReleaseCli files are expected until Task 4.

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/releaseVersionUtils apps/ava-cli/src/ReleaseCli/ReleaseNotesCli
git commit -m "feat(ava-cli): derive release version suffixes from the release line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Preflight accepts `alpha-dev` or `develop` and returns the line

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/runPreflight/runPreflight.ts`
- Test: `apps/ava-cli/src/ReleaseCli/runPreflight/runPreflight.test.ts`

- [ ] **Step 1: Write the failing tests** (in the existing `describe`, using its `FakeRepoState` helpers)

```ts
  it("resolves the alpha line on alpha-dev", () => {
    const result = runPreflight(
      _createFakeGit({
        branch: "alpha-dev",
        // the fake resolves origin/<source> and origin/<target> by name
      }),
    );
    expect(result.ok && result.line).toBe(ALPHA_RELEASE_LINE);
  });

  it.each(["main", "alpha", "feat/x"])("refuses %s, naming the allowed branches", (branch) => {
    const result = runPreflight(_createFakeGit({ branch }));
    expect(result).toMatchObject({ ok: false, reason: "wrong-branch" });
    expect(!result.ok && result.message).toContain('"alpha-dev" or "develop"');
  });
```

Generalize the fake first: rename `FakeRepoState` fields `originDevelop` to `originSource`, `originMain` to `originTarget`, `localDevelop` to `localSource`, `localMainExists` to `localTargetExists`, and make `rev-parse` match `origin/${state.branch}` for the source and `origin/${targetOf(state.branch)}` for the target, where `targetOf` maps `develop` to `main` and `alpha-dev` to `alpha`. Update every existing test to the new names. Replace imports of `RELEASE_SOURCE_BRANCH` / `RELEASE_TARGET_BRANCH` with `MAINLINE_RELEASE_LINE.sourceBranch` / `.targetBranch`.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/runPreflight`
Expected: FAIL: `result.line` is undefined and `alpha-dev` is refused.

- [ ] **Step 3: Implement**

In `runPreflight.ts`:

1. Delete `RELEASE_SOURCE_BRANCH` and `RELEASE_TARGET_BRANCH`.
2. Change the ok variant of `PreflightResult` to:

```ts
  | {
      ok: true;
      /** The line being released, from the checked-out branch. */
      line: ReleaseLine;
      /** Tip of origin/<source>: the commit the release is built from. */
      originSourceSha: string;
      /** Tip of origin/<target>: the first parent of the release commit. */
      originTargetSha: string;
      /** Local <target>, when it exists, so it can be fast-forwarded later. */
      localTargetSha: string | undefined;
    }
```

3. Replace `_refuseWrongBranch` so it returns the line or a refusal:

```ts
/** The line released from the checked-out branch, or the refusal. */
function _resolveLine(
  git: ReleaseCommands,
): { line: ReleaseLine } | PreflightRefusal {
  const currentBranch = getCurrentBranch(git);
  const line = releaseLineFromBranch(currentBranch);
  return line !== undefined
    ? { line }
    : {
        reason: "wrong-branch",
        message: `Releases are cut from "alpha-dev" or "develop" (currently on "${currentBranch ?? "a detached HEAD"}"). Run it on alpha-dev to release alpha, or on develop to release mainline.`,
      };
}
```

4. `runPreflight` resolves the line first, returns `{ ok: false, ...refusal }` when it is a refusal, then runs the other refusals, then `_resolveReleaseRefs(git, line)`.
5. Pass `line` into `_refuseWithoutPushPermission`, `_resolveReleaseRefs`, and `_refuseOutOfSyncSourceBranch`, replacing every `RELEASE_SOURCE_BRANCH` with `line.sourceBranch` and `RELEASE_TARGET_BRANCH` with `line.targetBranch`. Rename locals `originDevelopSha`, `originMainSha`, `localDevelopSha`, `localMainSha` to `originSourceSha`, `originTargetSha`, `localSourceSha`, `localTargetSha`.
6. When `origin/<target>` is missing, the message must say: `origin/${line.targetBranch} does not exist. For the first alpha release, create it at main's commit first: git push origin origin/main:refs/heads/alpha`.

- [ ] **Step 4: Run and confirm pass**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/runPreflight`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/runPreflight
git commit -m "feat(ava-cli): let ava release run on alpha-dev or develop only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Thread the line through the release stages, and add the banner

**Files:**
- Rename: `apps/ava-cli/src/ReleaseCli/checkDevelopCi.ts` to `checkSourceBranchCi.ts` (export `checkSourceBranchCi`)
- Modify: `runRelease/runRelease.ts`, `runRelease/resolveVersionHelpers.ts`, `runRelease/releaseOutputHelpers.ts`, `runRelease/releaseStageHelpers/releaseStageHelpers.ts`, `runRelease/releaseStageHelpers/releaseConfirmationStages.ts`
- Test: `runRelease/releaseStageHelpers/releaseStageHelpers.test.ts`, `ReleaseCli.test.ts`, a new `runRelease/releaseOutputHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

`releaseOutputHelpers.test.ts`:

```ts
import { ALPHA_RELEASE_LINE, MAINLINE_RELEASE_LINE } from "@ava-cli/ReleaseCli/releaseLine/releaseLine";
import { buildReleaseBanner } from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers";
import { describe, expect, it } from "vitest";

describe("buildReleaseBanner", () => {
  it("announces an alpha release to production in yellow", () => {
    expect(buildReleaseBanner(ALPHA_RELEASE_LINE)).toBe(
      "|bright_yellow|ALPHA release|reset|: alpha-dev to alpha. Deploys PRODUCTION (app.avandarlabs.com).",
    );
  });

  it("announces a mainline release in cyan", () => {
    expect(buildReleaseBanner(MAINLINE_RELEASE_LINE)).toBe(
      "|bright_cyan|MAINLINE release|reset|: develop to main. Deploys the mainline test URL, not production.",
    );
  });
});
```

In `releaseStageHelpers.test.ts`, following its existing fake-git pattern, add: on the alpha line, `commitReleaseVersionOnSource` writes `0.15.0-alpha` to package.json and commits `Release: v0.15.0-alpha [skip deploy]`; `bumpSourceToNextVersion` writes `0.15.1-alpha-dev` and pushes `alpha-dev`; `publishTargetAndTag` pushes `refs/heads/alpha` and tag `v0.15.0-alpha`.

In `ReleaseCli.test.ts`, add: running on branch `main` exits with code 1, prints the `"alpha-dev" or "develop"` refusal, and runs no mutating command.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli`
Expected: FAIL on the new tests (and type errors from Task 2 and 3 signature changes).

- [ ] **Step 3: Implement**

1. `releaseOutputHelpers.ts`: add

```ts
/** What a line's deploy reaches, for the banner. */
const BANNER_DEPLOY_NOTE: Readonly<Record<ReleaseLine["kind"], string>> = {
  alpha: "Deploys PRODUCTION (app.avandarlabs.com).",
  mainline: "Deploys the mainline test URL, not production.",
};

/** The colored first line of `ava release`, naming the line being released. */
export function buildReleaseBanner(line: ReleaseLine): string {
  return `|${line.bannerColor}|${line.bannerTitle}|reset|: ${line.sourceBranch} to ${line.targetBranch}. ${BANNER_DEPLOY_NOTE[line.kind]}`;
}

/** Print the banner. */
export function printReleaseBanner(line: ReleaseLine): void {
  Acclimate.log(buildReleaseBanner(line));
}
```

   `printVersionReference` takes `line` in its options and uses `line.targetBranch`, `line.sourceBranch`, and `toDevVersion(suggestedNext, line)`. Rename its `mainVersion`/`developVersion` options to `targetVersion`/`sourceVersion`.

2. `checkSourceBranchCi.ts`: delete `STAGING_WORKFLOW`; the options become `{ commitSha: string; line: ReleaseLine }` and the `gh` call uses `--branch line.sourceBranch --workflow line.sourceCiWorkflow`. Update the docstrings to say "the source branch's CI".

3. `releaseStageHelpers.ts`:
   - `ReleasePlan` gains `line: ReleaseLine` and renames `developVersion` to `sourceVersion`.
   - Rename `commitReleaseVersionOnDevelop` to `commitReleaseVersionOnSource`, `publishMainAndTag` to `publishTargetAndTag`, `updateLocalMainRef` to `updateLocalTargetRef`, `bumpDevelopToNextVersion` to `bumpSourceToNextVersion`. Rename SHA parameters as in Task 3.
   - Every `RELEASE_SOURCE_BRANCH` becomes `plan.line.sourceBranch`, every `RELEASE_TARGET_BRANCH` becomes `plan.line.targetBranch`, every `toDevVersion(x)` becomes `toDevVersion(x, plan.line)`.
   - In `commitReleaseVersionOnSource`, write `toPublishedVersion(releaseVersion, plan.line)` to package.json, compare `sourceVersion` against that, and use the message `Release: ${plan.releaseTag} [skip deploy]`.
   - The release commit message (line ~303) says `${line.sourceBranch}'s exact content`, not "develop's".

4. `releaseConfirmationStages.ts`: same replacements. `confirmCiVerdict` takes `line` and calls `checkSourceBranchCi`. `confirmReleasePlan` prints `printWarn(plan.line.deployWarning)` instead of the hard-coded production warning, and on the alpha line the confirm prompt reads `Release ${toPublishedVersion(releaseVersion, line)} to PRODUCTION?`. `printReleaseSummary` links `actions/workflows/${plan.line.targetDeployWorkflow}` and labels it `Deploy run:`.

5. `resolveVersionHelpers.ts`: `resolveNextVersion` takes `line` and asks `Which version should ${line.sourceBranch} move to next?`. The release-version prompt on the alpha line reads `What version number do you want for this release? (-alpha is added automatically)`.

6. `runRelease.ts`:
   - Print the banner first, before the dry-run warning and before preflight. The banner needs the line before preflight resolves it, so read the branch with `getCurrentBranch(git)` and `releaseLineFromBranch`; when that returns `undefined`, skip the banner and let preflight refuse.
   - Use `preflight.line` everywhere after preflight. `_resolvePlan` builds `releaseTag: toReleaseTag(releaseVersion, line)` and puts `line` in the plan.
   - Update the `runRelease` docstring: "Release one line: the target branch (`main` or `alpha`) becomes an exact copy of the source branch (`develop` or `alpha-dev`), tagged, and the source branch moves to its next dev version."

- [ ] **Step 4: Run the whole ava-cli suite and type-check**

Run: `pnpm --filter ava-cli test` then `pnpm type-check`
Expected: PASS, no type errors.

- [ ] **Step 5: Dry-run both lines by hand**

```bash
git switch -c alpha-dev-dryrun-check && ava release --dry-run --skip-ci-check --skip-changelog; git switch - && git branch -D alpha-dev-dryrun-check
```

Expected: preflight refuses (`alpha-dev-dryrun-check` is not a source branch). This proves the refusal path end to end without touching origin. Do not dry-run on a real `alpha-dev` or `develop` checkout: preflight fetches and checks push permission, which is fine, but keep this task offline-safe.

- [ ] **Step 6: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli
git commit -m "feat(ava-cli): release alpha from alpha-dev with a colored line banner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Usage text

**Files:**
- Modify: `apps/ava-cli/src/ReleaseCli/ReleaseCli.ts`

- [ ] **Step 1: Replace the first paragraph of `USAGE` and the `.description(...)`**

```ts
const USAGE = `ava release: publish a new release of the Avandar app.

  Run it on alpha-dev to release alpha (production, app.avandarlabs.com), or
  on develop to release mainline (main). Any other branch is refused.

  The target branch becomes an exact copy of the source branch (a straight
  cut, never a merge, so it cannot conflict), tagged vX.Y.Z on mainline or
  vX.Y.Z-alpha on alpha. The source branch then moves on to its next dev
  version (-dev on develop, -alpha-dev on alpha-dev). Type versions as
  X.Y.Z: the suffixes are added for you.
```

Keep the rest of `USAGE` unchanged except `--next` ("X.Y.Z the source branch moves to; gains -dev or -alpha-dev") and `--skip-ci-check` ("Do not check the source branch's CI"). Mirror the same wording in `.description(...)` and the `--next` / `--skip-ci-check` option descriptions.

- [ ] **Step 2: Run the CLI tests**

Run: `pnpm --filter ava-cli test -- src/ReleaseCli/ReleaseCli.test.ts`
Expected: PASS (update any snapshot of the usage text).

- [ ] **Step 3: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli/ReleaseCli.ts apps/ava-cli/src/ReleaseCli/ReleaseCli.test.ts
git commit -m "docs(ava-cli): describe both release lines in ava release help

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Persistent `alpha-dev` Supabase branch script

**Files:**
- Move: `scripts/demo/ensureSupabaseBranch.sh` to `scripts/alpha-dev/ensureSupabaseBranch.sh`

- [ ] **Step 1: Move and edit**

```bash
git mv scripts/demo/ensureSupabaseBranch.sh scripts/alpha-dev/ensureSupabaseBranch.sh
```

Edits:
1. Header: "Makes sure the persistent `alpha-dev` Supabase branch exists on the staging project...". Remove the `demo/*` wording and the non-persistent sentence.
2. Replace the branch guard with:

```bash
if [[ "$GIT_BRANCH" != "alpha-dev" ]]; then
  echo "Refusing to manage a Supabase branch for '$GIT_BRANCH': only alpha-dev is allowed." >&2
  exit 1
fi

SUPABASE_BRANCH="alpha-dev"
```

3. Add `--persistent` to both `supabase branches create` calls. Confirm the flag with `supabase branches create --help` (CLI 2.114.0). If the flag does not exist, use the Management API instead: `curl -X POST https://api.supabase.com/v1/projects/$STAGING_PROJECT_ID/branches` with body `{"branch_name":"alpha-dev","persistent":true,"region":"<region>"}`.
4. Rename every output variable `DEMO_*` to `ALPHA_DEV_*` and the env var `DEMO_ENV_FILE` to `ALPHA_DEV_ENV_FILE`.

- [ ] **Step 2: Lint the script**

Run: `bash -n scripts/alpha-dev/ensureSupabaseBranch.sh && shellcheck scripts/alpha-dev/ensureSupabaseBranch.sh`
Expected: no output (install shellcheck with `brew install shellcheck` if missing).

- [ ] **Step 3: Check the guard**

Run: `STAGING_PROJECT_ID=x SUPABASE_ACCESS_TOKEN=x bash scripts/alpha-dev/ensureSupabaseBranch.sh demo/measles; echo "exit $?"`
Expected: the refusal message and `exit 1`, with no network call.

- [ ] **Step 4: Commit**

```bash
git add scripts/alpha-dev scripts/demo
git commit -m "chore(ci): manage a persistent alpha-dev Supabase branch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `alpha-dev.yaml`

**Files:**
- Create: `.github/workflows/alpha-dev.yaml`
- Delete: `.github/workflows/demo.yaml`

- [ ] **Step 1: Write the workflow**

Build it from two existing files, copying their steps verbatim rather than retyping:

1. Header comment: deploys `alpha-dev` to https://alpha.avandarlabs.com on the persistent `alpha-dev` branch of the staging Supabase project, after lint, type-check, and the quick suite pass.
2. `on: push: branches: [alpha-dev]` and `workflow_dispatch`.
3. `concurrency: { group: alpha-dev-deploy, cancel-in-progress: false }`.
4. `env`: `NODE_VERSION: 24.15.0`, `SUPABASE_CLI_VERSION: 2.114.0`, `VERCEL_CLI_VERSION: 64.7.0`, `ALPHA_DEV_APP_URL: https://alpha.avandarlabs.com`, `VERCEL_ENVIRONMENT: alpha-dev`.
5. Jobs `lint-typecheck`, `test-quick`, `test-e2e`: copy them from `.github/workflows/staging.yaml` unchanged, including `environment: staging` on the test jobs. Change only the artifact names' `staging` prefix to `alpha-dev`.
6. Job `deploy`: `needs: test-quick`. Copy the whole `deploy` job from `demo.yaml` and change:
   - `DEMO_ENV_FILE` to `ALPHA_DEV_ENV_FILE`, the script path to `scripts/alpha-dev/ensureSupabaseBranch.sh`, every `DEMO_*` to `ALPHA_DEV_*`, `DEMO_APP_URL` to `ALPHA_DEV_APP_URL`.
   - `secrets_file` to `$RUNNER_TEMP/alpha-dev-functions.env`.

- [ ] **Step 2: Delete `demo.yaml`**

```bash
git rm .github/workflows/demo.yaml
```

- [ ] **Step 3: Lint**

Run: `npx --yes actionlint@1.7.7 .github/workflows/alpha-dev.yaml`
Expected: no findings. If `actionlint` cannot be fetched, run `python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/alpha-dev.yaml` and say in the report that only YAML syntax was checked.

- [ ] **Step 4: Check that no `demo` reference is left**

Run: `grep -nE "DEMO_|demo\.avandarlabs|scripts/demo" .github/workflows/alpha-dev.yaml`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows
git commit -m "chore(ci): gate and deploy alpha-dev to alpha.avandarlabs.com

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `alpha.yaml`

**Files:**
- Create: `.github/workflows/alpha.yaml`

- [ ] **Step 1: Write the workflow**

1. Header comment: deploys `alpha` to production (app.avandarlabs.com and the production Supabase project) after the same gates as `production.yaml`. `alpha` changes only through `ava release` run on `alpha-dev`. Only this workflow may use the `production` GitHub environment.
2. `on: push: branches: [alpha]` and `workflow_dispatch`.
3. `concurrency: { group: production-deploy, cancel-in-progress: false }`.
4. `env`: `NODE_VERSION: 24.15.0`, `SUPABASE_CLI_VERSION: 2.114.0`, `VERCEL_CLI_VERSION: 64.7.0`, `PRODUCTION_APP_URL: https://app.avandarlabs.com`.
5. Jobs `lint-typecheck`, `test-quick`, `test-e2e`: copy from `.github/workflows/production.yaml` unchanged. Artifact name prefixes become `alpha`.
6. Job `deploy`, `needs: test-quick`, `environment: production`, `timeout-minutes: 45`:

```yaml
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v5
      - run: corepack enable
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          package-manager-cache: true
      - uses: supabase/setup-cli@v1
        with:
          version: ${{ env.SUPABASE_CLI_VERSION }}

      - name: Apply migrations
        run: |
          supabase link --project-ref "$SUPABASE_PROJECT_ID"
          supabase db push --include-all
```

   Then copy, from the `deploy` job of `alpha-dev.yaml` (Task 7 deleted `demo.yaml`, so copy from its replacement), the steps "Set edge function secrets", "Deploy edge functions", "Pull the Vercel ... environment", and "Build and deploy to Vercel", with these changes:
   - Secrets file values: `SB_SECRET_KEY=${{ secrets.PRODUCTION_SB_SECRET_KEY }}`, `SB_PUBLISHABLE_KEY=${{ vars.PRODUCTION_SB_PUBLISHABLE_KEY }}`, `MODE=production`, `VITE_APP_URL=$PRODUCTION_APP_URL`, `GOOGLE_REDIRECT_URI=${{ vars.PRODUCTION_SUPABASE_URL }}/functions/v1/google-auth-callback`, `POLAR_SERVER_TYPE=production`. Every other secret reads from the `production` environment under the same name as in `alpha-dev.yaml`. No `ALPHA_DEV_*` value may remain.
   - `--project-ref "$SUPABASE_PROJECT_ID"` in place of `$ALPHA_DEV_SUPABASE_REF`.
   - No "Point Supabase Auth" step: production's auth URL is already app.avandarlabs.com.
   - Vercel pull uses `--environment=production`. Instead of failing on `VITE_SUPABASE_API_URL|VITE_SUPABASE_ANON_KEY|VITE_APP_URL`, delete those lines from the pulled file with `sed -i -E '/^(VITE_SUPABASE_API_URL|VITE_SUPABASE_ANON_KEY|VITE_APP_URL)=/d'`, since the build sets them from GitHub.
   - Build env: `VITE_SUPABASE_API_URL: ${{ vars.PRODUCTION_SUPABASE_URL }}`, `VITE_SUPABASE_ANON_KEY: ${{ vars.PRODUCTION_SB_PUBLISHABLE_KEY }}`, `VITE_APP_URL: ${{ env.PRODUCTION_APP_URL }}`, plus the Google Picker values.
   - `vercel build --prod` and `vercel deploy --prebuilt --prod`, both with `--token="$VERCEL_TOKEN"`.

- [ ] **Step 2: Lint**

Run: `npx --yes actionlint@1.7.7 .github/workflows/alpha.yaml`
Expected: no findings.

- [ ] **Step 3: Check that no staging or demo value reaches the deploy job**

Run: `awk '/^  deploy:/,0' .github/workflows/alpha.yaml | grep -nE "STAGING|staging|DEMO|ALPHA_DEV|sandbox"`
Expected: no output.

- [ ] **Step 4: List every secret and variable the workflow reads**

Run: `grep -oE "(secrets|vars)\.[A-Z0-9_]+" .github/workflows/alpha.yaml | sort -u`
Paste the output into the commit body. The runbook (Task 12) needs it.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/alpha.yaml
git commit -m "chore(ci): gate and deploy alpha to production

<paste the secrets list>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Lock mainline out of production (branch `chore/mainline-lockout` off `develop`)

**Files:**
- Modify: `.github/workflows/production.yaml`
- Modify: `vercel.json`

- [ ] **Step 1: Replace the `migrate` job in `production.yaml`**

Delete the whole `migrate` job (lines 157-176 today). Add:

```yaml
  # main no longer serves production: alpha does (see alpha.yaml). main
  # deploys to the `mainline` Vercel environment, a test URL backed by the
  # staging Supabase project, which develop's CI has already migrated.
  deploy-mainline:
    runs-on: ubuntu-latest
    needs: test-quick
    environment:
      name: staging
      deployment: false
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      VERCEL_CLI_VERSION: 64.7.0
    steps:
      - uses: actions/checkout@v5
      - run: corepack enable
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          package-manager-cache: true
      - run: |
          npx --yes "vercel@$VERCEL_CLI_VERSION" pull --yes \
            --environment=mainline --token="$VERCEL_TOKEN"
          npx --yes "vercel@$VERCEL_CLI_VERSION" build \
            --environment=mainline --token="$VERCEL_TOKEN"
          npx --yes "vercel@$VERCEL_CLI_VERSION" deploy --prebuilt \
            --environment=mainline --token="$VERCEL_TOKEN"
```

Rename the workflow to `name: CI/CD for Mainline Release`. Keep the filename, since `ava release` links to it.

- [ ] **Step 2: Turn off Git-integration deploys in `vercel.json`**

Add a top-level key:

```json
  "git": {
    "deploymentEnabled": {
      "main": false,
      "alpha": false,
      "alpha-dev": false
    }
  },
```

- [ ] **Step 3: Check nothing in `production.yaml` reaches production**

Run: `grep -nE "PRODUCTION_|environment: production|db push|functions deploy" .github/workflows/production.yaml`
Expected: no output.

- [ ] **Step 4: Lint and commit**

```bash
npx --yes actionlint@1.7.7 .github/workflows/production.yaml
git add .github/workflows/production.yaml vercel.json
git commit -m "chore(ci)!: stop main from deploying production

BREAKING CHANGE: main deploys to the mainline Vercel environment. alpha serves production.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Apply the same `vercel.json` change on `feat/alpha-line`**

In the `feat/alpha-line` worktree, make the identical `vercel.json` edit and commit with `chore(vercel): turn off Git-integration deploys for the release branches`. Do not copy the `production.yaml` change there: alpha-dev merges it in from develop later.

---

### Task 10: Version

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Set `"version": "0.15.0-alpha-dev"`.
- [ ] **Step 2:** Run `pnpm vitest run src/lib/analytics/appVersion.test.ts`. Expected: PASS.
- [ ] **Step 3:** Commit with `chore: start the alpha line at 0.15.0-alpha-dev`.

---

### Task 11: Catalog export and Parquet copy scripts

**Files:**
- Create: `scripts/alpha/exportCatalogData.sh`
- Create: `scripts/alpha/importCatalogData.sh`
- Create: `scripts/alpha/copyCatalogParquet.ts`
- Test: `scripts/alpha/copyCatalogParquet.test.ts`

These scripts are run by Pablo. The agent writes and tests them, and runs `exportCatalogData.sh` only against the `demo-measles` Supabase branch (a staging branch), never production.

- [ ] **Step 1: `exportCatalogData.sh`**

```bash
#!/bin/bash
#-------------------------------------------------------------------------------
# Dumps the open data catalog tables, data only, from a source database to a
# file. Used to move the catalog built on demo-measles into alpha-dev and
# production without re-running every pipeline.
#
# Usage:
#   bash scripts/alpha/exportCatalogData.sh <source-db-url> <out-file.sql>
#-------------------------------------------------------------------------------
set -euo pipefail

SOURCE_DB_URL="${1:?Usage: exportCatalogData.sh <source-db-url> <out-file.sql>}"
OUT_FILE="${2:?Usage: exportCatalogData.sh <source-db-url> <out-file.sql>}"

# Parents before children, so the import order satisfies foreign keys.
CATALOG_TABLES=(
  public.data_catalog_drives
  public.data_catalog_listings
  public.data_catalog_listings__relation_columns
  public.data_catalog_facet_counts
  public.pipeline_executions
  public.pipeline_execution_scopes
  public.pipeline_scope_checkpoints
)

table_args=()
for table in "${CATALOG_TABLES[@]}"; do
  table_args+=(--table "$table")
done

pg_dump "$SOURCE_DB_URL" --data-only --no-owner --no-privileges \
  --disable-triggers "${table_args[@]}" --file "$OUT_FILE"
echo "Wrote $OUT_FILE"
```

Before committing, read each table's foreign keys in `supabase/schemas/` (files `10.data_catalog_drives.sql`, `11.data_catalog_listings.sql`, `20.data_catalog_listings__relation_columns.sql`, `10.data_catalog_facet_counts.sql`, `10.pipeline_executions.sql`, `11.pipeline_execution_scopes.sql`, `10.pipeline_scope_checkpoints.sql`). If any references a `workspaces`, `users`, or other user-data table, stop and report it: the import into production would fail or link catalog rows to demo users.

- [ ] **Step 2: `importCatalogData.sh`**

Same header style. Takes `<target-db-url> <dump.sql>`. Refuses to run if any catalog table on the target already has rows (one `psql -tAc "select count(*) from <table>"` per table), then runs `psql "$TARGET_DB_URL" --single-transaction --set ON_ERROR_STOP=1 --file "$DUMP_FILE"`. `--disable-triggers` in the dump needs a superuser-equivalent role: document that the target URL must be the `postgres` connection string.

- [ ] **Step 3: Write the failing test for the Parquet copy's path logic**

```ts
import { listingIdFromCacheFolder } from "./copyCatalogParquet";
import { describe, expect, it } from "vitest";

describe("listingIdFromCacheFolder", () => {
  it("reads the listing id from catalog-cache/<listing>/<build>/part-00000.parquet", () => {
    expect(
      listingIdFromCacheFolder("catalog-cache/abc/build-1/part-00000.parquet"),
    ).toBe("abc");
  });

  it("returns undefined outside catalog-cache", () => {
    expect(listingIdFromCacheFolder("workspaces/x/y.parquet")).toBeUndefined();
  });
});
```

Run: `pnpm vitest run scripts/alpha/copyCatalogParquet.test.ts` (add the folder to the vitest include if the root config does not collect `scripts/`; follow how other `scripts/**/*.test.ts` files are collected). Expected: FAIL.

- [ ] **Step 4: `copyCatalogParquet.ts`**

A Node script run with `pnpm tsx scripts/alpha/copyCatalogParquet.ts`, reading `SOURCE_SUPABASE_URL`, `SOURCE_SECRET_KEY`, `TARGET_SUPABASE_URL`, `TARGET_SECRET_KEY` from the environment (never from arguments, so keys stay out of shell history). It:
1. Lists the source `opendata` bucket under `catalog-cache/` recursively, 1000 per page (reuse the paging pattern of `_removeFolder` in `apps/pipeline-server/src/openDataParquetCache/createSupabaseParquetCopyStore/createSupabaseParquetCopyStore.ts`).
2. Skips objects whose listing id is not in the target's `data_catalog_listings` (so it runs after the import).
3. Downloads each object and uploads it to the same path in the target with `contentType: "application/vnd.apache.parquet"`, `cacheControl: "31536000"`, `upsert: false`. An "already exists" error counts as done, so the script can be re-run after a failure.
4. Prints a final count of copied, skipped, and failed objects, and exits 1 if any failed.
5. Exports `listingIdFromCacheFolder` for the test, and runs `main()` only when executed directly.

Also confirm the target has an `opendata` bucket with a read-only check (`storage.from("opendata").list("", { limit: 1 })`), and exit with a clear message if it does not.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `pnpm vitest run scripts/alpha/copyCatalogParquet.test.ts`
Expected: PASS.

- [ ] **Step 6: Dry-run the export against `demo-measles` only**

Get the `demo-measles` branch DB URL with `supabase branches get demo-measles --project-ref frbelerytsmadmmdwgcl -o env` (POSTGRES_URL_NON_POOLING). Run `bash scripts/alpha/exportCatalogData.sh "<url>" .temp/feat-alpha-line/catalog.sql` and report the row count per table (`grep -c` on each `COPY` block is fine). Do not commit the dump.

- [ ] **Step 7: Commit the scripts**

```bash
git add scripts/alpha
git commit -m "chore(alpha): add catalog export, import, and Parquet copy scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Cutover runbook

**Files:**
- Create: `docs/measles-demo/alpha-cutover-runbook.md`

Written after Tasks 1-11 and after the migration audit (`docs/measles-demo/alpha-migration-audit.md`) are done, from what they actually built. Every step Pablo runs gets an exact command or click path, an expected result, and what to do if it differs. No placeholders except secret values, which are named but never written.

- [ ] **Step 1: Write these sections, in order**

1. **Before you start:** the tools to install (`supabase` 2.114.0, `psql`/`pg_dump` 15+, `vercel`, `gh`), and a link to the audit with its blockers, which must all be resolved.
2. **Rehearsal (local):** dump production schema and data with `supabase db dump --linked` (schema and `--data-only` separately, plus `--role-only`), restore into a switched local stack (`ava supabase switch` on a throwaway branch, then `psql`), run `supabase migration up --include-all` against it, then `pnpm dev` and open existing dashboards. Pass criteria: every migration applies, row counts in `auth.users`, `workspaces`, and `dashboards` are unchanged, and 5 named old dashboards render.
3. **GitHub setup:** the `production` environment's secrets and variables (the exact list from Task 8 Step 4), its deployment branch rule set to `alpha` only, branch protection on `alpha` (no direct pushes except the release, no PR merges), and the `alpha-dev` branch rename (Settings > Branches > rename `demo/measles`).
4. **Vercel setup (Pablo only, click paths):** create custom environments `alpha-dev` and `mainline` (Project `avandar` > Settings > Environments > Create Environment), add domain `alpha.avandarlabs.com` to `alpha-dev` (Settings > Domains > Add, then pick the environment), set each environment's variables (copy from `demo` for `alpha-dev`; copy from Preview/staging for `mainline`, including the staging `VITE_SUPABASE_*`), and the DNS record Vercel shows for the new domain.
5. **Supabase setup:** Google OAuth redirect URI for production, production Polar access token, pipeline server pointed at production (see `docs/measles-demo/pipeline-server-fly-runbook.md`).
6. **Cutover:** Stage 1 of `docs/measles-demo/alpha-launch-plan.md`, step by step, including: seeding the `alpha-dev` Supabase branch from the rehearsal's production dump right after its first deploy (roles file, then data file, with `psql --single-transaction --set ON_ERROR_STOP=1` against the branch's `POSTGRES_URL_NON_POOLING` from `supabase branches get alpha-dev --project-ref frbelerytsmadmmdwgcl -o env`; the branch already has the schema, so skip the schema file), with a pass check that `auth.users`, `workspaces`, and `dashboards` row counts match production; production backup (`supabase db dump --linked -f prod-<date>-schema.sql`, `--data-only -f prod-<date>-data.sql`, `--role-only -f prod-<date>-roles.sql`) and a restore test into a local stack; creating `alpha` at main's commit with `git push origin origin/main:refs/heads/alpha` (safe: that commit has no `alpha.yaml`, so nothing deploys); `ava release` on `alpha-dev`; the catalog import and Parquet copy commands.
7. **Rollback:** restore order (roles, schema, data) into production with `psql`, and redeploying the last `main` build in Vercel (Deployments > the last Production deployment from `main` > Promote to Production).
8. **Cleanup:** remove `demo.avandarlabs.com` and the `demo` environment in Vercel; delete the `demo-measles` Supabase branch.

- [ ] **Step 2: Check it against the plan**

Every Stage 1 step in `alpha-launch-plan.md` maps to a runbook section. Every command names a real script or flag from this branch.

- [ ] **Step 3: Copy to Downloads and render**

```bash
D="/Users/juanpablosarmiento/Library/Mobile Documents/com~apple~CloudDocs/Downloads/avandar_demo-measles/alpha-launch-plan"
cp docs/measles-demo/alpha-cutover-runbook.md "$D/"
markdown-to-pdf "$D/alpha-cutover-runbook.md" --out "$D/alpha-cutover-runbook.pdf" --compact
```

- [ ] **Step 4: Commit**

```bash
git add docs/measles-demo/alpha-cutover-runbook.md
git commit -m "docs(alpha): add the alpha cutover runbook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Review notes for the controller

- **High-risk tasks** (task-level review required): 3, 4, 8, 9, 11. They touch release safety, production deploys, or data movement.
- **Mechanical tasks:** 5, 10.
- **Ordinary:** 1, 2, 6, 7, 12.
- Run `pnpm --filter ava-cli test`, `pnpm lint`, and `pnpm type-check` once after Task 5 and before the final branch review.
- Final branch review covers both `feat/alpha-line` and `chore/mainline-lockout`.
