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

Routes between two modes based on the state of `ALL_FEATURES.md` and
`STATE.md`. Always read both files first to decide which mode to
enter — do not guess.

**Mode A — planning is not yet complete.**

You are in Mode A if any of these are true:

- `ALL_FEATURES.md`'s header still says `DRAFT` (Session 2 hasn't
  validated).
- One or more rows in `ALL_FEATURES.md` does not yet have a
  matching `docs/deslop/NNN-<slug>.md` file.
- `PLAN_OF_PLANS.md`'s "Current state" section names an unfinished
  planning task.

Action: execute the next planning step `PLAN_OF_PLANS.md`
identifies (Session N work). When you finish:

1. Update `PLAN_OF_PLANS.md`'s "Current state" section.
2. Update `STATE.md` if the planning status advanced.
3. Commit: `docs(deslop): continue planning — <one-line summary>`.
4. Push to `feat/ict4d-demo`.

**Mode B — planning is complete, fall through to migration.**

You are in Mode B if every row in `ALL_FEATURES.md` has a matching
`NNN-<slug>.md` file AND the header says `validated` or
`Ready for Phase 2`.

Action:

1. Read `STATE.md`'s `In-flight migrations` table. List the slugs
   already in flight (refactor branches open).
2. Walk `ALL_FEATURES.md` top to bottom. Find the first row whose
   status is `[ ]` (not started) AND whose slug is **not** in the
   in-flight list. Call this the *next slug*.
3. If at least one in-flight migration exists, do not proceed
   silently. Use `AskUserQuestion` to ask the operator:
   > "There are N migration(s) already in flight: <slug-1>,
   > <slug-2>, ... The next available slug to migrate is
   > `<next-slug>`. Proceed?"
   Offer answers: "Yes, migrate `<next-slug>`" / "Wait" /
   "Pick a different slug" (which sends them to
   `/deslop migrate <slug>`).
4. If no in-flight migrations exist, proceed directly.
5. When the operator confirms (or no in-flight migrations exist),
   carry out the same procedure as `/deslop migrate <next-slug>`
   below. The precondition check still applies — the per-feature
   markdown must exist.

If no `[ ]` rows remain in `ALL_FEATURES.md`, tell the operator that
all features are migrated or in flight and recommend `/deslop status`
for the current picture.

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

**Hard preconditions — check these first. If any fails, STOP, tell
the operator, and do nothing else.**

1. The per-feature plan exists at
   `docs/deslop/<NNN>-<feature-slug>.md`. Resolve `<NNN>` by
   looking up `<feature-slug>` in `ALL_FEATURES.md`.
   - If the slug isn't in `ALL_FEATURES.md` at all, stop with:
     > "Slug `<feature-slug>` is not in `ALL_FEATURES.md`. Add it
     > via `/deslop update` (if it landed on `feat/ict4d-demo`
     > recently) or check the spelling."
   - If the row exists but `docs/deslop/<NNN>-<feature-slug>.md`
     does not, stop with:
     > "There is no migration plan for `<feature-slug>` yet. Run
     > `/deslop continue` to write outstanding plans first."
2. `STATE.md` shows `Phase 1: complete`. If it doesn't, stop with:
     > "Phase 1 has not been completed yet. Migrations cannot
     > start until the operator finishes Phase 1 (schema +
     > `pnpm db:gen-types`)."
3. The row in `ALL_FEATURES.md` has status `[ ]`. If it's `[~]`,
   stop and tell the operator the migration is already in flight
   (the refactor branch already exists). If `[x]`, stop and tell
   the operator the feature is already merged.

**Procedure** (only when all preconditions pass):

1. **Re-verify the plan first.** Plans were written against
   `develop` at the time they were authored. `develop` keeps
   moving. Before doing anything else:
   - `git fetch origin develop`
   - Read `docs/deslop/<NNN>-<feature-slug>.md` end-to-end.
   - Cross-check each item in the plan against current `develop`:
     - For every path in "Files to copy verbatim", confirm it
       still does not exist on `develop` (or if it does, that the
       content matches what's intended).
     - For every path in "Files to surgically edit on `develop`",
       confirm the file still exists on `develop` and the
       described anchor lines / call sites still look the way the
       plan assumes.
     - For every path in "Files to delete", confirm the file still
       exists on `develop`.
     - For every dependency in "Dependency changes", confirm the
       state in `develop`'s `package.json` matches the plan's
       assumption (not already installed, not already removed).
     - For every entry in "Depends on", confirm those features
       are now `[x]` in `ALL_FEATURES.md`. If any prerequisite is
       still `[ ]` or `[~]`, stop and tell the operator they need
       to land those first.
   - If the plan needs updates:
     - Edit `docs/deslop/<NNN>-<feature-slug>.md` to reflect the
       current reality. Be explicit in the "Notes for future you"
       section about what changed and why.
     - Commit + push the plan update to `feat/ict4d-demo` BEFORE
       starting the refactor branch:
       `docs(deslop): refresh <feature-slug> plan against current develop`
     - Then proceed with the (now-accurate) plan.
   - If the plan looks fine as written, proceed directly.

2. Create the refactor branch off the latest `develop`:
   ```sh
   git checkout -b refactor-<NNN>/<feature-slug> origin/develop
   ```

3. Port code per the plan's "Files to copy" / "Files to edit" /
   "Files to delete" / "Dependency changes" sections. If the
   feature needs a new `*Client` or TS model files for a table
   Phase 1 introduced, author them in this migration — Phase 1
   deliberately did not.

4. Run the plan's "Verification" → "Automated" commands. All must
   pass; do not move on with red.

5. Do whatever "Verification" → "Manual" steps you can in this
   environment. For steps you cannot do (no browser, no live LLM,
   etc.), say so explicitly and list what the operator needs to
   verify by hand.

6. Push the refactor branch:
   ```sh
   git push -u origin refactor-<NNN>/<feature-slug>
   ```
   **Do not open a PR.** The operator opens PRs.

7. Switch back to `feat/ict4d-demo` and update housekeeping:
   - `STATE.md` `In-flight migrations` table: add a row for this
     refactor branch (feature index, slug, branch name, date).
   - `ALL_FEATURES.md`: flip the row from `[ ]` to `[~]`.

8. Commit + push to `feat/ict4d-demo`:
   `docs(deslop): mark <feature-slug> as in flight`

9. Report a short summary to the operator: refactor branch URL,
   verification results, whether the plan needed an update, and
   what the operator still needs to verify manually.

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
