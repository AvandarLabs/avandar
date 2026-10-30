---
name: diff-review
description: Use when preparing or updating a difit review transcript or review walkthrough, reviewing a pull request for the user, responding to difit comments, managing the diff guide or reviewed state, reprinting a review summary, or cleaning stale .difit files.
---

# Diff Review

Prepare and maintain the difit artifacts used by the repository's `diff-review`
command. The transcript is the canonical conversation between `claude` and the
reviewer for one branch and comparison.

Never launch `difit` or the `dif` TUI. Prepare the artifacts and tell the user
which repository command to run.

## Prerequisites

Resolve paths such as `scripts/...` relative to this skill's directory,
represented below as `<skill-dir>`.

1. Require `python3`.
2. In the modes that end with a run command (Initial, PR review, and
   Summary), resolve the repository root, then resolve `difit` in this order:
   - If `<repo-root>/node_modules/.bin/difit` exists, run
     `<repo-root>/node_modules/.bin/difit --version` and use that exact binary.
   - Otherwise, use `command -v difit`, then verify the returned global binary
     with `difit --version`.
   - Never prefer a global binary over the repository-local shim, and never use
     `npx` to install or resolve `difit` implicitly.
3. In the modes that end with a run command (Initial, PR review, and
   Summary), prepare the repository launcher as described in
   [Repository run command](contracts/reporting.md#repository-run-command). In PR review and read-only
   Summary mode, do not add a script to the reviewed source. The bundled runner
   uses a matching prebuilt binary or builds from source with Rust when needed.
4. In PR review mode, `gh` is optional. `scripts/get-pr-info.py` falls back to
   the GitHub REST API; private repositories then require `GITHUB_TOKEN` or
   `GH_TOKEN`.

If a required tool is missing, stop and give the user the exact remediation.

## Select a mode

| Request or state | Mode |
| --- | --- |
| Explicit summary request | Summary |
| Explicit request for a walkthrough, an as-built design doc, or a document to read before the code, including `/diff-review walkthrough` | Walkthrough |
| Regenerate guide, mark reviewed, or report reviewed state | Diff guide |
| Open reviewer comments | Continue |
| Ask the agent to critique a PR or local diff, including `pr`, `pre`, `pre-review`, or `/diff-review auto <PR-number>` | PR review |
| No prepared review (missing or empty transcript, or either guide absent), or an explicit new round with no open reviewer comments | Initial |
| Explicit cleanup request | Cleanup |

An unreplied non-`claude` comment always selects Continue. Summary is
explicit-only. "Review this PR" and "prepare a diff review" ask the agent to
review; "prepare the diff for review" only asks for Initial setup. A live
session with no reviewer comment is Initial coordination state, not Continue.
For an existing unchanged review with no open comments, do not reset or rewrite
artifacts. If its walkthrough is missing, write it by running steps 2 to 12 of
[Walkthrough](modes/walkthrough.md), per
[When a walkthrough is written](#when-a-walkthrough-is-written); otherwise
report that no comments are open and wait for a concrete request.

`walkthrough` as the first argument names the mode, not a comparison:
`/diff-review walkthrough` uses the default comparison, and
`/diff-review walkthrough main` compares against `main`.

## Read the files for the mode

The rules live in files beside this one, split by mode and by phase so a run
loads only what it uses. Once the mode is selected, read every file in its row,
in full, before acting. A file points to another's rules rather than repeating
them, so a skipped file is a skipped rule. A link to a file outside the row,
such as a review pass's file, names a rule another phase applies: follow it
when a step tells you to read that file, not before.

| Mode | Read |
| --- | --- |
| Initial | `modes/initial.md`, `contracts/transcript.md`, `contracts/guide.md`, `contracts/reporting.md`, and `modes/walkthrough.md` when no walkthrough exists |
| PR review | `modes/pr-review.md`, then every file Initial reads |
| Continue | `modes/continue.md`, `contracts/transcript.md`, `contracts/guide.md`, `contracts/reporting.md` |
| Diff guide | `modes/diff-guide.md`, `contracts/guide.md` |
| Summary | `modes/summary.md`, `contracts/reporting.md` |
| Walkthrough, or a prepared review missing its walkthrough | `modes/walkthrough.md`, which names the `walkthrough/` files each step reads |
| Cleanup | `modes/cleanup.md` |

```text
SKILL.md        mode selection, artifact names, when a walkthrough is written
modes/          one procedure per mode
contracts/      transcript and comment voice, diff guide and reviewed state,
                run command and chat summary
walkthrough/    the walkthrough's contract, one file per part, and one file
                per review pass for the subagent that runs it
references/     comment and reply voice, a worked pipeline explanation
scripts/        validators, helpers, the glossary marker, and the dif runner
```

## Artifact names

`dif` derives one stem from the current branch and comparison:

```text
<repo>/.difit/<branch-slug>-difit-<scope-slug>
```

The default comparison is `develop` when that branch exists, otherwise `main`.
Examples on `feat/share`:

- `.`: `feat-share-difit-dot`
- `develop`: `feat-share-difit-at-develop`
- `main`: `feat-share-difit-at-main`

Use the slug rules in `scripts/dif/src/comparison.rs` and
`scripts/dif/src/slug.rs`. Append these suffixes to the stem:

| Artifact | Suffix |
| --- | --- |
| Transcript | `.json` |
| Rendered guide | `-guide.md` |
| Structured guide | `-guide.json` |
| Diff summary | `-summary.md` |
| Manual test plan | `-test-plan.md` |
| Walkthrough | `-walkthrough.md` |
| Reviewed state | `-reviewed.json` |

The skill writes these artifacts. The TUI reads them and owns live session
metadata and transcript mirroring.

`dif` starts difit as soon as it launches, before any of these exist, and
creates the transcript as `[]` so the reviewer can comment immediately. Treat an
empty transcript as a new transcript, and never treat the transcript's presence
alone as proof that a review exists: that requires `-guide.md` and `-guide.json`
too.

## When a walkthrough is written

A walkthrough is written by default, once, and changed only on request:

- **No walkthrough yet:** preparing a review writes one. Initial and PR review
  both do, once the guides are up, and so does a plain `/diff-review` on an
  already prepared review with no open comments whose `-walkthrough.md` is
  missing. Continue, Diff guide, Summary, and Cleanup never write one.
- **A walkthrough exists:** only Walkthrough mode changes it, and Walkthrough
  mode is selected only by an explicit request such as
  `/diff-review walkthrough`. No other mode regenerates or edits it, even after
  a code change has made it stale, because producing one costs more than every
  other artifact combined. When a code change makes it stale, say so in one
  line of the chat report and name `/diff-review walkthrough` as the way to
  regenerate it.
