# Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `demo/measles` ready to be promoted into `develop` and released to `main`: remove the alpha line, merge `develop` without losing the plugin system, repair the migrations, give production a safe deploy, and hand Pablo a runbook.

**Architecture:** All work lands on one integration branch, `chore/production-cutover`. The alpha line is removed first, where `develop` has no competing changes. `develop` is then merged in three steps, so the commit that deleted the plugin system on `develop` is recorded as merged without being applied. A new migration restores `plugin_installations` after `develop`'s drop, and the two migrations that depend on it move after the restore. `production.yaml` takes the deploy job that was written for `alpha.yaml`. Spec: `docs/measles-demo/production-cutover-plan.md`.

**Tech Stack:** git, TypeScript, Vitest, Acclimate CLI, Oxlint, Lingui, Supabase CLI 2.114.0, Postgres 15 and 17, GitHub Actions, Vercel CLI 64.7.0, bash.

**Not in this plan:** the fix for the crosswalk privacy gap. Pablo chose to release with it (D4). It is Linear AVA-611, High priority, and gets its own spec and plan right after the release.

**Answered by Pablo on 2026-11-23:** D1 keep plugins. D2 CI deploys staging and production, and Vercel's Git integration is removed. D3 a PR, then an admin fast-forward. D4 release with the privacy gap.

**Also answered on 2026-11-23:** D5 staging gets the replace import first. D6 demo resources are deleted seven days after the smoke test. D7 all 140 review issues are opened together, only on Pablo's approval, by a new agent from a prompt in the runbook. E1 staging deploys to the existing Vercel environment named `staging`. No decision is open.

---

## Ground rules for every task

- **Never write to the production Supabase project** (`bwxxhmtynhrysbxxxutu`). Read-only queries are allowed in Task 17 only.
- **Never use the Vercel console and never change Vercel state.**
- **Never push, merge into `demo/measles` or `develop`, or open a PR.** Commit locally on `chore/production-cutover`. Pablo pushes.
- **Never run** `pnpm db:reset`, `pnpm db:seed`, `supabase start`, `supabase stop`, `supabase db diff`, or `pnpm db:new-migration` until `ava supabase status` names this branch's own project on its first line. Task 11 creates the switch.
- **Never use a `--linked` database command without `SUPABASE_DB_PASSWORD` set.** CLI 2.114.0 creates a temporary write-capable role when it finds no password.
- **Deployments happen in CI only** (D2). Nothing in this plan relies on Vercel's Git integration, a deploy hook, or a console action.
- **The repository and its Actions logs are public.** No secret, private hostname, connection string, or user detail goes into a file, a GitHub variable, a commit, or a log line. Workflow steps print names and fixed sentences only. Public documents give aggregate counts only.
- Follow `AGENTS.md` and `docs/rules/`. No em dashes in comments or docs. Docstrings on every export.
- Commit messages follow Conventional Commits. End each one with the `Co-Authored-By` trailer of the model that wrote it. Never put session or Slack links in a commit.
- Verify types with `pnpm exec tsc -b --force --noEmit`. A plain build can report clean from a stale cache.
- Format with `pnpm format:oxfmt <files>`.
- Run ava-cli tests with `pnpm --filter @avandar/ava-cli test <path>`, with no `--` before the path.
- Lint workflows with actionlint 1.7.12 or newer (`brew install actionlint`, then `actionlint --version`). Version 1.7.7 rejects valid keys.
- `ava` is one global symlink to whichever worktree last ran `pnpm build:ava-cli`. Only Task 21 rebuilds it.
- Route models and reviews as the `super-wrapper` skill says. Load it before dispatching.

Pinned commits:

| Name | Commit | What it is |
| --- | --- | --- |
| `ALPHA_TIP` | `2e5a62c7e` | `origin/demo/measles` at planning time. The source of `alpha.yaml`. |
| `PRE_REMOVAL` | `9389435f0` | `develop`, one commit before the plugin removal |
| `PLUGIN_REMOVAL` | `d521a7c10` | `develop`'s "remove demo-stage plugins system" |
| `OXLINT_PLUGIN_RULE` | `28a1ac252` | `develop`'s Oxlint port of the plugin import rule |
| `DEVELOP_TIP` | `ccab27208` | `origin/develop` at planning time |

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `.github/workflows/alpha.yaml`, `.github/workflows/alpha-dev.yaml`, `scripts/alpha-dev/ensureSupabaseBranch.sh` | Delete | The alpha line's CI |
| `.github/workflows/production.yaml` | Restore from `develop`, then modify | Gates, then the production deploy job |
| `vercel.json` | Restore from `develop`, then modify | Git-triggered deployments off for every branch |
| `.github/workflows/staging.yaml` | Modify | Gates, then the staging deploy job |
| `.github/workflows/pr-develop.yaml` | Modify | CLI 2.114.0 and the plugin bundle check |
| `apps/ava-cli/src/ReleaseCli/getReleaseLineFromBranch/` | Delete | Replaced by `releaseBranches/` |
| `apps/ava-cli/src/ReleaseCli/releaseBranches/releaseBranches.ts` | Create | The branch, suffix, and workflow constants of the one release path |
| `apps/ava-cli/src/ReleaseCli/**` | Modify | No alpha line. Hardening kept. |
| `package.json` | Modify | `0.15.0-dev` |
| `scripts/alpha/` | Rename to `scripts/catalog-move/` | Catalog export, import, Parquet copy |
| `supabase/migrations/20261117210525_drop_plugin_installations.sql` | Add from `develop`, unchanged | Staging ran it |
| `supabase/migrations/20261123200000_restore_plugin_installations.sql` | Create | Brings the table back after the drop |
| `supabase/migrations/20261123200100_add_plugin_data_slots.sql`, `20261123200200_harden_plugin_data_slot_bindings.sql` | Rename from `20261116192935_*` and `20261116222442_*` | Run after the restore |
| `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql`, `src/i18n/locales/**` | Regenerate | Generated files |
| `.oxlintrc.json`, `eslint/plugin-restrictions.js`, `eslint/plugin-restrictions.test.js` | Modify | The plugin import rule under Oxlint |
| `docs/measles-demo/alpha-migration-audit.md` | Rename to `production-migration-audit.md`, refresh | Audit for production's 79 files and staging's 10 |
| `docs/measles-demo/production-cutover-runbook.md` | Create | Pablo's runbook |
| `docs/reviews/README.md`, `.github/ISSUE_TEMPLATE/retro-review.yml`, `scripts/reviews/buildRetroReviewIssues/`, `docs/measles-demo/promotion-pr-description.md` | Create | Retroactive review scaffolding |

---

## Stage A: undo the alpha line

### Task 1: Integration worktree and baseline

**Risk class:** ordinary.

**Files:** none changed, except two cherry-picked docs commits.

- [ ] **Step 1: Confirm nothing moved**

```bash
git fetch origin
for ref in origin/demo/measles origin/develop origin/main; do
  printf '%s ' "$ref"; git rev-parse --short=9 "$ref"
done
```

Expected: `2e5a62c7e`, `ccab27208`, `8bb5b44f3`.
If `origin/demo/measles` differs: stop and tell Pablo. Another session broke the freeze.
If `origin/develop` differs: continue. Task 10 merges whatever its tip is. Write the new commit in the task report.

- [ ] **Step 2: Create the worktree**

Load the `using-wt` skill first.

```bash
cd "$(wt new chore production-cutover docs/production-cutover)"
git branch --show-current
pnpm install --frozen-lockfile
```

Expected: `chore/production-cutover`.

Every later command runs in that worktree.

- [ ] **Step 3: Carry the two docs commits that exist on one machine only**

```bash
git cat-file -e 17b5ee580 && git cherry-pick 1f02d0fd0 17b5ee580
```

Expected: two commits that change `docs/ai-agent/roadmap.md`.
If `git cat-file` fails, this machine does not have them: skip the step and say so in the report.
If the cherry-pick conflicts, keep the file's current text and add the Phase 1G section from the commit, then `git cherry-pick --continue`.

- [ ] **Step 4: Record the baseline**

```bash
pnpm exec tsc -b --force --noEmit
pnpm --filter @avandar/ava-cli test
```

Expected: no type errors, every test passes. If either fails, stop and report: the failure predates this plan.

---

### Task 2: Remove the alpha workflows and the lock-out

**Risk class:** high-risk. It decides whether `main` deploys production.

**Files:**
- Delete: `.github/workflows/alpha.yaml`, `.github/workflows/alpha-dev.yaml`, `scripts/alpha-dev/ensureSupabaseBranch.sh`
- Restore from `origin/develop`: `.github/workflows/production.yaml`, `vercel.json`

- [ ] **Step 1: Delete the alpha line's CI**

```bash
git rm .github/workflows/alpha.yaml .github/workflows/alpha-dev.yaml \
  scripts/alpha-dev/ensureSupabaseBranch.sh
```

Task 15 reads `alpha.yaml` from `2e5a62c7e`, so nothing is lost.

- [ ] **Step 2: Restore `develop`'s deploy files**

```bash
git checkout origin/develop -- .github/workflows/production.yaml vercel.json
```

- [ ] **Step 3: Verify with a diff**

```bash
git diff --exit-code origin/develop -- .github/workflows/production.yaml vercel.json \
  && echo identical
grep -nE "deploy-mainline|deploymentEnabled" .github/workflows/production.yaml vercel.json
grep -c "^  migrate:" .github/workflows/production.yaml
```

Expected: `identical`, then no output from the first `grep`, then `1`.

- [ ] **Step 4: Check nothing else points at the deleted files**

```bash
git grep -nE "alpha-dev\.yaml|alpha\.yaml|scripts/alpha-dev" -- . \
  ':!docs' ':!apps/ava-cli/src/ReleaseCli'
```

Expected: no output. Task 3 handles `ReleaseCli`, Task 7 handles `docs`.

- [ ] **Step 5: Commit**

```bash
git add -A .github/workflows scripts/alpha-dev vercel.json
git commit -m "chore(ci): remove the alpha workflows and restore develop's production deploy"
```

---

### Task 3: Remove the alpha line from `ava release`

**Risk class:** high-risk. Release safety.

**Files (all under `apps/ava-cli/src/ReleaseCli/`):**
- Modify: `getReleaseLineFromBranch/getReleaseLineFromBranch.ts`, `runPreflight/runPreflight.ts`, `releaseVersionUtils/releaseVersionUtils.ts`, `describeCiStatus/describeCiStatus.ts`, `runRelease/releaseStageHelpers/releaseConfirmationStages.ts`, `runRelease/releaseOutputHelpers/releaseOutputHelpers.ts`, `runRelease/resolveVersionHelpers/resolveVersionHelpers.ts`, `runRelease/runRelease.ts`, `ReleaseNotesCli/ReleaseNotesCli.ts`, `releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits.ts`, `ReleaseCli.ts`
- Test: the `.test.ts` beside each, plus `runRelease/releaseStageHelpers/releaseStageHelpers.test.ts` and `ReleaseCli.test.ts`

After this task `ava release` runs on `develop` only and says it deploys production. The `ReleaseLine` type still exists with one entry. Task 4 folds it away.

- [ ] **Step 1: Write the failing tests**

`getReleaseLineFromBranch.test.ts`: delete every alpha case and add:

```ts
it.each(["alpha-dev", "alpha", "main", "demo/measles", "feat/x", undefined])(
  "refuses %s",
  (branch) => {
    expect(getReleaseLineFromBranch(branch)).toBeUndefined();
  },
);

it("warns that pushing main deploys production", () => {
  expect(MAINLINE_RELEASE_LINE.deployWarning).toBe(
    "Pushing main deploys production and migrates the production database.",
  );
});
```

`runPreflight/runPreflight.test.ts`: delete the five alpha tests ("resolves the alpha release line on alpha-dev", "reads alpha-dev's release refs from origin/alpha-dev, origin/alpha, and local alpha", "reports no local alpha branch on a fresh clone of alpha-dev", "refuses when alpha-dev is out of sync with origin/alpha-dev", and "refuses when origin/alpha is missing, giving the command to create it"), rename "refuses when origin/main is missing, without the alpha hint" to "refuses when origin/main is missing", remove `alpha-dev` from `TARGET_BRANCH_BY_SOURCE`, add `"alpha-dev"` and `"alpha"` to `REFUSED_BRANCHES`, and replace the "names %s and both source branches" test with:

```ts
it.each(REFUSED_BRANCHES)("names %s and develop in the refusal", (branch) => {
  const { git } = _createFakeCommands({ branch });

  const result = runPreflight(git);

  expect(result.ok === false && result.message).toBe(
    `Releases are cut from "develop" (currently on "${branch}").`,
  );
});
```

`releaseVersionUtils/releaseVersionUtils.test.ts`: delete the three alpha `describe` blocks and the "uses -alpha and -alpha-dev on alpha" test, and add to `validateReleaseVersion`:

```ts
it("treats an -alpha suffix as any other malformed version", () => {
  expect(validateReleaseVersion("0.15.0-alpha", "Version")).toEqual({
    valid: false,
    message: "Version must look like X.Y.Z (for example 0.11.0): 0.15.0-alpha",
  });
});
```

`ReleaseNotesCli/ReleaseNotesCli.test.ts`: delete "targets the -alpha tag for an alpha release" and add:

```ts
it("does not accept --alpha", async () => {
  const result = await _runReleaseNotesCli(["--version", "0.15.0", "--alpha"]);

  expect(result.exitCode).not.toBe(0);
  expect(publishReleaseNotes).not.toHaveBeenCalled();
});
```

Use the file's existing run helper and mock in place of `_runReleaseNotesCli` and `publishReleaseNotes` if their names differ: read the "rejects an invalid version" test above it and mirror it.

`ReleaseCli.test.ts`: delete the whole `describe("ava release on alpha-dev with a non-passing CI verdict", ...)` block and every alpha row in the `describe("ava release on a source branch", ...)` case tables. In `describe("ava release on a branch that is not a source branch", ...)`, add `alpha-dev` to the refused branches. Keep every `develop` case unchanged: these are the real-git end-to-end tests.

In the remaining test files, delete the alpha cases and leave the mainline ones: `describeCiStatus.test.ts`, `checkSourceBranchCi.test.ts`, `collectReleaseChangelogCommits.test.ts`, `resolveVersionHelpers.test.ts`, `releaseOutputHelpers.test.ts` (delete the file's banner tests entirely), `releaseStageHelpers.test.ts`.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @avandar/ava-cli test src/ReleaseCli`
Expected: FAIL. `alpha-dev` still resolves a line, the warning still says the mainline test URL, and `--alpha` is still accepted.

- [ ] **Step 3: Implement**

1. `getReleaseLineFromBranch.ts`: delete `ALPHA_RELEASE_LINE`. Narrow `kind` to `"mainline"`. Delete the `bannerTitle` and `bannerColor` fields. Set `deployWarning` to `"Pushing main deploys production and migrates the production database."`. `RELEASE_LINES` holds the one line. Rewrite the docstrings so none mentions alpha or two lines.
2. `runPreflight.ts`: `_getReleaseLineOrRefusal` returns the message `` `Releases are cut from "${MAINLINE_RELEASE_LINE.sourceBranch}" (currently on "${currentBranch ?? "a detached HEAD"}").` ``. Delete `MISSING_TARGET_HINT` and make `_buildMissingTargetMessage` return `` `origin/${line.targetBranch} does not exist.` ``. Remove the `ALPHA_RELEASE_LINE` import.
3. `releaseVersionUtils.ts`: in `validateReleaseVersion`, the suffix check becomes `trimmed.endsWith("dev")` with the message `` `${label} must not end with "dev" (it is added automatically): ${trimmed}` ``. Remove alpha from every docstring.
4. `describeCiStatus.ts`: delete the `alpha` entry of `CI_NAME_BY_LINE_KIND`.
5. `releaseConfirmationStages.ts`: delete `NON_PASSING_CI_POLICY_BY_LINE_KIND`, `_buildCiRefusalMessage`, and the `refuse` branch of `confirmCiVerdict`, so a non-passing verdict asks, or proceeds under `--yes`. Decision A2 later changed this: under `--yes` a non-passing verdict stops. `_buildSkipCiCheckWarning` returns the one sentence `` `Skipping ${line.sourceBranch}'s CI check.` ``. Delete `CONFIRM_PROMPT_DESTINATION`: the prompt is `` `Release ${publishedVersion}?` ``. Delete `RELEASE_NOTES_LINE_FLAG`: the retry hint ends at the version.
6. `releaseOutputHelpers.ts`: delete `BANNER_DEPLOY_NOTE`, `buildBannerFromReleaseLine`, and `printReleaseBanner`.
7. `runRelease.ts`: delete `_printBannerForCheckedOutBranch` and its call, and the `getReleaseLineFromBranch` import if nothing else uses it. Fix the `runRelease` docstring: `main` becomes an exact copy of `develop`.
8. `resolveVersionHelpers.ts`: `_buildReleaseVersionPrompt` returns the plain question.
9. `ReleaseNotesCli.ts`: delete the `--alpha` option, its usage lines, and `alpha` from `ReleaseNotesCliArgs`. Use `MAINLINE_RELEASE_LINE` directly.
10. `collectReleaseChangelogCommits.ts`: the two patterns become `/^Release: v\d+\.\d+\.\d+(?: \[skip deploy\])?$/` and `/^Bump version to \d+\.\d+\.\d+-dev(?: \[skip deploy\])?$/`.
11. `ReleaseCli.ts`: replace `USAGE`'s first paragraph and the `.description(...)` and option texts with `develop`'s wording. Read it with `git show origin/develop:apps/ava-cli/src/ReleaseCli/ReleaseCli.ts`. Keep any option that exists only on this branch.
12. Comments in `releaseGitHelpers.ts`, `checkSourceBranchCi.ts`, and `releaseStageHelpers.ts`: remove every mention of alpha.

- [ ] **Step 4: Run and confirm pass**

```bash
pnpm --filter @avandar/ava-cli test
pnpm exec tsc -b --force --noEmit
git grep -nwi "alpha" -- apps/ava-cli/src/ReleaseCli
git grep -ni "alpha-dev" -- apps/ava-cli/src/ReleaseCli
```

Expected: every test passes, no type errors, and neither `grep` prints anything.

- [ ] **Step 5: Confirm the hardening survived**

```bash
git grep -nE "symbolic-ref|refs/remotes/origin/|refs/heads/" -- \
  apps/ava-cli/src/ReleaseCli ':!*.test.ts' | wc -l
```

Expected: the same count as `git grep` gives at `2e5a62c7e` for the same paths, minus lines deleted with `MISSING_TARGET_HINT`. If a full-ref lookup, the `git symbolic-ref` read, the HEAD re-check before the version commit, the `package.json`-only version commit, or a full-refspec push is gone, restore it.

- [ ] **Step 6: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli
git commit -m "feat(ava-cli)!: release from develop only and drop the alpha line

BREAKING CHANGE: ava release no longer runs on alpha-dev, and
ava release notes no longer accepts --alpha."
```

---

### Task 4: Fold the one release line into constants

**Risk class:** high-risk. Release safety. A pure refactor: no test may change its expected behavior.

**Files (all under `apps/ava-cli/src/ReleaseCli/`):**
- Create: `releaseBranches/releaseBranches.ts`
- Delete: `getReleaseLineFromBranch/getReleaseLineFromBranch.ts`, `getReleaseLineFromBranch/getReleaseLineFromBranch.test.ts`
- Modify: every file that imports `ReleaseLine`

- [ ] **Step 1: Create the constants**

```ts
/** The branch a release is cut from, and the only one `ava release` runs on. */
export const RELEASE_SOURCE_BRANCH = "develop";

/** The branch a release publishes to. Pushing it deploys production. */
export const RELEASE_TARGET_BRANCH = "main";

/** Carried by `develop` between releases, e.g. `0.15.1-dev`. */
export const DEV_VERSION_SUFFIX = "-dev";

/** The workflow whose verdict on `develop` gates a release. */
export const SOURCE_CI_WORKFLOW = "staging.yaml";

/** The workflow that runs when `main` is pushed. */
export const TARGET_DEPLOY_WORKFLOW = "production.yaml";

/** What pushing `main` does, warned about before the last confirmation. */
export const DEPLOY_WARNING =
  "Pushing main deploys production and migrates the production database.";
```

- [ ] **Step 2: Replace every use of the line**

In each file that imports from `getReleaseLineFromBranch`:

| Was | Becomes |
| --- | --- |
| `line.sourceBranch`, `plan.line.sourceBranch` | `RELEASE_SOURCE_BRANCH` |
| `line.targetBranch` | `RELEASE_TARGET_BRANCH` |
| `line.devSuffix` | `DEV_VERSION_SUFFIX` |
| `line.sourceCiWorkflow` | `SOURCE_CI_WORKFLOW` |
| `line.targetDeployWorkflow` | `TARGET_DEPLOY_WORKFLOW` |
| `line.deployWarning` | `DEPLOY_WARNING` |
| A `line: ReleaseLine` parameter or option, and the `line` field of `ReleasePlan` and of the preflight result | Deleted, with its argument at every call site |
| `toDevVersion(version, line)` | `toDevVersion(version)` |
| `toReleaseTag(version, line)` | `toReleaseTag(version)`, returning `` `v${version}` `` |
| `toPublishedVersion(version, line)` | Deleted. Callers use the version itself. `publishedVersion` fields are removed in favor of `releaseVersion`. |
| `CI_NAME_BY_LINE_KIND[line.kind]` | Two constants, `"Staging CI"` and `"staging CI"` |
| `_getReleaseLineOrRefusal` | `_refuseWrongBranch`, returning the refusal or `undefined`, comparing `getCurrentBranch(git)` with `RELEASE_SOURCE_BRANCH` |

Update the tests to the new signatures only. Delete tests that asserted `result.line`.

- [ ] **Step 3: Run the whole suite and type-check**

```bash
pnpm --filter @avandar/ava-cli test
pnpm exec tsc -b --force --noEmit
git grep -nE "ReleaseLine|getReleaseLineFromBranch|MAINLINE" -- apps/ava-cli
```

Expected: PASS, no type errors, no output from the `grep`.

- [ ] **Step 4: Read the diff against `develop`**

```bash
git diff origin/develop --stat -- apps/ava-cli/src/ReleaseCli ':!*.test.ts'
git diff origin/develop -- apps/ava-cli/src/ReleaseCli ':!*.test.ts'
```

Every remaining difference from `develop` must be one of: full-ref lookups, `git symbolic-ref`, the HEAD re-check before the version commit, the `package.json`-only version commit, full-refspec pushes, `describeCommandFailure`, the folder moves with their tests, generic `source` and `target` names, or the release-commit filter in the changelog. List anything else in the task report.

- [ ] **Step 5: Dry-run the refusal by hand**

```bash
pnpm --filter @avandar/ava-cli build
git switch -c release-refusal-check
node apps/ava-cli/dist/main.cjs release --dry-run --skip-ci-check --skip-changelog; echo "exit=$?"
git switch - && git branch -D release-refusal-check
```

Expected: `Releases are cut from "develop" (currently on "release-refusal-check").` and `exit=1`. The package's own `build` writes `dist/` and does not move the global `ava` symlink. Do not run `pnpm build:ava-cli` here, and do not run the release on `develop`.

- [ ] **Step 6: Commit**

```bash
git add apps/ava-cli/src/ReleaseCli
git commit -m "refactor(ava-cli): replace the release line with branch constants"
```

---

### Task 5: Version

**Risk class:** mechanical.

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Set `"version": "0.15.0-dev"`.
- [ ] **Step 2:** Run `pnpm vitest run src/lib/analytics/appVersion.test.ts`. Expected: PASS.
- [ ] **Step 3:** Commit with `chore: set the version to 0.15.0-dev`.

---

### Task 6: Rename the catalog scripts

**Risk class:** ordinary. No logic changes.

**Files:**
- Rename: `scripts/alpha/` to `scripts/catalog-move/` (7 files)
- Modify: the usage comments in `exportCatalogData.sh`, `importCatalogData.sh`, `copyCatalogParquet/copyCatalogParquet.ts`

- [ ] **Step 1: Move**

```bash
git mv scripts/alpha scripts/catalog-move
git grep -lE "scripts/alpha\b" -- . ':!docs/measles-demo/alpha-*' \
  ':!docs/superpowers/plans/2026-11-19-alpha-line-stage-0.md'
```

Replace `scripts/alpha/` with `scripts/catalog-move/` in every file the `grep` lists.

- [ ] **Step 2: Fix the wording**

In the three files' header comments, "into alpha-dev and production" becomes "into staging and production". Change nothing else.

- [ ] **Step 3: Run the tests**

```bash
pnpm vitest run scripts/catalog-move
bash -n scripts/catalog-move/exportCatalogData.sh
bash -n scripts/catalog-move/importCatalogData.sh
bash -n scripts/catalog-move/catalogTables.sh
```

Expected: PASS, and no output from `bash -n`. The integration tests that need a local Postgres skip themselves when none is running: report which ran.

- [ ] **Step 4: Commit**

```bash
git add -A scripts
git commit -m "refactor(scripts): rename the catalog scripts to catalog-move"
```

---

### Task 7: Documents

**Risk class:** mechanical.

**Files:**
- Modify: `docs/superpowers/2026-11-19-alpha-line-stage-0-handoff.md`, `docs/measles-demo/pr-feature-log.md`

- [ ] **Step 1:** Add this as line 3 of `docs/superpowers/2026-11-19-alpha-line-stage-0-handoff.md`, after the title and a blank line:

```markdown
> **Superseded on 2026-11-23** by [the production cutover plan](../measles-demo/production-cutover-plan.md). The alpha line was abandoned.
```

- [ ] **Step 2:** In `pr-feature-log.md`, rewrite F141 in three places.

The table row becomes:

```markdown
| F141 | Release and deploy hardening kept from the abandoned alpha line: `ava release` preflight and push safety, the production deploy job, and the catalog move scripts | not started | | |
```

The `## F141` section: keep the commit table. Replace the description with what survives (spec sections 8 to 10), and add one sentence that the `alpha-dev` and `alpha` workflows and the two-line release were removed on `chore/production-cutover`. In the file ownership table, the `demo.yaml` row says it was deleted and not replaced, and the `production.yaml`, `vercel.json` row says `develop`'s copies were restored and then given the deploy job (Task 15).

- [ ] **Step 3:** Check for leftovers.

```bash
git grep -nE "alpha-dev|alpha\.avandarlabs" -- docs ':!docs/measles-demo/alpha-*' \
  ':!docs/superpowers/plans/2026-11-19-alpha-line-stage-0.md' \
  ':!docs/superpowers/2026-11-19-alpha-line-stage-0-handoff.md' \
  ':!docs/measles-demo/production-cutover-*' \
  ':!docs/superpowers/plans/2026-11-23-production-cutover.md'
```

Expected: only lines inside F141's own history. Fix any other.

- [ ] **Step 4:** Commit with `docs(cutover): describe what survives of the alpha line`.

---

## Stage B: merge `develop`

Before Task 8: run `pnpm --filter @avandar/ava-cli test`, `pnpm lint`, and `pnpm exec tsc -b --force --noEmit` once. Stage A must be green before the merge starts.

### Task 8: Merge `develop` up to the plugin removal

**Risk class:** ordinary.

**Files:** whatever the merge brings. Two conflicts expected: `AGENTS.md`, `src/views/GisApp/MapViewer/MapViewer.module.css`.

- [ ] **Step 1: Merge**

```bash
git merge --no-ff 9389435f0
```

Expected: `CONFLICT (content)` in the two files above and no others. If more files conflict, resolve them by the policy table in spec section 6 and list them in the report.

- [ ] **Step 2: Resolve**

`AGENTS.md`: keep every rule from both sides. Where both sides edited the same sentence about linting or tooling, take `develop`'s sentence. `CLAUDE.md` is a symlink to this file: do not touch it.

`MapViewer.module.css`: keep this branch's selectors and values, then apply `develop`'s edits to the lines this branch did not change. Run `pnpm lint:css`. Expected: no findings in this file.

- [ ] **Step 3: Check what the merge deleted**

```bash
git diff --name-only --diff-filter=D HEAD -- . | grep -v '^apps/ava-video-producer/'
git status --short | grep -E '^(D |DD|UD|DU)' | grep -v 'apps/ava-video-producer/'
```

Expected: exactly `src/components/ChatPanel/ChatThread/isChatThreadVisiblyEmpty.ts` and its `.test.ts`. Then:

```bash
git grep -n "isChatThreadVisiblyEmpty" -- src
```

Expected: no output. If something still imports it, restore both files with `git checkout HEAD -- <path>` and report it.

- [ ] **Step 4: Commit the merge**

```bash
git add -A
git commit -m "chore(cutover): merge develop up to the plugin removal

Merges 9389435f0, the commit before develop removed the plugin system."
```

Do not run the test suites yet. The tree is not expected to be green between Tasks 8 and 13.

---

### Task 9: Record the plugin removal as merged, without applying it

**Risk class:** high-risk. This step is what keeps the plugin system.

**Files:**
- Add: `supabase/migrations/20261117210525_drop_plugin_installations.sql`

- [ ] **Step 1: Count the plugin files before**

```bash
git ls-files plugins packages/shared/plugin-manifest packages/web/plugin-sdk \
  packages/web/plugin-ui src/lib/plugins scripts/vite-plugin-ava-plugins | wc -l
```

Expected: `251`. Write the number down.

- [ ] **Step 2: Merge with the `ours` strategy**

```bash
git merge -s ours --no-ff d521a7c10 -m "chore(cutover): record develop's plugin removal as merged without applying it

d521a7c10 removed the plugin system from develop because it was demo-stage.
The demo is now being promoted, so the plugin system stays. This merge makes
that commit an ancestor, so later merges of develop do not delete the plugin
files again."
git diff --stat HEAD^1 HEAD
```

Expected: the `diff` prints nothing. The tree is unchanged.

- [ ] **Step 3: Bring back the one file staging needs**

```bash
git checkout d521a7c10 -- supabase/migrations/20261117210525_drop_plugin_installations.sql
git diff --cached --stat
```

Expected: one file, 46 insertions. Staging's migration history holds this version, so the file must stay in the tree, unchanged.

- [ ] **Step 4: Confirm the removal carried nothing else worth keeping**

```bash
git show --stat --format= d521a7c10 -- . ':!plugins' ':!packages' ':!src/lib/plugins' \
  ':!scripts/vite-plugin-ava-plugins' ':!src/i18n' | tail -60
```

Read the list. Every file must be plugin wiring, a generated file (database types, desktop migrations, catalogs), or the drop migration. If one is an unrelated fix, apply that hunk by hand and name it in the report.

- [ ] **Step 5: Count again and commit**

```bash
git ls-files plugins packages/shared/plugin-manifest packages/web/plugin-sdk \
  packages/web/plugin-ui src/lib/plugins scripts/vite-plugin-ava-plugins | wc -l
git commit -m "chore(db): keep develop's drop of plugin_installations in the migration history

Staging already applied 20261117210525. The next migration restores the table."
```

Expected: `251` again.

---

### Task 10: Merge the rest of `develop`

**Risk class:** high-risk. A wrong resolution loses code without an error.

**Files:** whatever the merge brings. Ten conflicts expected.

- [ ] **Step 1: Merge**

```bash
git rev-parse HEAD > "$(git rev-parse --git-dir)/CUTOVER_PRE_MERGE"
git merge --no-ff origin/develop
```

Expected conflicts:

| File | Kind | Resolution |
| --- | --- | --- |
| `apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx` | content | `git checkout --theirs` (C1) |
| `apps/ava-video-producer/capture-flows/avandar.mjs` | modify/delete | `git rm` (C1) |
| `eslint.config.js` | modify/delete | `git rm`. Task 12 ports what this branch added. |
| `eslint/deno-restrictions.js` | modify/delete | `git rm`. Task 12 checks its rule. |
| `pnpm-lock.yaml` | content | `git checkout --theirs`, then Step 3 |
| `packages/web/ui/src/EditableDisplayText/EditableDisplayText.tsx` | content | Read both |
| `packages/web/ui/src/ObjectDescriptionList/PrimitiveValueItem/PrimitiveValueItem.tsx` | content | Read both |
| `shared/models/vizs/AvaVizConfig/AvaVizConfig.ts` | content | Read both. The plugin viz type stays. |
| `src/components/ChatPanel/ChatPanel/ChatPanel.tsx` | content | Read both |
| `src/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList.tsx` | content | Read both |

- [ ] **Step 2: Resolve the "read both" files**

For each, run `git log --oneline --left-right 9389435f0...origin/develop -- <file>` and `git log --oneline 9389435f0..HEAD^1 -- <file>` to see what each side did. The rule: this branch's behavior, with `develop`'s lint-driven rewrites applied to it. If `develop` changed behavior too, keep both behaviors and say so in the report. Never pick a whole side with `--ours` or `--theirs` for these five.

Before saving a file, save this branch's version to compare later: `git show HEAD:<file> > /tmp/<name>.ours`.

- [ ] **Step 3: Rebuild the lockfile**

```bash
pnpm install
git diff --stat -- pnpm-lock.yaml | tail -1
pnpm install --frozen-lockfile
```

Expected: the second install changes nothing and exits 0.

- [ ] **Step 4: Audit every deletion**

```bash
PRE="$(cat "$(git rev-parse --git-dir)/CUTOVER_PRE_MERGE")"
git diff --name-only --diff-filter=D "$PRE" -- . | grep -v '^apps/ava-video-producer/'
```

Expected, and nothing else:

```text
eslint.config.js
eslint/adapter-import-resolution.test.js
eslint/deno-restrictions.js
eslint/package-restrictions.js
eslint/privacy-chokepoint.js
```

Any other path: find the `develop` commit that deleted it with `git log --diff-filter=D --format='%h %s' -1 origin/develop -- <path>`. Keep the deletion only when that commit is a lint or video-producer change. Otherwise restore the file with `git checkout "$PRE" -- <path>` and report it.

- [ ] **Step 5: Confirm the workflow and deploy files**

```bash
ls .github/workflows
test ! -e .github/workflows/demo.yaml && test ! -d scripts/demo && echo "no demo CI"
git diff --exit-code origin/develop -- .github/workflows/production.yaml vercel.json && echo identical
git ls-files plugins packages/shared/plugin-manifest packages/web/plugin-sdk \
  packages/web/plugin-ui src/lib/plugins scripts/vite-plugin-ava-plugins | wc -l
```

Expected: no `alpha*.yaml` and no `demo.yaml` in the listing, `no demo CI`, `identical`, and `251`.

- [ ] **Step 6: Commit the merge**

```bash
git add -A
git commit -m "chore(cutover): merge develop into the measles demo

Lint and apps/ava-video-producer follow develop. The plugin system and the
declarative schema follow this branch."
```

---

### Task 11: Repair the migration chain

**Risk class:** high-risk. Migrations.

**Files:**
- Create: `supabase/migrations/20261123200000_restore_plugin_installations.sql`
- Rename: `supabase/migrations/20261116192935_add_plugin_data_slots.sql` to `20261123200100_add_plugin_data_slots.sql`
- Rename: `supabase/migrations/20261116222442_harden_plugin_data_slot_bindings.sql` to `20261123200200_harden_plugin_data_slot_bindings.sql`
- Regenerate: `shared/types/database.types.ts`, `apps/desktop/migrations/*.gen.sql`

Load the `supabase-declarative-schema` skill first. Project rules under `docs/rules/` win where they disagree with it.

- [ ] **Step 1: Give this branch its own stack, before touching a migration**

```bash
ava supabase switch
ava supabase status | head -3
pnpm fns:update-env
```

Expected: the first status line names this branch's own project, `chore-production-cutover`, not `This is the develop local Supabase`. If it does not, stop. Do not continue on the shared stack.

- [ ] **Step 2: Prove the chain is broken (the failing test)**

```bash
pnpm db:reset 2>&1 | tail -20
```

Expected: FAIL at `20261117210525_drop_plugin_installations.sql` with `cannot drop table plugin_installations because other objects depend on it`. If the reset passes, stop and report: the analysis in spec section 3.2 no longer holds.

- [ ] **Step 3: Move the two dependent migrations after the drop**

```bash
git mv supabase/migrations/20261116192935_add_plugin_data_slots.sql \
  supabase/migrations/20261123200100_add_plugin_data_slots.sql
git mv supabase/migrations/20261116222442_harden_plugin_data_slot_bindings.sql \
  supabase/migrations/20261123200200_harden_plugin_data_slot_bindings.sql
git diff --cached -M --stat | tail -3
```

Expected: two renames, 0 insertions, 0 deletions. Neither production nor staging has applied these files.

- [ ] **Step 4: Write the restore migration**

```bash
cp supabase/migrations/20261109035052_add_plugin_installations.sql \
  supabase/migrations/20261123200000_restore_plugin_installations.sql
cmp supabase/migrations/20261109035052_add_plugin_installations.sql \
  supabase/migrations/20261123200000_restore_plugin_installations.sql
```

Expected: `cmp` prints nothing. The restore is a byte-for-byte copy of the generated migration that first created the table, so nobody edits a generated migration by hand. The commit message in Step 10 carries the explanation.

- [ ] **Step 5: Reset and confirm the chain applies**

```bash
ava supabase status | head -1
pnpm db:reset 2>&1 | tail -5
```

Expected: the reset finishes and seeds. If the restore fails with "already exists", the drop left that object behind: delete that one statement from the restore migration and reset again.

- [ ] **Step 6: Confirm the migrations equal the declarative schema**

```bash
ava supabase status | head -1
supabase stop
PGSSLMODE=disable supabase db diff 2>&1 | tail -30
supabase start > /dev/null
pnpm db:reset 2>&1 | tail -3
```

This is the order `scripts/db/new-migration/new-migration.sh` uses: `supabase db diff` tears the stack down, so the stop and start are explicit. Expected: `No schema changes found`, or only the drop and recreate of `analytics.*` views, which the diff tool proposes on every run and the repository's generator strips. Anything else is drift between the migrations and `supabase/schemas/`. A printed `drop` of something this branch did not touch means the stack holds another branch's objects: reset and run it again. A real difference goes into a new migration made with `pnpm db:new-migration <name>`, never into an edit of an existing file. Privileges are checked by `pnpm test:db` in Step 8, which runs `reconcile-privileges.sh`.

- [ ] **Step 7: Regenerate the generated files**

```bash
pnpm db:gen-types
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
pnpm db:validate-migrations
git status --short supabase apps/desktop/migrations shared/types | head -20
```

Expected: both checks pass. The desktop folder gains `20261117210525_drop_plugin_installations.gen.sql` and `20261123200000_restore_plugin_installations.gen.sql`, and its two slot files are renamed.

- [ ] **Step 8: Run the database tests**

```bash
pnpm test:db 2>&1 | tail -15
```

Expected: PASS, including the plugin installation and plugin data slot tests.

- [ ] **Step 9: Fix references to the old file names**

```bash
git grep -lE "20261116192935|20261116222442" -- . ':!supabase/migrations' ':!apps/desktop/migrations'
```

In each file listed, add the new name beside the old one. Do not rewrite history sections of the feature log.

- [ ] **Step 10: Commit**

```bash
git add -A supabase apps/desktop/migrations shared/types docs
git commit -m "fix(db): restore plugin_installations after develop's drop

develop dropped the table in 20261117210525, and staging applied that. The
restore runs next, and the two plugin data slot migrations move after it.
Neither staging nor production had applied those two files."
```

---

### Task 12: Lint under Oxlint

**Risk class:** ordinary.

**Files:**
- Modify: `.oxlintrc.json`, `eslint/plugin-restrictions.js`, `eslint/plugin-restrictions.test.js`, `package.json` (only if a lint script still names ESLint)
- Modify: whatever files `pnpm lint` reports

- [ ] **Step 1: Restore the plugin import rule in its Oxlint form**

```bash
git checkout 28a1ac252 -- eslint/plugin-restrictions.js eslint/plugin-restrictions.test.js
git show 28a1ac252 -- .oxlintrc.json
```

Apply that commit's `.oxlintrc.json` hunk (19 lines: the `jsPlugins` entry and the rule entries for plugin folders) to the current `.oxlintrc.json` by hand. Then port what this branch added to the ESLint version after the branches split:

```bash
git diff a5a58b2f8 2e5a62c7e -- eslint/plugin-restrictions.js eslint.config.js eslint/deno-restrictions.js
```

Each added restriction goes into the Oxlint rule file or into `.oxlintrc.json`. `develop` already moved the privacy, package, and Deno restrictions into `.oxlintrc.json`: confirm each addition from this branch is present there, and add the ones that are not.

- [ ] **Step 2: Run the rule's test**

```bash
pnpm vitest run eslint/plugin-restrictions.test.js
```

Expected: PASS. Then prove the rule fires: add `import { supabase } from "@/clients/supabase";` to the top of `plugins/epidemiology/src/index.tsx`, run `pnpm exec oxlint plugins/epidemiology/src/index.tsx`, expect one `plugin-restrictions` error, and remove the line.

- [ ] **Step 3: Lint everything**

```bash
grep -n '"lint"' package.json
pnpm lint 2>&1 | tail -40
```

Expected: the `lint` script starts with `oxlint`. Findings will appear in code that only ever ran under ESLint.

- [ ] **Step 4: Fix the findings**

```bash
pnpm exec oxlint --fix .
pnpm lint 2>&1 | tail -40
```

Fix what remains by hand, rule by rule. Never add a disable comment to get to zero, and never edit `.oxlintrc.json` to silence a rule outside the plugin entries. `--report-unused-disable-directives-severity=error` also fails on stale `eslint-disable` comments: delete them. Commit the automatic fixes and the manual fixes separately.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(lint): restore the plugin import rule under oxlint and lint the promoted code"
```

---

### Task 13: Regenerate the Lingui catalogs

**Risk class:** ordinary.

**Files:**
- Regenerate: `src/i18n/locales/*/messages.po`, `src/i18n/locales/*/messages.ts`

- [ ] **Step 1: Rebuild the catalogs from the merged source**

```bash
pnpm translations resolve
git status --short src/i18n | head -20
```

`pnpm translations resolve` only acts on conflicted catalogs and may report there are none. Never edit a `messages.ts` by hand.

- [ ] **Step 2: Extract, translate the strings new to each locale, and compile**

```bash
pnpm translations all
pnpm i18n:compile
pnpm i18n:check
```

Expected: `i18n:check` exits 0. `pnpm translations all` extracts, fills empty translations through OpenAI, and compiles. It needs `OPENAI_API_KEY` in the environment. If the key is missing, stop and report: do not commit catalogs with untranslated plugin strings.

- [ ] **Step 3: Commit**

```bash
git add src/i18n
git commit -m "chore(i18n): regenerate the catalogs after merging develop"
```

---

### Task 14: Full verification

**Risk class:** ordinary. Use the `systematic-debugging` skill for every failure.

**Files:** whatever the fixes need. One commit per fix.

- [ ] **Step 1: Types**

```bash
pnpm exec tsc -b --force --noEmit
pnpm type-check
```

Expected: no errors. `pnpm type-check` also covers the video producer and Deno. A video producer error after taking `develop`'s files means the app code it imports differs from `develop`'s: fix it in `apps/ava-video-producer/avandar-adapter/`, as small as possible, and list each file in the report.

- [ ] **Step 2: Lint, plugin bundle, packages**

```bash
pnpm lint
pnpm check:plugin-bundle
pnpm verify:packages
```

Expected: all pass.

- [ ] **Step 3: The quick suite**

```bash
ava supabase status | head -1
nohup pnpm fns:serve > /tmp/supabase-functions.log 2>&1 &
bash scripts/test-runners/run-all-tests.sh --quick 2>&1 | tail -40
```

Expected: PASS. Never run two test runs at once in this worktree.

- [ ] **Step 4: Targeted end-to-end tests, one at a time**

```bash
ls tests/e2e | grep -iE "plugin|catalog|explorer|chat|gis|map|dictionar|crosswalk"
```

Run each listed spec on its own with `pnpm test:e2e <name>.spec.ts`. Never run the whole suite. Never raise a timeout above 45 seconds. Expected: each passes. The three `plugins-epidemiology-*.spec.ts` files are required.

- [ ] **Step 5: Compare the "read both" files once more**

For the five files of Task 10 Step 2, run `diff /tmp/<name>.ours <file>`. Every difference must be a lint rewrite or a change `develop` made on purpose. Report any behavior that changed.

- [ ] **Step 6: Report**

Write, per check, the command and its last output line. A failing check is reported as failing, with the output.

---

## Stage C: deploy parity

> **Note (2026-11-24):** Stage C was implemented and reviewed, then set
> aside before the release (decision M1): the workflows and `vercel.json`
> were restored to `develop`'s copies in `b9601f995`, and the work is kept
> on the local branch `feat/ci-deploy-jobs`.

### Task 15: The production deploy job

**Risk class:** high-risk. This job writes to production.

**Files:**
- Modify: `.github/workflows/production.yaml`
- Modify: `vercel.json`

- [ ] **Step 1: Write the workflow**

Start from the file as it is (identical to `develop`'s). Take the source for the new job from `git show 2e5a62c7e:.github/workflows/alpha.yaml`, copying steps verbatim.

1. Replace the header with a comment that says: deploys `main` to production (https://app.avandarlabs.com and the production Supabase project) after lint, type-check, and the quick suite. Nothing touches production until the deploy job has confirmed it runs for the tip of `main`, checked the production configuration, and built the web app. `main` changes only through `ava release` run on `develop`. There is no `tags:` trigger, because the release pushes the branch and its tag together.
2. Add `concurrency: { group: production-deploy, cancel-in-progress: false }` with `alpha.yaml`'s comment.
3. `env`: keep `NODE_VERSION`. Add `SUPABASE_CLI_VERSION: 2.114.0` with `alpha.yaml`'s comment, `VERCEL_CLI_VERSION: 64.7.0`, and `PRODUCTION_APP_URL: https://app.avandarlabs.com`.
4. In `test-quick` and `test-e2e`: `version: 2.98.2` becomes `version: ${{ env.SUPABASE_CLI_VERSION }}`. In `test-quick`, add `- run: pnpm check:plugin-bundle` after the `prepare-envs` step.
5. Delete the `migrate` job. Add the whole `deploy` job from `alpha.yaml`, then change exactly this:
   - `if: github.ref == 'refs/heads/alpha'` becomes `if: github.ref == 'refs/heads/main'`.
   - The step "Refuse anything but the tip of alpha" becomes "Refuse anything but the tip of main": `refs/heads/alpha` becomes `refs/heads/main`, and both messages say `main`.
   - Every `${{ vars.AVA_PIPELINE_SERVER_URL }}` becomes `${{ secrets.AVA_PIPELINE_SERVER_URL }}`, in the configuration check and in the secrets step. A private hostname is not a public variable.
   - Nothing else. The job keeps `needs: test-quick`, `environment: production`, `timeout-minutes: 45`, the configuration check, the Vercel pull, the build, "Apply migrations" with `supabase db push --include-all`, the single-quoted secrets file, the function deploy, and the prebuilt deploy.

- [ ] **Step 2: Turn Git-triggered deployments off for every branch**

```bash
curl -s https://openapi.vercel.sh/vercel.json \
  | jq '.properties.git.properties.deploymentEnabled'
```

Expected: the schema allows a boolean. Then in `vercel.json`, after `"installCommand"`:

```json
  "git": {
    "deploymentEnabled": false
  },
```

If the schema allows only an object keyed by branch, list `main` and `develop` as `false` instead and say so in the report: other branches then keep building until Pablo disconnects the integration.

- [ ] **Step 3: Lint**

```bash
actionlint --version
actionlint .github/workflows/production.yaml
```

Expected: 1.7.12 or newer, then no findings.

- [ ] **Step 4: Check that nothing but production reaches the deploy job**

```bash
awk '/^  deploy:/,0' .github/workflows/production.yaml \
  | grep -nE "alpha|ALPHA|STAGING|staging|DEMO|sandbox"
grep -n "supabase db push" .github/workflows/production.yaml
grep -c "environment: production" .github/workflows/production.yaml
```

Expected: no output, then one `db push --include-all` line, then `1`.

Then read what the job can print, since the run log is public:

```bash
awk '/^  deploy:/,0' .github/workflows/production.yaml | grep -nE "echo|printf|set -x"
grep -oE "vars\.[A-Z0-9_]+" .github/workflows/production.yaml | sort -u
```

Every printed value must be a name, a commit, or a fixed sentence. GitHub masks secrets in logs and does not mask variables, so every `vars.` name must be public by nature. Expected: `PRODUCTION_SB_PUBLISHABLE_KEY`, `PRODUCTION_SUPABASE_URL`, and `VITE_GOOGLE_PICKER_APP_ID`, which all ship inside the web app.

- [ ] **Step 5: Check the order**

```bash
grep -n "      - name:" .github/workflows/production.yaml | awk '/Refuse anything/,0'
```

Expected, in this order: Refuse anything but the tip of main, Check the production configuration, Pull the Vercel production environment, Build the web app for Vercel, Apply migrations, Set edge function secrets, Deploy edge functions, Deploy the prebuilt web app to Vercel.

- [ ] **Step 6: List every secret and variable**

```bash
grep -oE "(secrets|vars)\.[A-Z0-9_]+" .github/workflows/production.yaml | sort -u
```

Paste the output into the commit body. Task 19 needs it. Today the `production` environment holds only `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_DB_PASSWORD`, and `PRODUCTION_PROJECT_ID`.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/production.yaml vercel.json
git commit -m "feat(ci): deploy production from CI and turn off git-triggered vercel deploys

<paste the secrets list>"
```

---

### Task 16: The staging deploy job

**Risk class:** high-risk. It deploys staging and rewrites staging's edge function secrets.

**Files:**
- Modify: `.github/workflows/staging.yaml`
- Modify: `.github/workflows/pr-develop.yaml`

Staging gets the same job as production (D2). Task 15 comes first: its `deploy` job is the source.

- [ ] **Step 1: Write the workflow**

1. Header comment: deploys `develop` to staging (https://staging.avandarlabs.com and the staging Supabase project) after lint, type-check, and the quick suite, in the same order as `production.yaml`.
2. Add `concurrency: { group: staging-deploy, cancel-in-progress: false }`.
3. `env`: add `SUPABASE_CLI_VERSION: 2.114.0`, `VERCEL_CLI_VERSION: 64.7.0`, and `STAGING_APP_URL: https://staging.avandarlabs.com`.
4. In the test jobs, `version: 2.98.2` becomes `version: ${{ env.SUPABASE_CLI_VERSION }}`. In `test-quick`, add `- run: pnpm check:plugin-bundle` after the `prepare-envs` step.
5. Delete the `migrate` job. Copy the `deploy` job from this branch's `production.yaml` and change exactly this:

| In `production.yaml` | In `staging.yaml` |
| --- | --- |
| `refs/heads/main`, "tip of main" | `refs/heads/develop`, "tip of develop" |
| `environment: production` | `environment: staging` |
| `secrets.PRODUCTION_DB_PASSWORD`, `secrets.PRODUCTION_PROJECT_ID` | `secrets.STAGING_DB_PASSWORD`, `secrets.STAGING_PROJECT_ID` |
| `PRODUCTION_SB_SECRET_KEY`, `PRODUCTION_SB_PUBLISHABLE_KEY`, `PRODUCTION_SUPABASE_URL`, as names, environment keys, and in messages | `STAGING_SB_SECRET_KEY`, `STAGING_SB_PUBLISHABLE_KEY`, `STAGING_SUPABASE_URL` |
| `PRODUCTION_APP_URL` | `STAGING_APP_URL` |
| "production" in step names, comments, and messages | "staging" |
| `write_secret MODE production` | `write_secret MODE staging` |
| `write_secret POLAR_SERVER_TYPE production` | `write_secret POLAR_SERVER_TYPE sandbox` |
| `$RUNNER_TEMP/production-functions.env` | `$RUNNER_TEMP/staging-functions.env` |
| The three Vercel steps | Step 2 |

- [ ] **Step 2: The Vercel steps for staging (E1)**

Staging deploys to the Vercel environment named `staging`. Pablo confirmed it exists, with staging's variables. Keep production's three steps and their order (pull, build before the migrations, deploy last), and change only how each command names its target. The `demo` deploy already targeted a named environment with this CLI version, so take the flags from it, not from memory:

```bash
git show origin/develop:.github/workflows/demo.yaml | grep -nE "vercel@|--environment|env_file="
```

| Step | In `production.yaml` | In `staging.yaml` |
| --- | --- | --- |
| Pull | `pull --yes --environment=production` and `.vercel/.env.production.local` | `pull --yes --environment=staging` and `.vercel/.env.staging.local` |
| Build | `build --prod` | `build --environment=staging`, the flag `demo.yaml` passes to `build` |
| Deploy | `deploy --prebuilt --prod` | `deploy --prebuilt --environment=staging`, the flag `demo.yaml` passes to `deploy` |

Keep both `sed` cleanups in the pull step. The first one deletes `VITE_SUPABASE_API_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` from what Vercel returns, so the build takes them from GitHub, as on production. Do not copy `demo.yaml`'s check that fails when those three are set in Vercel: the `staging` environment has them on purpose.

- [ ] **Step 3: `pr-develop.yaml`**

Add `SUPABASE_CLI_VERSION: 2.114.0` to `env` with the same comment as in `production.yaml`, and replace every `version: 2.98.2`. Confirm the `pnpm check:plugin-bundle` step is there.

- [ ] **Step 4: Lint and compare with production's job**

```bash
actionlint .github/workflows/staging.yaml .github/workflows/pr-develop.yaml
grep -rn "2.98.2" .github/workflows
awk '/^  deploy:/,0' .github/workflows/staging.yaml | grep -nE "alpha|ALPHA|PRODUCTION|production|DEMO"
diff <(awk '/^  deploy:/,0' .github/workflows/production.yaml \
        | sed -E 's/PRODUCTION/STAGING/g; s/production/staging/g; s#refs/heads/main#refs/heads/develop#; s/tip of main/tip of develop/') \
     <(awk '/^  deploy:/,0' .github/workflows/staging.yaml)
```

Expected: no findings, no output, no output, and a diff that shows only the Polar server type, the Vercel steps, and messages that name the branch.

- [ ] **Step 5: Compare what CI will write with what staging has, read-only**

The demo deploy wrote the GitHub `staging` environment's values to the `demo-measles` branch, so that branch's digests show what CI will write. `supabase secrets list` returns a digest per name, never a value.

```bash
DEMO_REF="$(supabase branches list --project-ref frbelerytsmadmmdwgcl -o json \
  | jq -r '.[] | select(.name=="demo-measles") | .project_ref')"
supabase secrets list --project-ref "$DEMO_REF" -o json \
  | jq -r '.[] | "\(.name) \(.value)"' | sort > /tmp/demo-digests.txt
supabase secrets list --project-ref frbelerytsmadmmdwgcl -o json \
  | jq -r '.[] | "\(.name) \(.value)"' | sort > /tmp/staging-digests.txt
join -j1 /tmp/demo-digests.txt /tmp/staging-digests.txt | awk '$2 != $3 { print $1 }'
rm /tmp/demo-digests.txt /tmp/staging-digests.txt
```

Expected, as on 2026-11-23: `GOOGLE_REDIRECT_URI`, `SB_PUBLISHABLE_KEY`, `SB_SECRET_KEY`, `VITE_APP_URL`, and the platform's own `SUPABASE_*` names, which differ per project by design, plus `FEATUREBASE_JWT_SECRET`. That last one is a real difference: report it to Pablo, who decides which value is right before the first staging deploy. Report any other name too.

- [ ] **Step 6: List what the `staging` environment still needs**

```bash
grep -oE "(secrets|vars)\.[A-Z0-9_]+" .github/workflows/staging.yaml | sort -u
gh secret list --env staging --json name -q '.[].name' | sort
gh variable list --env staging --json name -q '.[].name' | sort
```

Expected to be missing: `STAGING_SB_SECRET_KEY` as a secret, `STAGING_SB_PUBLISHABLE_KEY` and `STAGING_SUPABASE_URL` as variables, and `AVA_PIPELINE_SERVER_URL` as a secret (it is a variable today). Paste the three lists into the commit body. Task 19 needs them.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/staging.yaml .github/workflows/pr-develop.yaml
git commit -m "feat(ci): deploy staging from CI in the same order as production

<paste the lists>"
```

---

## Stage D: migration audit

### Task 17: Refresh the audit for production and staging

**Risk class:** high-risk. It reads production.

**Files:**
- Rename: `docs/measles-demo/alpha-migration-audit.md` to `docs/measles-demo/production-migration-audit.md`
- Modify: links to it in `docs/`

Read-only access: use the Supabase MCP server's `execute_sql` if Pablo has authenticated it for the session in read-only mode. Otherwise Pablo exports `PROD_DB_URL` and `STAGING_DB_URL` in the shell, and every query runs through the read-only helper in section 1.4 of `alpha-cutover-runbook.md` (one `begin transaction read only` per query). Never paste a URL into a file or a chat. If a query's safety is uncertain, do not run it: give Pablo the SQL.

- [ ] **Step 1: List what each database will apply**

```bash
ls supabase/migrations | sort > /tmp/merged-migrations.txt
git ls-tree --name-only origin/main supabase/migrations/ | sed 's#.*/##' | sort > /tmp/main-migrations.txt
git ls-tree --name-only origin/develop supabase/migrations/ | sed 's#.*/##' | sort > /tmp/develop-migrations.txt
comm -23 /tmp/merged-migrations.txt /tmp/main-migrations.txt | wc -l
comm -23 /tmp/merged-migrations.txt /tmp/develop-migrations.txt
```

Expected: `79` for production, and for staging the 7 dictionary and crosswalk files, the restore, and the two slot files.

- [ ] **Step 2: Confirm each database's history**

```sql
select count(*), max(version) from supabase_migrations.schema_migrations;
select version from supabase_migrations.schema_migrations
 where version in ('20261109035052', '20261117210525', '20261112000050', '20261116192935');
select to_regclass('public.plugin_installations');
```

Expected on production: 115, `20261013212914`, no rows, null. Expected on staging: 184, `20261117210525`, the first two versions only, null. If staging holds any of the nine demo-only versions, or still has the table, stop and report.

- [ ] **Step 3: Audit production's new files**

The 2026-11-19 audit covered 76 files. Audit the three it did not (`20261117210525`, `20261123200000`, and `20261123200200`, which was `20261116222442`), and audit `20261123200100` again, since it now runs after a drop and a restore. Use its method: reduce each file to its top-level statements, and check every statement that drops, renames, retypes, adds a constraint, or changes rows against production's rows and catalog objects. Then run its "Blockers" and "Data loss risks" queries again, since four days of production data are new: the counts of users, workspaces, dashboards, datasets, and dataset columns, the `individuals.status` values, non-null `api_service` values, and the catalog listings and their linked datasets.

- [ ] **Step 4: Audit staging's ten files**

For each: name collisions with objects already on staging, extensions available on Postgres 17, the row count of every table it alters, and whether each new constraint validates on staging's rows. Staging runs the 7 older files after later ones, so also check that nothing they create or replace was changed by a migration with a later version.

- [ ] **Step 5: Measure what a catalog replace deletes on each database**

Run the read-only report of `scripts/catalog-move/importCatalogData.sh --dry-run` against each target if Pablo has provided the URLs, or the equivalent counts by query: catalog rows per table, and the `datasets__open_data` rows that reference a listing the dump does not contain, with their workspace and owner. Production's expected answer: 6 listings and 4 datasets, all in Pablo's single-member test workspaces.

- [ ] **Step 6: Rewrite the document**

```bash
git mv docs/measles-demo/alpha-migration-audit.md docs/measles-demo/production-migration-audit.md
git grep -l "alpha-migration-audit" -- docs
```

Keep the 2026-11-19 findings under a dated heading. Add a 2026-11 section per database with the same tables: verdict, blockers, data loss risks, safe but notable, every migration. Renumber the "Every migration" table for the 79 files. Replace "alpha" wording: the migrations now reach production through `main`. Fix the links the `grep` lists.

- [ ] **Step 7: Commit**

```bash
git add -A docs
git commit -m "docs(cutover): refresh the migration audit for production and staging"
```

A blocker found here stops the plan. Report it to Pablo before Task 18.

---

## Stage E: the runbook

### Task 18: Catalog export dry run

**Risk class:** high-risk. Data movement, and it reads a database on the staging project.

**Files:** none in the repository. The dump stays outside it.

- [ ] **Step 1: Get a `pg_dump` and `psql` new enough**

```bash
brew install postgresql@17
"$(brew --prefix postgresql@17)/bin/pg_dump" --version
"$(brew --prefix postgresql@17)/bin/psql" --version
```

Expected: 17.6 or newer for both. The formula is keg-only, so the default `psql` does not change.

- [ ] **Step 2: Confirm the source branch is up**

```bash
supabase branches list --project-ref frbelerytsmadmmdwgcl -o json \
  | jq '.[] | select(.name=="demo-measles") | {name, persistent, preview_project_status}'
```

Expected: `ACTIVE_HEALTHY`. If it is paused, stop and ask Pablo to unpause it: that writes to staging's configuration.

- [ ] **Step 3: Export**

Follow section 6.11 of `alpha-cutover-runbook.md` for the source URL and the dump directory (section 1.5: outside the repository, mode 700), with `scripts/alpha/` read as `scripts/catalog-move/`:

```bash
mkdir -p "$HOME/avandar-cutover" && chmod 700 "$HOME/avandar-cutover"
SOURCE_DB_URL="$(supabase branches get demo-measles --project-ref frbelerytsmadmmdwgcl -o env \
  | sed -n 's/^POSTGRES_URL_NON_POOLING=//p' | tr -d '"')" \
PG_DUMP_BIN="$(brew --prefix postgresql@17)/bin/pg_dump" \
  bash scripts/catalog-move/exportCatalogData.sh "$HOME/avandar-cutover/catalog-$(date -u +%Y%m%d).sql"
```

Expected: a row count per catalog table and no error. Never print the URL. The script only reads its source.

- [ ] **Step 4: Check the dump loads, locally**

```bash
ava supabase status | head -1
DB_PORT="$(ava supabase status | awk '$1 == "Database" { print $2 }')"
DUMP="$(ls -t "$HOME"/avandar-cutover/catalog-*.sql | head -1)"
TARGET_DB_URL="postgresql://postgres:postgres@127.0.0.1:$DB_PORT/postgres" \
PSQL_BIN="$(brew --prefix postgresql@17)/bin/psql" \
  bash scripts/catalog-move/importCatalogData.sh "$DUMP" --dry-run \
  --yes-i-know-the-target postgres@127.0.0.1
```

Expected: the status line names this branch's own stack, and the dry run prints its report and writes nothing. If the script names a different variable for the `psql` binary, its usage header says which. Then run it without `--dry-run`, adding `--replace-existing --backup-file "$HOME/avandar-cutover/local-backup.sql"`, against the same local stack, and confirm the listing count it reports equals the dump's.

- [ ] **Step 5: Report**

Write the row counts, the dump's size and SHA-256, and the two psql and pg_dump versions. Task 19 quotes them. No commit.

---

### Task 19: The cutover runbook

**Note:** the section table below describes the CI deploy design the
runbook was first written for. Decision M1 set that design aside, and the
runbook itself is the source of truth.

**Risk class:** high-risk. Pablo writes to production from it.

**Files:**
- Create: `docs/measles-demo/production-cutover-runbook.md`

Written from what Tasks 1 to 18 built. Every step Pablo runs has an exact command or click path, an expected result, and what to do if it differs. Steps that write to production or change Vercel are marked in bold. No placeholders except secret values, which are named and never written.

- [ ] **Step 1: Write these sections, in order**

| # | Section | Source |
| --- | --- | --- |
| 1 | Day-of checklist, one line per step with its "touches production" mark | New |
| 2 | Before you start: tools (`supabase` 2.114.0, `psql` and `pg_dump` 17.6, `gh`), shell setup, rules for production access and dumps | Old 1.3 to 1.5 |
| 3 | Freeze: announce it, list the open PRs into `develop` (5 on 2026-11-23) and the local-only commits to push or drop (`003e2964c` on the first machine) | New |
| 4 | Rehearsal: dump production, restore into a switched stack at production's version, apply the 79 migrations, open old dashboards, pass criteria | Old 2, minus 2.7 |
| 5 | GitHub setup: the `production` environment's names from Task 15 Step 6 and the `staging` environment's from Task 16 Step 6, `AVA_PIPELINE_SERVER_URL` as a secret in both, the `FEATUREBASE_JWT_SECRET` decision for staging, the value rules, the name check, a required reviewer on `production` | Old 3.2 to 3.5 |
| 6 | Third parties: production API keys, Google OAuth redirect URI, Polar, pipeline server, no Supabase Git integration on production | Old 5.1 to 5.5 |
| 7 | Vercel before the cutover, values and click paths only: confirm `staging.avandarlabs.com` is attached to the environment named `staging`, review the `VITE_*` values of Production and of `staging` including `VITE_AVA_DATA_AGENT`, and delete every deploy hook | Old 4.4, 4.5 |
| 8 | Promote to `develop` (D3): push `chore/production-cutover` to `demo/measles`, open the PR with the title `feat: promote the measles demo to develop` and the body from `promotion-pr-description.md`, wait for `pr-develop.yaml`, then `git push origin <sha>:refs/heads/develop` as a fast-forward. What to expect: the PR shows merged, Vercel builds nothing by itself, `staging.yaml` deploys staging step by step, and `release-packages.yaml` opens a version PR that publishes nothing until merged | New |
| 9 | Staging: confirm the 10 migrations applied and the domain serves the new build, load the catalog with `--replace-existing` and copy the Parquet objects, staging checks | Old 6.11, retargeted |
| 10 | Back up production, verify the dump restores, choose the rollback basis | Old 5.8, 6.6 |
| 11 | Release: `pnpm build:ava-cli` on `develop`, `ava release` for `0.15.0`, approve the `deploy` job, what each step of the job prints, the migration window | Old 6.8, 6.10, rewritten for `main` |
| 12 | Load the catalog into production and copy the Parquet objects | Old 6.11 |
| 13 | Smoke test: sign in with an existing account, open an old dashboard, browse the catalog, run a query, install the epidemiology plugin in a test workspace, check Cmd+K shows `0.15.0` | Old 6.9 |
| 14 | Rollback: decide, restore the database, redeploy `main`'s previous functions, promote the previous Vercel deployment | Old 7 |
| 15 | Remove the Vercel Git integration, after both CI deploys were green: Project `avandar` > **Settings** > **Git** > **Connected Git Repository** > **Disconnect**. What stops (a preview for every branch), how to confirm nothing builds on the next push, and how to reconnect | New |
| 16 | Start the privacy fix (AVA-611). Then "Publish the review backlog" (D7): a prompt Pablo pastes into a new agent session when he is ready. Task 20 Step 8 writes this section | Task 20 |
| 17 | Cleanup (D6), seven days later: archive the dump, delete `demo.avandarlabs.com` and the `demo` environment, delete the `demo-measles` Supabase branch, delete `demo/measles` and `chore/production-cutover`, retarget feature branches | Old 8 |
| 18 | Known gaps | Old 9 |

- [ ] **Step 2: Check it against the spec**

Every numbered step of spec section 11 maps to a runbook section. Every command names a script, flag, or workflow that exists on this branch: run `git grep` for each path. No command mentions `alpha`, `alpha-dev`, or the `mainline` environment. The file is public: it holds no secret value, no connection string, and nothing about a user beyond aggregate counts.

- [ ] **Step 3: Copy to Downloads and render**

```bash
D="$(jpsyx config get downloads_dir)/avandar_production-cutover/production-cutover"
mkdir -p "$D"
cp docs/measles-demo/production-cutover-runbook.md "$D/"
markdown-to-pdf "$D/production-cutover-runbook.md" --out "$D/production-cutover-runbook.pdf" --compact
```

- [ ] **Step 4: Commit**

```bash
git add docs/measles-demo/production-cutover-runbook.md
git commit -m "docs(cutover): add the production cutover runbook"
```

---

## Stage F: retroactive review

### Task 20: Review scaffolding

**Risk class:** ordinary. Nothing here is published. The labels, the board, and the 140 issues are created later by a new agent, only when Pablo pastes the runbook's prompt (D7).

**Files:**
- Create: `docs/reviews/README.md`
- Create: `.github/ISSUE_TEMPLATE/retro-review.yml`
- Create: `scripts/reviews/buildRetroReviewIssues/buildRetroReviewIssues.ts`
- Test: `scripts/reviews/buildRetroReviewIssues/buildRetroReviewIssues.test.ts`
- Create: `docs/measles-demo/promotion-pr-description.md`
- Modify: the introductions of `docs/measles-demo/pr-feature-log.md` and `docs/measles-demo/bug-log.md`
- Modify: `docs/measles-demo/production-cutover-runbook.md` (section 16)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  createRetroReviewIssueFromFeature,
  getFeaturesFromFeatureLog,
  getReviewTierFromSection,
} from "./buildRetroReviewIssues";

const FEATURE_LOG = `
| ID | Feature | Status | Depends on | PR |
| --- | --- | --- | --- | --- |
| F1 | Case statuses | not started | | |
| F2 | Catalog search | merged: [#314](https://example.test/314) | F1 | |

## F1: Case statuses

Adds RLS policies on \`concept_statuses\`.

## F2: Catalog search

A search box in the catalog view.
`;

describe("getFeaturesFromFeatureLog", () => {
  it("reads each table row and its section", () => {
    expect(getFeaturesFromFeatureLog(FEATURE_LOG)).toEqual([
      {
        id: "F1",
        title: "Case statuses",
        section: "Adds RLS policies on `concept_statuses`.",
      },
      {
        id: "F2",
        title: "Catalog search",
        section: "A search box in the catalog view.",
      },
    ]);
  });
});

describe("getReviewTierFromSection", () => {
  it.each([
    ["Adds RLS policies on a table.", "security"],
    ["Grants execute to anon.", "security"],
    ["Adds supabase/migrations/2026_x.sql and a sync job.", "data"],
    ["A search box in the catalog view.", "ui"],
  ])("puts %j in the %s tier", (section, tier) => {
    expect(getReviewTierFromSection(section)).toBe(tier);
  });
});

describe("createRetroReviewIssueFromFeature", () => {
  it("titles, labels, and pins the issue", () => {
    const issue = createRetroReviewIssueFromFeature({
      feature: { id: "F1", title: "Case statuses", section: "Adds RLS." },
      pinnedSha: "abc1234",
    });

    expect(issue.title).toBe("Retro review F1: Case statuses");
    expect(issue.labels).toEqual(["retro-review", "retro-review:security"]);
    expect(issue.body).toContain(
      "https://github.com/AvandarLabs/avandar/blob/abc1234/docs/measles-demo/pr-feature-log.md",
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run scripts/reviews`
Expected: FAIL, cannot resolve `./buildRetroReviewIssues`.

- [ ] **Step 3: Implement**

```ts
/** One feature of the feature log: its table row plus its section's text. */
export type ReviewFeature = Readonly<{
  id: string;
  title: string;
  section: string;
}>;

/** The order reviews are worked in: security first, then data, then UI. */
export type ReviewTier = "security" | "data" | "ui";

/** A GitHub issue ready to be created with `gh issue create`. */
export type RetroReviewIssue = Readonly<{
  title: string;
  labels: readonly string[];
  body: string;
}>;

const FEATURE_ROW_REGEX = /^\| (F\d+) \| (.+?) \| .*\|$/;
const SECTION_HEADING_REGEX = /^## (F\d+): /;
const SECURITY_REGEX = /\b(RLS|polic(?:y|ies)|anon|security definer|grant)/i;
const DATA_REGEX = /supabase\/(?:migrations|schemas)|\bmigration|\bsync\b/i;
const FEATURE_LOG_PATH = "docs/measles-demo/pr-feature-log.md";
const REPO_URL = "https://github.com/AvandarLabs/avandar";

/** Maps each feature id to the text under its `## F<n>:` heading. */
function _getSectionsById(markdown: string): ReadonlyMap<string, string> {
  const sections = new Map<string, string[]>();
  let currentId: string | undefined = undefined;
  for (const line of markdown.split("\n")) {
    const headingId = SECTION_HEADING_REGEX.exec(line)?.[1];
    if (headingId !== undefined) {
      currentId = headingId;
      sections.set(currentId, []);
    } else if (line.startsWith("## ")) {
      currentId = undefined;
    } else if (currentId !== undefined) {
      sections.get(currentId)?.push(line);
    }
  }
  return new Map(
    [...sections].map(([id, lines]) => {
      return [id, lines.join("\n").trim()];
    }),
  );
}

/** Reads every feature row of the feature log, with its section's text. */
export function getFeaturesFromFeatureLog(
  markdown: string,
): readonly ReviewFeature[] {
  const sectionsById = _getSectionsById(markdown);
  return markdown.split("\n").flatMap((line) => {
    const match = FEATURE_ROW_REGEX.exec(line);
    if (match === null) {
      return [];
    }
    const [, id = "", title = ""] = match;
    return [{ id, title, section: sectionsById.get(id) ?? "" }];
  });
}

/** Sorts a feature into a review tier from what its section mentions. */
export function getReviewTierFromSection(section: string): ReviewTier {
  if (SECURITY_REGEX.test(section)) {
    return "security";
  }
  return DATA_REGEX.test(section) ? "data" : "ui";
}

/** Builds the public review issue for one feature, pinned to a commit. */
export function createRetroReviewIssueFromFeature(
  options: Readonly<{ feature: ReviewFeature; pinnedSha: string }>,
): RetroReviewIssue {
  const { feature, pinnedSha } = options;
  const tier = getReviewTierFromSection(feature.section);
  const logUrl = `${REPO_URL}/blob/${pinnedSha}/${FEATURE_LOG_PATH}`;
  return {
    title: `Retro review ${feature.id}: ${feature.title}`,
    labels: ["retro-review", `retro-review:${tier}`],
    body: [
      `This feature reached \`develop\` without a pull request review.`,
      `It is reviewed here, after the fact. See docs/reviews/README.md.`,
      "",
      `- Feature log entry: ${logUrl} (section ${feature.id})`,
      `- Code pinned at: ${REPO_URL}/tree/${pinnedSha}`,
      `- Review tier: ${tier}`,
      "",
      "## Findings",
      "",
      "None recorded yet. Each finding cites a permalink at the pinned commit.",
    ].join("\n"),
  };
}
```

Add a `main` at the bottom, run only when the file is the entry point, that reads `docs/measles-demo/pr-feature-log.md`, takes `--sha <commit>` and `--out <dir>`, and writes one `F<n>.json` per feature plus `order.md`, which lists the features by tier. It creates nothing on GitHub.

- [ ] **Step 4: Run the test and the script**

```bash
pnpm vitest run scripts/reviews
pnpm vite-script scripts/reviews/buildRetroReviewIssues/buildRetroReviewIssues.ts \
  --sha "$(git rev-parse HEAD)" --out .temp/chore-production-cutover/retro-review-issues
ls .temp/chore-production-cutover/retro-review-issues | wc -l
```

Expected: PASS, then 141: one file per feature row that is not dropped (140) plus `order.md`. Read five of the drafts.

- [ ] **Step 5: Write the policy and the template**

`docs/reviews/README.md`, an explanation page, says: what landed on `develop` without review (the `demo/measles` promotion, by PR number once known), why, that reviews happen after the commit and history is never rewritten, the four board states, that findings cite permalinks at a pinned commit, that fixes are normal PRs into `develop` and database fixes are new migrations, the tier order, and how an outside contributor can add a finding.

`.github/ISSUE_TEMPLATE/retro-review.yml`: an issue form named "Retroactive review" with the label `retro-review` and three fields: feature ID, pinned commit, findings.

- [ ] **Step 6: Write the promotion PR description**

`docs/measles-demo/promotion-pr-description.md`: what the PR brings (787 commits, features F1 to F141), that most of it was not reviewed, where the reviews will live, the known privacy gap from the top of the feature log, that the release goes ahead with it because production has no active users, and that the fix follows right after (D4), the migration notes from spec section 7, and that it lands as a fast-forward so every commit ID is kept.

- [ ] **Step 7: Reword the two logs' introductions**

`pr-feature-log.md`: the first paragraph after the warning says the log is now the review backlog, not a porting list, and links `docs/reviews/README.md`. `bug-log.md`: one line at the top says every fix it lists reaches `develop` with the promotion, so its rows need no separate PR.

- [ ] **Step 8: Put the publishing prompt in the runbook**

In `docs/measles-demo/production-cutover-runbook.md`, section 16 gets the heading "Publish the review backlog", one sentence saying that nothing in it runs until Pablo pastes the prompt into a new agent session, and this prompt in a fenced block, verbatim:

```text
You are publishing the retroactive review backlog for the public repository
AvandarLabs/avandar. Pablo has approved creating public labels, a public
project board, and 140 public issues. Create nothing else.

1. Read docs/reviews/README.md and section 12 of
   docs/measles-demo/production-cutover-plan.md.
2. Confirm the promotion has landed:
   git fetch origin && git merge-base --is-ancestor origin/demo/measles origin/develop
   If that fails, stop and tell Pablo.
3. Work from origin/develop in a new worktree. Pin the commit:
   PIN="$(git rev-parse origin/develop)"
4. Generate the drafts:
   pnpm vite-script scripts/reviews/buildRetroReviewIssues/buildRetroReviewIssues.ts \
     --sha "$PIN" --out .temp/retro-review-issues
   Expect 140 JSON files and order.md.
5. Show Pablo order.md and three drafts, one from each tier. Wait for him to
   say go in this session before creating anything on GitHub.
6. Create the labels that do not exist yet: retro-review,
   retro-review:security, retro-review:data, retro-review:ui.
7. Create a public project board named "Retroactive review" under
   AvandarLabs, with a Status field holding: Not reviewed, In review,
   Findings open, Reviewed. If gh lacks the project scope, ask Pablo to run
   gh auth refresh -s project. If the CLI cannot set the Status options,
   give Pablo the click path and wait.
8. Create the issues in order.md's order, one gh issue create per draft,
   with the draft's title, body, and labels. Add each to the board as
   "Not reviewed". Before creating one, search for an open or closed issue
   whose title starts with "Retro review F<n>:" and skip it if found, so a
   second run is safe. Pause one second between issues.
9. Report the number created, the number skipped, the board's URL, and every
   failure with its output. Do not edit code, do not close or change any
   other issue, and do not push.
```

Then refresh the Downloads copy:

```bash
D="$(jpsyx config get downloads_dir)/avandar_production-cutover/production-cutover"
cp docs/measles-demo/production-cutover-runbook.md "$D/"
trash "$D/production-cutover-runbook.pdf"
markdown-to-pdf "$D/production-cutover-runbook.md" --out "$D/production-cutover-runbook.pdf" --compact
```

- [ ] **Step 9: Commit**

```bash
git add docs/reviews .github/ISSUE_TEMPLATE scripts/reviews docs/measles-demo
git commit -m "docs(reviews): add the retroactive review policy, template, and issue drafts"
```

---

## Stage G: hand over to Pablo

### Task 21: Final sync and report

**Risk class:** ordinary.

**Files:** none, unless `develop` moved.

- [ ] **Step 1: Catch up with `develop` once more**

```bash
git fetch origin
git rev-parse --short=9 origin/demo/measles
git merge-base --is-ancestor origin/develop HEAD && echo "contains develop"
```

Expected: `2e5a62c7e` and `contains develop`. If `develop` moved, run `git merge --no-ff origin/develop`, resolve by spec section 6, and repeat Tasks 13 and 14. If `demo/measles` moved, stop and tell Pablo.

- [ ] **Step 2: Run everything once**

```bash
pnpm exec tsc -b --force --noEmit && pnpm type-check
pnpm lint && pnpm check:plugin-bundle
pnpm --filter @avandar/ava-cli test
bash scripts/test-runners/run-all-tests.sh --quick 2>&1 | tail -20
actionlint .github/workflows/*.yaml
git status --short | wc -l
```

Expected: all pass, and `0` uncommitted files.

- [ ] **Step 3: Confirm the promotion is a fast-forward at both ends**

```bash
git merge-base --is-ancestor origin/demo/measles HEAD && echo "demo/measles can fast-forward"
git merge-base --is-ancestor origin/develop HEAD && echo "develop can fast-forward"
git log --oneline origin/develop..HEAD | wc -l
```

Expected: both lines print.

- [ ] **Step 4: Run the final branch review**

Use `requesting-code-review` over `2e5a62c7e..HEAD`, routed as `super-wrapper` says. Fix findings with the implementer and unit-review rows.

- [ ] **Step 5: Report to Pablo and stop**

The report gives: the tip commit, each check and its result, every deviation from this plan, every file changed outside its task's list with one sentence each, and the runbook link. Do not push. Do not rebuild `ava`: the runbook has Pablo run `pnpm build:ava-cli` on `develop` before the release.

---

## Review notes for the controller

- **High-risk tasks** (task-level review required): 2, 3, 4, 9, 10, 11, 15, 16, 17, 18, 19. They touch release safety, production deploys, migrations, or data movement.
- **Mechanical tasks:** 5, 7.
- **Ordinary:** 1, 6, 8, 12, 13, 14, 20, 21.
- The tree is not expected to pass its checks between Task 8 and Task 13. Run the full suite and strict lint once before Task 8, in Task 14, and in Task 21.
- Tasks 8 to 14 run in order, in one worktree, one at a time. Task 15 follows Task 14, and Task 16 follows Task 15. Task 17 needs Pablo's read-only access and can run alongside Stage C. Task 19 needs every earlier task.
- The final branch review covers `2e5a62c7e..HEAD` on `chore/production-cutover`.
- Stop and ask Pablo when: a tip moved (Tasks 1 and 21), the reset in Task 11 Step 2 does not fail the way the spec predicts, Task 17 finds a blocker, or a step would need a write to production, Vercel, or staging's configuration.
