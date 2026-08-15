# Supabase Local Configuration Guard Design

## Goal

Keep the shared local Supabase configuration canonical on `develop` and prevent
temporary branch-scoped Supabase instances from entering commits, merges, or
pushes.

## Agent workflow

Before database migration or schema work on a branch other than `develop`, an
agent derives a temporary project id from the current branch name. The
derivation lowercases the name, replaces every run of characters outside
`a-z`, `0-9`, and `_` with `-`, collapses repeated hyphens, and trims leading
and trailing hyphens. For example, `feat/analytics-p2` becomes
`feat-analytics-p2`.

The agent runs `ava supabase switch <temporary-project-id>` before migration
work, even if no local Supabase containers are currently running. The isolated
configuration stays active unless the user asks for a merge into `develop`.
For an authorized merge to `develop`, the agent runs `ava supabase restore`
before staging, committing, or merging. If no merge is requested, the user is
responsible for restoring the standard local instance.

## Canonical configuration

The validator accepts only the standard local configuration in
`supabase/config.toml`:

- root `project_id = "avandar"`
- `api.port = 54321`
- `db.port = 54322`
- `db.shadow_port = 54320`
- `db.pooler.port = 54329`
- `studio.port = 54323`
- `inbucket.port = 51634`
- `edge_runtime.inspector_port = 8083`
- `analytics.port = 54327`

It ignores comments and remote configuration sections. The checks are
deliberately fixed rather than comparing with `develop`, so a bad `develop`
configuration cannot become the baseline.

## Hook architecture

A small shell validator receives TOML through standard input and exits nonzero
when any canonical value differs. It identifies the offending key and tells
the contributor to run `ava supabase restore`, stage the restored configuration,
and retry. It does not restore automatically because restoration stops and
removes the temporary local stack.

Three hooks invoke the validator:

- `pre-commit` checks the working tree on `develop`, plus the staged
  `supabase/config.toml` blob on every branch when that file is staged.
- `pre-merge-commit` checks the merged working tree when the target branch is
  `develop`.
- `pre-push` checks every non-deleted local Git tree submitted for push before
  its existing translation and formatting stages run.

`pre-merge-commit` is defense in depth only. Git does not run it for
fast-forward merges, and it does not run after a conflict is resolved. The
pre-commit and pre-push checks cover those paths.

## Tests and verification

Focused Vitest coverage runs the validator with temporary TOML fixtures. It
proves that the canonical configuration and stdin input pass; altered project
ids and each protected port fail with restoration guidance; comments and
remote values do not affect the result. Shell syntax checks cover all hooks.

No hook writes configuration, starts containers, or contacts any Supabase
project.
