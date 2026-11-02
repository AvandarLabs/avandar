# Integrations

The heart of `dif`: how it drives difit and the LLM pane, and how a reviewer comment
becomes an addressed change without a manual handoff.

## difit endpoints used

difit exposes a small HTTP API on its port; `dif` uses three pieces of it:

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `GET /api/comments-json` | the poller | read the live `{version, threads}` state |
| `POST /api/comment-imports` | agent reply | merge import-shape entries; difit bumps `version` and broadcasts `commentsChanged` over its `/api/watch` SSE, so the browser refetches and updates **live** |
| (readiness) `GET /api/comments-json` | startup | confirm difit bound before starting the poller |

The live `POST` path is why there is **no server restart** in the loop: difit's
own client subscribes to `/api/watch` and refetches on `commentsChanged`, so a
reply posted by the agent shows up in the open browser immediately.

## difit lifecycle

`dif` runs difit inside a read-only `PtyPane` (the left pane is difit's server
log) only after the matching review artifacts exist. The command is:

```
cd <repo> && exec <difit> <args…> --port <P> --host <H> --keep-alive --include-untracked [--comment <json>]
```

- `<difit>` resolves to the repo's local `node_modules/.bin/difit` when it
  exists (a repo can pin difit as a devDependency so no global install or `PATH`
  entry is required), and falls back to a bare `difit` from `PATH` for repos
  with no local install (e.g. non-JS projects). See `difit_program` in
  `src/difit/server.rs`.
- `<args…>` come from the comparison key (`.`/`staged`/`working`, or `@ <branch>`).
- `--port <P>` is a confirmed-free port (we bind-test it first; difit would
  otherwise silently auto-reassign an occupied port and strand the poller).
- `--host <H>` defaults to `127.0.0.1`, keeping difit's listener on the same
  local IPv4 interface used by the browser shell.
- `--keep-alive` keeps difit up when the browser disconnects.
- `--comment <json>` seeds difit with the existing transcript on launch.
- The browser opens by default (difit's behavior); tests pass `--no-open`.
- `exec` replaces the wrapper shell with difit so the pane's tracked PID **is**
  difit. Killing the pane child then signals difit directly rather than leaving
  an orphaned server holding the port — which matters for in-place restart.

difit dies with the TUI: dropping the `PtyPane` kills the child.

### Launching with no prepared review

**difit never waits on the LLM.** The diff comes from git alone, so a launch
with no prepared review starts difit, the poller, and the browser shell exactly
as a prepared one does. Two things differ:

1. The transcript is created first, as `[]`
   (`transcript::ensure_exists`), so the review has its canonical file from the
   first moment and the poller has somewhere to mirror. An existing transcript
   is never touched.
2. The LLM pane starts idle and the TUI asks, in a modal, whether to start a
   review. Nothing is injected unless the reviewer answers Yes; a No closes the
   modal and starts nothing. A Yes types the minimal slash command that prepares
   the review: `/diff-review` plus the comparison argument the user explicitly
   passed to the TUI. Examples: `dif .` runs `/diff-review .`, `dif develop` runs
   `/diff-review develop`, and bare `dif` runs `/diff-review`. Flags such as
   `--codex` / `-cx` are never included in that prompt. If the pane has died by
   then, the answer respawns it on a fresh session seeded with that command.

Nothing blocks on difit answering, either: the shell binds and serves its page
immediately and its iframe silently retries the proxied difit document (see
[web-shell.md](web-shell.md)), so the browser is opened as soon as the URL
exists rather than after a readiness probe.

The reviewer can comment straight away. Those comments are mirrored to the
transcript and dispatched to the LLM pane like any other, which means they queue
in the agent's own input while it is still writing the round.

Each UI tick calls `review_files_ready` through `App::update_difit_log`. When
the transcript and both guide files exist, `App::note_guide_ready` records it,
logs a line in the pane, and stops accepting comparison updates. Nothing is
started — everything already is.

### Importing the skill's transcript writes into the live server

Because difit is already running when the skill writes its round, the transcript
is a two-way channel, not just a mirror:

- **Outbound (mirror).** Each tick the poller rewrites the transcript from
  difit's `/api/comments-json`, remembering the exact text it wrote.
- **Inbound (import).** If the file on disk is *not* that text, the skill (or
  anything else) wrote it. `difit::importer::inbound_entries` returns the
  entries difit has never held, the poller POSTs them to
  `/api/comment-imports`, and it skips the mirror for that tick so the write is
  not clobbered before difit ingests it. difit pushes them to the browser over
  SSE; the next poll mirrors the merged conversation back to disk.

Guards on the inbound path:

- An entry with no id or no `filePath` is skipped — difit cannot place it, and
  one bad entry must not fail the batch.
- Every id difit has held this session (plus everything already imported) is
  remembered, so an id is never POSTed twice and a comment the reviewer just
  deleted is never resurrected by a slightly stale file.
- A malformed or half-written file is ignored until it parses.
- A failed POST leaves the ids unimported so the next tick retries; the
  transcript keeps the skill's entries either way.

The skill may still POST its entries itself (Continue mode does). That is
idempotent with this path: entries already in difit are, by definition, not
inbound.

### Reseeding a new difit comment session

difit keys its comments by the comparison's *resolved* commits, not by the
requested names. Once HEAD or the base moves (a commit, a merge, a pull), the
browser's next `/api/diff` request opens a new comment session, and
`/api/comments-json` then answers from it: version 0 and no threads. A plain
mirror would write that over the transcript and wipe the conversation, and the
GitHub sync would read every PR-bound comment as deleted and resolve or delete
it on the PR.

So before anything else in a tick, the poller checks for a new session:
`difit::importer::reseed_entries` treats a snapshot as new when it is version 0
with no threads, or when its version is below the last one mirrored. In that
case, the poller POSTs every transcript entry the new session lacks and skips
the GitHub pass and the mirror for that tick. A session the reviewer emptied by
deleting comments keeps counting up, so it is mirrored as usual.

### Comparison handoff

If the skill chooses a comparison inside an already-open TUI (for example the
user launched bare `pnpm diff-review`, then the final summary says
`Run: pnpm diff-review .`), it POSTs `{ "comparisonKey": "." }` to the metadata
file's `comparison_update_url`.

`App` honors that only while the review is still being prepared: no guide
artifacts yet **and** no comment in difit. It then retargets the in-memory
comparison, transcript path, guide paths, summary path, test-plan path, difit
port, and shell port, and relaunches difit, the poller, and the browser shell on
the new target (`App::relaunch_review_surface`), reusing the left pane so its log
stays continuous.

Once a guide exists the control endpoint returns `409`, and a retarget that
arrives after the reviewer has started commenting is logged and ignored: a
review that is underway is never switched out from under the browser.

### Restarting difit in place ("Restart diff server")

"Restart diff server" — the command palette entry or its `Ctrl+R` shortcut (see
[features.md](features.md#restart-diff-server)) — restarts only the difit server,
keeping the same comparison, port, and pane log. `dif` prompts a restart by
logging an orange warning in the left pane once it detects (via the git-watcher)
that the code changed since launch; it never restarts on its own, so a comment
you're mid-typing in the browser is never dropped. The flow:

1. `App::restart_difit` re-reads the `.difit` transcript and rebuilds the same
   difit command (same comparison + port, `--comment` reseeded). difit is spawned
   with `--no-open` — exactly as at launch — because the **web shell owns the
   browser surface**; a restart must not pop difit's own frontend.
2. It writes a `[dif] Stopping…` status line into the pane, calls
   `PtyPane::kill_child` (SIGKILL lands on difit thanks to `exec`), then
   `server::wait_until_port_free` so the port is released before rebinding.
3. It writes `[dif] Restarting…` and calls
   `PtyPane::respawn_shell_command_with_env`, which spawns the new difit into a
   fresh PTY **reusing the same `vt100` parser** — so the log is continuous, not
   cleared.
4. It bumps the running `WebShell`'s restart counter
   (`WebShell::note_difit_restart`). The shell serves it as `difitRestarts` in
   `/__wrap/meta.json`, which the open tab polls every 2s and reloads itself on.
   A restart never calls `open`, so it never stacks up another browser tab; the
   shell still proxies the same port, and `Ctrl+O` opens a tab when none is
   open.

The poller (still pointed at the unchanged port) and the LLM pane are not
touched; the poller just reconnects once difit answers again. The dispatcher's
once-each baseline means reseeded comments are not re-injected.

The restart warning that prompts this is **attributed**: `dif` tracks when it
last injected a prompt into the LLM (`last_inject_at`, set on comment injection
and on `Ctrl+G`) and words the alert "Claude made code changes..." when the change
settles soon after an injection, or "New manual changes detected…" otherwise. It
re-arms on each new distinct change, so a manual edit after a prior warning still
alerts. See [architecture.md](architecture.md#difit-pane-activity-log).

### Regenerating the diff guide ("Regenerate diff guide" / `Ctrl+G`)

The diff guide is generated and maintained by the `diff-review` skill, not
by `dif`. `Ctrl+G` (or the palette entry) types a minimal request into the LLM
pane — "Regenerate the diff guide … using the diff-review skill" — via the
same `send_prompt_to_pty` path as comment injection (and likewise records
`last_inject_at`). The skill writes `.difit/<branch>-difit-<scope>-guide.md`; the
diff guide view re-reads the file on its next tick (`Guide::refresh`, a content
diff) and renders it. No server restart and no `dif`-side writes to the guide.

**Caching.** Everything the shell *owns* — its HTML/JS/CSS, `inject.js`,
`meta.json`, `groups.json`, the injected difit document, and the filtered
`/api/diff` — is served `Cache-Control: no-store` (`send_bytes_nostore` in
`web/server.rs`). This is load-bearing: the frontend is compiled into the binary,
so after `dif` relaunches with a rebuilt frontend a cached copy would keep the
browser running stale code (e.g. an old "Show new changes" handler that never
clears). difit's own content-hashed static bundle still goes through plain
`send_bytes` and stays cacheable.

The served page also appends a per-build tag (`shell.js?v=<hash>`,
`shell.css?v=<hash>`; the hash covers all embedded frontend assets) so even a
browser that ignored `no-store` for an already-cached entry fetches the current
frames after a relaunch, because the URL itself changes.

The **browser web shell** can trigger the same regeneration from its "Regenerate"
button. Since the shell server thread can't type into the LLM pane, it bridges
through a shared flag: `POST /__wrap/regenerate` sets `Ctx::regen`
(`Arc<AtomicBool>`) and returns `202`; the event loop polls
`WebShell::take_regen_request()` each tick (`App::poll_web_shell_requests`) and
runs the same `regenerate_guide()`. Both the TUI guide view and the shell's
`groups.json` poll then pick up the rewritten guide.

## The LLM Pane

The right pane runs a terminal LLM frontend in the repo root. Claude is the
default; `--codex` / `-cx` select Codex. The base commands come from the repo-local
`.difit/dif.config.json` values `claude_cmd` and `codex_cmd`, both managed by
`dif config` and defaulting to `claude` and `codex`.

```
cd <repo> && <claude_cmd> (--resume <id> | --session-id <id>) [prompt]
cd <repo> && <codex_cmd> [prompt]
cd <repo> && <codex_cmd> resume <id> [prompt]
```

A session *can* be launched with a prompt appended as a final argument, which the
frontend submits on startup while staying interactive (the `prompt` parameter of
`session::build_llm_command`). **Launching `dif` never uses it**: the pane comes
up idle, fresh or resumed, because a launch is a request to see the diff, not to
commission a review. Two paths still pass a prompt:

- **The start-review modal answered Yes**, when the LLM pane has already died. It
  respawns on a fresh session seeded with `/diff-review [comparison]`. While the
  pane is alive, the same answer is typed into it instead.
- **`Ctrl+N` / "New LLM session"**, which mints a fresh session seeded with the
  orientation message from `session::initial_prompt` (it states the conversation
  is about the current diff review and to load the `/diff-review` skill). That is
  an explicit user action, not a launch.

For Claude, the session id is remembered in
`.difit/.claude-session-<branch>-<scope>`; a relaunch resumes it when its
transcript still exists, else starts fresh. Codex can resume a saved id through
`codex resume <id>`, but the current Codex CLI does not expose a flag for `dif`
to choose the id of a fresh interactive session, so `dif` does not persist a
new Codex id on fresh launch.

New comments are typed into the pane via the same keystroke-injection trick the
`tasks`/`brain` shells use (`send_prompt_to_pty`): characters typed, internal
newlines as `Alt+Enter`. The final submit/queue key is sent as a separate,
~200ms-delayed keystroke, not appended to the same burst. Claude receives a
delayed `Enter`; Claude Code coalesces a fast input burst and treats a newline
inside it as pasted text, whereas a discrete delayed `Enter` submits it. Codex
receives a delayed `Tab`, which queues the prompt behind any active work instead
of steering or interrupting the current turn.

## Injection: baseline, then once-each, held or eager

- On the first successful poll, every existing reviewer comment id is recorded
  as a **baseline** and *not* dispatched — `dif` only acts on comments added
  after launch. (Pre-existing open comments are intentionally left for you to
  trigger manually in the LLM pane if you want them addressed.) Comments held
  for **Send all** when `dif` last quit are the exception: their ids are saved
  to `-held.json` (see [data-model.md](data-model.md#the-held-comments)) and
  left out of the baseline, so they are held again.
- After that, any **reviewer** comment with no later `claude` reply in its
  thread is typed into the LLM pane exactly once (tracked by message id). A
  reviewer comment is any authored message whose author is **not** `claude`:
  difit's browser stamps hand-typed comments as `"User"`, and the
  `diff-review` skill posts as `"reviewer"`; both (and any other non-claude
  author) count. Matching `reviewer` alone would miss every comment you type in the
  browser, since difit hardcodes that author as `"User"`.
- **Delivery.** In **bulk** mode (the default) open comments are held and only
  counted; the count is served to the browser at `/__wrap/dispatch.json`. When
  the reviewer presses **Send all** (`POST /__wrap/send-all`), the event loop
  types every held comment as one numbered prompt and marks them dispatched. In
  **eager** mode (`POST /__wrap/dispatch {"mode":"eager"}`) each open comment
  is typed as its own prompt the tick it appears. A held comment is not marked
  dispatched, so its final text is what gets sent.
- **Send one now.** In bulk mode, `Cmd+Ctrl+Enter` in a TUI comment box makes
  `inject/destinations.js` tag that save with `X-Dif-Send: now`. The shell diffs
  it against difit's comments (as for a PR save) and records the new message ids
  in `DispatchControl`; the event loop hands them to the `Dispatcher`, which
  types each one alone as soon as difit holds it and keeps holding the rest.
- **PR-bound comments are skipped.** Any message id in the `-github.json`
  registry is never held, counted, or typed. See
  [GitHub PR sync](#github-pr-sync).

## GitHub PR sync

When the branch has an open PR, `dif` keeps it and the review in step: PR
comments the reviewer writes in dif, and everything that happens on the PR.
Only local comments and replies (the TUI conversation, the default) stay off
GitHub. Every GitHub call is GraphQL through `gh api graphql` (REST cannot add
to a pending review or mark files viewed) and runs on the poller thread
(`github::sync`), one at a time.

### Writing PR comments (push)

1. **`inject/destinations.js`** adds the TUI / PR toggle to each difit comment
   box (not to edit boxes: an edit follows the comment's destination) and
   relabels the box's submit button for the chosen destination and the
   shell's Bulk / Eager mode (read from `/__wrap/dispatch.json`). The label is
   a `data-dif-submit-label` attribute drawn by CSS `::after`, so React keeps
   owning the button's text. When a PR box submits, it tags difit's next `POST /api/comments` with
   `X-Dif-Destination: github`.
2. **The web shell** (`web/review_routes.rs`) intercepts that save. Before
   proxying it, it reads difit's `/api/comments-json` and marks the posted
   message ids difit does not hold yet as `pending` in the registry, so the
   poller and the LLM dispatcher never see the comment unmarked.
3. **The poller** plans against the registry (`github::plan`) and writes into
   the reviewer's **pending review**, GitHub's "Start a review". Drafts are
   visible only to the reviewer until the review is submitted.

| difit change | GitHub call |
| --- | --- |
| new PR thread, or PR reply in a local thread | `addPullRequestReviewThread` (draft; `line`/`side`, `startLine`/`startSide` for a range). Starts the pending review first (`addPullRequestReview` on the PR head) when there is none. |
| PR reply in a PR thread | `addPullRequestReviewThreadReply` (draft) |
| edited body | `updatePullRequestReviewComment` (draft or published) |
| one message deleted | `deletePullRequestReviewComment` |
| whole thread removed (difit's "Resolve") | published: `resolveReviewThread`; draft: delete its drafts |

Guards:

- A removal only counts when the **previous** snapshot held the comment, so a
  first or incomplete snapshot (difit restarting) changes nothing on GitHub.
- A failed post is recorded with GitHub's message and not retried until the
  reviewer edits the comment. A post that could not *reach* GitHub is not a
  failure: see [Offline](#offline).
- A PR reply whose root is still being posted waits for the next pass.
- A cached pending review GitHub no longer knows (submitted or discarded on
  github.com) is dropped and the call retried once against a fresh one.
- With no open PR, PR comments fail with the reason instead of calling GitHub,
  and the browser disables the PR option and shows **No linked PR**. A lookup
  that could not reach GitHub leaves the PR unknown instead, and PR comments
  wait for it.

### Offline

Every GitHub interaction is queued rather than dropped when GitHub cannot be
reached, and sent once it can (`github::connection`, `github::sync_queue`).

- **Detecting it.** The browser posts `navigator.onLine` to
  `POST /__wrap/github/connection` (`{"online": bool}`) at boot and on every
  `online` / `offline` event. Independently, a `gh` call whose error says it
  never got an answer (`error connecting to`, `dial tcp`, `no such host`,
  timeouts, HTTP 502/503/504; see `NETWORK_ERROR_MARKERS`) marks the connection
  lost. Every `gh` call is killed after 30s, because on a network that drops
  packets (captive or in-flight wifi) `gh` hangs instead of failing.
- **While offline** the sync pass makes no GitHub calls, and the first call that
  cannot reach GitHub stops the rest of the pass. A comment stays `pending`, an
  edit keeps a body that differs from GitHub's, a delete or resolve is recorded
  on the comment as `removal`, viewed changes stay in `queuedViewed`, and a
  submit stays in `queuedSubmit`. All of it lives in `-github.json`, so it
  survives a relaunch: a review submitted offline goes out on the next launch
  that can reach GitHub. A queued submit is refused with the reason once a
  lookup finds the branch has no open PR.
- **Coming back.** The browser reporting `online` clears both states and
  requests a pull, so the queue is sent at once. A lost connection the browser
  never saw is retried every 20s (`RETRY_EVERY`) unless the browser reports no
  network. A pull that could not reach GitHub is asked for again, keeping a
  Sync's permission to stash, and is not reported as finished or failed.
- **The browser** shows the header notice "Offline." (browser) or "Can't reach
  GitHub." (`gh`) with what is queued, from `connection` and `queued` in
  `/__wrap/github.json`. A pending PR comment's badge reads **Queued for PR**.
  The PR option stays selectable when offline before the PR could be looked up.
  A review submitted offline closes the panel; a later refusal reopens it with
  GitHub's message.
- **Known limit.** A mutation whose answer was lost (the connection dropped
  after GitHub applied it, or the 30s timeout) is retried, so a draft comment
  can be posted twice.

### Submitting the review

The shell's **Review (N)** button opens a panel with an optional summary and,
on someone else's PR, GitHub's three outcomes: Comment, Approve, Request
changes. On the reviewer's own PR GitHub only allows commenting, so the panel
offers **Submit comments** alone (the web route and the sync pass both refuse
anything else). `POST /__wrap/github/submit` queues the request (persisted as `queuedSubmit`); the poller
waits until no comment is still `pending` or has a queued removal, refuses while any have `failed`,
then calls `submitPullRequestReview` and marks every draft `published`.

### Pulling from GitHub

The poller pulls every 60 seconds, and at once when the reviewer clicks
**Sync** (`POST /__wrap/github/pull`) or after a submit. A pull reads every
review thread and the viewer's per-file viewed state (paged), then:

- **Comments** (`github::pull`, pure): threads and replies the reviewer has not
  seen are added to difit under their author's login (bots as
  `name[bot]`); the reviewer's own comments from github.com come in as difit's
  editable `User`. All of them are recorded in the registry first, so the LLM
  dispatcher never sees them. An edit on GitHub replaces the local body unless
  the reviewer has an unsent local edit of that comment, which wins. Comments
  deleted on GitHub, and threads resolved there, are removed from difit; a
  removed thread takes its local replies with it. A thread whose comments did
  not all fetch is never used to infer a deletion, and a missing draft only
  counts once the pending review itself is gone.
- **Applying to difit** (`difit::editor`): difit's import endpoint only
  appends, so a pull reads `/api/comments-json`, edits the threads, and saves
  them back through `POST /api/comments` with the version it read, exactly as
  difit's browser does. Removed ids are remembered for the session
  (`tombstones`): a stale browser save that brings one back is removed again
  and still never reaches the LLM.
- **Branch** (`github::checkout`): when the PR head differs from `HEAD`, it
  fetches `pull/<n>/head` and fast-forwards only if the branch is strictly
  behind. The background pull also requires that no tracked file has
  uncommitted changes, and the shell then reloads difit in place. A pull the
  reviewer asked for (**Sync** sets `reviewer_pull` beside `pull_requested`)
  instead stashes the tracked changes (`git stash push`, only when there is
  something to stash, so an older stash entry is never popped), fast-forwards,
  and restores them (`git stash pop`). A failed fast-forward still restores them.
  When the pull finishes, `reviewerPulls` grows in `/__wrap/github.json` and the
  browser reloads the page. Otherwise the header shows why (dirty, ahead,
  diverged).
- **Conflicts** (`github::conflicts`): when the restore conflicts, git keeps the
  stash entry and the files stay unmerged. The pull records them as `conflicts`
  in `/__wrap/github.json`, and the browser asks who resolves them, answering on
  `POST /__wrap/github/conflicts` with `{"resolve": "llm" | "reviewer"}`. For
  `reviewer`, the header notice says to resolve them and `git stash drop`. For
  `llm`, the files move to `conflicts_for_llm`; the TUI event loop takes them
  (`App::poll_web_shell_requests`) and types `conflicts::resolve_prompt` into the
  LLM pane: resolve the markers, `git reset -q` so the changes end unstaged as
  before, `git stash drop`, and do not commit. If the LLM pane is not running,
  the reviewer's notice is shown instead.
- **Viewed files**: see below.

### Viewed files

Viewed state syncs both ways, immediately, but only while difit shows the PR's
own diff: the comparison is the PR's base branch and `HEAD` is the PR head.
Otherwise the shell's PR pill explains why sync is paused.

- **GitHub → difit.** The first pull of a session makes GitHub win outright;
  later pulls send only files whose state changed. `VIEWED` marks a file viewed;
  `UNVIEWED` and `DISMISSED` (changed since viewed) unmark it. The changes are
  numbered events in `/__wrap/github.json`. `inject/viewed.js` applies new ones
  by writing difit's own storage (the `difit-viewed-index-v1/<repositoryId>`
  hash index, and the `viewedFiles` lists under `difit-storage-v1/<repositoryId>/`),
  hashing each file exactly as difit does (SHA-256 of its path, status, and
  hunks, from difit's own `/api/diff` query), then reloads difit's frame once no
  comment draft is open.
- **difit → GitHub.** difit's writes reach the shell as `storage` events; the
  shell sends each changed path to `POST /__wrap/github/viewed`, which adds it
  to the persisted `queuedViewed` (latest change per path). The shell sends
  unless the server already knows sync is blocked, so changes made before the
  first pull (say, launched offline) are queued too. A pull that finds sync
  blocked keeps the queue for when sync can run, and the first pull never
  overwrites a path that is still queued. A change leaves the queue once GitHub has it. GitHub has no
  bulk mutation, so marking a directory in difit becomes one
  `markFileAsViewed` / `unmarkFileAsViewed` call per file. A change GitHub
  already matches is skipped, which also stops the GitHub → difit writes from
  echoing back.

### Restyling

`inject/destinations.js` restyles PR comments from `/__wrap/github.json`. It
matches difit's `#comment-thread-<id>` elements to `/api/comments-json`
threads by message order and sets `data-dif-gh` / `data-dif-gh-thread`
attributes rather than classes, because React rewrites `className` but leaves
unknown attributes alone.

## The injected prompt and the skill handoff

The injected prompt is deliberately **minimal**: the comment's `file:line` (or
line range), the quoted body, and "Address it using the /diff-review
skill." It carries **no** commit policy, POST endpoint, or port. Everything about
*how* to respond lives in the `diff-review` skill so we don't re-explain
the contract on every comment (`src/inject/prompt.rs`).

The skill reads `dif`'s `.difit/.session-<…>.json` for the `port` (where to POST)
and the `comparison_key` (which sets the commit policy below). It also decides
whether the comment even needs a code change.

## Commit policy (by comparison)

The skill first decides whether the comment **calls for a code change** or is
just a question/discussion that needs only an answer (no edit). When a change is
warranted it applies the policy, derived from the `comparison_key` in the
session file:

| Comparison | Policy (when a change is warranted) |
| --- | --- |
| a branch (`develop` / `main` / `@ …`) | edit, **commit** with a focused message naming the comment |
| `.` / `staged` / `working` | edit, **fold into the existing uncommitted changes, do not commit** |

## The Reply Contract

The skill (not the prompt) owns the reply: it composes a JSON array with one
import-shape `reply` entry (same `filePath`/`position` as the thread,
`author: "claude"`, a fresh id, ISO timestamps, the reply body) and POSTs it to
`POST /api/comment-imports` on the live port. The poller mirrors the posted
reply back into the transcript on its next tick. A pure question always gets a
reply; for a code-change comment the reply is optional and terse. The skill
defines the exact wording and what the agent prints in chat.
