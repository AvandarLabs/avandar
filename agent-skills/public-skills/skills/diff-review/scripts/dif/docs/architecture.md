# Architecture

`dif` is a Ratatui TUI that runs difit and a resumable claude session side by
side, and pipes new difit comments into claude automatically.

## Module map

```
src/
├── main.rs            entry: parse CLI, call tui::run
├── lib.rs             module declarations
├── cli.rs             clap surface (one optional comparison key)
├── comparison.rs      ComparisonKey + difit args + scope slug + CommitPolicy
├── slug.rs            slugify, branch_slug, deterministic port_for
├── git.rs             repo_root, current_branch, default-comparison, diff_signature
├── git_watcher.rs     background thread publishing the repo's diff signature
├── paths.rs           .difit transcript + session-id + guide + reviewed-state paths
├── session.rs         pure claude command builder (resume/fresh + prompt)
├── pty_pane.rs        PTY-backed pane parsed through vt100 (reused by both panes)
├── difit/
│   ├── imports.rs     server↔import comment shapes + conversion
│   ├── transcript.rs  atomic read/write of the .difit transcript
│   ├── server.rs      build the difit command, pick a free port, spawn, wait-ready
│   └── poller.rs      background thread: poll comments-json → publish + mirror
├── inject/
│   ├── dispatch.rs    open-comment detection + line/location labels (pure)
│   ├── prompt.rs      minimal per-comment prompt text (pure)
│   ├── dispatcher.rs  stateful baseline-then-dispatch-once driver (pure)
│   └── reply_watcher.rs  baseline-then-log-once detector for new claude replies (pure)
└── tui/
    ├── mod.rs         terminal setup/teardown, run()
    ├── startup.rs     spawn difit + claude + poller, assemble App
    ├── app.rs         App state + focus + main-view switching + inject + scroll + palette/restart
    ├── draw.rs        two-half layout, main-view tab strip + log/guide routing, palette overlay
    ├── draw_palette.rs  the command-palette modal renderer
    ├── palette.rs     command registry (PALETTE_COMMANDS) + PaletteState
    ├── main_diff_view.rs  the MainDiffView cycle (log view ↔ diff guide view)
    ├── guide.rs       diff guide view state: styled markdown (re-read on change) + a cursor overlay (cursor is source of truth; scroll derived to keep it visible)
    ├── vim.rs         pure vim-motion parser (count/gg prefixes) → VimMotion
    ├── open_target.rs  pure path/URL token parsing + classify; opener (nvim new tab/tmux, else `open`)
    ├── markdown/      diff-guide markdown → ratatui Text (mod.rs walk, inline.rs, table.rs)
    ├── change_alert.rs  pure change-author attribution + restart-alert wording
    ├── session_meta.rs  the live-session metadata file
    ├── event_loop.rs  50ms loop: draw, inject, route input (incl. palette + main-view keys + mouse hover)
    └── keymap.rs      key→bytes encoder + prompt injection into the claude pane
```

No file exceeds 400 lines; modules are single-purpose. The main diff pane shows
one `MainDiffView` at a time — the **log view** (difit's `vt100` screen) or the
**diff guide view** (`guide.rs` markdown rendered by `markdown/`). `dif` starts
focused on this pane (in the log view), with the claude pane already working
from its auto-submitted initial prompt (see [integrations.md](integrations.md)).

## Diff guide navigation

The diff guide view is a basic vim pager with a **visible cursor**, drawn over
the fully **styled** (colored) markdown render — `dif` keeps the heading colors,
bold, code, and tables. The cursor `(row, col)` in `Guide` is the single source
of truth: motions move it, and the scroll is *derived* each frame to keep it on
screen (`Guide::ensure_visible`, minimal movement). The draw layer renders the
styled `Text`, hands `Guide` the plain text of each line (to clamp the cursor /
move by word / resolve the token under it), then paints a real terminal block
cursor at the cursor cell (`f.set_cursor_position`, the same mechanism the PTY
panes use).

`event_loop.rs` routes bare letters to `vim::VimState` (the pure motion grammar:
counts, `gg`, etc.) while the guide view is active, and `app::App::apply_guide_motion`
maps each `VimMotion` onto a `Guide` cursor move. `o` reads the token under the
cursor (`Guide::target_under_cursor` → `open_target` pure parse + classify) and
opens the result; only the final `open_target::open` (and the browser-open for
`Ctrl+O`) shells out. The motion grammar, word-stepping, scroll-derivation, and
target parsing are all pure and unit-tested.

We render the cursor ourselves (rather than using a text-editor widget like
`tui-textarea`) specifically because such widgets render plain, unstyled text —
keeping the colored markdown render matters more than offloading the small
cursor/scroll overlay.

## Mouse capture and native ⌘-click links

All three sibling shells (`dif`, `tasks`, `brain`) capture the mouse for the
scroll wheel, but right after `EnableMouseCapture` they emit `\x1b[?1002l\x1b[?1003l`
to turn **off** mouse *motion* reporting (button-drag + any-event) that crossterm
also enables. Motion reporting suppresses iTerm2's native ⌘-hover / ⌘-click link
and Semantic-History handling; with only button + wheel reporting, holding ⌘
bypasses to the native handler while the wheel still scrolls. `dif` therefore
does **not** track the mouse position itself (the keyboard `o` opens under the
cursor instead).

## Threads

- **Main thread** — the TUI event loop (draw + input at ~50ms).
- **Per-pane reader/writer/waiter threads** — each `PtyPane` spawns three (PTY
  master → vt100 parser, mpsc channel → PTY master, child wait → exit status).
  Two panes (difit, claude) → six. A "Restart dif" respawns the difit pane: its
  old three threads wind down on EOF and three fresh ones start against the same
  parser.
- **Poller thread** — polls difit's `/api/comments-json` once a second,
  publishes the latest snapshot under a lock, and mirrors it to the transcript.
- **Git-watcher thread** — recomputes the repo's diff signature once a second
  (`git rev-parse HEAD` + `status` + `diff HEAD`, hashed) and publishes it under
  a lock, so the UI loop can notice stale-diff state without spawning git itself.

## Data flow

```
reviewer types a comment in the browser
        │
        ▼
difit server (PtyPane, left)  ──poll /api/comments-json──►  Poller thread
        ▲                                                      │
        │                                          publishes Snapshot + writes
        │                                          .difit/<…>.json transcript
        │                                                      │
   POST /api/comment-imports                                   ▼
   (claude's reply, live)                         event loop: Dispatcher
        ▲                                          (baseline, then once-each)
        │                                                      │
        └──────────── claude pane (PtyPane, right) ◄── typed prompt
```

The reviewer never has to ask claude to "address the comments": the poller
sees each new reviewer comment and the loop types it into claude. Claude posts
its reply back to the live server, which pushes it to the browser over SSE — no
restart. See [integrations.md](integrations.md).

## Difit-pane activity log

The left difit pane is more than the server's own console: `dif` writes its own
status lines into it via `PtyPane::write_to_screen` (the same primitive restart
uses), so the pane reads as a running activity log. Each UI tick,
`App::update_difit_log`:

- asks the `ReplyWatcher` for `claude` replies new since the last snapshot and
  writes a cyan `💬 Added response to comment on <file>:Lx` line per reply
  (baseline-seeded at launch, logged once each), and
- re-reads the diff guide file (`Guide::refresh`, a content diff) so the diff
  guide view reflects the skill's latest write without a restart, and
- compares the `GitWatcher`'s latest diff signature against the signature difit
  is currently showing (`served_sig`). When they diverge and the new signature
  holds steady for `CODE_CHANGE_SETTLE` (3s), it writes one orange restart
  warning. `dif` never auto-restarts (that would drop comments you're mid-typing
  in the browser). Two refinements over a single latch:
  - **Re-arm per change.** `warned_sig` records the signature last warned about;
    a *new* distinct settled signature warns again, so a manual edit after a
    prior warning still alerts. `served_sig` re-baselines and `warned_sig` clears
    on restart.
  - **Best-effort attribution.** `change_alert::change_author` (pure, unit-tested)
    decides claude-vs-manual from how recently `dif` last injected a prompt
    (`last_inject_at`, set on comment injection and `Ctrl+G`): a change within
    `CLAUDE_ATTRIBUTION_WINDOW` (120s) of an injection is credited to claude
    ("Claude made code changes…"), otherwise it reads as a manual edit ("New
    manual changes detected…").

## Command palette & difit restart

`Ctrl+P` opens an in-memory command palette (`palette.rs`); the event loop
captures its keys while open and `App::execute_palette_action` dispatches the
chosen `PaletteAction` (`RestartDifit`, `RegenerateGuide`, `OpenInBrowser`, or
`NewClaudeSession`). `Ctrl+R` / `Ctrl+G` / `Ctrl+O` / `Ctrl+N` run those
directly; each is also the palette row's dimmed `[^R]` / `[^G]` / `[^O]` /
`[^N]` shortcut hint, via `palette::shortcut_for` (the source of truth
for the hint, per the shortcut-label rule in `AGENTS.md`). "Regenerate diff
guide" types a minimal request into the claude pane; the skill writes the guide
file and the diff guide view picks it up on its next refresh. "New Claude
session" is an interrupt: it kills the running claude child and respawns the
pane on a fresh session (via `startup::fresh_claude_command`, shared with the
pane's first launch) that auto-submits the review prompt — chosen over typing
`/new` so it takes effect immediately even when claude is mid-thought. The
palette is a
pure registry + filter/selection state, so it is unit-tested without a terminal.

The "Restart dif" action restarts the difit server **in place**. `PtyPane`
gained two capabilities for this:

- `kill_child()` — signal the current child without tearing down the pane.
  Because the difit command is launched with `exec difit …`, the pane's tracked
  PID is difit itself, so the signal frees the port instead of orphaning a
  server behind the wrapper shell.
- `respawn_shell_command_with_env()` — spawn a fresh child into a new PTY while
  **reusing the existing `vt100` parser**, so the pane's screen + scrollback (the
  log) carry over. A respawn replaces the per-child handles (writer/killer/exit
  + master) but keeps the shared parser, leaving the log continuous.

`App::restart_difit` orchestrates: write a `[dif]` status line into the pane,
kill difit, `server::wait_until_port_free` (so the relaunch rebinds the same
port rather than letting difit auto-reassign), then respawn with the same
comparison/port and a freshly re-read transcript. The poller and claude pane are
untouched; the poller reconnects on its own.

## Dependencies

Matches the sibling crates (ratatui, tui-term, vt100, portable-pty, crossterm,
anyhow, clap, serde/serde_json, chrono, uuid) plus two additions:

- `ureq` — a small blocking HTTP client for the poller's GET and the readiness
  probe. Blocking fits the dedicated poller thread; no async runtime is pulled
  in.
- `pulldown-cmark` (default features off) — the canonical Rust CommonMark/GFM
  parser (used by rustdoc + mdBook). The diff guide view needs to render real
  markdown — crucially **tables** — and the sibling `tasks` crate's hand-rolled
  renderer does not do tables. We drive pulldown-cmark's event stream and render
  to ratatui ourselves (`tui/markdown/`) so the guide renders as widgets, not
  plaintext (crucially **tables**), and integrates with our pane layout. The
  diff guide view draws this styled output directly and overlays its own cursor
  (see "Diff guide navigation" above), so no text-editor widget is needed.

`#![forbid(unsafe_code)]`.
