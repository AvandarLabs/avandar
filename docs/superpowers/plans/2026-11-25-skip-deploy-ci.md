# Skip CI/CD Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skip automated CI/CD, package release, PR test, and React Doctor workflow jobs whenever every commit in a `push` (`main`/`develop`) or `pull_request` either contains `[skip deploy]` in its subject or only modifies safe documentation and agent-skill files.

**Architecture:** Place all pure skip-evaluation rules, git range inspection, and the GitHub Actions CLI entrypoint in a single zero-dependency TypeScript module (`scripts/ci/should-skip-ci/ShouldSkipCi.ts`) with colocated Vitest unit and temp-repo integration tests (`ShouldSkipCi.test.ts`). Wrap Node 24 setup (no `pnpm install`) and script invocation in a local composite action (`.github/actions/check-skip/action.yml`), then gate the five target workflows with a lightweight `check-skip` job that runs `actions/checkout@v5` (`fetch-depth: 0`, `filter: blob:none`) followed by `./.github/actions/check-skip`.

**Tech Stack:** TypeScript (Node 24.15.0 native type stripping, zero external dependencies), Vitest, Git CLI, GitHub Actions composite action and workflows.

**Spec:** `docs/superpowers/specs/2026-11-25-skip-deploy-ci-design.md`

## Global Constraints

- Pin Node to `24.15.0` in the composite action via `actions/setup-node@v5` with no `pnpm install` and zero third-party dependencies in `ShouldSkipCi.ts`.
- Keep all code in `scripts/ci/should-skip-ci/ShouldSkipCi.ts` free of relative runtime imports so Node 24 executes the file directly without conflicting with `.oxlintrc.json`'s `import/extensions` (`"ts": "never"`) rule.
- Follow `docs/rules/typescript.md` (functional style without `for`/`while`, <= 80 char lines and comments, <= 45 line functions, `type` over `interface`, `_`-prefixed helpers declared above the single `export const ShouldSkipCi`, explicit module-boundary types, `arrow-body-style: always`, no em dashes) and `docs/rules/testing.md` (behavioral test names, one colocated test file `ShouldSkipCi.test.ts`).
- Check `[skip deploy]` on commit subject (`%s`) only, never on the commit body.
- Fail closed (`shouldSkip: false`) on `workflow_dispatch`, unknown events, empty or all-zero `before` SHA, unreachable commits, empty commit ranges, empty commits without `[skip deploy]`, and git errors.
- Keep the `release` job directly inside `.github/workflows/release-packages.yaml` (never behind `workflow_call`) to preserve npm OIDC trusted publishing `job_workflow_ref`.
- Keep `lint-pr-title` unconditional in `.github/workflows/pr-develop.yaml` and leave `.github/workflows/claude.yml` untouched.

## Review Focus

- **Squash-merged PR body containing `[skip deploy]`:** A commit whose subject is `feat: add login (#400)` and whose body lists `* wip: docs [skip deploy]` must return `shouldSkip: false` (verified against real `git log` in Task 2).
- **Mixed push where every commit qualifies differently:** A push with Commit 1 (`Bump version to 0.15.1-dev [skip deploy]` editing `package.json`) and Commit 2 (`docs: update architecture` editing `docs/arch.md` without `[skip deploy]`) must return `shouldSkip: true`, while adding a 3rd commit editing `src/app.ts` must flip it to `shouldSkip: false` (Tasks 1 and 2).
- **Symlink type-change (`T`) and non-markdown files inside allowed folders:** Replacing `.agents/skills/foo` symlink (`120000`) with a regular file (`100644`), or modifying `agent-skills/public-skills/skills/diff-review/scripts/dif/src/cli.rs` or `docs/ai-agent/eval-runs/run/summary.json`, must return `shouldSkip: false` without `[skip deploy]` (Tasks 1 and 2).
- **Merge commits without `[skip deploy]`:** A production release merge (`Release 0.15.0`) whose first-parent diff includes `package.json` or code must return `shouldSkip: false`, whereas a merge whose first-parent diff only touches safe docs or whose subject includes `[skip deploy]` qualifies (Task 2).
- **Spaces or unicode in file paths and unreachable/all-zero SHAs:** NUL-delimited `git diff-tree -z` must parse paths like `docs/release notes/v1 guide.md` without octal quote corruption, and all-zero or unreachable `before` SHAs must fail closed to `shouldSkip: false` (Tasks 1 and 2).

## File Structure

- Create: `scripts/ci/should-skip-ci/ShouldSkipCi.ts` - Pure file/commit skip rules, `git` range evaluator, and Node 24 CLI entrypoint writing `GITHUB_OUTPUT`.
- Create: `scripts/ci/should-skip-ci/ShouldSkipCi.test.ts` - Vitest unit tests for pure rules and parsers plus temporary-git-repo integration tests for git ranges and CLI invocation.
- Create: `.github/actions/check-skip/action.yml` - Local composite action performing Node `24.15.0` setup and `ShouldSkipCi.ts` execution (called right after `actions/checkout@v5` in each workflow's `check-skip` job).
- Modify: `.github/workflows/production.yaml` - Add `check-skip` job and gate `lint-typecheck` (transitively gating `test-quick`, `test-e2e`, `migrate`).
- Modify: `.github/workflows/staging.yaml` - Add `check-skip` job and gate `lint-typecheck` (transitively gating `test-quick`, `test-e2e`, `migrate`).
- Modify: `.github/workflows/release-packages.yaml` - Add `check-skip` job and gate `release` directly in place.
- Modify: `.github/workflows/pr-develop.yaml` - Add `check-skip` job and gate `lint-typecheck` (transitively gating `test-quick`, `pr-test-e2e`) and `verify-packages`, leaving `lint-pr-title` unconditional.
- Modify: `.github/workflows/react-doctor.yml` - Add `check-skip` job and gate `react-doctor` for both `push` and `pull_request`.

---

### Task 1: Pure CI skip rules and git output parsers

help-me-pick: implement L1 (hours=1 cause=known material=familiar stakes=low verified=yes)
High-risk: no

**Files:**
- Create: `scripts/ci/should-skip-ci/ShouldSkipCi.ts`
- Create: `scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`

**Interfaces:**
- Consumes: none (Node built-ins only).
- Produces (exported from `scripts/ci/should-skip-ci/ShouldSkipCi.ts`):
  - `export type FileChangeEntry = { oldMode: string; newMode: string; status: string; filePath: string; };`
  - `export type CommitRecord = { sha: string; subject: string; changes: readonly FileChangeEntry[]; };`
  - `export type CommitLogEntry = { sha: string; parentShas: readonly string[]; subject: string; };`
  - `export type SkipDecision = { shouldSkip: boolean; reason: string; };`
  - `export const ShouldSkipCi = { isSafeFileChange, parseDiffTreeRaw, parseCommitLog, isCommitSkippable, shouldSkipCommits }`:
    - `isSafeFileChange(entry: FileChangeEntry): boolean`
    - `parseDiffTreeRaw(rawOutput: string): FileChangeEntry[]`
    - `parseCommitLog(logOutput: string): CommitLogEntry[]`
    - `isCommitSkippable(commit: CommitRecord): boolean`
    - `shouldSkipCommits(commits: readonly CommitRecord[]): SkipDecision`

- [ ] **Step 1: Write failing unit tests in `scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`**

Create `scripts/ci/should-skip-ci/ShouldSkipCi.test.ts` asserting:
- `ShouldSkipCi.isSafeFileChange`:
  - returns `true` for `.md` files under `docs/`, `agent-skills/`, `.agents/`, `.claude/skills/`, `.cursor/skills/`, and `.opencode/skills/` (including nested paths and paths containing spaces like `docs/release notes/v1 guide.md`).
  - returns `true` for `AGENTS.md`, `CLAUDE.md`, and `README.md` at repo root and nested paths (both regular mode `100644` and symlink mode `120000`).
  - returns `true` for added (`A`, `newMode: "120000"`), modified (`M`, both `"120000"`), and deleted (`D`, `oldMode: "120000"`) direct skill directory symlinks under `.agents/skills/<name>`, `.claude/skills/<name>`, `.cursor/skills/<name>`, and `.opencode/skills/<name>`.
  - returns `false` for platform markdowns outside allowed dirs (`plugins/mozambique/content/intro.md`, `public/help.md`, `DESIGN.md`, `CHANGELOG.md`, `apps/ava-video-producer/docs/guide.md`).
  - returns `false` for non-`.md` files inside allowed dirs (`docs/ai-agent/eval-runs/r1/summary.json`, `agent-skills/symlink-skills-dirs.sh`, `agent-skills/public-skills/skills/diff-review/scripts/dif/src/cli.rs`, `.agents/skills/impeccable/scripts/impeccable`, `.claude/skills/foo/script.js`).
  - returns `false` for symlink type-changes (`T` where `oldMode: "120000"` and `newMode: "100644"` or vice versa) and nested non-`.md` symlinks like `.agents/skills/foo/nested-link`.
  - returns `false` for `.mdx` files under `docs/` (`docs/page.mdx`) or path traversal (`docs/../src/app.md`).
- `ShouldSkipCi.parseDiffTreeRaw`:
  - parses NUL-delimited `git diff-tree --raw -r --no-renames -z` output including spaces in paths and multiple entries into `FileChangeEntry[]`, and returns `[]` for empty input.
- `ShouldSkipCi.parseCommitLog`:
  - parses `%H\x1f%P\x1f%s` lines (including root commits with empty parents and merge commits with two space-separated parents) into `CommitLogEntry[]`.
- `ShouldSkipCi.isCommitSkippable`:
  - returns `true` when subject contains `[skip deploy]` even if `changes` includes `package.json` or `src/app.ts` or is empty.
  - returns `false` when `changes` is empty and subject lacks `[skip deploy]`.
  - returns `true` when subject lacks `[skip deploy]` and every entry in `changes` is safe; returns `false` when any entry is unsafe.
- `ShouldSkipCi.shouldSkipCommits`:
  - returns `shouldSkip: false` when `commits` is empty.
  - returns `shouldSkip: true` when a single commit has `[skip deploy]`, when a single commit has only safe files, or when one commit has `[skip deploy]` on `package.json` and another only edits `docs/guide.md`.
  - returns `shouldSkip: false` when even one commit in a multi-commit list lacks `[skip deploy]` and touches `src/app.ts`.

- [ ] **Step 2: Run the focused Vitest suite to verify failure**

Run: `pnpm exec vitest run scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`
Expected: FAIL because `ShouldSkipCi.ts` does not exist yet.

- [ ] **Step 3: Implement the pure functions in `scripts/ci/should-skip-ci/ShouldSkipCi.ts`**

Implement the types and `_`-prefixed helpers declared above `export const ShouldSkipCi`:
- `SKIP_DEPLOY_TOKEN = "[skip deploy]"`
- `SAFE_BASENAMES = new Set(["AGENTS.md", "CLAUDE.md", "README.md"])`
- `SAFE_MARKDOWN_PREFIXES = ["docs/", "agent-skills/", ".agents/", ".claude/skills/", ".cursor/skills/", ".opencode/skills/"] as const`
- `SKILL_SYMLINK_PATTERN = /^\.(?:agents|claude|cursor|opencode)\/skills\/[^/]+$/`
- `SYMLINK_MODE = "120000"`
- Pure helpers `_hasUnsafePathSegment`, `_isSymlinkModeForStatus`, `_isSafeFileChange`, `_parseDiffTreeRaw`, `_parseCommitLog`, `_isCommitSkippable`, `_shouldSkipCommits`, exported on `ShouldSkipCi`.

- [ ] **Step 4: Run focused tests and lint**

Run: `pnpm exec vitest run scripts/ci/should-skip-ci/ShouldSkipCi.test.ts && pnpm exec oxlint scripts/ci/should-skip-ci/ShouldSkipCi.ts scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`
Expected: PASS (0 failures, 0 lint errors).

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/ci/should-skip-ci/ShouldSkipCi.ts scripts/ci/should-skip-ci/ShouldSkipCi.test.ts
git commit -m "feat(ci): add pure skip-deploy and safe-doc commit evaluator"
```

---

### Task 2: Git range evaluator and Node 24 CLI entrypoint

help-me-pick: implement L1 (hours=1 cause=known material=familiar stakes=low verified=yes)
High-risk: no

**Files:**
- Modify: `scripts/ci/should-skip-ci/ShouldSkipCi.ts`
- Modify: `scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`

**Interfaces:**
- Consumes: Task 1 exports on `ShouldSkipCi` (`parseCommitLog`, `parseDiffTreeRaw`, `shouldSkipCommits`, `SkipDecision`, `CommitRecord`).
- Produces (added to `scripts/ci/should-skip-ci/ShouldSkipCi.ts`):
  - `export type CheckSkipEnv = { eventName: string; beforeSha?: string; afterSha?: string; prBaseSha?: string; prHeadSha?: string; githubOutputPath?: string; repoDir?: string; };`
  - `ShouldSkipCi.evaluateGitRange(options: CheckSkipEnv): SkipDecision`
  - `ShouldSkipCi.runCli(options: CheckSkipEnv): SkipDecision`
  - Direct Node CLI execution when invoked as `node scripts/ci/should-skip-ci/ShouldSkipCi.ts`, reading `EVENT_NAME`, `BEFORE_SHA`, `AFTER_SHA`, `PR_BASE_SHA`, `PR_HEAD_SHA`, and `GITHUB_OUTPUT` from `process.env`, writing `should-skip=<true|false>` and single-line `reason=<text>` to `GITHUB_OUTPUT` when set, and logging the decision to stdout.

- [ ] **Step 1: Write failing temporary-git-repo and CLI integration tests in `scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`**

Add tests using isolated temp repos (`mkdtempSync` in `os.tmpdir()`, cleaned up in `afterEach`/`finally`, zero external network) asserting:
- `push` with 1 commit having `[skip deploy]` touching `package.json` returns `shouldSkip: true`.
- `push` with 2 commits - one `[skip deploy]` touching `package.json`, one without `[skip deploy]` touching `docs/guide.md`, `AGENTS.md`, `CLAUDE.md` symlink, and `.agents/skills/my-skill` symlink - returns `shouldSkip: true`.
- `push` where 1 commit has `[skip deploy]` and another touches `src/app.ts` returns `shouldSkip: false`.
- `push` with a squash-style commit whose subject is `feat: ship login (#400)` and whose body contains `* wip: notes [skip deploy]` touching `src/login.ts` returns `shouldSkip: false`.
- `push` where a commit replaces `.agents/skills/my-skill` symlink with a regular file (type-change `T`) without `[skip deploy]` returns `shouldSkip: false`.
- `push` with a path containing spaces (`docs/release notes/v1 guide.md`) returns `shouldSkip: true`.
- `push` with a 2-parent merge commit `Release 0.15.0` bringing in `package.json` changes without `[skip deploy]` returns `shouldSkip: false`, whereas a merge commit whose first-parent diff only touches `docs/guide.md` (and all range commits qualify) returns `shouldSkip: true`.
- `push` with all-zero `beforeSha` (`"0".repeat(40)`), unreachable `beforeSha`, or an `--allow-empty` commit without `[skip deploy]` returns `shouldSkip: false`.
- `pull_request` uses `prBaseSha..prHeadSha`: returns `shouldSkip: true` when all PR commits qualify and `shouldSkip: false` when any PR commit touches code.
- `workflow_dispatch` always returns `shouldSkip: false` even when `HEAD` has `[skip deploy]`.
- Direct CLI smoke test: invoking `execFileSync("node", ["scripts/ci/should-skip-ci/ShouldSkipCi.ts"], { env: ... })` with a temporary `GITHUB_OUTPUT` file exits 0 and writes `should-skip=true` and `reason=...` (verifying Node 24 native type-stripping runs with zero build step!).

- [ ] **Step 2: Run the focused Vitest suite to verify the new tests fail**

Run: `pnpm exec vitest run scripts/ci/should-skip-ci/ShouldSkipCi.test.ts`
Expected: FAIL because `evaluateGitRange` / `runCli` and CLI invocation are not implemented yet.

- [ ] **Step 3: Implement `evaluateGitRange`, `runCli`, and direct CLI guard in `scripts/ci/should-skip-ci/ShouldSkipCi.ts`**

Add helpers declared above `export const ShouldSkipCi`:
- `_runGit(args: string[], repoDir: string): string` using `execFileSync("git", args, { cwd: repoDir, encoding: "utf8" })`.
- `_commitExists(sha: string, repoDir: string): boolean` checking `git cat-file -e <sha>^{commit}` inside `try/catch`.
- `_getRangeFromEnv(options: CheckSkipEnv)` mapping `"push"` -> `beforeSha..afterSha`, `"pull_request"` -> `prBaseSha..prHeadSha`, anything else -> fail-closed reason; rejecting empty or `/^0+$/` SHAs.
- `_loadCommitRecord(entry: CommitLogEntry, repoDir: string): CommitRecord`: if `entry.subject.includes(SKIP_DEPLOY_TOKEN)` return `{ sha, subject, changes: [] }` without calling `diff-tree`; otherwise run `git diff-tree --raw -r --no-renames --no-commit-id -m --first-parent --root -z <sha>` and parse via `_parseDiffTreeRaw`.
- `_evaluateGitRange(options: CheckSkipEnv): SkipDecision`: wraps git inspection in `try/catch` so unexpected git failures fail closed (`shouldSkip: false`).
- `_runCli(options: CheckSkipEnv): SkipDecision`: calls `_evaluateGitRange`, appends `should-skip=<bool>\nreason=<single-line>\n` to `options.githubOutputPath` when provided (sanitizing newlines in `reason`), logs the decision, and returns it.
- Direct execution guard at bottom of file comparing `import.meta.url` to `pathToFileURL(realpathSync(process.argv[1])).href` so Vitest imports never trigger CLI execution.

- [ ] **Step 4: Run focused Vitest tests, lint, and type-check**

Run: `pnpm exec vitest run scripts/ci/should-skip-ci/ShouldSkipCi.test.ts && pnpm exec oxlint scripts/ci/should-skip-ci/ShouldSkipCi.ts scripts/ci/should-skip-ci/ShouldSkipCi.test.ts && pnpm exec tsc -b --noEmit`
Expected: PASS (all unit + temp-repo + Node 24 CLI tests green, 0 lint errors, 0 TS errors).

- [ ] **Step 5: Commit Task 2**

```bash
git add scripts/ci/should-skip-ci/ShouldSkipCi.ts scripts/ci/should-skip-ci/ShouldSkipCi.test.ts
git commit -m "feat(ci): add git range inspection and Node 24 CLI for skip-deploy gate"
```

---

### Task 3: Composite action and workflow gating across all 5 workflows

help-me-pick: implement L1 (hours=0.5 cause=known material=familiar stakes=medium verified=yes)
High-risk: no

**Files:**
- Create: `.github/actions/check-skip/action.yml`
- Modify: `.github/workflows/production.yaml`
- Modify: `.github/workflows/staging.yaml`
- Modify: `.github/workflows/release-packages.yaml`
- Modify: `.github/workflows/pr-develop.yaml`
- Modify: `.github/workflows/react-doctor.yml`

**Interfaces:**
- Consumes: `scripts/ci/should-skip-ci/ShouldSkipCi.ts` CLI env vars (`EVENT_NAME`, `BEFORE_SHA`, `AFTER_SHA`, `PR_BASE_SHA`, `PR_HEAD_SHA`, `GITHUB_OUTPUT`).
- Produces: `.github/actions/check-skip/action.yml` composite action with:
  - Inputs: `node-version` (default `"24.15.0"`).
  - Outputs: `should-skip` (`${{ steps.evaluate.outputs.should-skip }}`), `reason` (`${{ steps.evaluate.outputs.reason }}`).

- [ ] **Step 1: Create `.github/actions/check-skip/action.yml`**

Composite action steps (callers run `actions/checkout@v5` with `fetch-depth: 0` and `filter: blob:none` first, because GitHub Actions reads local composite actions from the checked-out workspace):
1. `actions/setup-node@v5` with `node-version: ${{ inputs.node-version }}`.
2. `id: evaluate`, `shell: bash`, passing `EVENT_NAME: ${{ github.event_name }}`, `BEFORE_SHA: ${{ github.event.before }}`, `AFTER_SHA: ${{ github.sha }}`, `PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}`, `PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}` and running `node scripts/ci/should-skip-ci/ShouldSkipCi.ts`.

- [ ] **Step 2: Wire `check-skip` gate job into all five workflow files**

In every workflow below, the `check-skip` job runs `actions/checkout@v5` (`fetch-depth: 0`, `filter: blob:none`) followed by `id: skip`, `uses: ./.github/actions/check-skip`, exposing `outputs.should-skip: ${{ steps.skip.outputs.should-skip }}`:
- `.github/workflows/production.yaml`: add `check-skip` job (`runs-on: ubuntu-latest`, `timeout-minutes: 5`) passing `node-version: ${{ env.NODE_VERSION }}`; add `needs: check-skip` and `if: needs.check-skip.outputs.should-skip != 'true'` to `lint-typecheck` (`test-quick`, `test-e2e`, and `migrate` already depend on `lint-typecheck` / `test-quick`).
- `.github/workflows/staging.yaml`: same wiring as `production.yaml`.
- `.github/workflows/release-packages.yaml`: add `check-skip` job with `permissions: contents: read` passing `node-version: ${{ env.NODE_VERSION }}`; add `needs: check-skip` and `if: needs.check-skip.outputs.should-skip != 'true'` to `release` (keeping `release` directly inside `release-packages.yaml` for npm OIDC).
- `.github/workflows/pr-develop.yaml`: add `check-skip` job passing `node-version: ${{ env.NODE_VERSION }}`; keep `lint-pr-title` untouched; add `needs: check-skip` and `if: needs.check-skip.outputs.should-skip != 'true'` to both `lint-typecheck` and `verify-packages` (`test-quick` and `pr-test-e2e` skip transitively via `lint-typecheck`).
- `.github/workflows/react-doctor.yml`: add `check-skip` job (using composite action default Node `24.15.0`); add `needs: check-skip` and `if: needs.check-skip.outputs.should-skip != 'true'` to `react-doctor`.

- [ ] **Step 3: Validate YAML syntax, full focused tests, lint, and type-check**

Run:
```bash
node -e 'const fs=require("node:fs"); const files=[".github/actions/check-skip/action.yml",".github/workflows/production.yaml",".github/workflows/staging.yaml",".github/workflows/release-packages.yaml",".github/workflows/pr-develop.yaml",".github/workflows/react-doctor.yml"]; for (const f of files) { const s=fs.readFileSync(f,"utf8"); if (!s.includes("check-skip") && f.includes("workflows")) throw new Error("missing check-skip in "+f); } console.log("workflow wiring ok");' \
  && python3 -c 'import yaml, glob; [yaml.safe_load(open(f)) for f in [".github/actions/check-skip/action.yml"] + sorted(glob.glob(".github/workflows/*.y*ml"))]; print("YAML valid")' \
  && pnpm exec vitest run scripts/ci/should-skip-ci/ShouldSkipCi.test.ts \
  && pnpm lint \
  && pnpm type-check
```
Expected: YAML parses cleanly across the composite action and all 6 workflows, Vitest passes, `pnpm lint` passes, `pnpm type-check` passes.

- [ ] **Step 4: Commit Task 3**

```bash
git add .github/actions/check-skip/action.yml .github/workflows/production.yaml .github/workflows/staging.yaml .github/workflows/release-packages.yaml .github/workflows/pr-develop.yaml .github/workflows/react-doctor.yml
git commit -m "chore(ci): gate all CI/CD, release, PR, and React Doctor workflows on skip-deploy"
```

---

## Final Review

help-me-pick: bug-hunting-and-code-review L3 (hours=0.5 cause=known material=familiar stakes=medium verified=yes)
