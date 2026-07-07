# `dif` — review a diff in difit as a live conversation with claude

`dif` is a Rust TUI that wraps [difit](https://github.com/yoshiko-pg/difit).
It is bundled with the `diff-review` skill (it lives in the skill's `dif/`
directory). It opens a two-pane terminal shell:

- **Left — difit:** the difit server's log. The diff itself is reviewed in the
  browser difit opens.
- **Right — Claude:** a resumable `claude` session in the repo root.

A background thread polls difit for new reviewer comments. Each new comment is
typed into the Claude pane automatically; Claude addresses it and POSTs its
reply back to the live difit server, which pushes it to the browser over SSE.
**No "address the comments" handoff, and no restarting `dif`.**

```sh
dif                  # vs develop if it exists, else main
dif <branch>         # vs <branch>
dif .                # uncommitted worktree changes
dif staged|working   # staged / working tree
```

| Key | Action |
| --- | --- |
| `Alt+H` | focus the difit log pane |
| `Alt+L` | focus the Claude pane |
| `Ctrl+P` | open the command palette (e.g. "Restart dif") |
| `Ctrl+Q` | quit |

## How it works

1. Resolve repo + comparison key; pick a deterministic free port.
2. Spawn difit (`--keep-alive --include-untracked`, seeded with the existing
   `.difit` transcript via `--comment`) in a read-only PTY pane; difit opens
   the browser.
3. Spawn (or resume) a `claude` session in the right pane.
4. Poll `GET /api/comments-json` once a second, mirror it to
   `.difit/<branch>-difit-<scope>.json`, and detect new reviewer comments.
5. Type each new comment into Claude (relying on Claude's own input queue).
   Claude commits-or-not per the comparison (branch → commit per comment;
   `.`/staged/working → fold into the changes, no commit), then posts its reply
   to `POST /api/comment-imports`.

See [docs/](docs/) — start with [docs/architecture.md](docs/architecture.md)
and [docs/integrations.md](docs/integrations.md). Agent contributors: read
[AGENTS.md](AGENTS.md) first.

## Build / test

A prebuilt release binary ships at `bin/dif`. The `dif` zsh wrapper in this
directory execs it, and rebuilds from source first if any source file is newer
(so contributors never run `cargo` by hand). On a platform without a matching
prebuilt binary, build from source once:

```sh
cargo build --release   # run from this directory; produces target/release/dif
cargo test              # full suite
```

## Relationship to the `diff-review` skill

The skill still prepares the **initial** review transcript and composes
reply/thread content. Its **continue** mode posts replies to the live difit
server (`POST /api/comment-imports`) instead of the old stop-server →
rewrite-file → relaunch dance — `dif` mirrors the server back to disk on its
own. The retired `difit-watch.py` / `difit-stop.py` helpers have been removed;
their watching and lifecycle duties now live inside this binary.
