# Keybindings

This file covers the **terminal TUI**. The browser **web shell** is a separate
surface with its own command palette (`⌘K` / `Ctrl+K`) and navigation hotkeys
(`Ctrl+1..9` groups, `Ctrl+F` full diff, `Ctrl+H` toggle sidebar) — see
[web-shell.md](web-shell.md#header-chrome-command-palette--hotkeys).

Global (work from either pane):

| Key | Action |
| --- | --- |
| `Alt+H` | focus the left **main** (diff) view |
| `Alt+L` | focus the right **LLM** pane |
| `Alt+U` / `Alt+D` | scroll the focused view a half-page up / down (guide view moves its cursor; a PTY pane scrolls half its visible rows) |
| `Alt+K` / `Alt+J` | scroll the focused view one line up / down |
| `Ctrl+P` | open the **command palette** (works from either pane) |
| `Ctrl+R` | restart the difit server (the palette's "Restart diff server") |
| `Ctrl+G` | regenerate the diff guide (the palette's "Regenerate diff guide") |
| `Ctrl+O` | open the difit server URL in the default browser (the palette's "Open diff in browser") |
| `Ctrl+N` | start a fresh LLM session (interrupts: kills the running LLM and respawns it on a new session that auto-submits the review prompt; the palette's "New LLM session") |
| `Ctrl+Q` | quit `dif` (tears down difit, the LLM, and the poller) |
| `Alt+S` | show the keyboard-shortcuts help modal (also pinned at the right of the bottom statusline) |

`Alt+H` / `Alt+L` switch focus; `Alt+U` / `Alt+D` scroll the focused view a
half-page, while `Alt+K` / `Alt+J` scroll it one line at a time. These are
keyboard-only alternatives to the wheel that never depend on terminal mouse
reporting. `Ctrl+P` / `Ctrl+R` / `Ctrl+G` / `Ctrl+O` /
`Ctrl+N` / `Ctrl+Q` are the command keys. The `Alt` and `Ctrl` commands are intercepted
globally **before** keys are forwarded to the LLM, so they never reach the
LLM session. That is what lets `Alt+U`/`Alt+D` and `Alt+K`/`Alt+J` scroll while
the LLM pane is focused. When the **LLM** pane is focused, every other key is forwarded to the
frontend. The cursor shows in the focused pane.

## Command palette

While the palette is open it captures all keys:

| Key | Action |
| --- | --- |
| `↑` / `↓` | move the selection |
| `Ctrl+J` / `Ctrl+K` | move the selection (vim-style) |
| printable chars | filter the command list |
| `Backspace` | delete a filter character |
| `Enter` | run the selected command |
| `Esc` / `Ctrl+C` | close the palette |

See [config.md](config.md#command-registry) for the command list.

When the **main** (diff) view is focused (read-only). Keys common to both views:

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | cycle the main view forward / backward (Logs ↔ Diff guide) |
| `Up` / `Down` | scroll the active view 3 rows |
| `PageUp` / `PageDown` | scroll the active view 20 rows |
| mouse wheel | scroll the focused pane |

There are **no bare-letter shortcuts to switch views** — use `Tab` /
`Shift+Tab`. In the **diff guide** view, the bare letters instead drive a basic
vim pager with a visible cursor (drawn over the fully styled/colored markdown):

| Key | Action |
| --- | --- |
| `j` / `k` | move the cursor down / up one line (`3j` moves 3) |
| `h` / `l` | move the cursor left / right one column |
| `w` / `b` | move the cursor forward / back one word (`8w`) |
| `d` / `u` | scroll down / up half a page |
| `gg` / `G` | jump to the top / bottom |
| `o` | open the file path or URL **under the cursor** |
| (any motion) | accepts a numeric count prefix, e.g. `3j`, `8w` |

`o` opens whatever the cursor is on: a URL or a non-text path (e.g. a directory)
goes to the system default handler (`open`); a plain-text file opens in `nvim`
in a new tmux window (when inside tmux) or a new iTerm2 tab otherwise.

`Tab` / `Shift+Tab` and the vim keys are scoped to the main view (they are not
command-palette actions). They work only when it is focused: the LLM pane
forwards every key, including `Tab` and bare letters, straight to the frontend, so
focus it with `Alt+H` first. These follow the sibling `tasks`/`brain` focus
convention: `Alt+H` for the left pane, `Alt+L` for the right LLM pane.

## Mouse, and native ⌘-click links

`dif` (like the sibling `tasks` / `brain` shells) captures the mouse only for
**button + wheel** events — it deliberately turns off mouse *motion* reporting
(DECSET 1002/1003) that crossterm's `EnableMouseCapture` would also enable. With
motion reporting off, holding **⌘** lets iTerm2 bypass mouse reporting and use
its native link / Semantic-History handling: ⌘-hover underlines a URL or file
path and ⌘-click opens it (the same handler `o` uses from the keyboard).

**The scroll wheel is best-effort, not guaranteed.** Keeping ⌘-click working
(motion reporting off) is in tension with wheel delivery: on the user's iTerm2
the wheel emits **no** mouse events while motion reporting is off, so the panes
don't scroll with it. We deliberately do **not** re-enable motion reporting to
recover the wheel — it risks silently breaking ⌘-click (unconfirmed on that
iTerm2 version) and is fragile, terminal-specific behavior these shells
shouldn't depend on. Use **`Alt+U` / `Alt+D`** for half-page scrolls or
**`Alt+K` / `Alt+J`** for single-line scrolls (see the focus/command table
above): they are plain key events, intercepted before forwarding to the LLM, so
they scroll the focused view in any terminal and even while the LLM pane is
focused, with no dependency on mouse reporting. The
`brain` sibling records the full analysis in its `docs/decisions.md`; `dif`
keeps no decisions log, so the reasoning lives here.

## Shortcut-label rule (for agents)

When a shortcut is **also** a command-palette action (today: `Ctrl+R` →
"Restart diff server", `Ctrl+G` → "Regenerate diff guide", `Ctrl+O` → "Open
diff in browser", `Ctrl+N` → "New LLM session"), its dimmed `[…]` hint on the
palette row is derived from
`palette::shortcut_for`. If you add or change such a
shortcut, update `shortcut_for` so the hint matches — the rule is enforced in
`AGENTS.md`.
