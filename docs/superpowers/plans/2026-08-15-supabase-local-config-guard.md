# Supabase Local Configuration Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent temporary local Supabase settings from being committed,
merged into `develop`, or pushed.

**Architecture:** A stdin-based shell validator owns the canonical TOML checks.
Git hooks call it against the appropriate working, staged, merged, or pushed
Git tree; `AGENTS.md` defines when agents switch and restore local instances.

**Tech Stack:** Bash, Git hooks, Vitest, Node.js 22.

## Global Constraints

- Do not write to any Supabase database or remote project.
- Standard local configuration is project `avandar` with the documented ports.
- A hook must fail with `ava supabase restore` guidance and must not restore
  automatically.
- Do not commit, push, or merge these changes without user authorization.

---

### Task 1: Add the canonical configuration validator

**Files:**

- Create: `scripts/supabase/validate-standard-local-config.sh`
- Create: `scripts/supabase/validate-standard-local-config.test.ts`

**Interfaces:**

- Consumes: TOML on standard input.
- Produces: exit zero for the canonical configuration; exit one and restoration
  guidance for an invalid project id or protected port.

- [x] Write failing Vitest fixtures for canonical, changed, commented, remote,
      and stdin configuration behavior.
- [x] Run `pnpm vitest run scripts/supabase/validate-standard-local-config.test.ts`
      and confirm the new test fails because the validator is absent.
- [x] Implement the smallest stdin parser that reads only root and local section
      assignments, then checks every canonical key.
- [x] Re-run the focused Vitest test and confirm it passes.

### Task 2: Wire Git guards

**Files:**

- Create: `.githooks/pre-commit`
- Create: `.githooks/pre-merge-commit`
- Modify: `.githooks/pre-push`

**Interfaces:**

- Consumes: the working tree, Git index, and pre-push ref lines.
- Produces: nonzero hooks when a checked tree has nonstandard
  `supabase/config.toml` values.

- [x] Add working-tree and staged-index validation to `pre-commit`.
- [x] Add target-branch validation to `pre-merge-commit`.
- [x] Preserve pre-push ref input while validating every non-deleted local SHA
      before its existing i18n and formatting stages.
- [x] Run `bash -n` for all three hooks and manually exercise the validator
      against canonical and modified fixture input.

### Task 3: Record the agent workflow

**Files:**

- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: current Git branch and an authorized merge request.
- Produces: explicit `ava supabase switch` and `ava supabase restore` rules.

- [x] Add the non-`develop` migration isolation, branch-id derivation, restore,
      and no-commit rules under the Supabase section.
- [x] Verify the documented command names match the Ava CLI command source.

### Task 4: Verify the completed guard

**Files:**

- Verify only.

- [x] Run the focused validator test.
- [x] Run `bash -n .githooks/pre-commit .githooks/pre-merge-commit .githooks/pre-push scripts/supabase/validate-standard-local-config.sh`.
- [x] Run the validator against the checked-in `supabase/config.toml`.
- [x] Review the final diff and confirm existing unrelated changes remain intact.
