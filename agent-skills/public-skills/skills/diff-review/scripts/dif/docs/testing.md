# Testing

Red/green TDD: a failing test first, then the code that makes it pass. Run the
suite with `cargo test` (it finishes in a couple of seconds).

## What's tested

**Unit (inline `#[cfg(test)]`):**

- `comparison`: alias/branch parsing, difit args, scope slug (matches the
  skill's filenames), commit policy.
- `slug`: slugify, branch fallback, port range/determinism.
- `session`: Claude vs Codex command construction, resume vs fresh flags,
  prompt escaping, project-dir mangling, and the initial review prompt
  (submitted only for a fresh session, not a resume).
- `paths`: transcript + session-id + guide + reviewed-state filenames (each
  matching the skill's `<branch>-difit-<scope>` stem).
- `config`: `.difit/dif.config.json` location, defaults, and persistence.
- `git`: explicit-arg parsing and the develop→main default (faked
  `BranchProbe`); `diff_signature` moves on an edit and on a new untracked file
  (real temp repo, skipped if `git` is absent).
- `cli`: argument capture, `--codex` / `-cx`, and `config set` parsing.
- `difit::imports`: server→import conversion, field omission, id fallback,
  code-snapshot only on the thread root.
- `difit::transcript`: empty/missing detection, write→read round-trip, no
  leftover temp files.
- `difit::server`: command construction (args, flags, `exec`, `--no-open`,
  `--comment`), free-port picking, and `wait_until_port_free` (free vs occupied).
- `inject::dispatch`: open-comment detection, reviewer = any non-claude author
  (browser `"User"` and skill `"reviewer"` both dispatch; authorless/claude-only do
  not), answered/dispatched skipping, reviewer-reply-after-claude, line labels,
  baseline ids.
- `inject::dispatcher`: baseline-then-dispatch-once across snapshots; bulk
  holds and counts comments, send-all flushes them as one prompt, eager sends one
  each, PR-bound ids are never queued or sent, and a send-now comment skips the
  hold alone (once, and only after it reaches difit).
- `inject::mode`: bulk is the default, send-all and send-now ids are taken once,
  and the `/__wrap/dispatch` JSON in and out.
- `inject::prompt`: the batched send-all prompt.
- `github::anchor`: difit positions → GitHub side / line / start line.
- `github::plan` (`plan_tests.rs`): a draft thread at a range, a draft reply
  under a root on GitHub, waiting on a pending root, a PR reply in a local
  thread opening its own thread, update on an edit, nothing removed unless the
  previous snapshot held it, a removed published thread resolving (replies
  forgotten), a removed draft thread deleting its drafts, one deleted reply
  deleting on GitHub, retrying a failure only after an edit, a queued removal
  planned again after the snapshot that dropped it.
- `github::pull` (`pull_tests.rs`): new remote threads and replies under their
  authors (bots, the viewer's own as editable), placement in the matching local
  thread, a GitHub edit replacing an unchanged local body but losing to an
  unsent local edit, drafts turning published, deletions and resolves removing
  locally (with the thread's local replies), partial threads and unposted
  comments never removed, a draft kept while the pending review exists; viewed
  changes (GitHub wins first, then transitions only).
- `github::graphql`: error answers, the viewer's pending review, new threads and
  replies, threads with bots / ranges / outdated lines / paging, viewed files.
- `github::client`: thread variables (range vs single line), `gh pr view`
  parsing (open PRs only), "already gone" errors, and a hung command killed
  after the timeout (reported as a network error).
- `github::connection`: `gh`'s real unreachable-network messages vs GitHub
  refusals, the retry interval (never while the browser is offline), and the
  browser coming back online.
- `github::checkout` (`checkout_tests.rs`): the fast-forward decision (a
  reviewer's Sync stashes a dirty branch that is behind), plus a real `origin` /
  clone pair: fetching `pull/7/head` and fast-forwarding a clean branch, tracked
  edits blocking it (untracked files don't), a local commit making it diverged,
  stashed changes restored after the fast-forward, a conflicting restore naming
  the files and keeping the stash, a failed fast-forward still restoring, and a
  clean checkout never popping an older stash entry.
- `github::conflicts`: the browser's resolver names, the notice counts, and the
  LLM prompt (each file listed, `git reset -q`, `git stash drop`, no commit).
- `github::registry` / `github::session`: persistence, marking never resets a
  posted entry, session state never persisted, tombstones kept from the LLM,
  draft/failed counts (a draft with a queued removal is not a draft),
  `queuedViewed` and `queuedSubmit` persistence, own-PR detection, the browser JSON (incl.
  `conflicts`, `reviewerPulls`, `connection`, and `queued`), coming back online
  requesting a pull, answering conflicts (LLM vs reviewer), viewed event capping.
- `github::sync` offline (`sync_offline_tests.rs`, the fake GitHub's
  `set_offline`): a comment saved after the drop stays `pending` and posts on
  reconnect; launching offline leaves the PR unknown instead of failing
  comments; no calls while the browser reports no network; the retry interval;
  a draft deleted and a thread resolved offline reaching GitHub later; queued
  viewed changes sent later and never undone by the first pull, and kept while
  viewed sync is paused; a review submitted offline, including across a
  relaunch, and refused once the branch turns out to have no PR; an unreachable
  pull asked for again, not reported.
- `github::sync` (`sync_tests.rs`, against a stateful fake GitHub): draft then
  publish on submit, edit/resolve mirroring, own PR refusing approve, submit
  refusing failed comments, no PR failing comments with the reason, a pull
  importing a bot thread kept from the LLM, viewed sync both ways (one call per
  file, none for no-ops, paused off the PR's base), fast-forward vs a dirty
  branch's notice (a background pull never stashes), a reviewer's Sync
  stashing, pulling, and restoring, its conflicts waiting for an answer, and
  pulls only on request or interval.
- `difit::editor`: adding threads and messages once, setting a body, removing a
  reply vs a whole thread.
- `web::review_routes`: new message ids in a comment save (fails closed).
- `web::github_routes`: submit parsing (events, own PR comment-only),
  viewed-change parsing, and the conflict answer.
- `web::router`: `commented=1` on the `/api/diff` referer, composed with a group;
  `/__wrap/github/conflicts`.
- `web::filter`: `commented_files` (threads with messages only; unreadable means
  no filter).
- `web::meta`: `difitRestarts` in `meta.json`.
- `inject::reply_watcher`: baseline-then-log-once for new `claude` replies, with
  the `file:Lx` location; reviewer comments never logged as replies.
- `tui::keymap`: key→bytes encodings and injected prompt delivery, including
  frontend-specific delayed submit keys (`Enter` for Claude, `Tab` for Codex).
- `tui::control`: local control endpoint accepts one comparison update while
  offline, rejects invalid payloads, and returns `409` once updates are disabled.
- `tui::palette`: command registry (Refresh diff, Regenerate diff guide,
  Open diff in browser, New LLM session, Resync with GitHub), filter (by label
  and row number), selection/navigation, empty-match handling, and the `^R` /
  `^G` / `^O` / `^N` / `^S` shortcut hints.
- `tui::vim`: count and `gg` prefix accumulation, the bare-letter motions
  (`jkhl`, `w`/`b`, `d`/`u`, `G`, `o`), and unknown-key count reset.
- `tui::open_target`: token extraction under a column (with punctuation
  trimming that keeps `:`), URL vs path classification, line-ref parsing
  (`:L1-L6`, `:7`, none → 1), plain-word rejection, and the iTerm tab script.
- `tui::main_diff_view`: `Tab` / `Shift+Tab` cycle wrapping and the view labels.
- `tui::selection`: selection ordering and containment in content coordinates,
  the highlight painting exactly the selected cells, and copying out of a real
  `vt100` screen: partial rows, newlines between rows, soft-wrapped rows joined,
  trailing blanks trimmed, a wide character kept whole, and lines scrolled out
  of view read back with the scroll offset restored. Markdown views copy by
  character from their rendered lines.
- `tui::mouse`: mapping a cell onto the pane under it (borders, the tab strip,
  and the statusline map to none), clamping a drag into a pane and detecting it
  overshooting the top or bottom, and the exact mouse modes enabled (never 1003,
  never a reset).
- `tui::multi_click`: press counting (1, 2, 3, then restart; a slow press or a
  new cell starts over), the word-character set, the word under a cell in a real
  `vt100` screen (brackets and blanks excluded, wide characters whole), soft-wrap
  line spans, and the word under a markdown column.
- `clipboard`: base64 against the RFC 4648 vectors and the OSC 52 escape,
  plain and for tmux. `pbcopy` itself is not unit-tested.
- `tui::guide`: `refresh` detecting content changes (and file removal) on a
  real temp file; cursor motions moving + clamping within the content; word
  motions stepping between words across lines; `target_under_cursor` reading the
  token at the cursor; the scroll following the cursor off-screen; and
  `clamp_offset` scrolling minimally.
- `tui::change_alert`: agent-vs-manual attribution by injection recency, the
  selected-agent label, and that both alert wordings still say `Ctrl+R`.
- `tui::markdown`: headings bold, inline bold carries its modifier, unordered
  lists render bullets, tables render with borders and cells, prose word-wraps
  within the pane width; plus the inline style stack and table truncation.
- `pty_pane`: scrollback enter/return/clamp against a real PTY (`seq 1 200`),
  and respawn-reusing-the-parser (the continuous-log invariant for restart).

**Integration (`tests/difit_roundtrip.rs`):**

Two tests, each spawning a *real* difit against a throwaway git repo, covering
both directions of the transcript contract. They **skip** (do not fail) when
`git` or `difit` are unavailable.

- *Mirror:* a comment POSTed to `/api/comment-imports` is mirrored into the
  transcript by the `Poller`. Exercises the real difit contract and the
  live-reply path.
- *Inbound:* the instant-launch path. difit starts on an empty transcript, the
  reviewer comments, then the `diff-review` skill writes its round straight into
  the file. Asserts the new thread reaches the *live* server (so the open
  browser shows it) and that the transcript settles on the merged conversation
  with the reviewer's comment intact.

Also unit-tested, without difit: `difit::importer`'s decision — which entries an
out-of-band write adds, that the poller's own mirror adds none, that a deleted
comment is not resurrected, and that an unplaceable or half-written entry never
poisons the batch.

**Integration (`tests/web_shell.rs`):** the delivery mode round-trips through
`/__wrap/dispatch`, send-all reaches the shared control, a save tagged
`X-Dif-Destination: github` marks only the new comment against a stand-in difit
while still reaching it, a save tagged `X-Dif-Send: now` hands only the new
comment to the send-now queue, and `WebShell::note_difit_restart` shows up in
`meta.json`.

## What's not unit-tested

The terminal rendering and the event loop's input routing are exercised by
running `dif`, not by a unit test; they're thin glue over tested pieces
(`keymap`, `app`, `dispatcher`, `main_diff_view`, `markdown`). The PTY itself is
tested with a real child rather than a mock. The diff-guide *content* rules
(numbered groups, group/file reviewed semantics, re-review-on-change) live in
the `diff-review` skill, not this crate, so they are not unit-tested here.

The browser half of GitHub sync (`inject/destinations.js`, `inject/viewed.js`,
`shell/github.js`: the comment box toggle, the restyling, writing difit's viewed
storage, the header and review panel) depends on difit's rendered DOM and
storage, so it is checked by hand in a headless browser against a real difit,
driving the real `GithubSync` with a scripted stand-in `GithubApi`, so nothing
reaches a real PR. Real `gh` calls are never made by the suite.
