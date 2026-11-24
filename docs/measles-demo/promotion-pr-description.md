<!--
This whole file is the promotion PR's description: the runbook's `gh pr
create --body-file` step posts it as is, and GitHub does not render this
comment. The PR title is `feat: promote the measles demo to develop`. CI checks the
title against Conventional Commits (`lint-pr-title`), so keep it as is.
-->

## What this brings

This PR promotes the `demo/measles` branch into `develop`. That branch holds
the work behind a measles outbreak demo: the 787 commits that were on
`demo/measles` and not on `develop`, plus the commits that prepare this
release. The work is grouped into features F1 to F141 in
`docs/measles-demo/pr-feature-log.md`, which describes each one. Among
them:

- case types, case records, statuses, comments, and an activity feed
- the open data catalog, its pipelines, and its search
- maps on dashboards, public dashboards, and map exports
- the AI data agent
- plugins
- data dictionaries and crosswalks

## Most of this was not reviewed

The demo was built quickly on a branch of its own, and most of these commits
never went through a pull request review. The plan was to port each feature
to `develop` later as its own reviewed pull request. That plan is replaced:
the demo's work is what ships, so it lands here as it stands, and it is
reviewed in the open after the fact.

## Where the reviews live

`docs/reviews/README.md` explains the retroactive review. In short:

- Each feature gets a public issue, labelled `retro-review`, tracked on a
  public "Retroactive review" project board.
- Reviews start with the riskiest code: access rules and the database
  functions a signed-out visitor can run, then migrations and data sync,
  then the UI.
- Findings link the code at a pinned commit. Fixes are normal pull requests
  into `develop`, and a database fix is a new migration.
- Anyone can add a finding.

The feature log becomes the review backlog for this work, and
`docs/measles-demo/bug-log.md` lists the fixes this PR brings with it.

## A known privacy gap ships with this release

Crosswalk layouts and mappings can be read by every member who can view Data
Sources, even when a dataset in the crosswalk is restricted to other people.
Such a member can read a restricted dataset's column names, source columns,
and fill rules when that dataset is alone in its layout. The membership rows
themselves stay hidden. The warning at the top of the feature log describes
it.

The release goes ahead with this gap because production has no active users
yet. The fix is the first piece of work after the release, tracked as
AVA-611.

## Migrations

- **Nothing that already ran is changed.** A migration that staging already
  ran, which drops the `plugin_installations` table, stays exactly as it is.
- **A new migration restores `plugin_installations`.** It creates the same
  table the original migration did. On production the table is created,
  dropped, and created again in one push, and it is empty the whole time.
- **Two plugin migrations get later timestamps,** with unchanged contents, so
  they run after the restore. No shared database has run them yet.
- **What each database applies:** production applies 79 migration files in
  timestamp order, staging applies 10, and a fresh local database applies
  all 194, with no difference from the declared schema in
  `supabase/schemas/`.

## How it lands

`develop` only accepts squash merges, and a squash would replace these
commits with one new commit. The feature log and the bug log cite the
original commit IDs, so this PR is used for CI and for the public record, and
a maintainer then fast-forwards `develop` to this PR's head. Every commit ID
is kept.
