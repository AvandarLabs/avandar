# AGENTS.md

You are an AI agent working in the `dif/` directory of the `diff-review` skill.
This file is the single entry point for anything an agent needs to know about
the project. **Read it before changing code.** (Other agent tools — Codex,
opencode, Cursor — also resolve `AGENTS.md`; `CLAUDE.md` is a symlink to this
file so Claude Code picks it up too.)

## What this project is

`dif` is a Rust TUI — the "dif shell" — that wraps
[difit](https://github.com/yoshiko-pg/difit) and turns local diff review into
a live conversation with an LLM frontend. Launching `dif` opens a two-pane,
alternate-screen ratatui frontend:

- **LEFT — difit:** difit runs under a `PtyPane`; the pane shows the server's
  output and logs (URL, requests, status). The actual diff review happens in
  the browser difit opens; this pane is the server's console.
- **RIGHT: LLM panel:** Claude by default, or Codex when launched with
  `--codex`, running in the repo root.

A background thread polls difit's `GET /api/comments-json`, mirrors the threads
to the `.difit/<branch-slug>-difit-<scope-slug>.json` transcript, and detects
new reviewer comments (any author other than `claude`). Each new comment is
**typed once** into the
LLM pane; the agent addresses it, then POSTs its reply to difit's
`POST /api/comment-imports`, which pushes the reply to the browser live over
SSE. No server restart, no manual "address the comments" handoff.

This crate **replaces** the old zsh `dif` function and the Python helpers
(`difit-watch.py`, `difit-stop.py`) that used to live here.

For a deeper map, see [docs/architecture.md](docs/architecture.md).

## This project is coupled to the `diff-review` skill

`dif` and the `/diff-review` skill are two halves of one workflow: the
skill **writes** the review transcript and the diff guide; `dif` **runs** the
server, injects comments, and **renders** the guide. They share an on-disk
contract under `.difit/` (filenames, JSON/markdown shapes). You cannot reason
about one without the other.

- **Always load the `diff-review` skill as reference before changing code
  here.** Its source of truth is the skill's `SKILL.md` two directories up
  (`../../SKILL.md`) — this crate is bundled inside that skill at
  `scripts/dif/`. Read it, don't guess what it produces.
- **"Update the skill" always means `../../SKILL.md`**, even though it does not
  live in this directory. When the user asks to change diff-guide content
  rules, the reviewed-state behavior, the group/file review semantics, or the
  summary format, edit `../../SKILL.md` — not this crate. The Rust crate only
  renders and triggers; the *content* rules live in the skill.
- **The diff guide must stay current.** Whenever code changes during a review,
  the guide markdown under `.difit/` must be regenerated so it always reflects
  the present diff. That regeneration is the skill's job; `dif` only triggers
  it (`Ctrl+G`) and renders the result.
- **The diff never waits on the LLM.** difit needs only git, so `dif` always
  starts difit, the poller, the session metadata, and the browser shell at
  launch — even with no prepared review. It creates the transcript as `[]`
  first and shows the diff immediately. Nothing in this crate may reintroduce a
  wait for review artifacts before showing the diff.
- **A launch never starts a review.** The LLM pane comes up **idle**: nothing is
  typed into it at launch, fresh or resumed. With no prepared review, `dif` asks
  in the start-review modal (`tui/start_review/`), and *only* an explicit Yes
  injects `/diff-review [comparison]`; a No starts nothing. Generating a review
  costs the user real tokens and time, so it is always their call. Nothing in
  this crate may reintroduce an automatic kickoff — if you find yourself passing
  a prompt to `session::build_llm_command` on a launch path, stop.
  Once a review *is* running, the guide, summary, test plan, and `claude` threads
  fill in as the skill writes them.
- **The transcript is a two-way channel.** The poller mirrors difit's state into
  it, *and* imports back out of it: a write the poller did not make is the
  skill authoring a round, so entries difit has never held are POSTed to
  `/api/comment-imports` instead of being overwritten. difit remains the source
  of truth for the conversation; see `docs/integrations.md`.

## The docs/ contract

**Whenever you add a feature, change a keybinding, alter the transcript/comment
contract, change a startup behavior, or change the module shape, update the
relevant file under `docs/` in the same change.**

The docs are the source-of-truth for *what* the dif shell does and *why*. Code
is the source-of-truth for *how*. They must agree on what.

| If you change… | Update… |
| --- | --- |
| Module list, data flow, build pipeline, thread model | `docs/architecture.md` |
| User-visible behavior (panes, startup, browser open, injection) | `docs/features.md` |
| Comment/transcript JSON shape, session file, slug/port derivation | `docs/data-model.md` |
| Any keybinding | `docs/keybindings.md` and the in-code shortcut table |
| difit lifecycle, the `/api/*` endpoints used, the LLM pane, the POST reply path, commit policy | `docs/integrations.md` |
| `config.json` schema or loader | `docs/config.md` |
| Testing strategy, what we test vs. skip, mocking | `docs/testing.md` |

If a change spans multiple categories, update all the relevant docs. Do not
defer the doc update.

## What docs/ is for

- Self-contained context any agent can land in and understand without
  re-reading the entire source tree.
- Cross-file invariants the code doesn't make obvious (the difit endpoint
  contract, the `reviewer`/`claude` authorship rules, the dispatched-once
  invariant for comment injection).
- The "why" behind non-obvious choices (why we POST replies live instead of
  restarting difit; why injection relies on the LLM frontend's own input queue).

## What docs/ is NOT for

- A line-by-line code commentary. Read the source for that.
- Implementation rationale already in a code comment.
- Decision logs / changelog. Git history is the record of change.

## Quick orientation for new agents

1. Read [docs/README.md](docs/README.md) — the index.
2. Read [docs/architecture.md](docs/architecture.md) end-to-end.
3. Read [docs/integrations.md](docs/integrations.md) — the difit endpoint
   contract and the LLM injection/reply loop are the heart of this tool.
4. Open the file you actually need to touch.
5. As you change code, edit the docs alongside it.

## Build, run, test

```sh
# rebuild + run via the zsh wrapper (auto-rebuilds when src/ changes)
dif                 # vs develop if it exists, else main
dif .               # uncommitted worktree changes
dif <branch>        # vs <branch>

# manual rebuild (run from this dif/ directory)
cargo build --release

# the full test suite
cargo test --release

# one module's unit tests
cargo test --release session::
```

The `dif` zsh wrapper in this directory is the entry point (it execs the
prebuilt `bin/dif`, rebuilding from source first if sources changed). Users
never type `cargo run`.

## Red/Green TDD — the iron law

**No production code lands without a failing test written first.**

1. **RED.** Write the smallest test for the next behavior. Run it. Watch it
   fail (compile error or assertion). A test you never saw fail proves nothing.
2. **GREEN.** Write the simplest code that turns *that* test green. Don't add
   behavior the red test doesn't demand.
3. **REFACTOR.** Clean up with the bar green; re-run to stay green.

When fixing a bug: first a failing test that reproduces it, *then* the fix.

## Testing

- **What to test:** slug/port derivation, comparison-key parsing, the
  server-thread → import-shape conversion, the dispatched-once invariant for
  comment injection, prompt building (commit policy by comparison key),
  transcript read/write round-trips, error paths.
- **What NOT to test:** tautological defaults, getters, "does it compile"
  smoke tests.
- **Mocks live only at trait boundaries we own.** Don't mock the PTY — test it
  by spawning a real short command and asserting on the parsed vt100 screen
  (see `src/pty_pane.rs`). Don't mock the difit server in a way that diverges
  from its real responses; prefer fixtures captured from a real
  `/api/comments-json`.
- **Production modules don't get test-only methods.** Test helpers live under
  `#[cfg(test)]` in the same module (unit) or in the integration test file.

See [docs/testing.md](docs/testing.md) for the full strategy.

## House rules (project-specific)

- **No `unsafe`.** `[lints.rust] unsafe_code = "forbid"` enforces it.
- **Keep files modular and under 400 lines.** Split by responsibility into
  subdirectories (a `tui/` dir, a `difit/` dir, etc.). When a file approaches
  400 lines, break it up.
- **Don't introduce new dependencies casually.** Match the existing dependency
  set (ratatui, tui-term, vt100, portable-pty, crossterm, anyhow, clap,
  serde/serde_json, ureq or similar for HTTP). Justify any addition in
  `docs/architecture.md`.
- **Every exported function gets a `///` doc comment.** Otherwise default to no
  comments unless the *why* is non-obvious.
- **A command-palette action that also has a direct key must advertise it.**
  Whenever you add or change a shortcut that is *also* a command-palette action,
  the palette row must show the key as a dimmed gray `[…]` hint, and the hint
  must update if the key changes. The hint is derived from
  `palette::shortcut_for`, so the rule is: add/update a `shortcut_for` arm for
  that `PaletteAction` and the dimmed hint renders automatically
  (`draw_palette.rs`). Don't hand-write the key into the label. (We deliberately
  do *not* carry a separate "show in palette" boolean: `PALETTE_COMMANDS` is the
  palette, so every entry in it is already a palette action — a flag would be
  redundant with our registry shape. Plain hotkeys that are *not* palette
  actions, like `d` / `l` / `Tab`, live only in the event loop + `keybindings.md`
  and get no `shortcut_for` arm.)
- **Never modify a `reviewer`-authored comment.** The reviewer's entries are
  passed through verbatim; the tool only ever adds `claude`-authored replies.
