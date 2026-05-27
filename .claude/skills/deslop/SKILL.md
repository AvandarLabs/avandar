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
- `/deslop continue` — confirm with the operator, then continue
  planning or migrate the next feature (whichever the state
  warrants).
- `/deslop update` — scan new commits on `feat/ict4d-demo` since the
  last analysis and add any new features to the inventory.
- `/deslop undrift [<feature-slug>]` — re-verify one (or all)
  per-feature migration plans against the current `develop` and
  patch any drift.
- `/deslop migrate <feature-slug>` — execute one feature migration
  into a refactor branch off `develop`.
- `/deslop complete [<feature-slug>]` — verify a refactor branch
  merged into `develop`, clean up, log completion, and refresh the
  next plan in the queue.

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
`STATE.md`. **Always confirm with the operator before doing any
work.** Read both files first to decide which mode you are in, tell
the operator what you would do, and only proceed after they agree.

**Mode A — planning is not yet complete.**

You are in Mode A if any of these are true:

- `ALL_FEATURES.md`'s header still says `DRAFT` (Session 2 hasn't
  validated).
- One or more rows in `ALL_FEATURES.md` does not yet have a
  matching `docs/deslop/NNN-<slug>.md` file.
- `PLAN_OF_PLANS.md`'s "Current state" section names an unfinished
  planning task.

In Mode A, tell the operator (concise — 2-3 sentences):

> "Planning is not yet complete. Per `PLAN_OF_PLANS.md`, the next
> step is **<one-line summary of the next session's task>**. I would
> work on that now. Sound good?"

Use `AskUserQuestion` with options: "Yes, continue" / "No, hold" /
"Different task". Proceed only on yes.

When you finish the planning step:

1. Update `PLAN_OF_PLANS.md`'s "Current state" section.
2. Update `STATE.md` if the planning status advanced.
3. Commit: `docs(deslop): continue planning — <one-line summary>`.
4. Push to `feat/ict4d-demo`.

**Mode B — planning is complete, fall through to migration.**

You are in Mode B if every row in `ALL_FEATURES.md` has a matching
`NNN-<slug>.md` file AND the header says `validated` or
`Ready for Phase 2`.

In Mode B:

1. Read `STATE.md`'s `In-flight migrations` table. List the slugs
   already in flight (refactor branches open).
2. Walk `ALL_FEATURES.md` top to bottom. Find the first row whose
   status is `[ ]` (not started) AND whose slug is **not** in the
   in-flight list. Call this the *next slug*.
3. Tell the operator:
   > "Planning is complete. The next slug to migrate is
   > **`<next-slug>`** (index `<NNN>`).
   > <If N>0 in-flight: There are also <N> in-flight migration(s):
   > `<slug-1>`, `<slug-2>`, ... I'd skip those and pick
   > `<next-slug>` as the next one to land.>
   > Sound good?"

   Use `AskUserQuestion` with options:
   - "Yes, migrate `<next-slug>`"
   - "Pick a different slug" (operator can then tell you which)
   - "Wait"

4. On confirmation, run the **same procedure as
   `/deslop migrate <next-slug>`** — including the
   `/deslop undrift <next-slug>` step that lives inside it.

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
2. Fetch both branches — you need `develop` to filter out features
   that already live there:
   ```sh
   git fetch origin feat/ict4d-demo develop
   ```
3. List candidate commits since the marker:
   ```sh
   git log --oneline <last-sha>..origin/feat/ict4d-demo --no-merges
   ```
   If the list is empty, tell the user "no new commits since
   `<last-sha>`" and stop.
4. **Filter out commits whose work already exists on `develop`.**
   This is critical. Some commits on `feat/ict4d-demo` did not
   originate there — they were built on `develop`, merged into
   `develop`, and then forward-ported into `feat/ict4d-demo` (see
   the drift rules in `PROCESS.md`). Those are NOT new features to
   migrate; the feature already exists in both branches. Do not add
   them to `ALL_FEATURES.md`.

   Detect them two ways, and treat a hit from EITHER as "already on
   develop, skip it":

   a. **Patch-equivalence sweep** (catches cherry-picks /
      forward-ports that got a new SHA on `feat/ict4d-demo`):
      ```sh
      git cherry origin/develop origin/feat/ict4d-demo
      ```
      Lines prefixed `-` are commits whose patch is already present
      on `develop`. Lines prefixed `+` are genuinely unique to
      `feat/ict4d-demo`. Only `+` commits are migration candidates.

   b. **Per-feature diff check** (the decisive test once you've
      grouped commits into a candidate feature): for the paths the
      feature touches,
      ```sh
      git diff origin/develop..origin/feat/ict4d-demo -- <paths>
      ```
      If this diff is empty, the code is byte-identical on both
      branches — the feature already exists on `develop`. Skip it.

   When in doubt, the per-feature diff in (b) wins: a non-empty
   diff means there is real work to migrate; an empty diff means
   there is nothing to do regardless of what the commit log
   suggests.
5. For each remaining candidate commit, decide whether it
   introduces a new feature, extends an existing row in
   `ALL_FEATURES.md`, or is plain noise (e.g. typo fixes, formatter
   runs, dependency bumps). Use:
   - `git show <sha> --stat` for scope.
   - `git show <sha>` for intent.
6. For each genuinely new feature (survived the step-4 filter AND
   has a non-empty develop-vs-ict4d diff for its paths):
   - Add a row at the next available index in `ALL_FEATURES.md`
     under the right category. Use the same shape as existing rows.
   - Write a new `NNN-feature-slug.md` using
     `FEATURE_TEMPLATE.md`. (If planning is paused between sessions
     and we are tracking these as backlog rather than authoring docs
     immediately, ask the user — `AskUserQuestion` — before writing
     the per-feature doc.)
7. For each commit that just extends an existing row, append a note
   to that row's "Sources" cell with the new commit SHA.
8. Update `docs/deslop/STATE.md`:
   - `Last analyzed commit on feat/ict4d-demo` →
     `git rev-parse origin/feat/ict4d-demo`.
   - `Last update run on` → today's date.
   - Note any added feature indices, and any candidates skipped
     because they already exist on `develop`, in the running log
     section.
9. Commit + push to `feat/ict4d-demo`:
   `docs(deslop): update inventory — <N> new features since <short-sha>`

Be conservative. When in doubt about whether a commit is a genuinely
new feature (vs. already on `develop`, vs. noise), run the
per-feature diff check in step 4b and ask via `AskUserQuestion`
before adding a row.

### `/deslop undrift [<feature-slug>]`

Re-verify per-feature migration plan(s) against the current state of
`develop` and patch any drift. This is the shared building block —
both `/deslop migrate` and `/deslop complete` call this internally.

#### When called with a slug

Re-verify exactly one plan.

1. Resolve `<feature-slug>` to `docs/deslop/<NNN>-<feature-slug>.md`
   via `ALL_FEATURES.md`. If the slug isn't in the inventory or the
   plan file doesn't exist, stop with the same error messages
   `/deslop migrate`'s preconditions use.
2. `git fetch origin develop feat/ict4d-demo`
3. Read the plan end-to-end.
4. **Already-on-develop check first.** Diff the feature's paths
   between the two branches:
   ```sh
   git diff origin/develop..origin/feat/ict4d-demo -- <feature-paths>
   ```
   If this is **empty**, the feature already exists identically on
   `develop` — there is nothing left to migrate. This happens when
   a feature was built on `develop` and later forward-ported into
   `feat/ict4d-demo`. Do not silently "fix" the plan; instead
   surface it:
   > "`<feature-slug>` appears to already exist on `develop` (no
   > diff across its paths). It looks like this feature was never
   > unique to `feat/ict4d-demo`, or has already landed. Mark it
   > `[x]` and delete the plan?"
   Use `AskUserQuestion`. On confirmation, flip the row to `[x]`
   in `ALL_FEATURES.md`, delete the plan file, log it in
   `STATE.md`'s `Completed migrations log` (note "already on
   develop, no migration needed"), commit + push, and stop. If the
   operator declines, leave everything as-is and report.
5. Otherwise (diff is non-empty), cross-check every item in the
   plan against current `develop`:
   - For every path in **Files to copy verbatim**: confirm it still
     does not exist on `develop` (or, if it does, that the content
     already matches what's intended).
   - For every path in **Files to surgically edit on `develop`**:
     confirm the file still exists and the described anchor lines /
     call sites still look the way the plan assumes.
   - For every path in **Files to delete**: confirm the file still
     exists on `develop`.
   - For every entry in **Dependency changes**: confirm the state
     in `develop`'s `package.json` matches the plan's assumption
     (not already installed, not already removed).
   - For every entry in **Depends on**: confirm those features are
     now `[x]` in `ALL_FEATURES.md`. If any prerequisite is still
     `[ ]` or `[~]`, surface this — the dependency hasn't landed
     yet, so the plan cannot be executed as written.
6. If drift is found:
   - Edit the plan to reflect current reality. Be explicit in the
     "Notes for future you" section about what changed and why.
   - Commit + push to `feat/ict4d-demo`:
     `docs(deslop): refresh <feature-slug> plan against current develop`
7. If no drift, do nothing.
8. Report a 2–3 sentence summary: already-on-develop or not, drift
   found or not, what changed if anything, whether prerequisites
   are blocking.

#### When called without a slug

Re-verify every outstanding plan.

1. Count the plans:
   ```sh
   ls docs/deslop/[0-9]*-*.md 2>/dev/null | wc -l
   ```
2. Use `AskUserQuestion`:
   > "There are <N> outstanding migration plans in `docs/deslop/`.
   > Undrift all of them?"
   Options: "Yes, undrift all <N>" / "No, cancel" / "Pick specific
   slugs" (which sends them back to `/deslop undrift <slug>`).
3. On yes, iterate every `NNN-<slug>.md` file in numeric order and
   run the same per-slug procedure for each. Batch commits — one
   commit per plan that actually drifted, no commit at all for
   plans that were already fresh.
4. Report a summary: how many plans were checked, how many drifted,
   how many were already fresh.

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

1. **Refresh the plan first** by running the
   `/deslop undrift <feature-slug>` procedure (above). If undrift
   surfaces a blocking prerequisite that hasn't landed on `develop`
   yet, stop and report — do not start the refactor branch.

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

### `/deslop complete [<feature-slug>]`

Run only when the operator has merged the refactor branch into
`develop`. Verification before mutation is non-negotiable.

#### Resolving which feature to complete

The argument is optional and may be inexact. Resolve it before
doing anything destructive.

1. **No argument given.** Read `STATE.md`'s `In-flight migrations`
   table. If empty, stop and tell the operator there is nothing to
   complete. Otherwise use `AskUserQuestion`:
   > "Which in-flight migration are we marking complete?"
   Offer up to 4 options drawn from the in-flight table; if more
   than 4 exist, show the four most recent and add an option
   "Other" so the operator can name one explicitly.

2. **Argument is an exact slug match** for a row in
   `ALL_FEATURES.md` whose status is `[~]`. Use it directly.

3. **Argument is a non-exact match** (description, partial slug,
   different casing, etc.). Make your best guess by scoring the
   argument against in-flight slugs and against `[~]` rows in
   `ALL_FEATURES.md` (substring, token overlap, edit distance).
   Then confirm via `AskUserQuestion`:
   > "Best match for `<argument>` is `<guessed-slug>` (index
   > `<NNN>`, branch `refactor-<NNN>/<guessed-slug>`). Complete
   > this one?"
   Options: "Yes, that's the one" / "No, pick a different one"
   (then re-prompt with the full in-flight list) / "Cancel".

4. **Argument matches a row whose status isn't `[~]`** — e.g. `[ ]`
   (never started) or `[x]` (already completed). Stop and tell the
   operator the row's current status; do not mutate anything.

#### Procedure (after the slug is resolved and confirmed)

1. Fetch develop:
   ```sh
   git fetch origin develop
   ```
2. Verify the merge:
   ```sh
   git merge-base --is-ancestor origin/refactor-<NNN>/<feature-slug> origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
   If `NOT-merged`, **stop**. Tell the operator the branch is not
   on `develop` yet. Take no destructive action.

3. If merged:
   - Capture the merge SHA: `git rev-parse --short origin/develop`.
   - Delete the local branch (if present):
     `git branch -D refactor-<NNN>/<feature-slug> 2>/dev/null || true`
   - Delete the remote branch:
     `git push origin --delete refactor-<NNN>/<feature-slug>`
   - **Delete the per-feature markdown:**
     `rm docs/deslop/<NNN>-<feature-slug>.md`.
     Once merged into `develop`, the code is the source of truth.
     Stale plans rot. **Always delete.**
   - Update `ALL_FEATURES.md`: change the row's status from `[~]`
     to `[x] (<merge-sha>)`.
   - Update `STATE.md`: remove the row from the `In-flight
     migrations` table; append a row to the `Completed migrations
     log` with date + merge SHA.

4. Commit + push to `feat/ict4d-demo`:
   `chore(deslop): mark <feature-slug> as completed (<merge-sha>)`

5. **Refresh the next plan in the queue.** This keeps subsequent
   migrations cheap: every completion absorbs a little of the drift
   so `/deslop migrate` later won't have to.
   - Find the next slug to migrate by the same rule as
     `/deslop continue`'s Mode B: first `[ ]` row in
     `ALL_FEATURES.md` whose slug is not in `STATE.md`'s
     `In-flight migrations`.
   - Run `/deslop undrift <next-slug>` against it. If undrift
     pushes a plan refresh, that's another commit on
     `feat/ict4d-demo`; that's expected.
   - If there is no next slug (no `[ ]` rows left), skip this step
     and tell the operator that all features are now migrated or
     in flight.

6. Report a summary: feature completed, merge SHA, next slug in
   the queue (with note on whether its plan was refreshed).

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
