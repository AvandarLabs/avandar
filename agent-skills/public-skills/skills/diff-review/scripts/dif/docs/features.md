# Features

## Launch

```
dif                  # vs develop if it exists, else main
dif <branch>         # vs <branch>
dif .                # uncommitted worktree changes
dif staged|working   # staged / working tree
```

On launch `dif`:

1. Resolves the repo root, branch, and comparison key.
2. Picks a deterministic free port and opens difit on it (browser opens too).
3. Seeds difit with the existing `.difit` transcript, if any.
4. Starts (or resumes) a claude session in the repo root. A **fresh** session is
   launched with an initial message already submitted ("this conversation is
   about the current diff review … load the /diff-review skill"), so the
   pane is working from the first frame; a **resumed** session gets no such
   message (that orientation is already in its context).
5. Starts the background comments poller.
6. Focuses the **diff main view** (left), not the Claude pane — the review
   begins by looking at the diff, and Claude is already busy loading the skill.

## The two halves

The shell is split into the **main view** (the left "diff view") and the
**Claude panel** (the right).

- **Left — the main view**: a one-row tab strip plus one of two views. `Tab` /
  `Shift+Tab` cycle them; `l` jumps to the log view and `d` to the diff guide
  view (both work when the main view is focused — `Alt+H` focuses it).
  - **Log view** (`Logs`): difit's server log (URL, requests, status), plus
    `dif`'s own activity lines (see below). Read-only; scroll with the mouse
    wheel, arrows/PageUp/PageDown, or `Alt+U`/`Alt+D` for a half-page (the
    latter also scrolls while the Claude pane is focused).
  - **Diff guide view** (`Diff guide`): the review's diff guide, rendered from
    markdown with full styling (colored headings, **bold**, `code`, lists, and
    tables render as such). The guide is a guide to what's *left* to review; the
    `diff-review` skill writes it and keeps it current. Absent guide → a
    hint to press `Ctrl+D`. This view is a **basic vim pager with a visible
    cursor**: `j`/`k`/`h`/`l` move the cursor, `w`/`b` move by word, `d`/`u` are
    half-page, `gg`/`G` are top/bottom, all with count prefixes (`3j`, `8w`).
    Press **`o`** to open the file path or URL **under the cursor** — a
    plain-text file opens in `nvim` in a new tmux window (inside tmux) or a new
    iTerm2 tab, while a URL or non-text path (e.g. a directory) goes to the
    system default handler. (You can also ⌘-click paths/URLs with the mouse —
    see [keybindings.md](keybindings.md).)
- **Right — Claude**: the live, resumable claude session. Type into it like any
  claude chat when focused.

The diff itself is reviewed in the **browser** difit opens; the log view is the
server console, not the diff.

### Activity log in the log view

`dif` writes its own status lines into the log view so it doubles as an activity
log:

- **`💬 Added response to comment on <file>:Lx`** (cyan) each time Claude posts a
  reply back to difit.
- **A restart-needed warning** (orange) when the code changes since launch. The
  wording names the likely author: **`⚠️  Claude made code changes — restart
  difit (Ctrl+R) 🔁`** when claude just edited (it was handed a comment or a
  `Ctrl+D` moments before), or **`⚠️  New manual changes detected — …`** when the
  change came from outside the shell. It appears once the change settles, and
  `dif` **never auto-restarts** — that would drop a comment you're mid-typing in
  the browser. Press `Ctrl+R` (or run "Restart dif" from the palette) when ready.
  The warning **re-arms on each new change**, so a manual edit after a prior
  warning still alerts; it also re-baselines after a restart.

## Live comment handling

Leave comments in the browser as usual. Each new reviewer comment is typed into
the claude pane automatically **and submitted for you** (no manual Enter), with a
handoff to the `/diff-review` skill. Claude first decides whether the
comment needs a code change or is just a question: a question gets an answer
posted back as a reply (which appears in the browser live); a change gets edited
(committing or not per the
[commit policy](integrations.md#commit-policy-by-comparison)) and explained in
the chat, with at most a terse `Done.` posted to the thread. You never have to
tell claude to "address the comments," and replies appear without a restart.
(Code *changes* are different: the diff difit rendered at launch goes stale, so
`dif` logs a restart warning in the left pane — see below.)

Comments that already exist when `dif` launches are treated as a baseline and
are not auto-dispatched; only comments added after launch trigger work.

## Command palette

`Ctrl+P` (from either pane) opens a global command palette: a centered modal
with a filter input and a numbered command list. Type to filter, `↑`/`↓` (or
`Ctrl+J`/`Ctrl+K`) to navigate, `Enter` to run the selection, `Esc` (or
`Ctrl+C`) to close. The available commands are a fixed in-code registry; see
[config.md](config.md#command-registry).

### Restart dif

"Restart dif" — the palette command, or its direct **`Ctrl+R`** shortcut (shown
dimmed as `[^R]` on the palette row) — restarts only the **difit server** (the
left pane), not the whole shell and not the claude session. It:

1. Kills the running difit server.
2. Waits for the port to free, then relaunches difit with the **same**
   comparison and port it was started with (`dif` → `dif`, `dif <args>` →
   `dif <args>`), reseeding the current `.difit` transcript.

The log view is **not cleared**: `dif` writes `[dif] Stopping…` /
`[dif] Restarting…` status lines into the log and the new server output appends
below them, so it reads as one continuous log. The poller keeps running and
reconnects automatically once difit is back on the same port.

### Regenerate diff guide

"Regenerate diff guide" — the palette command, or its direct **`Ctrl+D`**
shortcut (shown dimmed as `[^D]` on the palette row) — asks Claude to rebuild the
diff guide for this review via the `/diff-review` skill. `dif` only types
the request into the claude pane; the skill writes the guide markdown file, and
the diff guide view picks it up automatically on its next refresh (no restart).
Use it after Claude (or you) changes code so the guide reflects the current diff.

### Open difit in browser

"Open difit in browser" — the palette command, or its direct **`Ctrl+O`**
shortcut (shown dimmed as `[^O]` on the palette row) — opens the running difit
server's URL (`http://localhost:<port>`) in the system default browser. It does
**not** restart the server; it just reopens the same review page (handy if you
closed the tab difit opened on launch).

### New Claude session

"New Claude session" — the palette command, or its direct **`Ctrl+N`** shortcut
(shown dimmed as `[^N]` on the palette row) — starts a fresh claude session by
typing and submitting `/new` in the claude pane. `dif` only types the command;
claude resets its own context, so the next injected comment or prompt is
answered in a clean session instead of the resumed one. The difit server, the
poller, and the pane itself are untouched.

## The diff guide and reviewed state

The diff guide lives at `.difit/<branch>-difit-<scope>-guide.md` and is always a
guide to **what's left to review**, organized as numbered groups (Group 1, Group
2, …). The `diff-review` skill owns its content:

- **Mark a group reviewed** ("group 1 is reviewed") and it is **removed** from
  the guide entirely — not even listed as "already reviewed", so the guide stays
  short.
- **Mark a file reviewed** and it stays in its group (it may matter for the other
  files there) but is tagged reviewed; a group is only dropped once the whole
  group is reviewed.
- If a reviewed file **changes again**, it returns to "needs review" and is
  flagged in the guide as changed-since-review.
- Reviewed state is tracked in `.difit/<branch>-difit-<scope>-reviewed.json`, so
  "what have I already reviewed?" can still be answered even though those items
  no longer clutter the guide.

`dif` renders the guide; the skill writes both files. See
[data-model.md](data-model.md#files-under-difit) and the
`diff-review` skill.

## Session continuity

The claude conversation persists for the whole review. Quitting and relaunching
`dif` for the same branch+scope resumes the same claude session when possible.

See [keybindings.md](keybindings.md) for focus, palette, and quit keys.
