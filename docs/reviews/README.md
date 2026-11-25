# Retroactive review

Some of the code on `develop` reached it without a pull request review. This
page explains which code that is, why it happened, and how it is being
reviewed now, after the fact.

## What landed without review

The promotion PR, titled `feat: promote the measles demo to develop`, merged
the `demo/measles` branch into `develop`. That branch held the work behind a
measles outbreak demo: 787 commits, grouped into the features F1 to F141 of
the [feature log](../measles-demo/pr-feature-log.md). The promotion PR's
description summarizes what it brought in.

Most of those commits were never reviewed. The demo was built quickly on a
branch of its own, and the plan was to port each feature to `develop` later
as its own reviewed pull request. That port was abandoned: the demo's work is
what ships to production, so it was promoted as it stands.

## Review after the commit, never a rewrite

This is post-commit review. Nobody reopens a pull request for a change that
already landed, and the history of `develop` is never rewritten to make room
for a review. The promotion landed as a fast-forward, so every commit ID the
feature log cites still points at the same code.

Each feature gets one public GitHub issue, labelled `retro-review`, with the
feature's ID in its title, such as `Retro review F98: ...`. A feature dropped
before the promotion gets no issue, since it never shipped as that feature.
F5 is the only one. A public project board named "Retroactive review" tracks
every issue through four states:

| State | Meaning |
| --- | --- |
| Not reviewed | Nobody has read the feature's code yet. |
| In review | Someone is reading it now. |
| Findings open | The review found problems that are not fixed yet. |
| Reviewed | The review is done and every finding is fixed or answered. |

## How findings and fixes work

- **A finding cites a permalink at a pinned commit.** Each issue names the
  commit its review is pinned to. A finding links the lines it is about at
  that commit, like
  `https://github.com/AvandarLabs/avandar/blob/<commit>/<path>#L10-L20`, so
  the link keeps pointing at the code that was read even after `develop`
  moves on.
- **A fix is a normal pull request into `develop`.** It is reviewed like any
  other change and links the finding it fixes.
- **A database fix is a new migration.** A migration that has already run is
  never edited, renamed, or deleted.

## Review order

The issues are worked in order of risk, in three tiers, each with its own
label:

1. **Security** (`retro-review:security`): row-level security policies, and
   the 33 database functions that a signed-out visitor (the `anon` role) can
   execute.
2. **Data** (`retro-review:data`): migrations, and the code that syncs or
   loads data.
3. **UI** (`retro-review:ui`): everything else.

A feature's tier comes from what its feature log section mentions, so it is a
starting point. A reviewer who finds that a feature belongs in a riskier tier
relabels it. For the same reason, reviewers should audit each of the 33
functions `anon` can execute on its own, not only through the features that
add them: a feature's section may not mention a function it adds, so its
issue can land outside the security tier.

## Adding a finding

Anyone can add a finding, including people outside the team:

1. Find the feature's issue on the "Retroactive review" board, or search the
   issues for `Retro review F<n>:`.
2. Comment on it with what you found, the impact you expect, and a permalink
   to the lines at the issue's pinned commit. On GitHub, press `y` on a file
   page to turn its URL into a permalink, then select the lines.
3. If the feature has no issue yet, open one with the "Retroactive review"
   issue template, which asks for the feature ID, the pinned commit, and the
   findings.

Do not post the details of a security problem that someone could exploit
today. Comment that you have a security finding and ask a maintainer for a
private way to send it, so it can be fixed before it is public.
