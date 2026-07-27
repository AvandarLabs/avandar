# Features

## Launch

```
dif                  # vs develop if it exists, else main
dif <branch>         # vs <branch>
dif .                # uncommitted worktree changes
dif staged|working   # staged / working tree
dif <branch> --codex # run the right pane with Codex instead of Claude
```

On launch `dif`:

1. Resolves the repo root, branch, and comparison key.
2. Looks for the matching `.difit/<branch>-difit-<scope>.json`,
   `-guide.md`, and `-guide.json` artifacts.
3. If those artifacts exist, picks a deterministic free port, starts difit,
   opens the browser web shell, seeds difit with the transcript, and starts the
   background comments poller.
4. If those artifacts do not exist, starts no difit server, no poller, and no
   browser shell yet. The left pane shows a waiting status while the right pane
   starts with a tiny first prompt: `/diff-review` plus only the comparison
   argument the user passed to `dif` (`/diff-review .`, `/diff-review develop`,
   etc.). If no comparison argument was passed, the prompt is just
   `/diff-review`. A local control endpoint is written to live-session metadata
   so the skill can tell this waiting TUI which comparison it chose.
5. Once the LLM writes the transcript and both guide artifacts, `dif` starts
   difit for the selected comparison, opens the browser web shell, refreshes
   live-session metadata, and begins polling for comments automatically.
6. Starts the right pane in the repo root. Claude is the default; `--codex`
   selects Codex. When a prepared review already exists, a **fresh** session is
   launched with the normal review-orientation prompt. A resumed Claude session
   gets no such message because that orientation is already in its context.
7. Focuses the **diff main view** (left), not the LLM pane.

## The two halves

The shell is split into the **main view** (the left "diff view") and the
right **Claude/Codex** pane.

- **Left: the main view**: a one-row tab strip plus one of three views. `Tab` /
  `Shift+Tab` cycle them in order: Logs, Test plan, Diff guide.
  - **Log view** (`Logs`): difit's server log (URL, requests, status), plus
    `dif`'s own activity lines (see below). Read-only; scroll with the mouse
    wheel, arrows/PageUp/PageDown, `Alt+U`/`Alt+D` for a half-page, or
    `Alt+K`/`Alt+J` for one line. The `Alt` bindings also scroll while the
    Claude or Codex pane is focused.
  - **Test plan view** (`Test plan`): the review's manual test plan, rendered
    from markdown. The `diff-review` skill writes it as a separate artifact from
    the diff guide, and `dif` refreshes it in place.
  - **Diff guide view** (`Diff guide`): the review's diff guide, rendered from
    markdown with full styling (colored headings, **bold**, `code`, lists, and
    tables render as such). The guide is a guide to what's *left* to review; the
    `diff-review` skill writes it and keeps it current. Absent guide → a
    hint to press `Ctrl+G`. This view is a **basic vim pager with a visible
    cursor**: `j`/`k`/`h`/`l` move the cursor, `w`/`b` move by word, `d`/`u` are
    half-page, `gg`/`G` are top/bottom, all with count prefixes (`3j`, `8w`).
    Press **`o`** to open the file path or URL **under the cursor**; a
    plain-text file opens in `nvim` in a new tmux window (inside tmux) or a new
    iTerm2 tab, while a URL or non-text path (e.g. a directory) goes to the
    system default handler. (You can also ⌘-click paths/URLs with the mouse;
    see [keybindings.md](keybindings.md).)
- **Right: Claude/Codex**: the live Claude or Codex frontend. Type into it like
  its normal terminal UI when focused.

The diff itself is reviewed in the **browser** difit opens; the log view is the
server console, not the diff.

### Activity log in the log view

`dif` writes its own status lines into the log view so it doubles as an activity
log:

- **`💬 Added response to comment on <file>:Lx`** (cyan) each time the agent posts a
  reply back to difit.
- **A restart-needed warning** (orange) when the code changes since launch. The
  wording names the likely author: **`⚠️  Claude made code changes - restart
  difit (Ctrl+R) 🔁`** when the LLM likely just edited (it was handed a comment
  or a `Ctrl+G` moments before), or **`⚠️  New manual changes detected - …`** when the
  change came from outside the shell. It appears once the change settles, and
  `dif` **never auto-restarts**; that would drop a comment you're mid-typing in
  the browser. Press `Ctrl+R` (or run "Restart diff server" from the palette) when ready.
  The warning **re-arms on each new change**, so a manual edit after a prior
  warning still alerts; it also re-baselines after a restart.

## Live comment handling

Leave comments in the browser as usual. Each new reviewer comment is typed into
the LLM pane automatically **and submitted for you** (no manual Enter), with a
handoff to the `/diff-review` skill. The agent first decides whether the
comment needs a code change or is just a question: a question gets an answer
posted back as a reply (which appears in the browser live); a change gets edited
(committing or not per the
[commit policy](integrations.md#commit-policy-by-comparison)) and explained in
the chat, with at most a terse `Done.` posted to the thread. You never have to
tell the agent to "address the comments," and replies appear without a restart.
(Code *changes* are different: the diff difit rendered at launch goes stale, so
`dif` logs a restart warning in the left pane; see below.)

Comments that already exist when `dif` launches are treated as a baseline and
are not auto-dispatched; only comments added after launch trigger work.

## Command palette

`Ctrl+P` (from either pane) opens a global command palette: a centered modal
with a filter input and a numbered command list. Type to filter, `↑`/`↓` (or
`Ctrl+J`/`Ctrl+K`) to navigate, `Enter` to run the selection, `Esc` (or
`Ctrl+C`) to close. The available commands are a fixed in-code registry; see
[config.md](config.md#command-registry).

### Restart Diff Server

"Restart diff server", the palette command, or its direct **`Ctrl+R`** shortcut (shown
dimmed as `[^R]` on the palette row), restarts only the **difit server** (the
left pane), not the whole shell and not the LLM session. It:

1. Kills the running difit server.
2. Waits for the port to free, then relaunches difit with the **same**
   comparison and port it was started with (`dif` → `dif`, `dif <args>` →
   `dif <args>`), reseeding the current `.difit` transcript.

The log view is **not cleared**: `dif` writes `[dif] Stopping…` /
`[dif] Restarting…` status lines into the log and the new server output appends
below them, so it reads as one continuous log. The poller keeps running and
reconnects automatically once difit is back on the same port.

### Regenerate diff guide

"Regenerate diff guide", the palette command, or its direct **`Ctrl+G`**
shortcut (shown dimmed as `[^G]` on the palette row), asks the LLM to rebuild the
diff guide for this review via the `/diff-review` skill. `dif` only types
the request into the LLM pane; the skill writes the guide markdown file, and
the diff guide view picks it up automatically on its next refresh (no restart).
Use it after the agent (or you) changes code so the guide reflects the current diff.

### Open Diff In Browser

"Open diff in browser", the palette command, or its direct **`Ctrl+O`**
shortcut (shown dimmed as `[^O]` on the palette row), opens the running difit
server's URL (`http://localhost:<port>`) in the system default browser. It does
**not** restart the server; it just reopens the same review page (handy if you
closed the tab difit opened on launch).

### New LLM Session

"New LLM session", the palette command, or its direct **`Ctrl+N`** shortcut
(shown dimmed as `[^N]` on the palette row), starts a fresh LLM session. It
is an **interrupt**, not a queued message: `dif` kills the running LLM child
and respawns the pane on a brand-new session that auto-submits the review prompt
on startup, exactly as the pane's first launch does. This is deliberate: typing
`/new` would merely land in the LLM's input queue and, if it were mid-thought,
could sit unsent for minutes (and the follow-up prompt with it). Respawning
reuses the pane, so its size and scrollback log carry over; the difit server and
the poller are untouched. Claude fresh session ids are persisted, so a later
`dif` launch can resume them when possible. Codex fresh sessions currently do
not persist a `dif`-chosen id because the Codex CLI does not expose that option.

## The diff guide, test plan, and reviewed state

The diff guide lives at `.difit/<branch>-difit-<scope>-guide.md` and is always a
guide to **what's left to review**, organized as numbered groups (Group 1, Group
2, …). The `diff-review` skill owns its content:

- **Mark a group reviewed** ("group 1 is reviewed") and it is **removed** from
  the guide entirely. It is not even listed as "already reviewed", so the guide stays
  short.
- **Mark a file reviewed** and it stays in its group (it may matter for the other
  files there) but is tagged reviewed; a group is only dropped once the whole
  group is reviewed.
- If a reviewed file **changes again**, it returns to "needs review" and is
  flagged in the guide as changed-since-review.
- Reviewed state is tracked in `.difit/<branch>-difit-<scope>-reviewed.json`, so
  "what have I already reviewed?" can still be answered even though those items
  no longer clutter the guide.

`dif` renders the guide; the skill writes the guide and reviewed-state files. See
[data-model.md](data-model.md#files-under-difit) and the
`diff-review` skill.

The diff summary lives at `.difit/<branch>-difit-<scope>-summary.md` and is shown
only in the browser web shell sidebar. The manual test plan lives at
`.difit/<branch>-difit-<scope>-test-plan.md`; `dif` shows it as its own TUI tab
before Diff guide, while the browser shows it as a separate sidebar tab.

## Session continuity

The LLM conversation persists for the whole review. Quitting and relaunching
`dif` for the same branch+scope resumes the same Claude session when possible.

See [keybindings.md](keybindings.md) for focus, palette, and quit keys.
