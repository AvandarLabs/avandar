# Data model

## Comment shapes

difit's `GET /api/comments-json` returns the server-internal shape:

```jsonc
{ "version": 7, "threads": [
  { "id", "filePath", "position", "codeSnapshot",
    "messages": [ { "id", "body", "author", "createdAt", "updatedAt" }, … ] } ] }
```

The transcript, `--comment`, and `POST /api/comment-imports` all use the flat
**import** shape — one `thread` entry per thread root, one `reply` per later
message:

```jsonc
{ "type": "thread" | "reply", "id", "filePath", "position", "body",
  "author"?, "createdAt"?, "updatedAt"?, "codeSnapshot"? }
```

`src/difit/imports.rs` converts internal → import: the first message becomes
the `thread` entry (carrying file/position/snapshot); later messages become
`reply` entries inheriting the thread's `filePath` + `position`. Empty
`author`/timestamp strings are omitted (difit's normalizer rejects them).

Authorship: claude's replies are `author: "claude"`; every other (non-claude)
author is treated as a **reviewer** comment to dispatch. difit stamps
browser-typed comments with its hardcoded default author `"User"`; when mirroring
a snapshot into the transcript, `dif` relabels that default to the reviewer's
resolved handle (`reviewer_name()` in `src/difit/imports.rs`, from the
`DIFF_REVIEW_REVIEWER` env var that `run.sh` sets via
`scripts/get-reviewer-name.sh`, defaulting to `"reviewer"`). So the reviewer's
own comments are attributed to their handle (e.g. `jpsyx`) rather than the
generic default. `dif` otherwise never rewrites a reviewer entry; it only
appends `claude`-authored replies. See the injection contract in
[integrations.md](integrations.md#injection-baseline-then-once-each).

## Files under `.difit/`

| Path | Written by | Purpose |
| --- | --- | --- |
| `<branch>-difit-<scope>.json` | the poller | the canonical, re-injectable transcript |
| `.claude-session-<branch>-<scope>` | startup | the Claude session id to `--resume` |
| `.codex-session-<branch>-<scope>` | startup | optional Codex session id to `codex resume` |
| `dif.config.json` | config CLI | repo-local `claude_cmd` and `codex_cmd` values |
| `.session-<branch>-<scope>.json` | startup | live-session metadata (ports, pid, transcript, comparison, control URL) for the skill |
| `<branch>-difit-<scope>-guide.md` | the `diff-review` skill | the rendered diff guide (read by the diff guide view) |
| `<branch>-difit-<scope>-guide.json` | the `diff-review` skill | the structured guide the web-shell sidebar reads |
| `<branch>-difit-<scope>-summary.md` | the `diff-review` skill | the high-level diff summary shown in the web-shell sidebar |
| `<branch>-difit-<scope>-test-plan.md` | the `diff-review` skill | the manual test plan shown in the TUI Test plan tab and web-shell sidebar tab |
| `<branch>-difit-<scope>-reviewed.json` | the `diff-review` skill | reviewed-group / reviewed-file state |

Writes to the transcript are atomic (temp file + rename). They all share the
`<branch>-difit-<scope>` stem so one review's files sort together.

### Live-session metadata

`.session-<branch>-<scope>.json` is written even while the TUI is still waiting
for the first review artifacts. Its shape includes:

```jsonc
{
  "port": 4500,
  "pid": 12345,
  "comments_file": "/repo/.difit/<branch>-difit-<scope>.json",
  "comparison_key": ".",
  "shell_port": 4600,
  "shell_url": "http://127.0.0.1:4600/",
  "control_port": 4700,
  "comparison_update_url": "http://127.0.0.1:4700/comparison"
}
```

The `comparison_update_url` is live-only coordination. The `diff-review` skill
POSTs `{ "comparisonKey": "." }` there when it chose a comparison inside an
already-open waiting TUI, so `dif` can retarget its in-memory paths and ports
before starting difit. The endpoint returns `202` while the review is still
offline and `409` after the review is online.

### The diff guide, summary, test plan, and reviewed-state files

These files are owned end-to-end by the `diff-review` skill; `dif` **reads**
the guide and test-plan markdown to render them and never writes them. The Rust
side only provides the path helpers so both halves agree on the names.

- **`-guide.md`** — GitHub-flavored markdown. Always a guide to what is *left* to
  review, organized as numbered groups (`Group 1`, `Group 2`, …). The diff guide
  view renders headings, bold/italic, inline code, lists, and tables.
- **`-summary.md`** — markdown containing at most three sentences. The browser
  web shell shows it under the "Diff guide" title before the "Full diff" row.
- **`-test-plan.md`** — markdown containing numbered manual test steps. The TUI
  renders it in a separate Test plan tab before Diff guide; the browser web
  shell renders it in a separate sidebar tab, not inside the guide.
- **`-reviewed.json`** — the reviewed state the skill consults to keep the guide
  current. Shape is the skill's to define and evolve; conceptually it records
  which group numbers are fully reviewed (and thus dropped from the guide) and
  which individual files are reviewed (kept in their group but tagged), with a
  per-file signature so a later change to a reviewed file flips it back to
  needs-review.

## Slug + port derivation

- `branch_slug` — the branch name slugified (lowercase, non-alphanumerics →
  single dashes, trimmed); falls back to `branch`.
- `scope_slug` — frozen to match the `diff-review` skill's filenames:
  `.`→`dot`, `staged`→`staged`, `working`→`working`, a branch→`at-<slug>`.
- `port` — a 32-bit FNV-1a hash of `"<branch>:<scope>"` mapped into
  `4500..5000`, so the same review lands on the same URL across launches. If
  that port is occupied at launch, `dif` falls back to an OS-assigned free
  port (difit would otherwise reassign silently and strand the poller).
