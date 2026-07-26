# Integrations

The heart of `dif`: how it drives difit and claude, and how a reviewer comment
becomes an addressed change without a manual handoff.

## difit endpoints used

difit exposes a small HTTP API on its port; `dif` uses three pieces of it:

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `GET /api/comments-json` | the poller | read the live `{version, threads}` state |
| `POST /api/comment-imports` | claude (its reply) | merge import-shape entries; difit bumps `version` and broadcasts `commentsChanged` over its `/api/watch` SSE, so the browser refetches and updates **live** |
| (readiness) `GET /api/comments-json` | startup | confirm difit bound before starting the poller |

The live `POST` path is why there is **no server restart** in the loop: difit's
own client subscribes to `/api/watch` and refetches on `commentsChanged`, so a
reply posted by claude shows up in the open browser immediately.

## difit lifecycle

`dif` runs difit inside a read-only `PtyPane` (the left pane is difit's server
log). The command is:

```
cd <repo> && exec <difit> <args…> --port <P> --keep-alive --include-untracked [--comment <json>]
```

- `<difit>` resolves to the repo's local `node_modules/.bin/difit` when it
  exists (a repo can pin difit as a devDependency so no global install or `PATH`
  entry is required), and falls back to a bare `difit` from `PATH` for repos
  with no local install (e.g. non-JS projects). See `difit_program` in
  `src/difit/server.rs`.
- `<args…>` come from the comparison key (`.`/`staged`/`working`, or `@ <branch>`).
- `--port <P>` is a confirmed-free port (we bind-test it first; difit would
  otherwise silently auto-reassign an occupied port and strand the poller).
- `--keep-alive` keeps difit up when the browser disconnects.
- `--comment <json>` seeds difit with the existing transcript on launch.
- The browser opens by default (difit's behavior); tests pass `--no-open`.
- `exec` replaces the wrapper shell with difit so the pane's tracked PID **is**
  difit. Killing the pane child then signals difit directly rather than leaving
  an orphaned server holding the port — which matters for in-place restart.

difit dies with the TUI: dropping the `PtyPane` kills the child.

### Restarting difit in place ("Restart dif")

"Restart dif" — the command palette entry or its `Ctrl+R` shortcut (see
[features.md](features.md#restart-dif)) — restarts only the difit server,
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
4. It reopens the review in the browser via `App::open_in_browser`, which targets
   the **wrapped-shell URL** (the running `WebShell` still proxies the same port),
   not raw difit.

The poller (still pointed at the unchanged port) and the claude pane are not
touched; the poller just reconnects once difit answers again. The dispatcher's
once-each baseline means reseeded comments are not re-injected.

The restart warning that prompts this is **attributed**: `dif` tracks when it
last injected a prompt into claude (`last_inject_at`, set on comment injection
and on `Ctrl+G`) and words the alert "Claude made code changes…" when the change
settles soon after an injection, or "New manual changes detected…" otherwise. It
re-arms on each new distinct change, so a manual edit after a prior warning still
alerts. See [architecture.md](architecture.md#difit-pane-activity-log).

### Regenerating the diff guide ("Regenerate diff guide" / `Ctrl+G`)

The diff guide is generated and maintained by the `diff-review` skill, not
by `dif`. `Ctrl+G` (or the palette entry) types a minimal request into the claude
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
button. Since the shell server thread can't type into the claude pane, it bridges
through a shared flag: `POST /__wrap/regenerate` sets `Ctx::regen`
(`Arc<AtomicBool>`) and returns `202`; the event loop polls
`WebShell::take_regen_request()` each tick (`App::poll_web_shell_requests`) and
runs the same `regenerate_guide()`. Both the TUI guide view and the shell's
`groups.json` poll then pick up the rewritten guide.

## The claude pane

A resumable claude session in the repo root. We invoke `claude` with
`--dangerously-skip-permissions` so injected review comments don't stall on a
permission prompt; those options live in `CL_OPTIONS` in `src/session.rs`.

```
cd <repo> && claude --dangerously-skip-permissions (--resume <id> | --session-id <id>)
```

A **fresh** session is launched with an initial review message appended as a
final argument so claude submits it on startup and stays interactive (the
`prompt` parameter of `session::build_claude_command`, gated by
`session::initial_prompt`): it states the conversation is about the current diff
review and to load the `/diff-review` skill. A **resumed** session gets no
such message — that orientation is already in the resumed conversation's
context, so re-injecting it would just repeat work.

The session id is remembered in `.difit/.claude-session-<branch>-<scope>`; a
relaunch resumes it when its transcript still exists, else starts fresh. New
comments are typed into the pane via the same keystroke-injection trick the
`tasks`/`brain` shells use (`send_prompt_to_pty`): characters typed, internal
newlines as `Alt+Enter`. The submitting `Enter` is sent as a **separate,
~200ms-delayed keystroke**, not appended to the same burst: claude coalesces a
fast input burst and treats a newline inside it as *pasted* text (so a trailing
`CR` would leave the prompt sitting unsent), whereas a discrete delayed `Enter`
submits it. Bursts are absorbed by claude's own input queue — there is no queue
or `--resume` cycling in `dif`.

## Injection: baseline, then once-each

- On the first successful poll, every existing reviewer comment id is recorded
  as a **baseline** and *not* dispatched — `dif` only acts on comments added
  after launch. (Pre-existing open comments are intentionally left for you to
  trigger manually in claude if you want them addressed.)
- After that, any **reviewer** comment with no later `claude` reply in its
  thread is typed into the claude pane exactly once (tracked by message id). A
  reviewer comment is any authored message whose author is **not** `claude`:
  difit's browser stamps hand-typed comments as `"User"`, and the
  `diff-review` skill posts as `"reviewer"`; both (and any other non-claude
  author) count. Matching `reviewer` alone would miss every comment you type in the
  browser, since difit hardcodes that author as `"User"`.

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

## The reply contract (claude's side)

The skill (not the prompt) owns the reply: it composes a JSON array with one
import-shape `reply` entry (same `filePath`/`position` as the thread,
`author: "claude"`, a fresh id, ISO timestamps, the reply body) and POSTs it to
`POST /api/comment-imports` on the live port. The poller mirrors the posted
reply back into the transcript on its next tick. A pure question always gets a
reply; for a code-change comment the reply is optional and terse — the skill
defines the exact wording and what claude prints in chat.
