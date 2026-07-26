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
| `.claude-session-<branch>-<scope>` | startup | the claude session id to `--resume` |
| `.session-<branch>-<scope>.json` | startup | live-session metadata (port, pid, transcript, comparison) for the skill |
| `<branch>-difit-<scope>-guide.md` | the `diff-review` skill | the rendered diff guide (read by the diff guide view) |
| `<branch>-difit-<scope>-guide.json` | the `diff-review` skill | the structured guide the web-shell sidebar reads |
| `<branch>-difit-<scope>-reviewed.json` | the `diff-review` skill | reviewed-group / reviewed-file state |

Writes to the transcript are atomic (temp file + rename). They all share the
`<branch>-difit-<scope>` stem so one review's files sort together.

### The diff guide and reviewed-state files

These two are owned end-to-end by the `diff-review` skill; `dif` **reads**
the guide markdown to render it and never writes either. The Rust side only
provides the path helpers (`paths::guide_path`, `paths::reviewed_state_path`) so
both halves agree on the names.

- **`-guide.md`** — GitHub-flavored markdown. Always a guide to what is *left* to
  review, organized as numbered groups (`Group 1`, `Group 2`, …). The diff guide
  view renders headings, bold/italic, inline code, lists, and tables.
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
