# Testing

Red/green TDD: a failing test first, then the code that makes it pass. Run the
suite with `cargo test` (it finishes in a couple of seconds).

## What's tested

**Unit (inline `#[cfg(test)]`):**

- `comparison` — alias/branch parsing, difit args, scope slug (matches the
  skill's filenames), commit policy.
- `slug` — slugify, branch fallback, port range/determinism.
- `session` — resume vs fresh flags, prompt escaping, project-dir mangling, and
  the initial review prompt (submitted only for a fresh session, not a resume).
- `paths` — transcript + session-id + guide + reviewed-state filenames (each
  matching the skill's `<branch>-difit-<scope>` stem).
- `git` — explicit-arg parsing and the develop→main default (faked
  `BranchProbe`); `diff_signature` moves on an edit and on a new untracked file
  (real temp repo, skipped if `git` is absent).
- `cli` — argument capture.
- `difit::imports` — server→import conversion, field omission, id fallback,
  code-snapshot only on the thread root.
- `difit::transcript` — empty/missing detection, write→read round-trip, no
  leftover temp files.
- `difit::server` — command construction (args, flags, `exec`, `--no-open`,
  `--comment`), free-port picking, and `wait_until_port_free` (free vs occupied).
- `inject::dispatch` — open-comment detection, reviewer = any non-claude author
  (browser `"User"` and skill `"reviewer"` both dispatch; authorless/claude-only do
  not), answered/dispatched skipping, reviewer-reply-after-claude, line labels,
  baseline ids.
- `inject::dispatcher` — baseline-then-dispatch-once across snapshots.
- `inject::reply_watcher` — baseline-then-log-once for new `claude` replies, with
  the `file:Lx` location; reviewer comments never logged as replies.
- `tui::keymap` — key→bytes encodings.
- `tui::palette` — command registry (Restart dif, Regenerate diff guide, Open
  difit in browser), filter (by label and row number), selection/navigation,
  empty-match handling, and the `^R` / `^D` / `^O` shortcut hints.
- `tui::vim` — count and `gg` prefix accumulation, the bare-letter motions
  (`jkhl`, `w`/`b`, `d`/`u`, `G`, `o`), and unknown-key count reset.
- `tui::open_target` — token extraction under a column (with punctuation
  trimming that keeps `:`), URL vs path classification, line-ref parsing
  (`:L1-L6`, `:7`, none → 1), plain-word rejection, and the iTerm tab script.
- `tui::main_diff_view` — `Tab` / `Shift+Tab` cycle wrapping and the view labels.
- `tui::guide` — `refresh` detecting content changes (and file removal) on a
  real temp file; cursor motions moving + clamping within the content; word
  motions stepping between words across lines; `target_under_cursor` reading the
  token at the cursor; the scroll following the cursor off-screen; and
  `clamp_offset` scrolling minimally.
- `tui::change_alert` — claude-vs-manual attribution by injection recency, and
  that both alert wordings name the author and still say `Ctrl+R`.
- `tui::markdown` — headings bold, inline bold carries its modifier, unordered
  lists render bullets, tables render with borders and cells, prose word-wraps
  within the pane width; plus the inline style stack and table truncation.
- `pty_pane` — scrollback enter/return/clamp against a real PTY (`seq 1 200`),
  and respawn-reusing-the-parser (the continuous-log invariant for restart).

**Integration (`tests/difit_roundtrip.rs`):**

Spawns a *real* difit against a throwaway git repo, POSTs a reviewer comment to
`/api/comment-imports`, and asserts the `Poller` mirrors it into the transcript.
This exercises the real difit contract and the live-reply path. It **skips**
(does not fail) when `git` or `difit` are unavailable.

## What's not unit-tested

The terminal rendering and the event loop's input routing are exercised by
running `dif`, not by a unit test — they're thin glue over tested pieces
(`keymap`, `app`, `dispatcher`, `main_diff_view`, `markdown`). The PTY itself is
tested with a real child rather than a mock. The diff-guide *content* rules
(numbered groups, group/file reviewed semantics, re-review-on-change) live in
the `diff-review` skill, not this crate, so they are not unit-tested here.
