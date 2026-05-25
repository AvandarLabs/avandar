# `STATE.md` — live state for the de-slop workflow

This file is the single source of truth for **meta state** about the
de-slop effort. It is read and written by every `/deslop ...` command
and by every planning session.

When something changes, update this file in the same commit. Do not
let it drift.

---

## Phase 1 — schema parity

- **Status**: `not started`
- **Completed by operator on**: _(date when Phase 1 lands on `develop`)_
- **Notes**: Phase 1 is narrow. It (a) copies all Supabase migrations
  and the declarative schema from `feat/ict4d-demo` onto `develop`,
  (b) runs `pnpm db:gen-types`, and (c) patches any resulting
  TypeScript errors with the smallest edits possible. It does NOT
  create new `*Client` or model files for the new tables — those land
  per feature during Phase 2.

When Phase 1 lands, flip the status to `complete` and record the
commit on `develop` that closed it.

---

## ALL_FEATURES inventory

- **Header status**: `DRAFT — Session 1 (2026-05-21)`
- **Last analyzed commit on `feat/ict4d-demo`**:
  `31a166db17e4c7b537d6016ddf94aa897d53f819`
  (subject: _Apply pre-PR formatter to i18n catalogs_)
- **Last update run on**: `2026-05-25`
- **Next planning session**: Session 2 — validate the draft inventory
  against the codebase per `PLAN_OF_PLANS.md`.

`/deslop update` compares the analyzed-commit SHA above against
`origin/feat/ict4d-demo` and walks any new commits. Bump the SHA
when a run is complete.

---

## In-flight migrations

Refactor branches currently open (pushed to origin, not yet merged
into `develop`). Each row is added by `/deslop migrate` and removed
by `/deslop complete`.

| Feature index | Slug | Refactor branch | Started | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |

---

## Completed migrations log

Append a row when `/deslop complete <feature-slug>` succeeds. This is
the durable record once the per-feature markdown has been deleted.

| Feature index | Slug | Merge SHA on `develop` | Completed |
|---|---|---|---|
| _(none yet)_ | | | |

---

## Update log

Append-only log of `/deslop update` runs.

- `2026-05-25` — initial state file authored. No inventory update
  yet; baseline marker set to
  `31a166db17e4c7b537d6016ddf94aa897d53f819`.
