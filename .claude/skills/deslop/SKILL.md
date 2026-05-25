---
name: deslop
description: >
  Use this skill whenever the user types a `/deslop` command (`/deslop list`,
  `/deslop status`, `/deslop continue`, `/deslop update`,
  `/deslop migrate <feature-slug>`, `/deslop complete <feature-slug>`) or asks
  in free-form about the de-slop workflow that migrates features from
  `feat/ict4d-demo` (current production branch) into `develop`. Triggers
  include phrases like "de-slop", "deslop", "ICT4D demo branch parity",
  "feature migration", "refactor branch", or any reference to the planning
  docs under `docs/deslop/`.
metadata:
  tags: deslop, ict4d-demo, develop, branch-management, migration
---

# `/deslop` — drive the `feat/ict4d-demo` → `develop` migration

The team's production branch is `feat/ict4d-demo`, not `main`. We are
draining it back into `develop` one feature at a time so we can return
to a normal `develop → main` release flow. Every artifact for this
effort lives in `docs/deslop/`.

Whenever the user invokes one of the `/deslop ...` commands below,
follow the corresponding procedure verbatim. Free-form mentions of
de-slop work also belong here — treat them as if the user had typed
the closest matching command and confirm with `AskUserQuestion` if
ambiguous.

If a command needs context you don't have, **read the markdowns in
`docs/deslop/`** before guessing. The canonical files are:

- `docs/deslop/README.md` — orientation.
- `docs/deslop/PROCESS.md` — the three-phase workflow and drift rules.
- `docs/deslop/PLAN_OF_PLANS.md` — the live planning state.
- `docs/deslop/FEATURE_TEMPLATE.md` — the shape each per-feature
  migration doc must take.
- `docs/deslop/ALL_FEATURES.md` — the master feature inventory.
- `docs/deslop/STATE.md` — meta state: last analyzed commit on
  `feat/ict4d-demo`, planning status, in-flight refactor branches.
- `docs/deslop/NNN-feature-slug.md` — one per planned migration.

---

## Command reference

### `/deslop list` (alias: `/deslop help`)

Print the command list below to the user as a short bulleted summary
with one-line descriptions. Do not perform any other action.

- `/deslop list` — show this list.
- `/deslop status` — current planning + migration state.
- `/deslop continue` — continue planning from where the last session
  left off.
- `/deslop update` — scan new commits on `feat/ict4d-demo` since the
  last analysis and add any new features to the inventory.
- `/deslop migrate <feature-slug>` — execute one feature migration
  into a refactor branch off `develop`.
- `/deslop complete <feature-slug>` — verify a migration merged into
  `develop` and run the cleanup ritual.

### `/deslop status`

Report — in plain text, under 200 words — the answers to:

1. What does `docs/deslop/STATE.md` say the last analyzed commit on
   `feat/ict4d-demo` is, and how many new commits exist since
   (`git log --oneline <last-sha>..origin/feat/ict4d-demo --no-merges
   | wc -l`)?
2. What is the `ALL_FEATURES.md` header status — `DRAFT`, `validated`,
   or `Ready for Phase 2`?
3. How many feature rows are in `ALL_FEATURES.md` total / `[x]`
   completed / `[~]` in progress / `[ ]` not started?
4. How many `NNN-feature-slug.md` files exist? Does that match the
   number of incomplete rows in `ALL_FEATURES.md`?
5. List any refactor branches still in progress (per `STATE.md`'s
   `In-flight migrations` section).

No file edits.

### `/deslop continue`

Read `docs/deslop/PLAN_OF_PLANS.md` and execute the next planning
step it identifies (Session N work). The plan-of-plans determines
which session you are based on the directory state — do not second-
guess it.

When you finish a session's work:

1. Update the "Current state" section of `PLAN_OF_PLANS.md`.
2. Update `docs/deslop/STATE.md` if you advanced the analyzed-commit
   marker or finished a planning phase.
3. Commit:
   `docs(deslop): continue planning — <one-line summary>`
4. Push to `feat/ict4d-demo` (this is the canonical branch for all
   `docs/deslop/` content).

### `/deslop update`

The point of this command: `feat/ict4d-demo` keeps shipping
hot-patches because it's production. Each one is a feature that
needs to migrate. Capture them.

Procedure:

1. Read the `Last analyzed commit on feat/ict4d-demo` value from
   `docs/deslop/STATE.md`.
2. Fetch:
   ```sh
   git fetch origin feat/ict4d-demo
   ```
3. List new commits since the marker:
   ```sh
   git log --oneline <last-sha>..origin/feat/ict4d-demo --no-merges
   ```
   If the list is empty, tell the user "no new commits since
   `<last-sha>`" and stop.
4. For each new commit, decide whether it introduces a new feature,
   extends an existing row in `ALL_FEATURES.md`, or is plain noise
   (e.g. typo fixes, formatter runs, dependency bumps). Use:
   - `git show <sha> --stat` for scope.
   - `git show <sha>` for intent.
5. For each genuinely new feature:
   - Add a row at the next available index in `ALL_FEATURES.md`
     under the right category. Use the same shape as existing rows.
   - Write a new `NNN-feature-slug.md` using
     `FEATURE_TEMPLATE.md`. (If planning is paused between sessions
     and we are tracking these as backlog rather than authoring docs
     immediately, ask the user — `AskUserQuestion` — before writing
     the per-feature doc.)
6. For each commit that just extends an existing row, append a note
   to that row's "Sources" cell with the new commit SHA.
7. Update `docs/deslop/STATE.md`:
   - `Last analyzed commit on feat/ict4d-demo` →
     `git rev-parse origin/feat/ict4d-demo`.
   - `Last update run on` → today's date.
   - Note any added feature indices in the running log section.
8. Commit + push to `feat/ict4d-demo`:
   `docs(deslop): update inventory — <N> new features since <short-sha>`

Be conservative. When in doubt, ask via `AskUserQuestion` whether a
commit qualifies as its own feature row.

### `/deslop migrate <feature-slug>`

Execute one feature migration into a refactor branch off `develop`.
Pre-conditions:

- Phase 1 has been completed by the operator. If `STATE.md` does
  not show `Phase 1: complete`, stop and tell the user.
- The feature has an `NNN-feature-slug.md` in `docs/deslop/` and a
  matching row in `ALL_FEATURES.md` with status `[ ]`.

Procedure:

1. Read `docs/deslop/NNN-<feature-slug>.md` end-to-end. Everything
   needed for the migration is in that file.
2. Follow the file's "Steps to migrate" section in order:
   - `git fetch origin develop`
   - `git checkout -b refactor-NNN/<feature-slug> origin/develop`
   - Port code per the doc's "Files to copy" / "Files to edit" /
     "Files to delete" / "Dependency changes" sections.
   - If the feature needs a new `*Client` or TS model files for a
     table Phase 1 introduced, author them in this migration — Phase
     1 deliberately did not.
3. Run the verification commands in the doc's "Verification" →
   "Automated" section. All must pass; do not move on with red.
4. Do whatever "Verification" → "Manual" steps you can in this
   environment. For steps you cannot do (no browser, no live LLM,
   etc.), say so explicitly and list what the operator needs to
   verify by hand.
5. Push:
   ```sh
   git push -u origin refactor-NNN/<feature-slug>
   ```
   **Do not open a PR.** The operator opens PRs.
6. Update `docs/deslop/STATE.md` `In-flight migrations` table:
   add a row for this refactor branch (slug, branch name, date).
7. Update the row in `ALL_FEATURES.md` from `[ ]` to `[~]`.
8. Commit + push the housekeeping change to `feat/ict4d-demo`:
   `docs(deslop): mark <feature-slug> as in flight`
9. Report a short summary to the user: branch pushed, verification
   results, what they need to manually test.

### `/deslop complete <feature-slug>`

Run only when the operator has merged the refactor branch into
`develop` and tells you to mark it complete. Verification before
mutation is non-negotiable.

Procedure:

1. Fetch develop:
   ```sh
   git fetch origin develop
   ```
2. Verify the merge:
   ```sh
   git merge-base --is-ancestor origin/refactor-NNN/<feature-slug> origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
   If `NOT-merged`, **stop**. Tell the user the branch is not on
   `develop` yet. Take no destructive action.
3. If merged:
   - Capture the merge SHA: `git rev-parse --short origin/develop`.
   - Delete the local branch (if present):
     `git branch -D refactor-NNN/<feature-slug> 2>/dev/null || true`
   - Delete the remote branch:
     `git push origin --delete refactor-NNN/<feature-slug>`
   - Delete `docs/deslop/NNN-<feature-slug>.md`.
   - Update `ALL_FEATURES.md`: change the row's status from `[~]`
     (or `[ ]`) to `[x] (<merge-sha>)`.
   - Update `STATE.md`: remove the row from the `In-flight
     migrations` table; append to the `Completed migrations` log
     with date + merge SHA.
4. Commit + push to `feat/ict4d-demo`:
   `chore(deslop): mark <feature-slug> as completed (<merge-sha>)`

---

## When *not* to do something

- **Never open a PR.** The operator opens every PR. Pushing the
  refactor branch is where your job ends in `/deslop migrate`.
- **Never push to `develop` or `main`.** Refactor branches push to
  their own namespace; `docs/deslop/` housekeeping pushes to
  `feat/ict4d-demo`.
- **Never modify `feat/ict4d-demo` source code from this skill.**
  The only files this skill writes on that branch live under
  `docs/deslop/`, `.claude/skills/deslop/`, and (transitively, via
  `/deslop update` reads only) `git` itself.
- **Never delete a per-feature markdown without verifying the merge
  first.** Step 2 of `/deslop complete` is the gate.
- **Never assume Phase 1 is done.** Read `STATE.md` first. Phase 1
  is narrow: Supabase schema parity + `pnpm db:gen-types` + minimal
  type-error patches. No new clients/models — those land per feature
  in Phase 2.
