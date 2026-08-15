---
name: diff-review
description: Use when preparing or updating a difit review transcript, reviewing a pull request for the user, responding to difit comments, managing the diff guide or reviewed state, reprinting a review summary, or cleaning stale .difit files.
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
2. Resolve the repository root, then resolve `difit` in this order:
   - If `<repo-root>/node_modules/.bin/difit` exists, run
     `<repo-root>/node_modules/.bin/difit --version` and use that exact binary.
   - Otherwise, use `command -v difit`, then verify the returned global binary
     with `difit --version`.
   - Never prefer a global binary over the repository-local shim, and never use
     `npx` to install or resolve `difit` implicitly.
3. Prepare the repository launcher as described in
   [Repository run command](#repository-run-command). In PR review and read-only
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
artifacts; report that no comments are open and wait for a concrete request.

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
| Reviewed state | `-reviewed.json` |

The skill writes these artifacts. The TUI reads them and owns live session
metadata and transcript mirroring.

`dif` starts difit as soon as it launches, before any of these exist, and
creates the transcript as `[]` so the reviewer can comment immediately. Treat an
empty transcript as a new transcript, and never treat the transcript's presence
alone as proof that a review exists: that requires `-guide.md` and `-guide.json`
too.

## Transcript contract

Every entry must include stable identity, authorship, and timestamps:

```jsonc
{
  "type": "thread",
  "id": "claude-r1-cta-button-99",
  "filePath": "src/components/CtaButton.tsx",
  "position": { "side": "new", "line": 99 },
  "body": "Markdown comment",
  "author": "claude",
  "createdAt": "2026-06-08T15:30:00Z",
  "updatedAt": "2026-06-08T15:30:00Z"
}
```

For a range, use `"line": { "start": N, "end": M }`. Replies use
`"type": "reply"` and must copy the parent thread's `filePath` and `position`
exactly because difit has no parent-id field.

- Write only `author: "claude"`. Treat every other author as the reviewer and
  never modify their entries.
- Use `claude-r<round>-<unique-slug>`. The next round is one greater than the
  highest existing `claude-r<N>-*` id.
- Use current ISO 8601 UTC timestamps for new entries. Do not alter existing
  entries or reuse ids.
- Resolve the reviewer display handle with
  `sh <skill-dir>/scripts/get-reviewer-name.sh` when needed.

Validate every complete transcript before reporting success:

```bash
python3 <skill-dir>/scripts/validate.py <transcript-path>
```

### Writing the transcript while a session is live

A live `.session-<branch-slug>-<scope-slug>.json` means difit is already serving
this comparison in the reviewer's browser, which is now the normal case even for
a brand-new review. Then:

- Re-read the transcript immediately before writing it. The reviewer may have
  commented while you worked, and the TUI poller mirrors those comments into the
  file continuously.
- Preserve every existing entry and append only new `claude` entries. Dropping
  an entry is a bug, not a way to remove a comment.
- Writing the file is enough to reach the open browser: the TUI detects a write
  it did not make and imports the new entries into the live difit server, which
  pushes them over SSE. Do not restart `dif`.
- POSTing the new entries yourself is also fine and is idempotent with that
  import. Continue mode still POSTs, because a single reply should appear at
  once.

### Comment style

Never use em dashes. Keep comments direct and concise.

Before writing any PR finding or review summary, read
[`references/comment-style.md`](references/comment-style.md) and follow it. It
governs the prose of a review comment: how to lead, how long to be, when to ask
instead of assert, and what never to write. If
`~/.diff-review/comment-style.md` exists, read that too and let it win on any
conflict.

For explainers on the agent's own diff, comment only when the reviewer benefits
from context the diff does not state: why an abstraction exists, how data moves,
which domain rule or invariant applies, or why a fallback or integration works
that way. Skip formatting, naming-only changes, obvious helpers, and narration
of the attached line. Never comment outside the requested diff scope.

For replies to change requests, use exactly `Done.` unless the reviewer asked a
question or needs a non-obvious trade-off, behavior change, or out-of-scope
follow-up. Never cite commits or restate code visible in the diff.

For PR findings, write text a human can paste into GitHub unchanged, in the
voice `references/comment-style.md` describes:

- Nit: state the correction only.
- Documented rule violation: state the fix and cite the rule.
- Undocumented convention: identify it without presenting it as a rule.
- Bug: explain the failure condition and concrete fix.
- Architecture or data-model concern: use concise bullets.

## Repository run command

In Initial mode, ensure the script and detect the package manager:

```bash
python3 <skill-dir>/scripts/ensure-command.py
sh <skill-dir>/scripts/detect-pm.sh
```

In PR review and Summary mode, preserve the reviewed source: use the package
script only if it already exists, otherwise use the direct runner. Package
manager detection is read-only and remains safe.

Format the final line from their output and the selected comparison:

- pnpm, yarn, or bun: `→ Run: <pm> diff-review <args>`
- npm: `→ Run: npm run diff-review -- <args>`
- npm without args: `→ Run: npm run diff-review`
- No package script, including `NO_PACKAGE_JSON`:
  `→ Run: sh <skill-dir>/scripts/dif/run.sh <args>`

If a live session for the current branch has `comparison_update_url`, notify it
before reporting the run command. Prefer the matching comparison or the sole
unambiguous session. POST `{"comparisonKey":"<selected-key>"}` to that URL.
HTTP 202 means accepted; 409 means the review is already prepared and its
comparison is settled. Missing, ambiguous, or failed handoff is non-fatal.

Do this handoff early, before writing any artifact. `dif` honors it only while
no guide exists and the reviewer has not commented yet; after that it keeps the
comparison the reviewer is already looking at.

When a live session already covers the selected comparison, the reviewer's
browser is open on this diff, so a run command is noise. Replace the final
`→ Run:` line with:

```text
→ Review is live · no relaunch needed
```

## Diff guide contract

The guide is a complete, stable partition of the current diff. Every file must
appear exactly once in `-guide.md`, `-guide.json`, and the group roster in
`-reviewed.json`. Reviewed groups remain in both guides; their statuses show
completion. This invariant keeps the web shell's "new files not in guide"
signal meaningful.

Group files by one cohesive concern and order groups so earlier groups provide
context for later ones. Prefer small groups when a natural seam exists, but do
not split a cohesive change merely to reduce its file count. Preserve group
numbers for the life of the review; new groups take the next unused number.

Put generated and non-reviewable artifacts in one final group named
`Generated: review not required`, with `kind: "generated"`, zero threads, and
`reviewed` status so they do not inflate remaining-review counts. Do not store
review signatures or write explainer threads for them.

### Rendered guide

```markdown
# Diff guide: <branch> vs <comparison>

_<n> threads · <n> files_

## Group 1. <group name>

<optional one-line orientation>

| File | Threads | Status | Note |
| --- | --- | --- | --- |
| `src/a.rs` | 2 | pending | <six-word tag> |
| `src/b.rs` | 1 | ✅ reviewed | <tag> |
| `src/c.rs` | 3 | ⚠️ changed since review | <tag> |
```

### Structured guide

Write `-guide.json` in lockstep with `-guide.md`:

```jsonc
[
  {
    "n": 1,
    "kind": "bug",
    "ticket": "PP-39",
    "name": "mixed-media child ordering",
    "orient": "One-line orientation.",
    "files": [
      {
        "path": "src/a.ts",
        "tag": "assigns sibling order at save",
        "threads": 1,
        "status": "pending"
      }
    ]
  }
]
```

Use exact repo-relative paths. `threads` counts `claude` threads for the file.
Allowed status values are `pending`, `reviewed`, and `changed`.

After every guide write, run the deterministic coverage gate until it passes:

```bash
python3 <skill-dir>/scripts/check-guide-coverage.py <guide-json-path> <comparison-key>
```

### Reviewed state

```jsonc
{
  "groups": [
    { "n": 1, "name": "...", "files": ["src/a.rs", "src/b.rs"] }
  ],
  "reviewedGroups": [],
  "reviewedFiles": {
    "src/b.rs": "<git hash-object output>"
  },
  "changedFiles": ["src/c.rs"]
}
```

Use `git hash-object -- <path>` as the reviewed-file signature.
Initialize all three state collections as empty for a new review.

- Marking a group reviewed adds its number to `reviewedGroups` and records all
  file signatures. Keep the group in the guides with reviewed statuses.
- Marking one file reviewed records its current signature.
- During regeneration, compare stored signatures with current content. Remove
  stale signatures, add those paths to `changedFiles`, remove affected groups
  from `reviewedGroups`, and mark those files `changed`. Keep them in
  `changedFiles` until reviewed again, then remove them from that list.
- Reconcile state with the new roster: remove absent paths from `reviewedFiles`
  and `changedFiles`, and remove group numbers absent from the current roster
  from `reviewedGroups`. When a retained group's file membership changes,
  remove it from `reviewedGroups` unless every current reviewable file has a
  current signature.
- Answer "what is reviewed?" from `-reviewed.json`; answer "what remains?" from
  its current signatures and the guide roster.

### Summary and test plan

Write `-summary.md` and `-test-plan.md` for a new review. Regenerate either only
when its content becomes stale.

The summary is a markdown list of at most three one-sentence bullets describing
the diff at a high level. Do not include file inventories or test steps.

The test plan is a numbered list of concrete manual steps. Include exact paths,
clicks, and commands. Put commands in fenced code blocks and literal text the
user must copy in blockquotes or another isolated markdown block.

## Chat output

After Initial and manual Continue rounds, send one raw-markdown navigation
summary of at most 30 lines. Do not fence it, paste JSON, narrate individual
comments, or use a table for files.

Include the round, branch and comparison, counts, concern groups in review
order, each file's thread count and a tag of at most six words, and the next
step. Add a one- or two-sentence file-purpose continuation only when the path,
tag, and group do not reveal the file's role. For tiny diffs, omit group
headings.

```text
┌─ ROUND <N> · <branch> vs <comparison> ──────────────┐
│  <thread-count> threads · <file-count> files        │
└─────────────────────────────────────────────────────┘

**GROUP 1: <name>**  *(<orientation>)*
  ├─ `<path>`  [<n> threads] · <tag>
  └─ `<path>`  [<n> threads] · <tag>

→ Run: `<repository command>`
```

When a live session already covers this comparison, end with
`→ Review is live · no relaunch needed` instead of the run command.

A manual Continue summary also includes Addressed, New, and Open counts, plus
commits made in that round. End it with
`→ Reply posted live · no relaunch needed` instead of a run command.

## Workflows

### Initial

The reviewer is very likely already looking at this diff: `dif` opens difit
immediately and only then asks for the review. Write artifacts as you finish
them rather than batching everything to the end, so the browser fills in
progressively. The guides are what the reviewer is waiting on; write them before
polishing explainer threads.

1. Resolve the repo root, branch, comparison, stem, and artifacts. Do the
   comparison handoff now if a live session needs it.
2. If `.difit/<exact-branch-name>_explanations.md` exists, use it as a candidate
   list but verify each entry against the current diff. Otherwise inspect:
   - `.`: `git diff HEAD`, plus untracked files
   - `staged`: `git diff --staged`
   - `working`: `git diff`, plus untracked files
   - branch: `git diff <base>...HEAD`
3. For a new transcript — absent, or the `[]` one `dif` created — write helpful
   explainer threads or leave it `[]`. For a new round on an existing
   transcript, preserve every entry and append only new `claude` threads; never
   replace the conversation with the new round alone. With a live session,
   follow [Writing the transcript while a session is
   live](#writing-the-transcript-while-a-session-is-live).
4. Validate the transcript.
5. Write all guide artifacts. Initialize reviewed state only when it is absent;
   otherwise preserve and reconcile it. Pass the coverage gate.
6. Send the Initial chat summary.

A reviewer comment may arrive mid-round: `dif` types it into your input as soon
as it is written, so it lands as a queued message while you work. Finish the
Initial round first, then address it as a Continue round.

Except for the package script added by `ensure-command.py`, do not change source
files, commit, push, or merge in Initial mode.

### PR review

1. For a PR number or URL, read its description and base before fetching code:

   ```bash
   python3 <skill-dir>/scripts/get-pr-info.py <number>
   ```

   Follow the user's worktree conventions. Otherwise fetch the PR head into a
   temporary `review/pr-<number>` branch and worktree:

   ```bash
   git fetch origin pull/<number>/head
   git worktree add <worktree-path> -b review/pr-<number> FETCH_HEAD
   ```

   Fetch the base branch if needed. For a local diff critique, skip this step
   and remain in the current worktree.
2. Load project instructions, contributing guidance, lint configuration, and
   applicable code-review skills. This skill defines the workflow, not the
   project's review rules. Also load
   [`references/comment-style.md`](references/comment-style.md), plus
   `~/.diff-review/comment-style.md` when it exists, before writing any finding.
3. Review the PR with `git diff <baseRefName>...HEAD`; for a local critique,
   review the selected comparison. Check correctness, edge cases, architecture,
   data modeling, documented conventions, and useful nits.
4. Write one thread per finding, then use the Initial artifact, validation,
   coverage, and reporting steps with the selected comparison.

Do not change, commit, push, or merge the contributor's code.

### Continue

Continue has two entry paths: Injected handles one comment typed by the TUI;
Manual discovers all open comments from the transcript. This path is unrelated
to the `/diff-review auto <PR-number>` alias for PR review.

1. Read the matching `.difit/.session-<branch-slug>-<scope-slug>.json` for the
   live `port`, `comments_file`, and `comparison_key`. Read the mirrored
   transcript once for context. Never write it; the TUI poller owns it.
2. An open comment is a non-`claude` entry without a later `claude` reply at the
   same `filePath` and `position`. Classify it as a question, change request, or
   both. Do not edit code for a question alone.
3. When changing code, ensure the result remains visible to the active
   comparison. The bundled runner always uses these semantics:
   - A committed branch comparison, such as `develop`, `main`, or another
     ref: run relevant checks and automatically commit the complete
     comment-addressing change.
   - An unstaged comparison, such as `.` or `working`: make the requested
     changes without committing them. Tracked edits may remain unstaged and
     new files may remain untracked.
   - `staged`: stage every tracked edit and new file. `git add -N` is
     insufficient.
   - Inspect `git status` before replying.
4. Create only new entries. A question requires a reply. A completed change may
   omit the reply or use `Done.`; if declining a requested change, explain why
   in a reply. Copy the parent location exactly and use fresh ids and timestamps.
5. Validate the full transcript plus new entries in a temporary file, or for one
   reply verify its parent location exactly. POST only new entries:

   ```bash
   curl -sS -X POST "http://localhost:<port>/api/comment-imports" \
     -H 'Content-Type: application/json' \
     --data '<json-array-of-new-entries>'
   ```

6. If code changed, regenerate the guides and reviewed signatures, run the
   coverage gate, and update the summary or test plan only if stale.
7. Report according to the entry path:
   - Injected question with no code edit: compose the reply body once, POST it,
     then send that exact body as the entire chat response.
   - Injected change request: explain the completed work normally in chat. Keep
     any difit reply terse.
   - Manual: send the Continue navigation summary.

The POST updates the open browser live; do not restart `dif`.

### Diff guide

1. Resolve the current artifacts and read reviewed state, or initialize it.
2. Apply mark-reviewed instructions.
3. Re-derive the complete file roster. Reuse existing groups, preserve numbers,
   and append only genuinely new groups.
4. Recompute reviewed signatures and demote changed files.
5. Write reviewed state and both guides, then pass the coverage gate.
6. Update the summary or test plan only when stale.
7. Briefly report the reviewed and remaining counts without pasting the guide.

Do not change source files, commit, push, or post comments in Diff guide mode.

### Summary

Summary mode is read-only and explicit-only.

1. Resolve the transcript and guides from the requested or default comparison.
2. If the transcript is absent or empty with no guides, report that no review
   exists and offer Initial mode: `dif` creates an empty transcript at launch,
   so its presence proves nothing. A zero-thread transcript is valid only when
   both guide artifacts exist; if either is missing, report the review as
   incomplete and offer regeneration.
3. Otherwise reconstruct the navigation summary from the transcript and guide.
   Use the highest `claude-r<N>-*` id as the round, or round 1 when no such id
   exists. Include the repository run command, even for a transcript containing
   reviewer comments.
4. Output only the summary block.

Do not write artifacts, source files, commits, or comments in Summary mode.

### Cleanup

1. List local branches with
   `git for-each-ref --format='%(refname:short)' refs/heads` and slugify them
   with the runner's rules.
2. Inspect review artifacts and `.session-*.json` under `.difit/` only.
3. Keep files matching existing branch slugs. Rename an unambiguous stale stem
   to the current branch stem, moving all six artifacts together.
4. Delete remaining stale artifacts, sessions for deleted branches, and retired
   `.watcher-*.log` files. Never delete a session for an existing branch.
5. Delete an empty (`[]`) transcript that has no guide artifacts and no live
   session: it is the stub `dif` creates at launch, left by a run that never
   produced a review. Keep an empty transcript whose guides exist — that is a
   real zero-thread review.
6. Report every rename and deletion.

Never touch files outside `.difit/` in Cleanup mode.
