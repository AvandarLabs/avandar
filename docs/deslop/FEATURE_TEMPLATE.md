# Feature migration template

Every `NNN-feature-slug.md` file in this directory follows this shape.
Copy this file verbatim when authoring a new feature migration plan.
Replace every `{{placeholder}}` and delete anything that doesn't apply.

The audience is a code agent in a fresh session. When the operator
says `migrate <feature-slug>`, the agent reads that one file and is
expected to complete the migration without asking clarifying
questions. **If the agent has to ask the operator something, the
migration doc was incomplete — fix the doc before the next session.**

---

# {{NNN}} — {{Human-readable feature name}}

- **Slug**: `{{feature-slug}}` (kebab-case, used in branch name)
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-{{NNN}}/{{feature-slug}}`
- **Depends on**: list any other features in `ALL_FEATURES.md` that
  must be merged into `develop` before this one. Use `none` if the
  feature is standalone.
- **Estimated PR size**: rough lines-of-diff + file count from
  `git diff --stat origin/develop..feat/ict4d-demo -- <paths>`.

## Notes for future you

This section lives at the **top** of the plan (not the bottom) so
that an operator reviewing the file sees surprises, drift warnings,
and judgment calls before reading the mechanical steps below. Per
the deslop skill's "Per-feature plan authoring rules", every plan
must put Notes here.

Use this section for anything an agent (or operator) landing cold
should know before reading the steps:
- Weird gotchas, hidden constraints, or non-obvious folds.
- Why the row description in `ALL_FEATURES.md` may be stale or
  drift-prone.
- Cross-feature coupling that the dependency graph alone doesn't
  capture.
- Where the demo recording lives, where to find a corresponding
  spec/plan, etc.

Delete this section if (and only if) the feature genuinely has
nothing surprising — but most features do.

## What this feature is

One paragraph, plain language. What the user sees, why it matters.
Link to the spec in `docs/superpowers/specs/` on `feat/ict4d-demo`
if one exists. Link to the relevant checkpoint section in
`docs/ict4d-demo/CHECKPOINTS.md` if applicable.

## Steps to migrate

Mechanical, in order. **Step 0 is `/deslop undrift <feature-slug>`,
run by the skill before this list executes.** That step re-verifies
every path, dependency, and prerequisite below against the current
state of `develop` and patches the plan if anything has drifted.
Do not skip it.

1. From the current `develop` HEAD, create
   `refactor-{{NNN}}/{{feature-slug}}`:
   ```sh
   git fetch origin develop
   git checkout -b refactor-{{NNN}}/{{feature-slug}} origin/develop
   ```
2. Bring code over from `feat/ict4d-demo`. Use one of:
   - **Path-scoped checkout** (preferred when the file list is
     stable and disjoint from `develop`):
     ```sh
     git checkout feat/ict4d-demo -- <paths>
     ```
   - **Manual recreate** (when files overlap with concurrent
     `develop` work and a clean port is needed):
     spell out the per-file edits below.
3. Resolve any conflicts. Document the resolution choice inline
   below for traceability.
4. If the feature needs a new `*Client` or new TS model files for
   a table that Phase 1 introduced, create them as part of this
   migration. Phase 1 only ran `pnpm db:gen-types`; it deliberately
   did not author per-table clients/models. Do not run schema
   regen — Phase 1 is assumed done.
5. Run the verification commands listed in `Verification`.

### Files to copy verbatim

```
<list of paths, one per line>
```

These should not need any edits because they don't exist on
`develop` (or are guaranteed identical).

### Files to surgically edit on `develop`

For each one, list the exact change. Example:

- `src/components/SomeComponent/index.ts`
  - Add re-export of `SomeNewSubcomponent`.
- `src/views/SomePage/SomePage.tsx`
  - Wrap the existing tree in `<NewProvider>`.

### Files to delete

```
<list of paths, if any>
```

### Dependency changes

- New packages to install: `pnpm add <pkg>`
- Removed packages: `pnpm remove <pkg>`
- `package.json` `scripts` adjustments: spelled out.

## Verification

### Automated

Run these in order. Each must pass cleanly. Note any expected
pre-existing warnings.

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run <paths-relevant-to-this-feature>
```

If the feature has a Playwright spec, include the spec invocation.
If the feature touches an edge function, include the local
edge-function smoke command if there is one.

### Manual

Step-by-step user-perspective verification. Each step is something
a human can do. If you can't drive a browser from your session,
SAY SO and list the steps the operator should run by hand.

1. Start the dev server (`pnpm dev`).
2. Open `<page>`. Confirm `<thing>`.
3. ...

If manual verification requires production-only state (e.g. live
LLM, live Supabase storage, OAuth provider), note that here and
flag it to the operator instead of skipping it.

## Risks + things to look out for

- Common conflict points with concurrent `develop` work.
- Subtle behavioral changes a reviewer should focus on.
- Storage / migration / persistence concerns even though Phase 1
  is supposed to have handled them — paranoia is fine here.

## How to mark this feature completed

When the operator runs `/deslop complete {{feature-slug}}`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-{{NNN}}/{{feature-slug}} origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
   If `NOT-merged`, stop and tell the operator. Do nothing else.
2. If merged:
   - Capture the merge SHA:
     `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - Delete the local branch (if present):
     `git branch -D refactor-{{NNN}}/{{feature-slug}} 2>/dev/null || true`
   - Delete the remote branch:
     `git push origin --delete refactor-{{NNN}}/{{feature-slug}}`
   - Delete this file: `rm docs/deslop/{{NNN}}-{{feature-slug}}.md`
   - Edit `docs/deslop/ALL_FEATURES.md`: change the status for
     index `{{NNN}}` from `[~]` (or `[ ]`) to `[x] ($MERGE_SHA)`.
   - Edit `docs/deslop/STATE.md`: remove the entry from
     `In-flight migrations`; append to
     `Completed migrations log` with today's date and `$MERGE_SHA`.
   - Commit:
     `chore(deslop): mark {{feature-slug}} as completed ($MERGE_SHA)`
   - Push to `feat/ict4d-demo`.

## Notes for future you

(Optional free-form section. Anything an agent in a later session
might want to know: weird gotchas, why a particular file is
excluded, where the demo recording lives, etc.)
