# `dif`: review a diff in difit as a live conversation with an LLM

`dif` is a Rust TUI that wraps [difit](https://github.com/yoshiko-pg/difit).
It is bundled with the `diff-review` skill (it lives in the skill's `dif/`
directory). It opens a two-pane terminal shell:

- **Left: difit:** the difit server's log, or a waiting status while the LLM
  prepares the first review. The diff itself is reviewed in the browser shell
  once difit starts.
- **Right: Claude/Codex:** Claude by default, or Codex with `--codex`.

A background thread polls difit for new reviewer comments. Each new comment is
typed into the LLM pane automatically; the agent addresses it and POSTs its
reply back to the live difit server, which pushes it to the browser over SSE.
**No "address the comments" handoff, and no restarting `dif`.**

```sh
dif                  # vs develop if it exists, else main
dif <branch>         # vs <branch>
dif .                # uncommitted worktree changes
dif staged|working   # staged / working tree
dif <branch> --codex # use Codex instead of Claude
```

| Key | Action |
| --- | --- |
| `Alt+H` | focus the difit log pane |
| `Alt+L` | focus the LLM pane |
| `Ctrl+P` | open the command palette (e.g. "Restart diff server") |
| `Ctrl+Q` | quit |

## How it works

1. Resolve repo + comparison key; pick deterministic free ports.
2. If the matching `.difit` transcript and guide files exist, spawn difit
   (`--keep-alive --include-untracked`, seeded with the transcript via
   `--comment`) in a read-only PTY pane and open the browser shell.
3. If those files do not exist, start only the LLM pane with `/diff-review`
   plus the comparison arg the user passed to `dif`; bare `dif` uses just
   `/diff-review`. When the files appear, start difit and the browser shell.
4. Spawn the LLM session in the right pane.
5. Poll `GET /api/comments-json` once a second, mirror it to
   `.difit/<branch>-difit-<scope>.json`, and detect new reviewer comments.
6. Type each new comment into the LLM pane.
   The agent commits-or-not per the comparison (branch → commit per comment;
   `.`/staged/working → fold into the changes, no commit), then posts its reply
   to `POST /api/comment-imports`.

See [docs/](docs/). Start with [docs/architecture.md](docs/architecture.md)
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
rewrite-file → relaunch dance; `dif` mirrors the server back to disk on its
own. The retired `difit-watch.py` / `difit-stop.py` helpers have been removed;
their watching and lifecycle duties now live inside this binary.
