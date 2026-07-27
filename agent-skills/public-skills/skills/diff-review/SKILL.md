---
name: diff-review
description: Use when preparing or updating the `.difit/<branch>-difit-<scope>.json` transcript for the user's `dif` workflow — including the initial review of a diff, reviewing a GitHub pull request locally so the user can vet the agent's review before doing their own (`/diff-review pr <number>`, also aliased `pre`, `pre-review`, `auto`, and triggered by natural language that asks the agent to review a PR/diff for the user, e.g. "review this PR for me", "prepare a diff review", "pre-review PR 123"; the request to *review* is what triggers it — "prepare a diff for review" without asking the agent to review does not), responding to reviewer comments left in difit (`/diff-review continue|respond|address comments`), re-printing the chat summary block for an existing review (`/diff-review summary`), regenerating or updating the diff guide and its reviewed state ("regenerate the diff guide", "group N is reviewed", "I reviewed <file>", "what have I reviewed?", "what's left to review?"), or cleaning up stale `.difit/` files.
---

# Diff Review

Prepare or update the difit comment transcript that backs the user's `dif`
wrapper. The transcript lives at `<repo>/.difit/<branch-slug>-difit-<scope-slug>.json`
and is the canonical conversation between `claude` (you) and `reviewer` (the
user) for one review.

Never launch `difit` or the `dif` TUI yourself — the user runs the review
command (`<pm> diff-review`, see [The run command](#the-run-command)).

## Prerequisites

Check these before starting; if one is missing, stop and tell the user how to
install it rather than failing partway through.

- **`difit`** installed globally and on `PATH` (the `dif` TUI execs it
  directly; do not rely on `npx`). Verify with `command -v difit`.
- **The `diff-review` package.json script.** The review TUI (`dif`) is bundled
  with this skill (Rust source under `scripts/dif/`, prebuilt binary at
  `scripts/dif/bin/dif`). Do **not** assume a global `dif` command exists — the
  user may not have it on `PATH`. Instead, the repo invokes the bundled runner
  through a `diff-review` package.json script. On the first run in a repo, ensure
  that script exists (idempotent, safe to run every time):
  ```bash
  python3 <skill-dir>/scripts/ensure-command.py
  ```
  It prints `EXISTS`, `ADDED <value>`, or `NO_PACKAGE_JSON`. It adds the script
  only if missing, pointing at `scripts/dif/run.sh` as a **repo-relative** path
  whenever a runner exists inside the repo — either because the skill itself is
  vendored there, or (when the skill runs from an external install like a global
  plugin dir) because a copy of the runner is committed elsewhere in the repo. It
  falls back to an absolute path only when the repo has no runner at all. The
  repo-relative value is what lets teammates on a fresh clone run
  `<pm> diff-review` without a personal global `dif`. On a platform with no
  matching prebuilt binary the runner builds from source once via
  `cargo build --release` (needs a Rust toolchain).
- **`python3`** — runs `scripts/ensure-command.py` and the transcript validator
  `scripts/validate.py`.
- **`gh`** — GitHub CLI, **optional** (used only in PR review mode, and even
  there it's not required). The whole skill works without it: PR review pulls the
  diff with plain `git` and reads PR metadata via `scripts/get-pr-info.py`, which
  uses `gh` when present and otherwise falls back to the GitHub REST API (public
  PRs anonymously; private PRs need `GITHUB_TOKEN` or `GH_TOKEN`). Installing and
  authenticating `gh` (`gh auth status`) is the smoothest path but never a hard
  requirement.

Throughout this skill, paths like `scripts/…` are **relative to this skill's own
directory** (the one containing this `SKILL.md`), not the repo under review;
`<skill-dir>` denotes that directory. See [The run command](#the-run-command)
for how the final "run" line is formatted.

## Mode selection

Pick a mode before doing anything else:

| Trigger | Mode |
|---|---|
| User said "summary", "prepare another summary", "remind me how to review the diff", or invoked `/diff-review summary` | **Summary** |
| User said "regenerate the diff guide", or the `dif` TUI injected "Regenerate the diff guide … using the diff-review skill" (the `Ctrl+G` path) | **Diff guide** |
| User said "group N is reviewed", "I reviewed `<file>`", "mark … reviewed", "what have I reviewed?", or "what's left to review?" | **Diff guide** |
| User said "continue", "respond to comments", "address newest comments", or similar; OR the transcript already exists and contains messages authored by `reviewer`; OR a session file `.difit/.session-<…>.json` exists | **Continue** |
| User invoked `/diff-review pr\|pre\|pre-review\|auto <n>`, said "review PR <n>" / "review pull request <n>", or asked the agent in natural language to review a PR for them ("review this PR for me", "prepare a diff review for PR <n>", "pre-review <n>", "auto-review <n>") | **PR review** |
| No transcript yet, or transcript exists but contains only `claude` entries from a prior round and you have new code changes worth re-reviewing | **Initial** |
| User said "cleanup" | **Cleanup** |

When in doubt: if a `reviewer`-authored message in the transcript has no
`claude` reply after it, you're in **Continue** mode. Summary mode is
**explicit-only** — never default to it; only use it when the user
asked for a summary in so many words.

**Reading review intent (PR review vs "just prepare the diff").** PR review
mode is for when the user asks *you* to review — to read the code and leave
findings before they take their own pass. Judge intent from the sentence, not
from the mere presence of the word "review": "review this PR for me" and
"prepare a diff review" ask you to review; "prepare a diff **for** review" and
"prepare the diff" ask you only to set up the diff (the human reviews), so that
is **not** PR review mode. Trust your natural-language judgment here; these
examples are guardrails, not a keyword matcher.

## Shared rules (apply in every mode)

### File paths (must match `dif` exactly)

`dif` derives the filenames from the current branch + comparison key. The
slug rules live in the bundled CLI (`scripts/dif/src/comparison.rs` and
`scripts/dif/src/slug.rs`); read them if naming ever changes. The cache file is
always:

```
<repo>/.difit/<branch-slug>-difit-<scope-slug>.json
```

Examples on branch `feat/share`:
- `/diff-review .`           → `.difit/feat-share-difit-dot.json`
- `/diff-review develop`     → `.difit/feat-share-difit-at-develop.json`
- `/diff-review main`        → `.difit/feat-share-difit-at-main.json`

Defaults match `dif`: no argument → `develop` if it exists, else `main`.

Two sibling files share the same `<branch-slug>-difit-<scope-slug>` stem and are
owned by **this skill** (the `dif` TUI reads the guide and test plan to render
them but never writes them):

```
<repo>/.difit/<branch-slug>-difit-<scope-slug>-guide.md        # the diff guide
<repo>/.difit/<branch-slug>-difit-<scope-slug>-summary.md      # high-level diff summary
<repo>/.difit/<branch-slug>-difit-<scope-slug>-test-plan.md    # manual test plan
<repo>/.difit/<branch-slug>-difit-<scope-slug>-reviewed.json   # reviewed state
```

e.g. on `feat/share` with `develop`: `feat-share-difit-at-develop-guide.md` and
`feat-share-difit-at-develop-reviewed.json`. See [The diff guide](#the-diff-guide)
and [The diff summary and test plan](#the-diff-summary-and-test-plan).

### Comment shape

Every entry is a difit comment import. Always include `id`, `author`,
`createdAt`, `updatedAt` so dedup works and threads stay stable across
relaunches.

```jsonc
{
  "type": "thread",                       // or "reply"
  "id": "claude-r1-cta-button-99",        // stable, see "IDs"
  "filePath": "src/components/CtaButton.tsx",
  "position": { "side": "new", "line": 99 },          // or { "side": "new", "line": { "start": N, "end": M } } for a range
  "body": "…markdown…",
  "author": "claude",                     // yours; never reuse "reviewer"
  "createdAt": "2026-06-08T15:30:00Z",
  "updatedAt": "2026-06-08T15:30:00Z"
}
```

**Authorship:** your entries are always `author: "claude"`. The reviewer's
entries are authored under their resolved handle — `scripts/get-reviewer-name.sh`
returns it (GitHub/git handle, e.g. `jpsyx`, defaulting to `reviewer`), and the
`dif` TUI relabels difit's generic default author to it when mirroring, so the
reviewer's own comments read as their handle inside the diff. Treat **any
non-`claude` author** as the reviewer (difit may still show `User` for a comment
not yet mirrored). Never write or modify a reviewer-authored entry — pass them
through verbatim.

**Reply targeting:** difit attaches a `type: "reply"` to a thread by matching
`(filePath, position)` — there is no parent-id pointer. Your reply's
filePath and position must equal the target thread's filePath and position
exactly (same `side`, same `line` shape, same numbers).

**IDs:** use `claude-r<round>-<short-slug>`, e.g. `claude-r1-modal-58`,
`claude-r2-reply-to-r1-modal-58`. Round = how many times you've written to
this transcript (count existing `claude-r<N>-*` ids in the file; next round
is max+1, or 1 if none). The slug part just needs to be unique within the
file.

**Timestamps:** ISO 8601 in UTC. New entries use the current time. Never
back-date or rewrite timestamps on entries you didn't author.

### What to comment on

Explain (in both modes): why a new module/abstraction exists, how data
moves through a changed workflow, which business or domain rule the code
implements, why a particular fallback/validation/error path is there,
non-obvious invariants or ordering dependencies, integration points.

Skip: style/lint/format changes, naming-only cleanups, pure file moves
with no behavior change, helpers whose purpose is obvious from the local
diff. Don't comment on lines outside the requested diff scope.

### Writing claude entries — style

These rules apply to every `claude`-authored entry, both new `thread`
explainer threads and `reply` entries that respond to `reviewer`.

**Never use em dashes (`—`).** Not in review comments, not in replies, not in
threads, not anywhere. Use a colon, semicolon, comma, parentheses, or two
sentences instead. The **only** allowed use is a true explanatory interjection
where a paired em dash is the single best grammatical choice, and even then
prefer parentheses or commas. When in doubt, do not use one.

**For reply entries (responding to a `reviewer` comment):**

- Never reference commit hashes. The reviewer is looking at the diff,
  not `git log`. Saying *"Done in `abc1234`"* is noise. A bare
  `Done.` is enough when there's nothing else to add.
- Never restate the code you just wrote. The reviewer can read the
  new diff and see the change. Pasting the post-change snippet,
  paraphrasing it in prose ("`retry` now mirrors the `staleTime`
  style above it"), or describing what the change does in words is
  redundant.
- The bar for adding text past `Done.` is: *the reviewer cannot get
  this from the diff alone.* That includes:
  - A non-obvious **behaviour change** they should look for (e.g.
    "this also moves `Children.only` above the guard so the
    one-child contract is enforced even on the pass-through path" —
    they would not necessarily catch that from the line diff alone).
  - A **trade-off you considered and rejected** that the diff
    doesn't show (e.g. "I deleted the helper instead of keeping a
    thin wrapper because no caller exists yet" — the deletion is
    visible, the reasoning isn't).
  - An **answer to a question** that was actually asked. If they
    asked *"what is X for?"*, the reply explains X.
  - **Out-of-scope follow-up** the reviewer should know about (e.g.
    "develop is also missing this fix; backport as its own PR" —
    not visible in this branch's diff).
- A reply that addresses a change request and that doesn't have one of
  the points above should be exactly `Done.` and nothing else.
- When a question has a long answer, lead with the direct answer
  (yes/no, the canonical name, the concrete reason) and only then
  expand. Do not bury the answer at the end.

**For new threads (initial-mode explainers and any new threads you add
in continue mode):**

- Explain the *why*, the non-obvious *how*, or the broader context that
  the diff does not surface on its own. Do not describe the line above
  the comment ("This sets `staleTime` to Infinity offline" — the
  reviewer can see that).
- Lead with the load-bearing fact, then expand if needed. The first
  sentence should be the one the reviewer would want if they only read
  one sentence.
- Keep prose tight. If the second paragraph repeats the first in
  different words, cut it.
- Never paste the same code that's already on the line(s) the comment
  attaches to. A short reference snippet from elsewhere in the file
  is fine when the comparison is the point.

If a reply or thread feels like it's narrating the diff, delete it and
start over. The diff narrates itself.

### The run command

The final `→ Run:` line tells the reviewer how to launch the review. The user
may not have a global `dif` command, so the review TUI is launched through the
repo's `diff-review` package.json script (which points at the bundled runner).
Build the line deterministically — don't inspect the repo by hand:

1. **Ensure the package.json script exists** (idempotent; the first-run
   prerequisite):
   ```bash
   python3 <skill-dir>/scripts/ensure-command.py
   ```
   Note whether it printed `EXISTS` / `ADDED …` (script is present) or
   `NO_PACKAGE_JSON` (no JS project here).
2. **Detect the package manager:**
   ```bash
   sh <skill-dir>/scripts/detect-pm.sh
   ```
   Prints `pnpm`, `yarn`, `bun`, or `npm`.
3. **Format the run line** with the same comparison arg you'd pass `dif` (`.`,
   `staged`, `working`, a base branch, or nothing for the default):
   - Script present, manager is `pnpm` / `yarn` / `bun`:
     `→ Run: <pm> diff-review <args>` (e.g. `pnpm diff-review .`).
   - Script present, manager is `npm`: npm needs `--` before args:
     `→ Run: npm run diff-review -- <args>` (bare `npm run diff-review` when
     there are no args).
   - `NO_PACKAGE_JSON` (non-JS repo): fall back to the direct runner:
     `→ Run: sh <skill-dir>/scripts/dif/run.sh <args>` (or `dif <args>` if the
     user has sourced the optional zsh wrapper).

4. **Notify a live waiting TUI, if one exists.** When `/diff-review` is running
   inside an already-open `dif` TUI that was waiting for the first review, the
   TUI may not yet know which comparison key you selected. Before printing the
   final summary block, scan `.difit/.session-<current-branch-slug>-*.json` for
   a live session metadata file that contains `comparison_update_url`. Prefer a
   session whose `comparison_key` matches the originally requested comparison
   (including the default when no arg was supplied); otherwise use the only live
   session for the current branch. If there is exactly one usable URL, POST the
   selected comparison key there:

   ```bash
   python3 - "$comparison_update_url" "$selected_comparison_key" <<'PY'
   import json, sys, urllib.request

   url = sys.argv[1]
   comparison_key = sys.argv[2]
   body = json.dumps({"comparisonKey": comparison_key}).encode()
   req = urllib.request.Request(
       url,
       data=body,
       headers={"Content-Type": "application/json"},
       method="POST",
   )
   try:
       with urllib.request.urlopen(req, timeout=1) as resp:
           if resp.status not in (202, 409):
               print(f"comparison update returned HTTP {resp.status}", file=sys.stderr)
   except Exception as exc:
       print(f"comparison update skipped: {exc}", file=sys.stderr)
   PY
   ```

   Set `comparison_update_url` to the metadata file's `comparison_update_url`
   and `selected_comparison_key` to the comparison key from the final run
   command, e.g. `.` for `pnpm diff-review .` or `develop` for
   `pnpm diff-review develop`. HTTP `202` means the TUI accepted the comparison
   and will use it for starting/restarting difit and opening the browser. HTTP
   `409` means the TUI is already online, so leave it alone. If there is no
   live metadata file, more than one ambiguous candidate, or the POST fails,
   continue normally; this handoff is best-effort and only matters for an
   already-open waiting TUI.

Do this once per review round; the command is cheap and deterministic.

### Required chat output

**Exception — auto-injected single comment (the `dif` live flow):** when you
were triggered by the `dif` TUI typing one new reviewer comment into the pane
(Continue mode → **Auto**), the TUI summary below does **not** apply. Your chat
output instead follows
[Auto path — what to post and what to say in chat](#auto-path--what-to-post-and-what-to-say-in-chat):
for a **conversational** comment, the verbatim reply body and nothing else; for a
**change request**, your normal explanation of the work you did. The summary in
this section applies only to **Initial** mode and to **manual** multi-comment
**Continue** rounds.

After finishing **Initial** or a **manual Continue** round (Cleanup has its own
output — see that section), the last thing you send to the chat is a
single TUI-style summary. **Do not paste the JSON, do not re-explain
individual threads.** The transcript is the explanation; chat is for
navigation.

The summary tells the reviewer:

1. What was prepared (round, branch+comparison, file/thread counts; for
   continue mode also: commits made, comments addressed, comments still
   open if any).
2. Logical groupings of files — group by the underlying concern (a
   feature, a refactor, a fix). Order groups so earlier ones supply
   context for later ones. Within a group, order files so a reviewer can
   read top-to-bottom without back-tracking.
3. Per-file: comment count and a short tag (≤6 words) explaining why
   that file sits in that group.
4. *Optional* one- or two-sentence file-purpose note beneath a file row
   when knowing what the file is or how it fits into the broader picture
   is crucial to understanding the diff. **Two sentences MAXIMUM.** Skip
   it when the file's purpose is obvious from its path/name, the per-file
   tag, or the surrounding group context — not every file needs one. The
   bar is "without this, the reviewer would have to open the file to
   know what it is." Style-only cleanups, well-known config files
   (`package.json`, `.gitignore`, `eslint.config.js`, etc.), and files
   whose role is self-evident from their position in the tree do not
   need notes.
5. The next step. In **initial** and **summary** mode this is the run command
   (see [The run command](#the-run-command) for how to format it). In
   **continue** mode the reply is already live in the reviewer's browser (you
   POSTed it), so there is nothing to relaunch — replace the run line with a
   short confirmation like `→ Reply posted live · no relaunch needed`.

**Formatting rules:**

- Use box-drawing characters (`┌─┐│└┘├─`) for the header and the ASCII
  tree under each group. They render well in monospace; markdown bold
  and `code` formatting carry the visual hierarchy in lieu of color.
- **Output the summary as raw markdown. DO NOT wrap it in a fenced code
  block (```` ``` ````).** Wrapping the whole block in a code fence turns
  every `**bold**`, `*italic*`, and inline `` `code` `` into literal
  asterisks/backticks — you lose all the styling that distinguishes
  group names, file paths, and the `dif` command from surrounding text,
  and the output reads as a flat wall of monochrome ASCII. The
  templates below are shown inside code fences in this document so the
  shape is preserved verbatim for you to copy; the fences themselves
  are not part of the output you send to chat. The box-drawing
  characters render correctly on their own — they don't need a fence
  to look right.
- One group → one ASCII tree. Don't use tables for the file list; trees
  scan faster when each row is short.
- ≤ 30 lines of output total. If there's only one logical group, skip
  the group header entirely and just list files. File-purpose notes
  (rule 4 above) count against this budget — if a group would push past
  30 lines once notes are added, cut the notes you can defend, not the
  groups.
- Never narrate the comments themselves — the reviewer reads them in
  `difit`. Group names and per-file tags are positioning, not summary.
- When you do include a file-purpose note, place it on the line directly
  beneath the file row, indented to align with the file path (not the
  tree character). One or two sentences. No blockquote, no italics, no
  leading dash, no bullet — just the sentence(s) as a plain continuation
  of the row above. See the templates below for the exact shape.

**Template — initial mode** (copy what's between the fences, not the
fences themselves; the file-purpose-note line is *optional* per rule 4
— show it only on files where it's crucial):

```
┌─ ROUND <N> · <branch> vs <comparison> ──────────────┐
│  <thread-count> threads · <file-count> files        │
└─────────────────────────────────────────────────────┘

**GROUP 1: <group-name>**  *(<why this comes first>)*
  ├─ `<path/to/file-with-note>`   [<n> threads] · <tag>
  │   <One- or two-sentence file-purpose note. Skip this line when the
  │   file's role is obvious from path / tag / group context.>
  └─ `<path/to/file-no-note>`     [<n> threads] · <tag>

**GROUP 2: <group-name>**  *(<why this follows>)*
  ├─ `<path/to/file>`             [<n> threads] · <tag>
  └─ `<path/to/file>`             [<n> threads] · <tag>

→ Run: `<pm> diff-review <comparison-key>`
```

(The `→ Run:` line is formatted per [The run command](#the-run-command): `<pm>`
is the detected package manager, e.g. `pnpm diff-review .`.)

**Template — continue mode** (same shape, plus a status line and a
commits line if any commits were made this round; same rule — copy
the contents, not the fences; the file-purpose-note line is optional
per rule 4):

```
┌─ ROUND <N> · <branch> vs <comparison> ──────────────┐
│  Addressed <X> · New <Y> · Open <Z> · Commits <C>   │
└─────────────────────────────────────────────────────┘

**Commits this round:**
  • <sha-short>  <subject>
  • <sha-short>  <subject>

**GROUP 1: <group-name>**  *(<why this comes first>)*
  ├─ `<path/to/file-with-note>`   [<n> new · <m> replies] · <tag>
  │   <One- or two-sentence file-purpose note. Skip this line when the
  │   file's role is obvious from path / tag / group context.>
  └─ ...

→ Reply posted live · no relaunch needed
```

If the diff is tiny (1–3 files, no meaningful grouping), drop the group
headers and just list the files under the title box. File-purpose notes
still attach to individual file rows the same way.

## The diff guide

The diff guide is a standalone markdown file the `dif` TUI renders in its "Diff
guide" view (press `d` / `Tab` in the shell). It is a guide to what is left to
review — never a changelog, never an "already reviewed" archive; as you mark
work reviewed, fully-reviewed groups drop out of the *rendered* view. **When you
(re)write it, though, it must list _every_ file then in the diff** — completeness
at write time is a hard rule (see [Completeness](#completeness--the-guide-lists-every-file-in-the-diff)).

You own five files:

- `…-guide.md` — the rendered guide (below).
- `…-guide.json` — the **structured** form of the guide (below), consumed by the
  browser web shell's sidebar. Write it whenever you write `…-guide.md`.
- `…-summary.md` — the high-level diff summary.
- `…-test-plan.md` — the manual test plan.
- `…-reviewed.json` — the reviewed state that drives what the guide shows.

### Completeness — the guide lists every file in the diff

**Every time you write or regenerate the guide, it must include _every_ file
present in the diff at that moment. Never omit a file** — not lockfiles, not
generated output, not binaries. This is a hard rule across all three files
(`-guide.md`, `-guide.json`, `-reviewed.json`): the group roster is a **complete
partition** of the diff's files at write time.

Why: it's what makes the web shell's **"new files not in guide"** signal
trustworthy. With a complete guide, the only files difit shows that the guide
doesn't are ones that appeared *after* the guide was written — e.g. files you
created while addressing review comments — which is exactly the cue to
regenerate. If the guide silently dropped files, that signal would be permanent
noise instead.

Files that don't need reading — machine-generated or compiled artifacts such as
lockfiles (`Cargo.lock`, `pnpm-lock.yaml`), prebuilt binaries (`bin/dif`),
snapshots, and other build output — still go in the guide, collected into a
**final catch-all group named `Generated — review not required`**. It always
takes the **last** group number, and its one-line orientation must say the files
are generated and can be skipped in review (e.g. _"Machine-generated / compiled
artifacts — no review needed."_). Give each such file a `—` status and `0`
threads, and never write explainer threads on them. Do not scatter these files
into the concern groups; they belong together in this final group.

(This completeness is about **write time**. Later, as you mark real content
reviewed, fully-reviewed *content* groups may still drop from the rendered guide
— but the `Generated — review not required` group is never a review target, so
it never disappears.)

### When to (re)write the guide

- **Initial mode:** write the guide after writing the transcript.
- **Continue mode:** whenever you change code in a round, **regenerate the guide**
  so it matches the new diff (this is also enforced by the bundled CLI's
  `scripts/dif/AGENTS.md`).
- **Diff guide mode:** on an explicit "regenerate the diff guide" / `Ctrl+G`
  request, or after a mark-reviewed request, rewrite the guide from the current
  diff + the reviewed state.

Always run the validator on the transcript as usual; the guide itself is plain
markdown and needs no validation.

### Guide format

Markdown rendered by the TUI (headings, **bold**, `code`, lists, and **tables**
all render). Numbered groups, same grouping logic as the chat summary (group by
concern; order so earlier groups give context for later ones).

**Never use em dashes (`—`) in the guide.** Not in the title, not in group
headings, not in group names, not in orientations, tags, or notes. This is the
rule violated most often: group names like `Web shell — pure core` are wrong.
Use a colon (`Web shell: pure core`), a period in the heading separator
(`## Group 1. <name>`), commas, or parentheses. The pending-status glyph is a
middle dot `·`, never an em dash. The only allowed em dash anywhere is a true
explanatory interjection, and even then prefer parentheses.

```markdown
# Diff guide: <branch> vs <comparison>

_<n> threads · <n> files · what's left to review_

## Group 1. <group name>

<optional one-line orientation for the group>

| File | Threads | Status | Note |
| --- | --- | --- | --- |
| `src/a.rs` | 2 | · | <≤6-word tag> |
| `src/b.rs` | 1 | ✅ reviewed | <tag> |
| `src/c.rs` | 3 | ⚠️ changed since review | <tag> |

## Group 3. <group name>
| File | Threads | Status | Note |
| --- | --- | --- | --- |
| `src/d.rs` | 1 | · | <tag> |
```

- **Numbered groups, stable numbers.** A group keeps the same number for the
  life of the review (persisted in `-reviewed.json`), so "group 1" always means
  the same group even after others are removed. Visible numbers may therefore
  have gaps (e.g. Group 1 then Group 3 once Group 2 is fully reviewed). New
  groups that appear in a later round take the next unused number.
- **Status column:** `·` (not yet reviewed), `✅ reviewed` (file signed off but
  its group isn't fully done), or `⚠️ changed since review` (a previously
  reviewed file whose code changed again — back to needing review).
- A **fully reviewed _content_ group is omitted entirely** from the rendered
  markdown — no header, no "(reviewed)" note. Don't lengthen the guide with
  what's done. (The `Generated — review not required` catch-all group is **not**
  a review target and is **never** omitted — it stays so the roster remains a
  complete list of the diff; see [Completeness](#completeness--the-guide-lists-every-file-in-the-diff).)

### Structured guide (`-guide.json`)

The browser web shell renders the guide as a sidebar natively (per-group
orientation, per-file tag / thread count / status) rather than parsing the
markdown. So alongside `…-guide.md`, write a `…-guide.json` array — one object
per group, using the **same grouping and stable numbers** as the markdown:

```jsonc
[
  {
    "n": 1,                       // stable group number (matches -reviewed.json)
    "kind": "bug",                // free label: "bug" | "enhancement" | "refactor" | …
    "ticket": "PP-39",            // optional issue key; omit when there is none
    "name": "mixed-media child ordering",
    "orient": "One-line orientation for the group.",
    "files": [
      { "path": "src/a.ts", "tag": "assigns sibling_order at save", "threads": 1, "status": "—" }
    ]
  }
]
```

- `path` must be the repo-relative path exactly as it appears in the diff — the
  web shell matches it against difit's `/api/diff` to filter each group's view,
  so a mismatch silently drops the file from the filtered view.
- `threads` = number of `claude` threads on that file in the transcript.
- `status` mirrors the markdown: `"—"` (pending), `"reviewed"`, or `"changed"`.
- **Include every file in the diff** (the [Completeness](#completeness--the-guide-lists-every-file-in-the-diff)
  rule): generated / non-reviewable files go in the final
  `Generated — review not required` group, e.g.
  `{ "n": <last>, "kind": "generated", "name": "Generated — review not required",
  "orient": "Machine-generated / compiled artifacts — no review needed.",
  "files": [ { "path": "Cargo.lock", "tag": "lockfile", "threads": 0, "status": "—" } ] }`.
- Keep it in **lockstep with `…-guide.md`**: a fully-reviewed *content* group
  dropped from the markdown is also omitted here (the shell's "Full diff" view
  still shows every file regardless) — but the `Generated — review not required`
  group is never dropped.
- Write/rewrite it in the **same steps** you write `…-guide.md` (Initial;
  Continue when code changed; Diff-guide mode). It is plain JSON — no validator.

### Reviewed state (`-reviewed.json`)

```jsonc
{
  "groups": [                                   // the stable group roster
    { "n": 1, "name": "…", "files": ["src/a.rs", "src/b.rs"] },
    { "n": 3, "name": "…", "files": ["src/d.rs"] }
  ],
  "reviewedGroups": [2],                         // fully-reviewed group numbers (omitted from the guide)
  "reviewedFiles": {                             // file → signature at the time it was reviewed
    "src/b.rs": "<git hash-object output>"
  }
}
```

- The **signature** is `git hash-object -- <path>` for the file's current
  content (works for tracked and untracked files). Store it when you mark a file
  reviewed so a later change is detectable.
- Always `mkdir -p .difit` and write valid JSON. A brand-new review starts with
  the groups you just derived, empty `reviewedGroups`, empty `reviewedFiles`.

### Handling review state changes

- **"Group N is reviewed":** add `N` to `reviewedGroups`; on regeneration that
  group is omitted from the guide. (Mark its files reviewed too, for the record.)
- **"I reviewed `<file>`" / a file is reviewed:** record it in `reviewedFiles`
  with its current signature. **Keep the file in its group** in the guide with
  `✅ reviewed` — it may still matter as context for the group's other files —
  and only drop the whole group once every file in it is reviewed.
- **A reviewed file changed again:** on regeneration, recompute each
  `reviewedFiles` signature. If it differs from the stored one, **remove the file
  from `reviewedFiles`** (and, if its group was in `reviewedGroups`, remove the
  group from there and restore it to the guide). Show the file with `⚠️ changed
  since review` so the reviewer knows it needs another look.
- **"What have I reviewed?" / "what's left?":** answer from `-reviewed.json`
  (reviewed groups + files) and the guide (what remains). The guide alone only
  shows what's left; the reviewed state is where the done work is recorded.

### The diff summary and test plan

The diff summary and test plan are part of the **diff guide umbrella**, but they
are separate artifacts:

- `…-summary.md` is rendered in the browser web shell's left sidebar under the
  "Diff guide" title, before the "Full diff" row.
- `…-test-plan.md` is rendered in its own TUI tab and in the browser web shell's
  "Test plan" sidebar tab. It is **not** appended to or rendered inside the diff
  guide markdown.

Write both files when you create the guide for a new review. When regenerating
the diff guide, decide whether each file should be regenerated. Do not
regenerate them reflexively: a file-list-only regrouping usually does not change
the manual test plan, while bug fixes, new features, behavior changes, or
functional enhancements often do.

**Diff summary rules (`…-summary.md`):**

- Write the summary as a markdown bullet list.
- At most **3 bullets**. Never write a fourth bullet.
- Each bullet is at most **1 sentence**. Never write a multi-sentence bullet.
- Describe the diff at a high level: what area it touches and what changed.
- Do not list every file, repeat the chat summary, or include test steps.

**Test plan rules (`…-test-plan.md`):**

- Use a numbered markdown list for the manual steps.
- Steps must be manual and concrete. If browser testing is needed, tell the
  user exactly where to go and what to click.
- If a script or command should be run, include the exact command in a fenced
  code block so the web shell can render it with a copy icon.
- If the user needs to copy any non-command text, put that text in a blockquote
  (or another clearly separated markdown block) so the web shell can render it
  with a copy icon.
- Keep generated copy text literal. Do not say "copy the sample above" unless
  the exact sample text is present in the artifact.

### Diff guide mode (the workflow)

1. Resolve repo root, branch, comparison key, and the two file paths.
2. Read `-reviewed.json` if it exists (else start fresh).
3. Apply any mark-reviewed instruction from the user (update `reviewedGroups` /
   `reviewedFiles`).
4. Re-derive the diff's groups/files (reuse the transcript's grouping where one
   exists; don't invent a new grouping gratuitously). Preserve stable group
   numbers from `groups`; append new groups with the next number.
5. Recompute reviewed-file signatures; demote any that changed (above).
6. Write `-reviewed.json`, then write `-guide.md` and `-guide.json` (both omit
   fully-reviewed groups; keep them in lockstep). Decide whether `-summary.md`
   and `-test-plan.md` also need to be regenerated, and rewrite only the ones
   whose content is stale.
7. In chat, briefly confirm what changed (e.g. "Group 2 marked reviewed and
   dropped from the guide; 3 files left across Groups 1 and 3."). Do not paste
   the whole guide — the reviewer reads it in the `dif` Diff guide view.

Do not commit, push, or change source files in diff guide mode.

## Initial mode

Use when there's no live conversation to continue.

1. Resolve repo root, current branch, and comparison key.
2. Check for `.difit/<exact-branch-name>_explanations.md` (note: uses the
   exact branch name with slashes, not the slug). If present, use it as
   the candidate set; verify each entry against the actual diff and select
   only the ones that help a human reviewer. Skip stale/redundant/obvious
   ones. Keep the markdown file intact for reference.
3. If no explanations file, inspect the diff directly:
   - `.`     → `git diff -- .`
   - `staged` → `git diff --staged`
   - `working` → unstaged diff
   - branch → `git diff <base>...HEAD`
4. Compose `type: "thread"` entries per the comment shape above.
5. `mkdir -p .difit`; write the JSON. Empty review → write `[]`.
6. **Validate the transcript** against difit's import schema:
   ```bash
   python3 <skill-dir>/scripts/validate.py <transcript-path>
   ```
   This checks JSON validity *and* every rule difit's normalizer enforces
   (position.line shape, ISO timestamps, unique ids, replies that target a
   real thread, etc.). It exits non-zero on any failure. If it fails, fix
   the issues and re-run before printing the summary — a transcript that
   fails validation will crash `dif` on launch.
7. **Write the diff guide** (`…-guide.md` **and** `…-guide.json`), write
   `…-summary.md`, write `…-test-plan.md`, and initialize `…-reviewed.json` with
   the groups you just derived (empty `reviewedGroups` / `reviewedFiles`). See
   [The diff guide](#the-diff-guide) and
   [The diff summary and test plan](#the-diff-summary-and-test-plan).
8. Print the chat summary per **Required chat output**.

Do not commit, push, merge, or change source files in initial mode.

## PR review mode

Invoked by `/diff-review pr <number>` and its aliases `pre`, `pre-review`,
`auto` (`/diff-review auto <number>` etc.), or by natural language asking you to
review a PR for the user ("review this PR for me", "prepare a diff review for
PR <number>", "pre-review 123"). See
[Reading review intent](#mode-selection) — the ask to *review* is the trigger;
"prepare a diff for review" is not this mode.

The job: pull a contributor's PR locally, review it, and leave your findings as
difit threads so the user can vet your review in `dif` **before** doing their own
detailed pass. You are reviewing someone else's code, not explaining your own —
so this mode flags nits, convention breaks, and bugs, which the
explainer-oriented modes deliberately skip.

Works with or without the `gh` CLI (see step 1); it needs a GitHub remote and
normal git access to the repo.

### 1. Read the PR, then pull it into a review worktree

1. Read the PR metadata and body **first** — you cannot review well without the
   author's stated intent. Use the bundled resolver, which works whether or not
   `gh` is installed (it falls back to the GitHub REST API):
   ```bash
   python3 <skill-dir>/scripts/get-pr-info.py <number>
   ```
   It prints normalized JSON: `title`, `body`, `author`, `url`, `baseRefName`,
   `headRefName`, `isCrossRepository`. Read the `body` (the PR description) to
   understand what the PR is trying to do, and note `baseRefName` — that's the
   branch you review the diff against. If it errors on a private repo, tell the
   user to set `GITHUB_TOKEN`/`GH_TOKEN` or install `gh`.
2. Choose the worktree location. **Follow the user's documented worktree
   conventions if they have any** (a preferred directory and/or a helper such as
   `mkt <branch>`); otherwise fall back to `git worktree add` under a sibling
   directory of the repo. The branch and the worktree share one name:
   `review/pr-<number>`.
3. Create the worktree pointed at the PR head (this path handles fork PRs too):
   ```bash
   git fetch origin pull/<number>/head
   git worktree add <worktree-path> -b review/pr-<number> FETCH_HEAD
   ```
   Work from inside `<worktree-path>`. If the base branch isn't present locally,
   fetch it so the diff resolves (`git fetch origin <baseRefName>`).

### 2. Gather the review rules

Before commenting, load every rule source that applies, in this order:

1. **The project's own rules** — its `CLAUDE.md` / `AGENTS.md`, contributing
   guide, lint/style config, and any documented conventions. Follow them.
2. **`avandar-code-skill`, if it is available** — invoke it and review the code
   according to it. Skip silently if that skill isn't present.
3. **Any other applicable code-review skills** in the project or the user's
   personal set — if there are code-review / code-standards skills whose rules
   apply, follow them too. Skip any that aren't present.

This skill owns the *process*, not the judgment. It does not teach you how to
evaluate architecture or data modeling; that depth comes from the rule sources
above and your own review. Keep this file's guidance general.

### 3. Review the diff

Review `git diff <baseRefName>...HEAD`. Look past style — the point is to catch
what a human would want flagged before they review:

- Correctness bugs and unhandled edge cases.
- Architecture and design flaws.
- Data-modeling problems.
- Convention and rule violations (per the sources in step 2).
- Nits (typos, lint, formatting) — a quick one-line comment, no explanation.

Compose one `thread` per finding using the [Comment shape](#comment-shape) and
the [PR-review comment style](#pr-review-comment-style) below.

**Do the review yourself; do not delegate to a built-in review command.** If
you're running inside Claude, do **not** invoke the built-in `/code-review` slash
command — it is heavier than this skill wants and produces its own output flow.
This skill is intentionally lightweight: review the diff directly, apply the rule
sources from step 2, and write the findings as difit threads. (The named skills in
step 2, like `avandar-code-skill`, are the intended way to add review depth; the
built-in `/code-review` is not.)

### PR-review comment style

The [Writing claude entries — style](#writing-claude-entries--style) and
[What to comment on](#what-to-comment-on) sections describe how to *explain your
own diff*; they do **not** apply here. In PR review you are critiquing, so use the
taxonomy below for every thread.

Every comment must be **copy-pastable straight into a GitHub review by a human,
with zero editing**. Be direct and polite, never sycophantic. **No em dashes.**
Explain only as much as the comment type calls for. When the fix lives in the same
file, put the replacement code right in the comment.

- **Quick nit** (typo, indentation, line length, lint): state the fix and nothing
  else. `Fix typo "recieve" → "receive".` / `Line exceeds the max length.`
- **Breaks an explicitly documented rule:** name the fix and cite where the rule
  lives. `` Use `type Props` instead of `interface Props` (rule in `docs/style.md:12-14`). ``
- **Breaks an apparent-but-undocumented convention:** point it out without
  overclaiming — "probably" is your friend.
  `The rest of this module returns a Result rather than throwing. We should
  probably keep that convention here.`
- **Bug** (the one case where you explain in full):
  - State the bug clearly.
  - State when it happens: repro steps if you can give them, or note it's a
    theoretical case worth hardening if you can't.
  - State the fix as steps. If it's fixable in this file, propose the replacement
    code inline; otherwise describe the change and where it goes.
- **Architecture / data-modeling / other high-level concern:** more room to
  explain, but use **bullet points, not prose**. No essays. A human reads this and
  must get your point without skimming.

### 4. Write and validate the transcript, write the guide

Same machinery as Initial mode. `mkdir -p .difit`, write the transcript at
`<repo>/.difit/<branch-slug>-difit-<scope-slug>.json` (here the branch slug is
`review-pr-<number>` and the scope is the base branch), validate it with
`validate.py`, then write the diff guide, diff summary, test plan, and reviewed
state. See [Initial mode](#initial-mode) steps 5–7,
[The diff guide](#the-diff-guide), and
[The diff summary and test plan](#the-diff-summary-and-test-plan).

### 5. Report

Print the [Required chat output](#required-chat-output) initial-mode summary. The
final line is the run command (see [The run command](#the-run-command)), with the
comparison arg set to the PR's base branch:

```
→ Run: `<pm> diff-review <baseRefName>`
```

e.g. `pnpm diff-review main` (or `npm run diff-review -- main`). Run it from
inside the review worktree.

Do not commit, push, or merge in PR review mode. You are producing a review of the
PR, not changing it.

## Continue mode

Use when there are `reviewer`-authored comments to respond to. This is the
"PR-review-iteration" path.

This mode is triggered two ways:

- **Auto (the common path):** the `dif` TUI types a single new reviewer comment
  into the claude pane as a prompt. The prompt is intentionally minimal — it
  names the `file:line` (or line range), quotes the comment, and tells you to
  address it with this skill. It does **not** carry the commit policy, the POST
  endpoint, or the port; **you derive those yourself** from the session file
  (step 1). Address that one comment and post your reply — you usually don't need
  the full transcript walk. **Your chat output is strictly governed by
  [Auto path — what to post and what to say in chat](#auto-path--what-to-post-and-what-to-say-in-chat);
  read it before you reply. For a question (no code edit), your chat message is
  the difit reply body and literally nothing else — no preamble, no "posted
  live" line.**
- **Manual:** the user asks you to address comments without an injected prompt.
  Read the transcript and the live-session file to find what's open and which
  port to post to. Print the normal **Required chat output** summary.

### Auto path — what to post and what to say in chat

> **The single most-violated rule in this skill:** for a comment that needs no
> code edit, your chat message must be the difit reply body **verbatim and
> nothing else** — author it once, post it, paste the same text to chat. No
> "this was a question", no `File:` line, no "posted live". If you catch yourself
> adding a sentence around the answer, stop and delete it. See Case A.

How you respond to an auto-injected comment depends on whether it required a
**code edit**. Classify first (step 3), then follow the matching case.

#### Case A — conversational comment (no code edit)

The comment was a question or discussion and you changed no code.

**This output is mechanical, not composed. Author the answer ONCE.** Do not
write one version for difit and a different version for chat — that is exactly
the bug this rule exists to stop.

Do precisely this, in order:

1. Write the answer **once** as the `reply` body (steps 4–5). This is the only
   place you compose it.
2. POST that reply to difit.
3. **Your chat message is a verbatim copy of that same `body` string — paste it,
   do not retype or rephrase it.** Nothing before it. Nothing after it. No
   leading sentence, no trailing sentence.

So if the answer is *"This file is `src/test-utils/TestProviders.tsx`, and it has
26 lines."*, then:
- the difit reply `body` is exactly that, and
- your **entire** chat message is exactly that — the same characters — and
  nothing else.

**Banned in the Case A chat message — if any of these appear, you have failed
the rule; delete everything except the reply body:**

- Any sentence classifying the comment ("A question, not a change request…",
  "Since no changes were requested…", "no code edit was needed").
- A `File:` line, a `filePath`, a line count framed as metadata, or anything
  formatted differently from the reply body.
- The port, "reply posted live", "posted to the difit server", "no relaunch
  needed", "viewable in the browser", or any note that you POSTed anything.
- The TUI summary block.
- Any text whatsoever that is not character-for-character part of the reply
  `body`.

**Self-check before you send (Case A):** Is my chat message byte-for-byte equal
to the `body` I POSTed? If I removed the reply from difit, would this chat
message read as a normal, complete answer to the question with no leftover
references to difit, comments, ports, or "changes"? If not, rewrite it down to
just the reply body.

**Worked example (the real failure this rule is hardening against):**

Comment: *"this is a test: tell me the filename and how many lines of code it
has"*

✅ Correct — the whole chat message, and identical to the difit reply body:

> This file is `src/test-utils/TestProviders.tsx`, and it has 26 lines.

❌ Wrong — what was sent instead (three separate failures: a classifier line, a
differently-formatted answer that doesn't even match the posted comment, and a
"posted live" line):

> A question, not a change request, so no code edit was needed.
>
> File: src/test-utils/TestProviders.tsx — 26 lines
>
> Reply posted live to the difit server (port 4993) → no relaunch needed.

#### Case B — change request (you edited code)

The comment asked for a change and you made it (committing or folding per the
policy in step 3). Then:

- **Explain the changes in chat the way you normally would** after doing work —
  what you changed and why. This is *not* bound by the verbatim rule.
- **The difit reply is optional.** You do **not** have to post a comment for a
  code change. If you skip it, just report the work in chat; **do not** announce
  that you didn't post a comment.
- **Never post a long (20+ line) "here's everything I did" explanation as a difit
  reply.** If you post a reply at all, keep it terse — usually exactly `Done.`
  (per the reply-style rules above). The long explanation belongs in chat, the
  terse acknowledgement (if any) belongs in difit. They are *not* the same text,
  and that's expected for Case B.
- A comment that is **both** a question and a change request: make the change
  (Case B chat behavior) and, in the difit reply, answer the question part.
- **Regenerate the diff guide.** Because you changed code, the guide is now
  stale: rewrite `…-guide.md` (and refresh reviewed-file signatures, demoting any
  reviewed file you just edited to `⚠️ changed since review`) per
  [The diff guide](#the-diff-guide). Also decide whether `…-summary.md` and
  `…-test-plan.md` need updates. This keeps the `dif` Diff guide view honest
  without a `Ctrl+G`.

The verbatim "chat == difit reply" rule applies to **Case A only**.

**Order matters — do these steps in this order:**

1. **Locate the live difit server + transcript.** `dif` writes
   `.difit/.session-<branch-slug>-<scope-slug>.json` with `port`, `pid`,
   `comments_file`, and `comparison_key`. Read it for the `port` (where you POST
   the reply) and the comparison identity. The `comparison_key` is not enough
   to decide the git state when difit's actual arguments can include unstaged
   and untracked changes independently. **Recover the exact comparison
   arguments from the command that launched the review or the live process, and
   record separately whether staged, unstaged, and untracked changes are
   included. Never infer one category from another.** If several
   `.session-*.json` files exist, pick the one whose `<branch-slug>` matches the
   current branch. Read the transcript at `comments_file` (mirrored live by
   `dif`'s poller) once for context; don't re-read mid-work, and **never write it
   yourself** (the poller owns it).

2. **Identify what needs a response.** Walk the transcript. For each thread:
   - The thread root and any `claude`-authored replies are *prior context*.
   - Every `reviewer`-authored entry without a later `claude` reply in the
     same thread (same `filePath`+`position`) is *open*.
   - Classify each open `reviewer` entry: **change request** (asks you to do
     something) vs. **question** (asks you to explain something). Some
     comments are both — handle both halves.

3. **Decide whether the comment even needs a code change, then act.** Not every
   comment is a change request. A comment that only **asks a question** or opens
   a **discussion** ("why is this here?", "does this handle X?") needs **no code
   edit** — you just answer it in the reply (step 4). Only edit when the comment
   actually **requests a change**. A comment can be both; handle both halves.

   When a change *is* warranted, make it visible to the same comparison after
   the review server restarts. Apply this policy from the exact arguments
   resolved in step 1:
   - **Neither unstaged nor untracked changes are included** (for example,
     `pnpm diff-review develop`) → edit the files, run relevant checks, and
     **commit every comment-addressing change** with a focused message naming
     the comment(s), such as
     `fix(modal): drop morph fallback per review`.
   - **Unstaged changes are included** → tracked edits may remain unstaged.
     Otherwise, stage every tracked edit before considering the comment
     addressed.
   - **Untracked changes are included** → new files may remain untracked.
     Otherwise, fully stage every new file before considering the comment
     addressed. `git add -N` is not a substitute for staging it.
   - **Both unstaged and untracked changes are included** → changes in either
     category may remain uncommitted and unstaged.

   These categories are independent. A review may include unstaged changes but
   exclude untracked files, or include untracked files but exclude unstaged
   changes. In either mixed case, leave only the included category as-is and
   stage the excluded category. Before replying, inspect `git status` and verify
   that every file changed for the comment is committed, staged, or deliberately
   left in a category the exact comparison arguments include.
   Follow the user's normal CLAUDE.md rules (worktree, no force-pushes, etc.).

4. **Compose only the new entries** (not a full transcript). The live endpoint
   merges by `id`, so you ship just what you're adding this round:
   - For a **conversational** comment (Case A): one `type: "reply"` answering it
     — **required**.
   - For a **change request** (Case B): a reply is **optional** and, if posted,
     terse (usually `Done.`). Never a long write-up of what you did — that goes
     in chat, not difit.
   - Each `reply` you do post needs:
     - same `filePath` and `position` as the parent thread (verify this —
       wrong position = orphaned reply or attached to the wrong thread),
     - `author: "claude"`, fresh `id` and timestamps,
     - a body that answers the question and/or notes a non-obvious decision.
   - New `type: "thread"` entries for any *new* explanatory points your change
     raises. Use these sparingly; not every change needs a thread.

5. **POST your new entries to the live difit server.** This replaces the old
   stop → rewrite-file → relaunch flow:
   ```bash
   curl -sS -X POST "http://localhost:<port>/api/comment-imports" \
     -H 'Content-Type: application/json' \
     --data '<json-array-of-your-new-entries>'
   ```
   difit merges by `id` and broadcasts the change, so the reply appears in the
   reviewer's open browser **live — no restart**. `dif`'s poller mirrors the
   posted entries back into the transcript on its next tick; you never write the
   transcript file yourself.

6. **Verify before posting.** The strict validator
   (`python3 <skill-dir>/scripts/validate.py <path>`) expects a
   *full* transcript, so it will reject a partial array of just your new replies
   (their parent threads aren't in it). Either validate the full union in a
   throwaway temp file, or — for a single reply — verify by hand that each
   reply's `filePath` + `position` exactly matches its parent thread before you
   POST.

7. **Respond in chat.**
   - **Auto-injected single comment:** follow
     [Auto path — what to post and what to say in chat](#auto-path--what-to-post-and-what-to-say-in-chat).
     Conversational comment → only the verbatim reply body. Change request →
     your normal explanation of the work. No TUI summary either way.
   - **Manual multi-comment round:** print the full **Required chat output**
     continue summary.
   Any reply you posted is already live in the browser — there is no `dif`
   relaunch step.

### Order-of-operations red flags — STOP

- Writing the transcript file yourself. `dif`'s poller owns it; your write will
  be overwritten on its next tick. → POST your entries to the live server instead.
- Restarting `dif` to make your reply show up. Unnecessary — the POST pushes it
  to the browser over SSE. → Just POST.
- Replying to a `reviewer` thread at a different `(filePath, position)` than
  the thread root. The reply will orphan or attach to the wrong thread.
  → Copy `position` from the parent thread verbatim.
- Modifying a `reviewer`-authored entry's `body`, `author`, `id`, or
  timestamps. You only ever *add* `claude` entries. → Pass user entries
  through unchanged.
- Reusing an `id` that's already in the transcript. dedup keeps the
  existing one; your new content is silently dropped. → Increment the
  round number; use a fresh slug.
- Treating staged, unstaged, and untracked changes as one "working tree"
  category. Difit can include them independently. → Inspect the exact
  comparison arguments and apply step 3 to each changed file.
- Leaving a changed file in a category the review excludes, including using
  `git add -N` for a new file when untracked changes are excluded. The fix can
  disappear when the review server restarts. → Fully stage that file, or commit
  the whole comment-addressing change when neither unstaged nor untracked
  changes are included.
- **Declining** to act on a requested change without saying so. If you choose
  *not* to make a change the reviewer asked for, post a reply explaining why —
  otherwise the next round can't tell it was deliberate. (Making the change and
  skipping the reply is fine; *not* making it and staying silent is not.)
- Editing code for a comment that was only a **question**. The reviewer asked
  you to explain, not to change anything. → Answer it in the reply; make no edit.
- Posting a long write-up of what you changed as a difit **reply**. For a code
  change the difit reply is optional and terse (`Done.`); the explanation goes in
  **chat**. → Keep the reply terse (or skip it); explain in chat.
- Wrapping a **conversational** auto-injected reply (Case A) in chat
  meta-commentary — `File: …`, the port, "reply posted live", "no relaunch
  needed", "now viewable in the browser", or how you classified the comment. →
  Send **only** the verbatim reply body, exactly as it appears in difit. (This
  does not apply to Case B, where chat *is* your normal explanation of the work.)
- Composing the Case A answer **twice** so the chat text and the posted difit
  `body` differ (e.g. difit says "This file is `X`, and it has 26 lines." but
  chat says "File: X — 26 lines"). → Author the answer once as the reply `body`,
  POST it, then paste that exact string to chat. They must be byte-for-byte equal.

## Summary mode

For `/diff-review summary`, or when the user explicitly asks for
"another summary", "remind me how to review the diff", "prepare another
diff summary", or similar — anywhere they want the chat summary block
re-printed without doing any review work (e.g. they ended a previous
session and started a new one, and want the navigation block back in
chat).

This mode is **strictly read-only**: no JSON writes, no edits, no
commits, no comment POSTs, no source-file changes. It exists purely to
re-render the **Required chat output** block from an existing transcript.

1. Resolve repo root, current branch, and comparison key. If the user
   passed a key with the slash command (`/diff-review summary develop`),
   use it; otherwise apply the same default `dif` uses (no arg →
   `develop` if it exists, else `main`).
2. Locate the transcript at
   `<repo>/.difit/<branch-slug>-difit-<scope-slug>.json` (same slug
   rules as `dif`; see **File paths**).
3. **If the transcript does not exist, or is `[]`, or contains no
   `type: "thread"` entries:** tell the user there is no existing code
   review to summarize, and ask whether they'd like you to perform an
   initial code review (which would then put you in **Initial** mode).
   Stop here — do not invent a summary.
4. Otherwise, read the transcript and reconstruct the chat summary
   block per **Required chat output**:
   - Round number = highest `claude-r<N>-*` id present in the file.
   - Re-derive logical groupings from the transcript's files (reading
     enough of the diff or the files themselves to recover the
     original grouping intent). Don't introduce new groupings around
     files the transcript doesn't already comment on.
   - Use the **initial-mode template** if no `reviewer`-authored entries
     exist. Otherwise use the **continue-mode template**, deriving
     Addressed/New/Open counts from the existing transcript; omit the
     "Commits this round" line — summary mode does not produce new
     commits, so there is nothing to list.
   - The final `→ Run:` line stays (formatted per
     [The run command](#the-run-command), e.g. `→ Run: pnpm diff-review .`) —
     that's the whole point of re-printing the summary.
5. Print **only** the summary block. No preamble, no narration of what
   was in the transcript, no diff exposition. The reviewer reads the
   detail in `difit`; chat is for navigation.

Do not commit, push, merge, modify the transcript, or change source
files in summary mode. If the user actually wants a new round of
review (they have new code changes since the transcript was written),
push back and ask whether they meant **Initial** or **Continue** mode
instead.

## Cleanup mode

For `/diff-review cleanup`:

1. List local branches with `git for-each-ref --format='%(refname:short)' refs/heads`.
2. Slugify each branch using the same rules as `dif`.
3. Inspect every `.difit/*-difit-*.json`, `.difit/*-difit-*-guide.md`,
   `.difit/*-difit-*-guide.json`, `.difit/*-difit-*-summary.md`,
   `.difit/*-difit-*-test-plan.md`, `.difit/*-difit-*-reviewed.json`, and
   `.difit/.session-*.json`.
4. Keep files whose `<branch-slug>` prefix matches an existing branch.
5. For prefix mismatches that look like a rename (exactly one stale file
   with the suffix, and the current branch has no file with that suffix),
   rename it to the current branch's slug. Move a review's whole file set
   together (transcript + `-guide.md` + `-guide.json` + `-summary.md` +
   `-test-plan.md` + `-reviewed.json`).
6. Delete the rest, including stale `.session-*.json` files for branches that
   no longer exist (and any leftover `.watcher-*.log` files from the retired
   Python watcher). When you delete a transcript, delete its `-guide.md`,
   `-guide.json`, `-summary.md`, `-test-plan.md`, and `-reviewed.json` siblings
   too. Report renames and deletions.
7. Never touch files outside `.difit/`. Don't delete the `.session-*.json` for
   a branch that still exists — a `dif` session may be live and writing it.

## Quick reference

| What | Where |
|---|---|
| Review a GitHub PR | `/diff-review pr\|pre\|pre-review\|auto <number>` (or "review this PR for me") → pull into `review/pr-<number>` worktree, review, `<pm> diff-review <baseRefName>` |
| Transcript | `<repo>/.difit/<branch-slug>-difit-<scope-slug>.json` |
| Diff guide | `<repo>/.difit/<branch-slug>-difit-<scope-slug>-guide.md` |
| Structured guide (web shell) | `<repo>/.difit/<branch-slug>-difit-<scope-slug>-guide.json` |
| Diff summary | `<repo>/.difit/<branch-slug>-difit-<scope-slug>-summary.md` |
| Test plan | `<repo>/.difit/<branch-slug>-difit-<scope-slug>-test-plan.md` |
| Reviewed state | `<repo>/.difit/<branch-slug>-difit-<scope-slug>-reviewed.json` |
| Session metadata | `<repo>/.difit/.session-<branch-slug>-<scope-slug>.json` |
| Slug rules | `scripts/dif/src/comparison.rs` + `scripts/dif/src/slug.rs` (bundled CLI) |
| Validate the transcript | `python3 <skill-dir>/scripts/validate.py <path>` |
| Ensure the `diff-review` package.json script | `python3 <skill-dir>/scripts/ensure-command.py` |
| Detect package manager | `sh <skill-dir>/scripts/detect-pm.sh` |
| Resolve reviewer handle | `sh <skill-dir>/scripts/get-reviewer-name.sh` (GitHub/git handle, default `reviewer`) |
| Read a PR's metadata (no `gh` needed) | `python3 <skill-dir>/scripts/get-pr-info.py <number>` (gh if present, else GitHub REST API) |
| Run command (shown to user) | `<pm> diff-review [args]` — see [The run command](#the-run-command) |
| Post a reply (live) | `curl -sS -X POST http://localhost:<port>/api/comment-imports --data <json>` |
| Live server port | `port` field in `<repo>/.difit/.session-<branch-slug>-<scope-slug>.json` |
