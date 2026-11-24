# demo/measles: bug port tracker

Every fix listed here reaches `develop` with the `demo/measles` promotion, so
its rows need no separate PR.

Bugs fixed on `demo/measles` whose bug also exists in `develop`'s code, and
where each one stands on its way to `develop`. Before the promotion, each row
was meant to become its own PR into `develop`. Now they all arrive together
with it. Each row is tracked by one Linear issue. The Linear issue holds the repro, the
`demo/measles` commits and files to take, and the verification steps.

Where the details live:

- `F<n>` refers to a section of [pr-feature-log.md](pr-feature-log.md).
- `BUG-<n>` refers to [the AI harness bug log](../ai-harness-audit/bug-log.md).
  The feature log groups those fixes under F22.

## Keeping this current

- When a PR opens, set Status to `PR open` and fill in PR. Put
  `Fixes AVA-<n>` in the PR body so Linear links it.
- When the PR merges into `develop`, set Status to `done`.
- When a new bug fix lands on `demo/measles` and the bug is also on
  `develop`, add a row here and a Linear issue (label `bug`).
- When a bug turns out not to reproduce on `develop`, set Status to
  `not on develop` and say why in Notes.

Statuses: `no PR`, `PR open`, `done`, `not on develop`, `blocked`.

## Ready to port

These bugs need no other feature from the log first.

| Linear | Bug | Log | Pri | Pts | Status | PR | Notes |
|---|---|---|---|---|---|---|---|
| AVA-580 | Public dashboards fail for signed-out visitors | F113 | P1 | 5 | no PR | | `8acb26a6e` may also fix AVA-388 |
| AVA-572 | Case type queries with records fail with `uninspectable-source` | F63 | P1 | 2 | no PR | | Found by reading code. Confirm on `develop` first |
| AVA-581 | Displace leaves geometry-column points at exact coordinates | F114 | P1 | 3 | no PR | | |
| AVA-587 | Map area drawing breaks mid-gesture, and e2e runs are flaky | F127 | P1 | 2 | PR open | #321 | PR body lacks `Fixes AVA-587` |
| AVA-415 | SQL analyzer refuses `EXTRACT(... FROM ...)` | BUG-001 | P1 | 1 | no PR | | |
| AVA-392 | Dates shown one day early west of UTC | BUG-003 | P1 | 2 | no PR | | |
| AVA-366 | A narrow column projection breaks queries | BUG-005 | P1 | 3 | no PR | | Fixes two of three cases. Issue stays open for the multi-dataset case |
| AVA-419 | API-backed Parquet fails to load | F37 | P1 | 2 | no PR | | |
| AVA-568 | Data Sources is unreadable on phones | F20 | P2 | 2 | no PR | | |
| AVA-569 | Get started checklist covers drawer footers | F36 | P2 | 2 | no PR | | |
| AVA-570 | `ava pipeline run` gives up at 300 s and hides text errors | F38 | P2 | 2 | no PR | | |
| AVA-571 | Pipeline server imports any path a pipeline name points at | F39 | P2 | 2 | no PR | | |
| AVA-574 | List columns throw, and DECIMAL values lose their scale | F70 | P2 | 3 | no PR | | |
| AVA-575 | PDF table assistant adds no rows | F77 | P2 | 3 | no PR | | |
| AVA-576 | A long result is charted as one jagged series | F79 | P2 | 3 | no PR | | |
| AVA-577 | The offline fallback offer can't be accepted | F80 | P2 | 2 | no PR | | |
| AVA-582 | Layer popups show only 12 columns | F116 | P2 | 2 | no PR | | |
| AVA-583 | Graduated color does nothing on a geometry-only query | F117 | P2 | 3 | no PR | | |
| AVA-588 | Query errors shown in developer wording | BUG-002 | P2 | 3 | no PR | | |
| AVA-589 | Discovery lookup fails with `Catalog Error` | BUG-004 | P2 | 2 | blocked | | Imports code AVA-588 adds |
| AVA-590 | A new chat's repeated question is sent as "Try again" | BUG-006 | P2 | 2 | no PR | | |
| AVA-591 | Chat bubble shows inline SQL with `t0` aliases | BUG-008 | P2 | 2 | no PR | | |
| AVA-592 | Chat re-asks a lookup the user already answered | BUG-010 | P2 | 2 | no PR | | |
| AVA-593 | "Last year" is guessed, and blank totals are called results | BUG-011 | P2 | 3 | no PR | | |
| AVA-594 | A chart request in the explorer claims a dashboard block | BUG-012 | P2 | 3 | no PR | | |
| AVA-595 | Chart blocks the chat adds to dashboards keep `t0` aliases | BUG-013 | P2 | 2 | no PR | | |
| AVA-596 | Explorer banner reads "[Clarification answer: ...]" | BUG-014 | P3 | 1 | PR open | #324 | |
| AVA-578 | Chat empty state never shows | F92 | P3 | 1 | done | #325 | |
| AVA-579 | The slate's neutral.7 edge doesn't render | F93 | P3 | 1 | done | #326 | |
| AVA-584 | Form approximation badge shows on a collapsed drawer | F123 | P3 | 1 | done | #323 | |
| AVA-586 | Batch ESLint misresolves the video adapter's imports | F125 | P3 | 1 | done | #322 | |
| AVA-573 | CaseTypeDraftBlock tests leak toast timers | F64 | P3 | 1 | not on develop | | Clean in isolation, with the chat panel tests, and in the full frontend suite |
| AVA-585 | `pnpm type-check:deno` fails after a package build | F124 | P3 | 1 | not on develop | | `develop`'s package builds don't emit the chunked type files that fail |

## Waiting on another fix or feature

These bugs are also on `develop`, but their fix builds on another log item.
They have no Linear issue yet. File one when what they wait on is ported.

| Bug | Log | Waits on |
|---|---|---|
| Years and counts shown with decimals in the data grid | BUG-007 | AVA-392 (BUG-003) |
| A discovery lookup misses values past the first 100 | BUG-009 | AVA-589 (BUG-004) |
| An automatic lookup match is sent as the user's choice | BUG-015 | AVA-592 (BUG-010) |
| Public snapshot reads refuse case type views and allow analyzer bypasses | F69 | AVA-415 (BUG-001) |
| A case's id is sent to the model in view-change lines | F78 | BUG-015 |
| Column comparisons aren't answered from the schema | F95 | F22, F89 |
| API-backed listing copies expire | F29 | F25 |
| Catalog relation columns aren't indexed by listing | F40 | F4 |
| Plugin cards don't list what a plugin adds or reads | F109 | F100, F105 |
