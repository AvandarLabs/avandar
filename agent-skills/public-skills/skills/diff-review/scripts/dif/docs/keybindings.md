# Keybindings

This file covers the **terminal TUI**. The browser **web shell** is a separate
surface with its own command palette (`⌘K` / `Ctrl+K`) and navigation hotkeys
(`Ctrl+1..9` groups, `Ctrl+F` full diff, `Ctrl+H` toggle sidebar, `Ctrl+D` diff
guide tab, `Ctrl+T` test plan tab on macOS; `Alt+Shift` is the leader on
Windows/Linux) — see
[web-shell.md](web-shell.md#header-chrome-command-palette--hotkeys).

Global (work from either pane):

| Key | Action |
| --- | --- |
| `Alt+H` | focus the left **main** (diff) view |
| `Alt+L` | focus the right **LLM** pane |
| `Alt+U` / `Alt+D` | scroll the focused view a half-page up / down (guide view moves its cursor; a PTY pane scrolls half its visible rows) |
| `Alt+K` / `Alt+J` | scroll the focused view one line up / down |
| `Ctrl+P` | open the **command palette** (works from either pane) |
| `Ctrl+R` | refresh the diff by relaunching the difit server (the palette's "Refresh diff"). The open browser tab reloads itself; no new tab opens |
| `Ctrl+S` | resync with GitHub now: pull new PR comments and commits, the same as the browser's **Sync** (the palette's "Resync with GitHub") |
| `Ctrl+G` | regenerate the diff guide (the palette's "Regenerate diff guide") |
| `Ctrl+O` | open the difit server URL in the default browser (the palette's "Open diff in browser") |
| `Ctrl+N` | start a fresh LLM session (interrupts: kills the running LLM and respawns it on a new session that auto-submits the review-orientation prompt; the palette's "New LLM session") |
| `Ctrl+Q` | quit `dif` (tears down difit, the LLM, and the poller) |
| `Alt+S` | show the keyboard-shortcuts help modal (also pinned at the right of the bottom statusline) |

`Alt+H` / `Alt+L` switch focus; `Alt+U` / `Alt+D` scroll the focused view a
half-page, while `Alt+K` / `Alt+J` scroll it one line at a time. These are
keyboard-only alternatives to the wheel that never depend on terminal mouse
reporting. `Ctrl+P` / `Ctrl+R` / `Ctrl+S` / `Ctrl+G` / `Ctrl+O` /
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

## Start-review modal

Raised at launch when no prepared review exists for the comparison (see
[features.md](features.md#launching-with-no-prepared-review)). It captures every
key while open, so a stray keystroke can neither leak into the LLM pane nor be
read as an answer:

| Key | Action |
| --- | --- |
| `y` | start the review (types `/diff-review [comparison]` into the LLM pane) |
| `n` / `Esc` / `Ctrl+C` | dismiss: close the modal and start nothing |
| `Enter` | answer with the selected button (it opens on **Yes**) |
| `←` / `→`, `h` / `l` | select No / Yes without answering |
| `Tab` / `Shift+Tab` | move the selection to the other button |
| anything else | swallowed |

The key map is a pure `key -> intent` function in `tui/start_review/keys.rs`, so
every row above is unit-tested without a terminal.

Nothing else in `dif` ever starts a review on its own. After dismissing, the way
to start one is to type `/diff-review` in the LLM pane yourself.

When the **main** (diff) view is focused (read-only). Keys common to both views:

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | cycle the main view forward / backward (Logs ↔ Test plan ↔ Diff guide) |
| `Up` / `Down` | scroll the active view 3 rows |
| `PageUp` / `PageDown` | scroll the active view 20 rows |
| mouse wheel | scroll the pane under the pointer |

There are **no bare-letter shortcuts to switch views** — use `Tab` /
`Shift+Tab`. In the **Test plan** and **Diff guide** views, the bare letters
drive a basic vim pager with a visible cursor (drawn over the fully
styled/colored markdown):

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

## Mouse

| Action | Effect |
| --- | --- |
| wheel | scroll the pane under the pointer, focused or not (a markdown view moves its cursor) |
| click | focus the pane under the pointer |
| drag | select text in that pane, highlighted. Dragging past its top or bottom edge scrolls a terminal pane to reach more |
| release | copy the selection to the clipboard. The statusline shows `Copied N characters`, and the highlight stays until the next click or key |
| ⌘-click (iTerm2) | open a URL or file path, unchanged: iTerm2 handles it before mouse reporting |
| Option-drag (iTerm2) / Fn-drag (Terminal) | the terminal's own selection, bypassing `dif` |

A selection never spans panes and copies as plain text, with soft-wrapped lines
joined and trailing blanks trimmed. Over SSH the copy also reaches your local
clipboard through OSC 52; in iTerm2 that needs **Settings > General >
Selection > Applications in terminal may access clipboard**, and inside tmux
it needs `set -g set-clipboard on` (or `allow-passthrough on`). The keyboard
scrolls (`Alt+U` / `Alt+D`, `Alt+K` / `Alt+J`) still work without the mouse.
See [architecture.md](architecture.md#mouse-wheel-click-drag-to-copy) for how it
works.

## Shortcut-label rule (for agents)

When a shortcut is **also** a command-palette action (today: `Ctrl+R` →
"Refresh diff", `Ctrl+G` → "Regenerate diff guide", `Ctrl+O` → "Open
diff in browser", `Ctrl+N` → "New LLM session", `Ctrl+S` → "Resync with
GitHub"), its dimmed `[…]` hint on the
palette row is derived from
`palette::shortcut_for`. If you add or change such a
shortcut, update `shortcut_for` so the hint matches — the rule is enforced in
`AGENTS.md`.
