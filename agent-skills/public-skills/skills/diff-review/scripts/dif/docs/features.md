# Features

## Launch

```
dif                  # vs develop if it exists, else main
dif <branch>         # vs <branch>
dif <branch> --host 127.0.0.1  # choose difit's local bind address
dif .                # uncommitted worktree changes
dif staged|working   # staged / working tree
dif <branch> --codex # run the right pane with Codex instead of Claude
dif <branch> -cx     # short alias for --codex
```

On launch `dif`:

1. Resolves the repo root, branch, and comparison key.
2. Creates `.difit/<branch>-difit-<scope>.json` as an empty transcript (`[]`) if
   the review has none yet. An existing transcript is never touched.
3. Picks a deterministic free port, starts difit on the requested host
   (127.0.0.1 by default) seeded with the transcript, starts the browser web
   shell, and opens the browser — **without waiting for difit to answer**. The
   shell page loads at once and its iframe retries until difit is up, so the
   review opens as fast as the browser can be told to.
4. Starts the background comments poller.
5. Starts the right pane in the repo root, **idle**. Claude is the default;
   `--codex` and `-cx` select Codex. Nothing is typed into it: a launch shows the
   diff, it does not commission a review. A resumed Claude session simply comes
   back with the context it already had.
6. Focuses the **diff main view** (left), not the LLM pane.

### Launching with no prepared review

**The diff never waits on the LLM.** difit only needs git, so everything above
happens the same whether or not a review has been prepared. When
`-guide.md`/`-guide.json` are missing, the only differences are:

- A modal asks: **"No diff review found"** — start one? `y` / `Enter` starts it,
  `n` / `Esc` dismisses. Nothing is generated unless you say Yes; dismissing
  leaves the diff open and changes nothing. Answering Yes types the tiny prepare
  command into the LLM pane: `/diff-review` plus only the comparison argument you
  passed to `dif` (`/diff-review .`, `/diff-review develop`, etc.). Bare `dif`
  runs just `/diff-review`. You can also type `/diff-review` in the LLM pane
  yourself at any time, which is the only route left after dismissing.
- The left pane's title reads `preparing guide`, and a banner there says the diff
  is live and that nothing is generating a review.
- A local control endpoint is written to live-session metadata so the skill can
  tell the running TUI which comparison it chose (see
  [integrations.md](integrations.md#comparison-handoff)).

You can review — and comment — immediately. Comments you write before the guide
exists are mirrored into the transcript and queued to the LLM like any other, so
they are waiting in its input the moment it finishes the round it is on.

Once a review is under way, the guide, summary, test plan, and `claude` threads
appear on their own as the skill writes them: the browser shell polls the markdown and `-guide.json`
every few seconds, and the poller pushes the transcript's new threads into the
live difit server, which streams them to the browser over SSE. No relaunch, and
no manual refresh. When the artifacts land, the pane logs
`Diff guide ready` and the title drops `preparing guide`.

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
the LLM pane automatically **and submitted or queued for you** (Claude uses
Enter; Codex uses Tab), with a handoff to the `/diff-review` skill. The agent
first decides whether the comment needs a code change or is just a question: a
question gets an answer posted back as a reply (which appears in the browser
live); a change gets edited (committing or not per the
[commit policy](integrations.md#commit-policy-by-comparison)) and explained in
the chat, with at most a terse `Done.` posted to the thread. You never have to
tell the agent to "address the comments," and replies appear without a restart.
(Code *changes* are different: the diff difit rendered at launch goes stale, so
`dif` logs a restart warning in the left pane; see below.)

Comments that already exist when `dif` launches are treated as a baseline and
are not auto-dispatched; only comments added after launch trigger work.

### Bulk vs eager delivery

The browser shell's top bar has a **Bulk / Eager** toggle.

- **Bulk (the default)** holds every new comment. A **Send all (N)** button
  shows how many are waiting; pressing it types them into the LLM pane as **one**
  numbered prompt. One prompt per pass of comments costs far fewer tokens than
  one per comment. A held comment that you edit is sent in its edited form, and
  one you delete is never sent.
- **Eager** types each comment into the LLM pane as soon as you save it.
  Switching to Eager also sends anything still held.
- **Send one now.** In Bulk, **Cmd+Ctrl+Enter** (Ctrl+Alt+Enter off macOS) in
  a comment box set to TUI saves that one comment and types it into the LLM pane
  at once. Everything else stays held for **Send all**. The submit button's
  tooltip shows the shortcut while it applies.

The mode resets to Bulk on every launch.

### Keeping the GitHub PR in sync

When the branch has an open PR, `dif` keeps it and the review in step. The only
thing that never goes to GitHub is the local conversation: comments and replies
sent to the TUI (the default).

**Header.** The browser shell's top bar shows the PR (`#42`, linking to it), a
**Sync** button, and a **Review (N)** button counting draft PR comments. With no
open PR (or no `gh`), it shows a yellow **No linked PR** instead, with the
reason on hover, and looks again every minute. Problems worth acting on (the PR
has commits you can't pull yet, a failed sync) appear as a short notice beside
them.

**PR comments are drafts until you submit.** Every comment box in difit has a
**TUI / PR** toggle beside its buttons. **PR** adds the comment to your pending
GitHub review (what "Start a review" does on github.com) and never sends it to
the LLM. A reply box inside a PR thread defaults to PR. **Ctrl+G** (macOS) or
**Alt+Shift+G** (Windows/Linux) flips the toggle without leaving the box; the
box shows the hint beside the toggle. The submit button names where the
comment goes: **Add to PR review** (blue) for PR, and **Queue for TUI** in
Bulk mode or **Send to TUI** in Eager mode for the TUI ("reply" is added in a
reply box).
**Cmd+Enter** (Ctrl+Enter off macOS) saves to the destination the toggle shows;
**Cmd+Shift+Enter** saves to the other one for that comment only, without
flipping the toggle. A comment sent to the TUI either way follows the Bulk /
Eager mode. With no PR, Cmd+Shift+Enter from a TUI box does nothing. Hovering
the submit button shows the alternate shortcut.

- Drafts are visible only to you, here and on github.com, until you submit.
  A draft you start on github.com shows up in dif too.
- **Review (N)** opens the submit panel: an optional summary and, on someone
  else's PR, **Comment**, **Approve**, or **Request changes**, as on GitHub. On
  your own PR GitHub only lets you comment, so the panel offers **Submit
  comments** alone.
- PR comments are restyled: a blue thread border and a GitHub badge linking to
  the comment. Drafts are dashed and say **PR draft**; published comments say
  **On PR**; a red **PR sync failed** means GitHub rejected the comment (hover
  for GitHub's message; editing the comment retries).
- Editing a PR comment edits it on GitHub. Deleting a reply deletes it.
  Resolving a thread resolves the conversation on GitHub (a draft thread is
  deleted instead).
- GitHub only accepts comments on lines that are part of the PR's diff. If `dif`
  compares something other than the PR (say `dif .`), a comment on a line the PR
  does not change fails with GitHub's message.

**Everything on the PR flows back.** dif pulls every minute, and at once when
you click **Sync** or submit a review:

- New comments and replies from anyone appear under their author's login,
  including bots (`coderabbitai[bot]`). They are PR comments: the LLM never sees
  them. Your own comments from github.com come in editable.
- Edits made on GitHub replace the local text, unless you have an unsent edit of
  the same comment, which wins. Comments deleted on GitHub, and conversations
  resolved there, disappear locally.
- New commits on the PR are pulled in when your branch is simply behind. The
  minute-by-minute pull does that only when no tracked file has uncommitted
  changes, and the diff then reloads in place.
- Clicking **Sync** goes further: it stashes your uncommitted changes,
  fast-forwards to the PR head, and restores them. Once the sync finishes, the
  page reloads, keeping your view, sidebar tab, and **With comments** filter.
- If restoring your changes conflicts, a modal lists the conflicted files and
  asks who resolves them. **I'll resolve them** (or Esc) leaves them to you; the
  header reminds you to `git stash drop` afterward, since git keeps the stash
  when a restore conflicts. **Auto-resolve with the LLM** types a request into
  the LLM pane to resolve them, leave the changes unstaged, and drop the stash,
  without committing.
- Unpushed commits or a diverged branch are never touched; the header says why.

**Viewed files stay in sync both ways.** Marking a file viewed in difit marks it
on GitHub at once, and the reverse arrives with the next pull. Marking a whole
directory in difit marks each of its files on GitHub (GitHub has no bulk
version). When a session starts, GitHub's viewed state wins. This only runs
while dif shows the PR's own diff (comparing against the PR's base, with your
checkout at the PR head); otherwise the PR link's tooltip says why it is
paused. When GitHub's state changes a file, difit's view reloads once you have
no comment half-typed.

### Only files with comments

For a big diff, the browser shell's top bar has a **With comments** toggle (a
comment icon and a count of the files with comments). Turning it on narrows the
diff to the files that have at least one comment thread, on top of whichever view
is open (the full diff or a group). The command palette has the same toggle:
**Show only files with comments** / **Show all files**. Below 1440px wide the
toggle shows only its icon and count.

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

A restart **never opens a browser tab**. The browser shell keeps serving on the
same port, and the tab you already have open reloads itself once it sees the
restart, keeping your view, sidebar tab, and **With comments** filter. A manual
browser refresh restores them the same way. If no tab is open, `Ctrl+O` opens
one.

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
and respawns the pane on a brand-new session that auto-submits the
review-orientation prompt on startup. (The pane's *own* first launch submits
nothing — see [Launching with no prepared review](#launching-with-no-prepared-review).) This is deliberate: typing
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
