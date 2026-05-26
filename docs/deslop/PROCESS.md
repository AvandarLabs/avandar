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

Goal: make `develop`'s **database schema** identical to
`feat/ict4d-demo`'s and make sure `develop` still type-checks.
Nothing else. No new clients, no new models, no application code
brought over.

The operator does this manually:

1. Take all Supabase migrations from `feat/ict4d-demo` that don't
   exist on `develop` and apply them on `develop`.
2. Take the declarative schema (`supabase/schemas/`) from
   `feat/ict4d-demo` and copy it onto `develop`.
3. Run `pnpm db:gen-types` to regenerate the Supabase-driven
   TypeScript types.
4. Fix every type error that results from the regenerated types.
   The fix is whatever is *minimally* needed to keep `develop`
   compiling — touch existing call sites only, do not introduce
   new abstractions, new clients, or new models.
5. Commit + push to `develop`.

What Phase 1 explicitly does **not** do:

- ❌ Create new TypeScript model files for the new tables/columns.
- ❌ Create new `*Client` files (Supabase, Dexie, etc.) for the
  new tables.
- ❌ Bring over parsers, RPC wrappers, or migration helpers tied to
  those tables.

Clients and models for new tables get created **when a Phase 2
feature needs them**, by the migration doc that introduces that
feature. Doing it earlier creates dead code on `develop` and makes
later feature migrations harder to review.

Every feature migration markdown in this directory is written with
the assumption that **Phase 1 is already done** when the migration
starts. That means:

- The database schema already matches.
- `pnpm db:gen-types` output already matches.
- `pnpm tsc -b --noEmit` is clean on `develop`.
- But: any new tables introduced by Phase 1 still have no
  TS client / model wrapper. The feature migration that needs
  them is responsible for creating those wrappers as part of its
  own scope.

If a migration ends up needing a **schema** change, that's a bug in
Phase 1 — flag it back to the operator instead of paving over it.
If a migration needs to create a new client or model for a table
that Phase 1 added, that is expected and in-scope for the feature.

### Phase 2 — Feature parity (agent + operator together, weeks)

Goal: bring every feature listed in `ALL_FEATURES.md` over to
`develop`, one feature per day, via reviewed PRs.

The mechanical loop is driven by two short commands handled by the
`deslop` skill. See `.claude/skills/deslop/SKILL.md` for the full
procedure each command runs.

1. Operator: `/deslop migrate <feature-slug>`. (Or `/deslop continue`
   once planning is done — same procedure, slug picked
   automatically with operator confirmation.)
2. Agent checks the hard preconditions: the slug exists in
   `ALL_FEATURES.md`, the per-feature markdown
   `NNN-feature-slug.md` exists, Phase 1 is complete per
   `STATE.md`, and the row is `[ ]`. If any precondition fails,
   the migration is refused.
3. Agent runs `/deslop undrift <feature-slug>` internally — the
   plan is re-verified against current `develop` and any drift is
   patched + pushed to `feat/ict4d-demo` before the refactor
   branch opens.
4. Agent creates `refactor-NNN/<feature-slug>` from current
   `develop` (regular branch — no worktree dance).
5. Agent ports the code from `feat/ict4d-demo` per the doc's
   "Files to copy" / "Files to edit" / "Files to delete" sections.
6. Agent creates any new `*Client` / TS model files the feature
   needs for tables that Phase 1 added but didn't wrap.
7. Agent runs the doc's automated verification (`tsc`, lint,
   vitest, playwright if applicable). All must be green.
8. Agent runs the doc's manual verification where it can. Steps it
   cannot do in this environment are flagged for the operator
   instead of claimed.
9. Agent pushes the refactor branch and updates `STATE.md`'s
   `In-flight migrations` table. **No PR.** The operator opens the
   PR, reviews, pushes fix-ups, and merges to `develop` manually.
10. Operator: `/deslop complete [<feature-slug>]`. The slug is
    optional; if it isn't given or isn't an exact match, the
    agent resolves it with `AskUserQuestion`.
11. Agent verifies the merge with
    `git merge-base --is-ancestor refactor-branch origin/develop`.
    If not merged, agent stops and reports — no destructive
    action.
12. On confirmed merge, agent runs the cleanup ritual: delete the
    local + remote refactor branch, **delete
    `NNN-feature-slug.md`** (stale plans rot — always delete),
    flip the row in `ALL_FEATURES.md` to `[x] (<merge-sha>)`, move
    the entry from `STATE.md`'s `In-flight migrations` to the
    `Completed migrations log`, commit + push.
13. As the final step of `/deslop complete`, the agent runs
    `/deslop undrift <next-slug>` against the next feature in the
    queue. Each completion absorbs a little drift so subsequent
    migrations have less to fix.

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
directly (because that's where prod points today). Catch it with:

1. Operator: `/deslop update`. The skill walks every commit since
   `STATE.md`'s `Last analyzed commit on feat/ict4d-demo`, decides
   which ones are features vs. noise, adds new feature rows to
   `ALL_FEATURES.md`, and writes the matching `NNN-feature-slug.md`
   migration docs.
2. The agent bumps the analyzed-commit SHA in `STATE.md`.
3. New features sit in the queue like any other until the operator
   runs `/deslop migrate <feature-slug>`.

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
