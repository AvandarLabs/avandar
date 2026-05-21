# Process — de-slopping `feat/ict4d-demo` back into `develop`

This document defines what we're doing and how. Read `README.md` for
orientation first; read `PLAN_OF_PLANS.md` next for the live execution
state.

## The world today

- `feat/ict4d-demo` is the production branch (deployed live).
- `develop` is ~78 non-merge commits behind it. It is not deployed
  anywhere user-facing right now.
- `main` is stale and not in the picture until Phase 3.

The reason this is awkward: best practice is `develop → staging`,
`main → production`. We are temporarily inverted because demo work
landed directly on a long-lived feature branch and got promoted to
production from there.

## The three phases

### Phase 1 — Schema resolution (operator-driven, one-shot)

Goal: make `develop`'s database schema and generated TypeScript model
schema **byte-for-byte identical** to `feat/ict4d-demo`'s before any
Phase 2 work starts.

The operator does this manually:

1. Take all Supabase migrations from `feat/ict4d-demo` that don't
   exist on `develop` and apply them on `develop`.
2. Take the declarative schema (`supabase/schemas/`) from
   `feat/ict4d-demo` and copy it onto `develop`.
3. Regenerate all clients and models (`pnpm` codegen, parser regen,
   etc.).
4. Commit + push to `develop`.

Every feature migration markdown in this directory is written with
the assumption that **Phase 1 is already done** when the migration
starts. That means:

- Schemas already match.
- TS model types already match.
- The migration only ever has to bring **application code** over.
  It never has to write or backfill a migration.

If a migration ends up needing schema changes anyway, that's a bug
in Phase 1 — flag it back to the operator instead of paving over it.

### Phase 2 — Feature parity (agent + operator together, weeks)

Goal: bring every feature listed in `ALL_FEATURES.md` over to
`develop`, one feature per day, via reviewed PRs.

For each feature, the agent follows the
`FEATURE_TEMPLATE.md` shape. The mechanical loop:

1. Operator says: `migrate <feature-slug>`.
2. Agent reads `NNN-feature-slug.md` from this directory. Everything
   needed is in that file.
3. Agent creates branch `refactor-NNN/<feature-slug>` from current
   `develop`. (No worktree dance — this is a regular branch.)
4. Agent ports the code from `feat/ict4d-demo`. The migration doc
   spells out which files, which surgery, and what to leave behind.
5. Agent runs the test + lint + typecheck commands listed in the
   migration doc and gets them green.
6. Agent does the manual-test checklist from the migration doc.
   If the agent can't manually test (no browser, no live LLM, etc.),
   the doc says so and the agent flags it instead of claiming it
   worked.
7. Agent pushes the branch. **Does not open a PR.** The operator
   opens the PR, reviews it, may push fix-ups, then merges to
   `develop` manually.
8. Operator says: `mark <feature-slug> as completed`.
9. Agent verifies the merge actually happened (`git log
   origin/develop` shows the branch's commits, or `git merge-base
   --is-ancestor refactor-branch origin/develop` returns true).
10. On confirmed merge, agent:
    - Deletes the `refactor-NNN/<feature-slug>` branch (local + remote).
    - Deletes `NNN-feature-slug.md` from this directory.
    - Changes the status in `ALL_FEATURES.md` to `[x] completed`.
    - Commits + pushes the housekeeping change.

If the merge isn't confirmed, the agent says so and does nothing
destructive.

#### Why we delete the per-feature markdown on completion

The markdown is a TODO. Once merged into `develop`, the code itself is
the source of truth. Leaving stale plans around invites drift between
what the doc says and what shipped. `ALL_FEATURES.md` keeps a
permanent record by name + index.

#### Order of migrations

There is no fixed order in `ALL_FEATURES.md` — the operator picks each
day based on review capacity, demo timing, and risk. The dependency
graph between features is captured inside each migration doc's
`Depends on` section so a feature can't accidentally jump its
prerequisites.

### Phase 3 — Cutover (operator-driven, one-shot)

When `ALL_FEATURES.md` shows every feature complete:

1. `develop` now has feature parity with `feat/ict4d-demo` (and
   probably some additional fresh work — see "drift" below).
2. Operator merges `develop` into `main`.
3. Production deployment is repointed from `feat/ict4d-demo` to
   `main`.
4. `feat/ict4d-demo` is deleted.
5. This directory (`docs/deslop/`) is removed.

## Drift handling

The two branches will both keep moving during Phase 2. Two cases.

### `develop` gets a new feature that isn't on `feat/ict4d-demo`

Two sub-cases:

1. **Not urgent for production.** Do nothing. The feature lives on
   `develop` and ships when Phase 3 cuts over.
2. **Operator decides it's urgent for users right now.** Operator
   asks the agent to forward-port the feature onto `feat/ict4d-demo`
   and push. This is unusual (we are explicitly trying to drain
   `feat/ict4d-demo`, not add to it) and only happens when blocked
   on a real user need.

### `feat/ict4d-demo` gets a new feature that isn't on `develop`

This happens when an emergency hotfix lands on the production branch
directly (because that's where prod points today). When this happens:

1. Operator tells the agent to add the new feature to
   `ALL_FEATURES.md` with the next available index.
2. Agent writes a new `NNN-feature-slug.md` migration doc for it.
3. The feature now waits in the queue like any other.

This pattern is the unfortunate cost of having production point at a
long-lived feature branch. Once Phase 3 lands we go back to the
normal cherry-pick-into-main flow for hotfixes.

## Glossary

- **The refactor branch** — `refactor-NNN/<feature-slug>`, created
  off the current `develop` HEAD at the start of each migration.
- **The source branch** — `feat/ict4d-demo`. The code being migrated
  comes from here.
- **The target branch** — `develop`. The code lands here after the
  operator reviews the PR off the refactor branch.
- **Migration** — porting one feature from the source branch to a
  refactor branch off the target branch, ready for PR review.
- **Mark as completed** — the operator's signal that the refactor
  branch merged into `develop`. Triggers the cleanup ritual described
  in Phase 2.
- **Feature** — a logical unit of user-facing capability or
  developer-facing infrastructure. NOT a file, directory, or commit.
  A feature can span dozens of files; one file can host many
  features. Granularity goal: each feature should land in a single
  reviewable PR.

## Anti-patterns (things we explicitly do NOT do)

- ❌ Cherry-picking commits from `feat/ict4d-demo` directly. The
  history there is messy (many "fixes" / "more fixes" / "lint fixes"
  / merge commits). Refactor branches are clean re-implementations
  in spirit even when the diff happens to be byte-identical.
- ❌ Opening PRs from agent sessions. The operator opens every PR.
- ❌ Force-pushing or rebasing `develop`. Always merge.
- ❌ Modifying `feat/ict4d-demo` casually. It's production. Touch it
  only when explicitly told to (e.g. an urgent forward-port).
- ❌ Leaving per-feature markdowns around after merge. Delete them.
- ❌ Assuming a feature is done because tests pass. The operator's
  merge into `develop` is the only "done" signal that matters.
