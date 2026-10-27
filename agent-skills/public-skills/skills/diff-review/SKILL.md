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
artifacts. If its walkthrough is missing, write it by running steps 2 to 11 of
[Walkthrough](#walkthrough), per
[When a walkthrough is written](#when-a-walkthrough-is-written); otherwise
report that no comments are open and wait for a concrete request.

`walkthrough` as the first argument names the mode, not a comparison:
`/diff-review walkthrough` uses the default comparison, and
`/diff-review walkthrough main` compares against `main`.

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

Never use em dashes. Keep every comment direct and concise.

Two different voices live in this skill, and they must not be mixed:

| You are | You write | Follow |
| --- | --- | --- |
| The **reviewer**, leaving findings on a diff | PR findings, review summaries, explainer threads | [`references/review-comment-style.md`](references/review-comment-style.md) |
| The **engineer**, answering a reviewer's comment | Continue-mode replies | [`references/reply-style.md`](references/reply-style.md) |

Read the matching file before writing, and read the personal override next to
it when it exists (`~/.diff-review/review-comment-style.md`,
`~/.diff-review/reply-style.md`); the override wins on any conflict.

#### As the reviewer

For explainers on the agent's own diff, comment only when the reviewer benefits
from context the diff does not state: why an abstraction exists, how data moves,
which domain rule or invariant applies, or why a fallback or integration works
that way. Skip formatting, naming-only changes, obvious helpers, and narration
of the attached line. Never comment outside the requested diff scope.

**Explainers point into the walkthrough; the walkthrough never points back.**
When a walkthrough exists, it is where the context lives, so an explainer
whose context a walkthrough section already explains cites that section by
number and heading instead of repeating it, and adds only what is specific to
the attached lines:

```markdown
Keeps the earlier column ID only for an unchanged expression. Why, with a
worked example: §6.2, "When a user edits and re-runs a query, each result
column keeps its earlier column ID only when the app can prove it is the same
column".
```

Point a thread at the walkthrough wherever a reader of those lines needs the
bigger picture: the strand section that explains the code block, or the
Background technical context entry for an unfamiliar module. PR findings never
cite the walkthrough, because they are pasted into GitHub, where it does not
exist.

For PR findings, write text a human can paste into GitHub unchanged, in the
voice `references/review-comment-style.md` describes:

- Nit: state the correction only.
- Documented rule violation: state the fix and cite the rule.
- Undocumented convention: identify it without presenting it as a rule.
- Bug: explain the failure condition and concrete fix.
- Architecture or data-model concern: use concise bullets.

#### As the engineer

The default reply to a change request is exactly `Done.` Add a line beyond it
only for what the reviewer cannot get from their own request plus the diff:
a decision their request left open, a deviation or refusal, a verification
result, a consequence they did not ask about, or the answer to a question. A
question always gets a reply.

Never restate the reviewer's own ask, rationale already written into the code
or rule, where in the file the change landed, or code visible in the diff.
Past one point, use bullets, one line each.
`references/reply-style.md` carries the full rule with worked examples.

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

## Walkthrough contract

The walkthrough is the as-built design document for one change: the theory of
the change, written to be read before any code. It is indexed by idea, not by
file. The guide answers "where do I go next", a thread answers "why is this
line like this", and the walkthrough answers "what is this change, and why is
it shaped this way".

The walkthrough is always a markdown file in `.difit/`, named from the same
stem as every other artifact (see [Artifact names](#artifact-names)). It is
printed from that file. Never publish it to a hosting service, and never
substitute a hosted page for the file.

### When a walkthrough is written

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

### The walkthrough stands alone

The walkthrough is published with the pull request, for reviewers who have the
repository and nothing else. Everything in `.difit/` is gitignored, so none of
it exists for them, and neither does anything else local to the author's
checkout. The walkthrough therefore never cites:

- the diff guide, its group numbers, the transcript, its threads, the summary,
  the test plan, or any other `.difit/` artifact,
- a gitignored or untracked file, such as a local log, a scratch plan, or a
  verification transcript,
- a local-only path, such as a worktree's absolute location.

It may cite files tracked in the repository at the compared revision, commands
the reader can run, and external sources with URLs. Its own screenshots under
`.difit/<stem>-walkthrough-assets/` are part of the document rather than a
reference, and travel with it into the printed PDF. Local artifacts are inputs
to writing it, never references in it: carry over what they established, as a
claim verified against the code, and drop the pointer. A sentence that exists
only to point at a local artifact, such as "the authoritative navigation is in
the guide", comes out whole.

### Sections

Use these headings in this order, numbered, omitting any that would be empty.
Purpose, Glossary, Background technical context, and Manual testing are never
omitted. The list gives the order, not literal numbers: each strand takes its
own top-level number, and the sections after the strands number on from the
last one. Numbers are stable for the life of the review so the reviewer can
annotate a printout and cite `§6.2` back to you.

Headings are factual navigation, not titles. A correct, specific, boring
heading beats an elegant one every time; this is a reference document a
reviewer navigates under time pressure, not an article they read for pleasure.
Name the concrete subject and the condition in plain language, and never use
wordplay, suspense, alliteration, or a phrase whose meaning only resolves after
reading the section.

Three failure modes. The last two survive review because they read well:

- **Vague:** the heading names a topic but not a claim, so it cannot be
  distinguished from three neighbouring sections.
- **Literary:** the heading is memorable and says nothing checkable. A heading
  built on a metaphor ("as a durable transition"), an abstract noun phrase
  ("Claim, then settle"), or a value judgement ("Visibility replaces a
  boolean") names the author's framing rather than the mechanism.
- **Insider:** the heading states a precise claim, but only to a reader who
  already knows this code's informal vocabulary. `Executed results need
  evidence before they can inherit identity` is checkable to its author; a
  reviewer cannot tell what was executed, what the evidence proves, or whose
  identity is inherited. The fix is in
  [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code).

| Avoid | Use |
| --- | --- |
| `The 404 that means two things` | `Ambiguous 404 when getting a file from Drive` |
| `A view's scope is the whole view` | `Picker views cannot combine Drive scopes` |
| `Dashboard publication as a durable transition` | `Publishing a dashboard writes storage objects and the row in two steps` |
| `Claim, then settle` | `A publish claims a revision, uploads objects, then commits visibility` |
| `Visibility replaces a boolean` | `is_public becomes a three-state visibility column` |

The test: read the heading alone and say what the section will assert. If the
answer is "something about publishing", rename it. A heading may be a full
clause and may run past twenty words when grounding it for a new reader takes
that; length is not the constraint, and a shorter heading that has stopped
being specific or clear is worse.

1. **Purpose.** The problem in the reader's terms and what "done" means. No
   file names, no module names. Two paragraphs at most, and it must **name
   every strand of work in the change**, because a strand the reader has not
   been told about will read as a non sequitur when its section arrives.
   Finish with a one-line map, strand to section number, so the reader can
   predict the section list before reading it.
2. **Glossary.** Every term the reader will meet that is not general
   software-engineering vocabulary, defined in plain words. See
   [Glossary](#glossary).
3. **Background technical context.** A directory tree of the code the reader
   needs to know about, then one or two sentences per model or module. See
   [Background technical context](#background-technical-context).
4. **Manual testing.** Numbered steps the reviewer can follow to exercise the
   change themselves. See [Manual testing](#manual-testing).
5. **Shape of the solution.** The mental model: the moving parts and how data
   flows between them, as prose plus at least one mermaid diagram. When the
   change has more than one strand, say here how they relate, including "these
   two are independent" when that is the truth.
6. **One section per strand of work,** named after the concern rather than the
   kind of thing it contains. Use numbered subsections (`6.1`, `6.2`) for the
   pieces inside a strand, so the reviewer can cite one.

   When a section explains one specific defect and its resolution, add `The
   Problem` and `The Solution` one heading level below it:

   ```markdown
   ### 6.1 Ambiguous 404 when getting a file from Drive

   #### The Problem

   State the failure condition and evidence.

   #### The Solution

   State the implemented correction and why it closes the failure.
   ```

   Do not add these headings to sections that do not describe a solved problem.

   **Do not file sections by artifact kind.** "Components", "Algorithms and
   invariants", "Helpers" are category buckets, and a bucket strands its
   contents: the reader who meets a SQL projection algorithm under
   "Algorithms" has to reconstruct for themselves why it is in this change at
   all. A section named for the concern carries that connection for free.

   **Filing by strand changes where things go, never how deeply they are
   covered.** Inside a strand, cover every one of these that applies, at the
   depth a section dedicated to it would have had:

   - **Each unit that carries design weight:** what it is responsible for, why
     it is a separate unit rather than folded into its caller, who calls it,
     what it depends on, and what it deliberately does not know about. Skip
     units whose name and signature already explain them.
   - **Each algorithm whose logic is not evident on one read:** the excerpt it
     lives in (see [Code alongside the prose](#code-alongside-the-prose)), one
     concrete worked example giving actual inputs, the intermediate states and
     the output, the invariant the code maintains, and what breaks when that
     invariant is violated. Add a mermaid flowchart for branching logic and a
     mermaid state diagram for anything with lifecycle states. When the
     algorithm runs in several ordered steps or spans several tools, structure
     the section per
     [Explaining a multi-step algorithm or pipeline](#explaining-a-multi-step-algorithm-or-pipeline).
   - **Each constraint the strand has to respect,** including the failure mode
     it closes or is exposed to, and what the code can and cannot prove as a
     result. These are the paragraphs a reviewer most often disagrees with, so
     they earn their space.
   - **Each behaviour-preserving rewrite:** the argument a reader can check on
     paper for why the two forms agree. Which conditions correspond, what the
     boundary cases map to, what the empty or no-match case returns in each. A
     test count or a property-check result is evidence that the argument holds;
     it is not the argument, and a reviewer cannot re-derive it from a number.
   - **Provenance and destination** for a value that crosses a boundary: where
     it comes from and who consumes it, both named in backticks. "Closure state
     written by a callback" leaves the reader unable to find either end;
     "`selectBundle` discovers it during init and every later `ensureExtension`
     call reads it" is checkable against the code.
   - **The layout,** where the directory or module structure is itself a design
     decision. A dependency graph is welcome. Where an artifact is written is
     also a decision: name the path and the reason for that place.

   Filing by strand makes coverage easy to lose: an item that had its own
   section under an artifact-based layout has no obvious home under a
   strand-based one, and it fails by disappearing silently rather than by
   leaving an empty heading. Auditing this list is part of
   [Closing checks](#closing-checks).
7. **Interface changes.** Any user-visible change, with evidence. See
   [Screenshots](#screenshots).
8. **Decisions.** One bullet per real decision: what was chosen, the
   alternative that was rejected, why, and what evidence would reverse it. A
   decision with no rejected alternative is not a decision, it is narration:
   cut it, or say plainly that the choice was arbitrary. Cite precedent per
   [Citations](#citations).
9. **Deliberately not handled.** Scope boundaries and known gaps, so the
   reviewer does not spend attention rediscovering them.
10. **Open questions.** Explicit asks for the reviewer, each answerable. A
    change with genuinely no open question probably did not need a
    walkthrough.
11. **Sources.** The numbered reference list, present whenever the body cites
    anything.

There is no reading-order or navigation section. Mapping sections to code is
the explainer threads' job, per [As the reviewer](#as-the-reviewer), because
the walkthrough stands alone.

### Glossary

Every term the reader will meet in the document that is not general
software-engineering vocabulary: product terms with a specific meaning here,
house terms, and the informal vocabulary of this area of the code. One list in
alphabetical order, not split by kind. The clarity pass drafts it and the
parent pastes it in, per
[The clarity pass runs in a subagent](#the-clarity-pass-runs-in-a-subagent).

- **Define each term in plain words, grounded in the product.** Say what the
  thing is in terms of what a user does or sees, then, only if needed, what the
  code does with it. One or two sentences.
- **Never define a term with more jargon.** A definition that leans on another
  unexplained term has moved the problem, not solved it. Every word in a
  definition is general vocabulary, product vocabulary, or another entry in
  this list, and the first two are preferred.
- **Concepts go here, code units go in the background.** A model, module, or
  function name belongs in
  [Background technical context](#background-technical-context). The glossary
  holds the ideas those units implement.
- **It does not replace a figure's own glossary.** A diagram still carries its
  `Where:` list directly under the fence, per
  [A diagram must stand alone](#a-diagram-must-stand-alone), because the figure
  has to read on its own page.

| Avoid | Use |
| --- | --- |
| **Binding registry** - the query-owned reconciliation output that maps projection identities to result column descriptors. | **Binding registry** - a lookup list, rebuilt each time a query runs, that records which column of the query's results each column ID points to. Charts use it to find the column to draw. |
| **Owner** - the scope a registry is keyed by. | **Owner** - the one place a query runs from, such as the Data Explorer or a single chart on a dashboard. Column IDs are never carried from one owner to another. |

```markdown
## 2. Glossary

- **Column ID** - a permanent ID the app gives each column a user selects in a
  query. Chart settings and filters save this ID instead of the column's name,
  so renaming the column does not break them.
- **Output name** - the name a column has in the query's results, such as
  `total` in `SUM(cnt) AS total`. It changes when the user renames the column
  or changes its aggregation.
- **Projection** - one item in a query's SELECT list. `SUM(revenue)` and
  `AVG(revenue)` are two projections of the same table column.
```

### Background technical context

The map of the code a reader needs before the strand sections make sense. The
background context pass writes it, per
[The background context pass runs in a subagent](#the-background-context-pass-runs-in-a-subagent).
Two parts, in this order:

1. **A directory tree** in a `text` fence, showing only the directories and
   units the walkthrough involves and the reader needs as background. It is
   not a file inventory of the change. Mark a unit the change adds `(new)` and
   one it modifies `(changed)`; an unmarked unit is unchanged code the change
   depends on. A directory that only leads to a unit is a path, not a unit: it
   carries no marker and gets no entry. The tree needs no caption, because the
   list under it is its legend.
2. **One entry per unit in the tree,** one or two short sentences and never
   more: what the unit is in product terms, then the one relationship the
   reader needs, such as what it writes to or who calls it. The strand
   sections carry everything else.

The tree and its list are one figure, so they fit on one printed page, per
[A figure never spans two pages](#a-figure-never-spans-two-pages). When the
change is too wide for that, show each area's anchor unit and let the strand
sections introduce the rest. Do not define vocabulary in an entry: terms
belong in the [Glossary](#glossary), which the clarity pass drafts after this
section exists.

````markdown
## 3. Background technical context

```text
shared/models/
├── Dashboard/                                     (changed)
├── queries/
│   ├── StructuredQuery/                           (changed)
│   └── QueryColumnBindings/                       (new)
└── vizs/
    └── makeOutputNameVizConfigFromColumnIdConfig/ (new)
src/clients/dashboards/
└── DashboardClient/
src/views/
├── DataExplorerApp/                               (changed)
└── DashboardApp/AvaPage/pblocks/
    └── DataVizPBlock/                             (changed)
```

- `Dashboard`: the model that holds everything about one dashboard, including
  its page and the charts on it. Written to the `dashboards` table through
  `DashboardClient`.
- `StructuredQuery`: the model for a query a user builds with the Query tab's
  form instead of typing SQL. `structuredQueryToSql` turns it into the SQL that
  runs.
- `QueryColumnBindings`: matches each column of a query's results to the
  column ID that chart settings and filters saved.
- `makeOutputNameVizConfigFromColumnIdConfig`: just before a chart draws, swaps
  each saved column ID for that column's current name in the results.
- `DashboardClient`: reads and writes rows of the `dashboards` table.
- `DataExplorerApp`: the Data Explorer page, where a user writes a query and
  charts its results.
- `DataVizPBlock`: one chart on a dashboard page. It runs its own query and
  draws the result.
````

### Manual testing

How the reviewer exercises the change themselves, as numbered steps they can
follow without asking anything. The author writes this section while drafting,
because the author knows what changed and how to reach it. Start from
`-test-plan.md` when it exists, verify each step against the code, and bring it
up to this standard. Do not edit `-test-plan.md` itself.

- **Setup comes first, as numbered steps,** taking the reader from a fresh
  checkout to the state the test needs:
  - **Database state.** When the project's standard seed data is enough, say
    so and give the project's reset command (in Avandar, `pnpm db:reset`).
    When the test needs records the seed does not create, give the exact
    command that creates them. Carry over any precondition the project's
    instructions attach to those commands: in Avandar, a branch other than
    `develop` runs `ava supabase switch` before any database command.
  - **Data loaded through the UI.** Name the exact fixture file in the
    repository's test-data directory (in Avandar, a file under `tests/data/`)
    and the clicks that load it.
  - **The app.** The command that starts it, and the file where the sign-in
    credentials are defined. Point to the file; never paste a password.
- **One step per action:** what to open, where to click, what to type, and
  what to look for. Name a page by its navigation path or URL, and bold every
  UI label exactly as the screen spells it.
- **A fixed defect gets a before-and-after** under the step that reproduces it:
  - **Before this change:** what used to happen, so the reader recognises it
    if it ever comes back.
  - **Now:** what happens instead.
- **What the UI cannot reach gets commands.** When part of the change has no
  path through the UI, give the commands that exercise it: the specific test
  files, one command per fenced block, and what a pass looks like. Follow the
  project's rules on which tests to run and how (in Avandar, end-to-end specs
  one at a time, never the whole suite).
- Put commands in fenced blocks and literal text the reader must type in a
  blockquote, as in the test plan.

````markdown
## 4. Manual testing

1. Confirm `ava supabase status` reports this worktree's own project, running
   `ava supabase switch` first if it does not. Then rebuild the database. The
   standard seed data is enough.

   ```sh
   pnpm db:reset
   ```

2. Run `pnpm dev`, open the printed URL, and sign in with the seeded user
   defined in `seed/SeedData.ts`.
3. Open `/avandar-labs/data-manager/data-import`, choose **Upload**, import
   `tests/data/small-california-covid-sample/small-california-covid-sample.csv`,
   and click **Save Dataset**.
4. Open **Data Explorer** and select that dataset on the **Query** tab. On the
   **Visualizations** tab, choose **Bar chart**, add **daily_new_cases** as a
   series, and set its **Series label** to:

   > Cases trend

5. Back on the **Query** tab, change the aggregation of **daily_new_cases** to
   **SUM**.
   - **Before this change:** the labelled series was dropped from the chart,
     because its settings were saved under the column's old name.
   - **Now:** the series stays, with the same label.
6. The SQL round trip has no path through the UI. Run its regression:

   ```sh
   pnpm test:executed tests/integration/queries/structuredQueryRoundTrip.executed.test.ts
   ```
````

### Diagrams

Diagrams are expected, not optional. Prefer mermaid, which the published page
renders natively, and pick the type from what the reader needs to conclude:

| To show | Use |
| --- | --- |
| Architecture, module or directory dependencies | `flowchart` / `graph` |
| Branching logic in an algorithm | `flowchart` |
| Lifecycle or capability states | `stateDiagram-v2` |
| An ordered exchange between components or processes | `sequenceDiagram` |
| Data model or table relationships | `erDiagram` |

Give every diagram a caption stating what to notice in it. A diagram the reader
cannot draw a conclusion from is decoration: cut it. Draw the dependency or
data-flow direction, and when a directory tree is the clearest form for a
layout decision, a fenced tree is fine alongside the graph.

#### A diagram must stand alone

The caption adds emphasis. It is never what makes the diagram readable. Assume
the reader looks at the picture first, before any surrounding prose, because
that is what people do: if the drawing alone does not say what the parts are
and how they relate, it has failed and no caption repairs it.

That has one consequence that overrides every instinct toward tidiness:

- **Label nodes and edges in full.** `supabase/schemas/ declares privileges`
  beats `schemas`. `reconciler exits 1 on drift` beats `drift`. A verbose label
  is not a defect to be trimmed; a label that only means something to someone
  who already knows the system is.
- **Label every edge that is not obvious from its endpoints.** An unlabelled
  arrow asserts "related somehow", which is rarely the claim being made.
- **A glossary is REQUIRED whenever any label is abbreviated.** If a node or
  edge carries a single word, an acronym, an identifier, or any token a reader
  outside the change would not resolve, the diagram is immediately followed by
  a definition list naming every such label. Not in the caption prose, and not
  further down the section: directly under the fence, so it is on the same page
  as the drawing.
- **Legends are welcome.** Line style, colour, or shape carrying meaning
  (staged versus committed, synchronous versus deferred) needs a legend, either
  as a glossary entry or as a `subgraph Legend` in the diagram itself.

```markdown
Where:

- **staged** - objects uploaded under a transition claim, readable only by the
  dashboard's editors.
- **committed** - the generation `snapshot_revision` points at, readable by the
  dashboard's audience.
- **fence** - an `abort_publish` claim written over an abandoned `publish`.
```

Prefer the full label and no glossary. Reach for a short label plus a glossary
only when the full one genuinely will not lay out, and never ship a short label
with neither.

#### A figure never spans two pages

The drawing, its glossary, and its caption are one figure and must land on one
page. A reader who has to turn the page to find out what a label means is doing
the work the glossary was added to remove.

`markdown-to-pdf` 0.9.0 and later enforce this: the italic paragraph after a
mermaid fence is read as the caption, a `Where:` glossary between the two joins
the same figure, and the drawing is re-fitted to the page minus whatever the
explanation needs. So the mechanism is not your problem. The budget is.

Every line of glossary and caption is a line the drawing does not get, and past
about a third of the page the renderer starts shrinking the explanation's type
instead. Both are worse than the alternative, which is a smaller figure:

- **Keep a glossary to what the diagram actually abbreviates.** A glossary is
  not a place to explain the mechanism; that is what the section's prose is
  for. One line per abbreviated label.
- **Keep a caption to one or two sentences.** It states what to notice, not
  what the diagram shows.
- **Split a figure that needs more than that.** Two figures, each with its own
  short explanation, both fit. One figure with a nine-entry glossary does not,
  and shrinks the drawing that the glossary exists to explain.

#### Size a diagram by its shape, not by shrinking its type

`markdown-to-pdf` 0.8.0 and later scale every diagram to fill the content box,
bounded by the page height. That removed the old compounding-shrink problem:
there is now exactly one scaling, the renderer gets a 2000px viewport so it
does not pre-squash a wide drawing, and a diagram may take a whole page. Which
it should, whenever the content earns it. **A full-page diagram is a good
outcome, not an overrun.** Never trade a label's clarity for compactness.

What the author still controls is the diagram's **aspect ratio**, and that is
now the only thing that decides printed label size. The content box is about
490pt wide by 690pt tall, so a portrait-ish diagram uses the whole page and
prints its type at the largest scale available. A diagram much wider than tall
is width-bound: it is scaled down until it fits the width, leaves most of the
page height unused, and prints small type for no benefit.

So the rule is about shape:

- **Default to `flowchart TD`.** Depth costs nothing now: extra rows use the
  height that a wide diagram would waste.
- **Keep the widest row to two or three nodes,** even with verbose labels. This
  is the same ceiling as before, but for a different reason: it is what keeps
  the drawing portrait, not what keeps it inside a viewport.
- **Use `LR` only for two or three nodes**, and never place two subgraphs side
  by side. Two disconnected components are also laid out side by side; an
  invisible `~~~` link between them stacks them instead.
- **A `sequenceDiagram` stays legible to about three participants.** Beyond
  that express the ordering as a vertical flowchart.
- **Split rather than squeeze.** Two diagrams, each portrait and fully
  labelled, both read; one wide diagram carrying the same content does not. A
  before/after pair belongs in two fences.

Type size no longer needs pinning, and the old `fontSize: '11px'` pin is now
counterproductive: it shrinks labels relative to node padding and edge
spacing, and since the whole drawing is then scaled up to the page, the only
lasting effect is smaller text inside larger boxes. Omit the `%%{init}%%` line
unless you are deliberately raising the label size relative to the drawing:

```
%%{init: {'themeVariables': {'fontSize': '16px'}}}%%
```

One caution carried over from measurement: `direction TB` inside a subgraph
does not narrow a wide diagram, it only changes the internal flow, so the fix
for a too-wide diagram is always fewer nodes per row.

### Screenshots

For any user-visible change, include a screenshot. Drive the app to the changed
state and capture it. When capture is genuinely blocked, say so in one sentence
and fall back to an ASCII wireframe of the changed surface. Blocked means
blocked, not inconvenient: no browser automation available, an unrunnable local
stack, or a flow gated behind a third-party credential the run does not hold.

Save captures under `.difit/<stem>-walkthrough-assets/` and reference them
with relative paths, so the links resolve from the markdown file itself.

#### Name a UI element, show the UI element

Naming a piece of interface creates vocabulary the reader is expected to carry
for the rest of the document, and prose cannot install that vocabulary. A
reader who cannot picture "the rail" reads every later sentence about it as a
term of art they hold unresolved, and by the third such term they are
reconstructing the screen instead of reviewing the change. So the first time
the document names an element, show it. Together these captures are the
document's visual glossary.

Two forms work, and the choice is about how many terms are in play:

- **A zoomed-in capture** of the element alone, when one term needs anchoring.
  Crop to the element plus enough surrounding context to place it on the page.
- **One full-page capture annotated with letters** (A, B, C) or arrows, when
  several terms arrive together. Follow the image with a definition list
  resolving every label, directly under it, the same way a diagram glossary
  sits directly under its fence.

Prefer the annotated full-page capture once a section introduces three or more
names, because a reader separating "the rail" from "the slate" needs to see
both in one frame.

**A term is exempt only when it is obvious, never when it is merely
guessable.** Two kinds qualify:

| Kind | Examples |
| --- | --- |
| Visually self-evident | `Submit button`, `Edit icon`, `search field` |
| Self-describing by position | `left sidebar`, `top-right menu`, `page footer` |

Everything else gets an image. `Rail`, `slate`, `sticky action bar`, `dock`,
and `pane` are exactly the cases this rule exists for: each is precise to the
team and opaque to a reader who has not already built the picture. A house name
for a region is never self-evident, however settled it feels internally. When
you are unsure which side a term falls on, it falls on the side that gets a
capture.

### Citations

Where a decision, structure, or algorithm has academic or published precedent,
cite it: the design pattern by name, the book, or the paper. Use IEEE style,
bracketed numerals numbered by first appearance in the text, resolved in a
final Sources section with a URL when one exists.

Cite only what actually informed or names the decision. A citation that merely
decorates a choice the author reached independently is padding, and padding
costs the reviewer the trust that the real citations need.

**Citations travel with their claim.** A restructure that leaves a supported
claim unsupported has lowered the document's standard of evidence without anyone
deciding to. Verifying that is part of the closing pass; see
[Closing checks](#closing-checks).

```markdown
The loader memoizes the in-flight promise rather than the resolved value, so
concurrent callers share one fetch [1], and the module keeps its cache private
so callers cannot observe the difference [2].

## 10. Sources

[1] D. Michie, "Memo functions and machine learning", *Nature*, vol. 218,
    pp. 19-22, 1968. https://doi.org/10.1038/218019a0
[2] D. L. Parnas, "On the criteria to be used in decomposing systems into
    modules", *Commun. ACM*, vol. 15, no. 12, pp. 1053-1058, 1972.
    https://doi.org/10.1145/361598.361623
```

### Code alongside the prose

Assume the reader has the printout and nothing else. No editor, no second
window, no way to look up an identifier you name. So **when an explanation
depends on code, put the code above the paragraph that explains it**, the way a
technical article does: snippet first, then the prose that acts on it. A
paragraph that says "the read is only valid after the `await getDb()` above it"
is unreadable to someone who cannot see the lines in question.

- **Name the source before every repository code excerpt.** Use the complete
  path relative to the project root, immediately above the fence:

  ```markdown
  **File: `src/lib/google-drive/getGoogleDriveFile.ts`**
  ```

  Blocks not copied from a repository file, including Mermaid diagrams,
  commands to run, ASCII wireframes, and illustrative examples, do not receive
  a file label.
- **Quote the excerpt, not the unit.** Five to fifteen lines, trimmed to what
  the paragraph is about. A whole function is a tour; the reader stops reading
  tours.
- **Carry the enclosing scope down to the excerpt.** A trimmed excerpt with no
  frame around it leaves the reader unable to say what runs it. They have a
  printout and cannot open the file, so an excerpt beginning `return [` could
  be in any of a hundred functions. Show every enclosing level as its signature
  alone, elide the body with `...`, and indent the excerpt where it really
  sits:

  ````markdown
  **File: `scripts/db/reconcile-privileges/PrivilegeSql/PrivilegeSql.ts`**

  ```typescript {4,5}
  function _getReplaySql(options: { scope: Scope; declarations: Declarations }): string {
    ...
    return [
      "begin;",
      _getStripSql(scope),
      ...
    ].join("\n");
  }
  ```
  ````

  Levels stack, so a method inside an exported object shows both:

  ````markdown
  ```typescript
  export const PrivilegeSql = {
    ...
    getReplaySql(options: ReplayOptions): string {
      ...
      return [...];
    },
    ...
  }
  ```
  ````

  `...` on its own line is the elision. `// [18 lines]` is equally acceptable
  and better when the amount omitted is itself the point. Elide anything the
  paragraph does not discuss, including parameter destructuring and guard
  clauses; the signature and the discussed lines are the whole budget. An
  excerpt that already is a complete top-level statement, a `create table`, a
  `grant`, a policy, needs no frame: it has no enclosing scope to lose.
- **Point at the lines you mean** with the fence's highlight spec, so the eye
  lands on the two lines the paragraph is about rather than scanning the block:

  ````markdown
  **File: `src/lib/extensions/ensureExtension.ts`**

  ```typescript {3,4}
  const ensureExtension = (name: string) => {
    const existing = extensionPromises.get(name);
    const db = await getDb();
    if (!shouldLoad({ hasPthreadWorker })) return false;
    return loadIt(db, name);
  };
  ```
  ````

  This is the meta-string convention Docusaurus, Shiki and rehype-pretty-code
  use, single lines and ranges both (`{2,4-6}`). MDX proper, meaning JSX inside
  Markdown, is not supported: only the highlight spec is read.
- **Never name a line by number in prose.** Describe the line by its content,
  "the highlighted read of `hasPthreadWorker`", not "line 12". A spec and a
  prose line number are two copies of one fact, and editing the snippet
  invalidates one of them without warning. Verifying the spec itself lands on
  the intended lines is part of the closing pass; see
  [Closing checks](#closing-checks).
- **The snippet is the subject, not the content.** After it, say the thing the
  code cannot say: why the order matters, what breaks if it changes, which
  caller depends on it. Never narrate it line by line.
- **Elide with `...`** rather than including scaffolding the paragraph does not
  discuss.
- A snippet whose paragraph would survive its deletion should be deleted.
- **A snippet buys you nothing on the "why".** It answers what the code is, and
  never discharges the prose's duty to say why. When adding one forces a cut,
  cut narration of the snippet, never the reasoning the snippet cannot show.
  Compression around a new snippet is the most reliable way to lose the
  provenance, the equivalence argument and the rejected alternative all at once.

### Explaining a multi-step algorithm or pipeline

A pipeline, a multi-pass algorithm, or a command that runs several tools in
order needs a shape the ordinary section structure does not supply. Ordering
the prose the way the code runs is the obvious choice and the wrong one: the
reader holds every step unplaced until the last one lands, then re-reads from
the top to attach them.
[`references/pipeline-explanation.md`](references/pipeline-explanation.md) is a
worked example of the structure below, annotated with which rule each part
satisfies.

Write it in three parts, in this order.

**1. The structural fact, before any step.** Open with whatever reorganises the
reader's model, and name the design they will otherwise assume. A reader
meeting a privilege reconciler assumes a shadow database, because that is how
`supabase db diff` works; the explanation opens by saying there is no shadow
database and that the replay runs in a rolled-back transaction on the live
connection. An accurate description that leaves the reader's wrong model
standing will be read through that model.

**2. The steps, in execution order, one heading each.** Name each step by the
thing that runs it rather than by what it achieves: `supabase db diff -f
<name>`, then `strip-noop-view-recreations`, then `supabase db reset`. A step
named for its trigger can be found in the code and grepped for; a step named
`Normalisation` cannot.

Each step carries four things, and one that stops at the first two is
narration:

- What it does.
- What it produces, and where that output goes.
- Which defect exists in its absence.
- What its position in the order depends on. When a step must follow another,
  name which and why. When two are independent, say so.

**3. One section per property the pipeline guarantees.** A step list states
what happens and cannot state what holds afterwards, which is what a reviewer
checks the design against. For each property, use it as the heading, then trace
it to the specific steps that produce it.

The properties are the reader's questions, and they are rarely "what runs
first". "Why the same statements are not re-emitted on every run" and "why
drift cannot reach a committed migration" are separate guarantees produced by
different steps, and a single section covering both answers neither.

Three rules apply throughout:

- **Trace one traversal with real values.** The input, the intermediate states,
  the output, per the algorithm bullet in item 6 of [Sections](#sections).
  For a pipeline this is often a before and after pair of catalog reads, file
  contents, or command output, quoted rather than described.
- **State what each step deliberately does not do.** An unexplained exclusion
  reads as an oversight, so a reviewer spends a comment asking about it.
  "Functions and default privileges are deliberately not stripped, because
  their declarations already name every grantee" closes the question that the
  strip step opens.
- **Give a two-column table to any step that compares two states.** Name each
  side, how each is produced, and what each means. Prose that alternates
  between two states across a paragraph forces the reader to track which one
  each sentence is about.

### Flow and orientation

A section that is factually perfect and arrives from nowhere has failed. Being
correct about an algorithm is worth nothing if the reader is still working out
why they are reading about it. This is a prose problem, and the fix is
structural, not more words.

- **Open every section by locating it.** One sentence, before the subject:
  which strand of the change this belongs to, and what question it answers.
  Never open a section on its own subject.
- **Earn the reader's arrival.** If a section follows from the one before,
  say how. If it does not, say that: "this is independent of everything above,
  and is here because it shipped in the same branch" orients better than
  silence.
- **Order sections by dependency,** so the context a section needs has always
  already been read.
- **Transitions are one sentence.** Flow is a property of structure, not of
  length; a walkthrough that got longer to explain itself has usually got
  worse.
- **Check the structure by reading only the headings and each section's first
  sentence.** That pass is part of [Closing checks](#closing-checks).

### Writing for a reader new to this code

Write for a software engineer who knows the product and has never worked in
this part of the codebase. They know what the product's screens do, and they
know general engineering vocabulary: tables, indexes, caches, inheritance, a SQL
alias. They do not know the vocabulary this area of the code has grown, and
they were not in the conversations it grew in.

That vocabulary comes in two kinds, and the second is the trap:

- **Nomenclature** is documented: a label in the product's UI, a term the
  project's docs define, a model the codebase names on purpose. A reader can
  look it up.
- **Vernacular** is informal: words that emerged while the code was being
  built, living in comments, variable names, and discussion, and defined
  nowhere. `binding`, `identity`, `owner`, `descriptor`, and `evidence` in the
  examples below are all vernacular. A reader cannot look it up, and an author
  who has used a word for a week no longer hears it as jargon.

Vernacular is not banned. The reader will meet it in the diff, and the document
should prepare them for it. It must be grounded: either replaced with a plain
description, or introduced in product terms and defined in the
[Glossary](#glossary).

- **Ground each mechanism in what a user does or sees.** Name the user action
  that triggers it, or the screen that shows its effect, then use the technical
  vocabulary freely. "Column ID" means something to a reader once they know it
  is what keeps a chart series' label when the user renames the column on the
  Query tab.
- **Name both sides of every relationship word.** `binding`, `mapping`, `link`,
  `match`, `reference`, and `target` each join two things, so say which two:
  not "an Explorer binding" but "the link between a chart setting in the Data
  Explorer and one column of the query's results".
- **Name the owner of every abstract noun.** `identity`, `state`, `metadata`,
  `schema`, `evidence`, `scope`, and `provenance` say nothing until the reader
  knows whose. The owner goes in the same sentence or the one before;
  otherwise restate it. When one word covers several things across the
  document, as `identity` can cover a source column's ID, a selected column's
  ID, and a result column's ID, name the specific thing every time.
- **Qualify a generic word that names more than one thing in the codebase.**
  `descriptor`, `config`, `settings`, `registry`, `context`, and `schema`
  usually name several unrelated types. A reader resolves the bare word to
  whichever one they already know, which is often the wrong one.
- **Clarity outranks brevity.** Write as briefly as clarity allows, and no more
  briefly. A heading or sentence that grew by the qualifier a reader needed has
  improved; one that lost it to save words has not. Shortening is worth doing
  only until the reader starts to lose the meaning.

| Avoid | What a new reader cannot tell | Use |
| --- | --- | --- |
| `4. Executed results need evidence before they can inherit identity` | What ran, what the evidence proves, and whose identity is inherited by what. | `4. When a user edits and re-runs a query, each result column keeps its earlier column ID only when the app can prove it is the same column` |
| `When no descriptor exists, a unique output receives an ID.` | Which descriptor. The codebase also has visualization setting descriptors, so the reader picks the wrong one. | `When the app cannot describe the query's SELECT list as projection descriptors, for example because the query has a join, each uniquely named result column receives an ID.` |
| `4.3 Old rows cannot establish a new Explorer binding` | What is bound to what. "Explorer binding" reads like a documented term, and is not one. | `4.3 After a user edits the SQL in the Data Explorer, results from the old SQL cannot supply column IDs to the chart settings` |
| `Source-field identity and result identity meet at compilation and reconciliation.` | Two identities of unnamed things, joined by two process nouns the reader has not met. | `WHERE filters save IDs of the data source's columns, while chart settings and HAVING filters save IDs of the columns the query selects. The two kinds of ID meet only when the query is compiled to SQL and when its results are matched back to IDs.` |

**The cold-read test.** Read each heading, and the first sentence of each
section, as that new reader. For every noun, say what concrete thing it names;
for every verb, say who does it to what. An answer that needs knowledge of this
code means the sentence needs grounding. The
[clarity pass](#the-clarity-pass-runs-in-a-subagent) applies this test to the
whole draft.

### How much to explain

There is no word limit. A walkthrough is long when the change has many ideas in
it and short when it has few, so any cap punishes the document that had the
most to say and lets a padded one through under the number. What a cap reaches
for is proportion, and proportion is measurable directly: a passage should be
as long as what the reviewer would otherwise get wrong, and no longer.

**The deletion test.** For any passage, ask what a competent reviewer would
conclude if it were not there. If they would conclude the same thing, it is
narration and comes out, however true it is. If they would conclude something
false, or could not reach a conclusion at all, it stays, at whatever length the
correction takes. The test runs per passage, never per document: a section that
earns four paragraphs sits beside one that earns a sentence, and the document
is correct.

The competent reviewer in this test is the reader that
[Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code)
describes, not an insider. A phrase that grounds a term for that reader passes
the test, even where an insider would not miss it.

What material earns, once it passes that test:

| The passage covers | Earns |
| --- | --- |
| A unit whose name and signature already say it | Nothing |
| A mechanism the reviewer can read off the diff | One sentence, and only where a later passage depends on it |
| A constraint whose violation would be a defect | The failure mode, what the code proves, and what it does not |
| A decision | The choice, the rejected alternative, the reason, and the evidence that would reverse it |
| A behaviour-preserving rewrite | The whole equivalence argument, boundary cases included |
| An algorithm that is not evident on one read | A worked example with real values, however long that runs |

Both failures are quiet, which is why neither shows up without being looked
for:

- **Under-explained reads as brisk.** The reviewer reconstructs from the diff
  something the author already knew. The tell is a claim the reader cannot
  check without opening a file the document does not quote.
- **Over-explained reads as thorough.** The tells are a paragraph after a
  snippet that narrates the snippet, a second example that varies nothing from
  the first, a sentence that restates the section's own heading, and any
  sentence that would survive its own deletion.

Two redirects, for passages that fail the test but are worth keeping somewhere:

- **Explanation that belongs in the code.** When a passage says why a line is
  written that way, and every future reader of that file needs the same answer,
  the walkthrough is the wrong home: put it in the code and let the walkthrough
  cite it. A walkthrough is read once, by this reviewer, for this change.
- **Explanation that answers a question nobody asked.** True and unasked is
  still padding. The questions a walkthrough owes answers to are the ones in
  [Sections](#sections); past those, the author is enjoying the topic.

A figure's legend is part of the figure, not prose. Never shorten a section by
trimming a glossary entry or a caption: the entry exists because a label needs
resolving, and cutting it breaks the figure rather than tightening the section.

### Factual prose

Every sentence contributes one of six things: a technical fact, evidence, a
consequence, a decision, a transition, or a scope boundary. Delete or rewrite
sentences that only make the document sound engaging.

Importance claims name their reason in the same sentence, wherever in it the
label sits. Replace a bare label such as `important`, `critical`, `central`, or
`load-bearing` with the behavior, dependency, or failure, or connect the label
directly to that reason. A label attached to a clause that merely enumerates
its parts is still bare: `two parts, and both are load-bearing: (1)... (2)...`
numbers the parts without saying what breaks if either is missing, so the
label has not earned its place. Each item needs its own stated consequence,
not just its own number.

| Remove | Write instead |
| --- | --- |
| Reader coaching: `This one is worth dwelling on.` | State the finding: `The existing unit test hid the defect.` |
| Inflated significance: `This strand is the point of the branch.` | State the coverage gap: `No existing test covered these failures.` |
| Vague importance: `The separator row is load-bearing.` | State the behavior and failure: `The separator row distinguishes a table from a paragraph; without it, the parser renders the pipes as body text.` |
| Tag-on importance before a list: `The argument has two parts, and both are load-bearing: (1) service_role is unreachable from a browser; (2) the one caller scopes the id by workspace.` | State what fails without each part: `(1) ...; (2) .... Without (1), any authenticated session could call this directly; without (2), nothing scopes the id to the caller's workspace.` |
| Suspense: `That change surfaced a second, subtler property.` | Name the property and its effect. |
| Dramatic metaphor or anthropomorphism: `The import got further and then died.` | Name the component and failure: `DuckDB aborted the import after the preview succeeded.` |
| Punchline contrast: `This looks redundant and is not.` | State why both statements are required. |
| Editorial judgment: `The view is genuinely not capturable.` | State the blocking condition. |
| Vague pronoun-led transition: `This has a consequence outside the code.` | Name the affected workflow or system. |
| Singular-insight framing: `which is the single fact that explains the shape` | Drop the framing and state the fact: `schema files are read by the generator and applied to no database.` |
| Merit or deserving language: `The third state earns its place through the SELECT rule.` | State what it does: `The SELECT rule is what makes draft different from workspace.` |
| Essay scaffolding: `It is worth noting`, `The interesting question is`, `Two details carry weight`, `Notice that` outside a caption | Delete the scaffold and lead with the fact. |
| Rule-of-three padding: three parallel clauses where one carries the claim | Keep the clause that is checkable, delete the cadence. |

Captions follow the same rule. State what the diagram or screenshot proves;
do not turn the caption into a slogan or punchline.

### Closing checks

Nine passes over the finished draft, before handing it over. Each catches a
class of defect that reading the document top to bottom does not.

Run them by dispatching a subagent, per
[The style check runs in a subagent](#the-style-check-runs-in-a-subagent), and
only after the content review has settled, per
[The content review runs in a subagent](#the-content-review-runs-in-a-subagent).
The author of a document is the worst reader of it: having just chosen every
sentence, they read the intent rather than the text, and the tells in
[Factual prose](#factual-prose) are exactly what an author cannot see in their
own draft.

1. **Find every fact the document states twice, and confirm the copies agree.**
   A walkthrough is full of deliberate duplication, and every instance of it is
   somewhere a later edit can go stale silently. There is no lint for this: the
   document stays valid Markdown and reads fine, and only the two copies
   disagree. Known instances, all of which have bitten:

   - A count in the prose against what the section actually lists. "Two
     unrelated corrections rode along" above a section listing four.
   - A highlight spec against the printed snippet. Count the snippet's lines and
     confirm each number in the spec lands on the line you mean; an off-by-one
     shades the wrong line and nothing else will tell you.
   - A claim that carried a citation, after the sections moved. A shrinking
     Sources list is the symptom.
   - The strand map in Purpose against the sections delivered.
   - A section cross-reference (`§4.2`) against where that content now lives.
   - The Glossary against the body: an entry for a term the body no longer
     uses, or a term the body leans on with no entry.
   - The Background tree against the list under it: every unit in one appears
     in the other.

2. **Audit the coverage,** per the checklist in item 6 of
   [Sections](#sections): walk it against every strand and confirm where each
   item landed, saying so when an item does not apply.

3. **Read only the headings and each section's first sentence.** If that alone
   does not tell the story of the change, the structure is wrong, and no detail
   inside the sections will fix it. For a section covering a pipeline or a
   multi-step algorithm, confirm it opens on the structural fact rather than on
   step one, and that each guarantee it claims has its own heading, per
   [Explaining a multi-step algorithm or pipeline](#explaining-a-multi-step-algorithm-or-pipeline).

4. **Cover the caption and read each diagram cold,** per
   [A diagram must stand alone](#a-diagram-must-stand-alone). Every node and
   edge label must resolve without the surrounding prose. Any label that is a
   single word, an acronym, or a bare identifier requires a glossary directly
   under the fence; a missing glossary is a defect, not a stylistic
   preference. Then check the shape per
   [Size a diagram by its shape](#size-a-diagram-by-its-shape-not-by-shrinking-its-type):
   a diagram wider than it is tall wastes the page and prints small type. Then
   check the budget per
   [A figure never spans two pages](#a-figure-never-spans-two-pages): a long
   glossary shrinks the drawing it exists to explain.

5. **Audit the writing contract.** Read the headings without the body and
   confirm each names a checkable claim rather than a topic or a metaphor.
   Check every solved-problem section for `The Problem` and `The Solution`,
   every repository code excerpt for its project-relative file label AND its
   enclosing signature, and every paragraph and caption against
   [Factual prose](#factual-prose). Then read the draft once more, sentence by
   sentence, looking only for the tells in that table. They cluster at the
   start of sections and in the sentence before a diagram, but a tell buried
   mid-paragraph is just as much a defect; the clustering is where to expect
   more of them, not where to stop looking. A label attached to an
   enumeration's lead-in clause is easy to skip on a skim read precisely
   because it sits mid-sentence rather than as the sentence's main claim.

6. **List every UI element the document names,** and confirm each
   non-obvious one has its zoomed-in or annotated capture, per
   [Name a UI element, show the UI element](#name-a-ui-element-show-the-ui-element).
   Report the misses rather than fixing them: this pass cannot drive the app,
   so the author takes the capture.

7. **Run the deletion test on every section,** per
   [How much to explain](#how-much-to-explain): name what a reviewer would get
   wrong if the section were not there. A section that cannot produce that
   answer is narration and comes out, whatever its subject. Run it on the
   longest sections first, where the answer is least likely to cover the whole
   length.

8. **Check the opening sections against their contracts.** Purpose, Glossary,
   Background technical context, and Manual testing come first, in that order.
   No glossary definition uses a term that would itself need defining, per
   [Glossary](#glossary). No Background entry runs past two sentences, per
   [Background technical context](#background-technical-context). Every Manual
   testing step is runnable as written, setup comes first, and each fixed
   defect has its before-and-after, per [Manual testing](#manual-testing).

9. **Confirm the document stands alone,** per
   [The walkthrough stands alone](#the-walkthrough-stands-alone). Search it for
   `.difit`, `guide`, `group`, `transcript`, `test plan`, `thread`, and
   absolute paths, and remove every pointer to something a reader of the pull
   request cannot open. There is no reading-order section.

### Review passes

A drafted walkthrough goes through four review passes, each dispatched to its
own subagent, one at a time and in this order. Each pass reads the document the
previous one left, and each is done by a reader who did not choose the words.

| Order | Pass | Question it answers | What it changes |
| --- | --- | --- | --- |
| 1 | Background context | What code does a reader need to know to follow this change? | Writes the Background technical context section |
| 2 | Clarity | Can an engineer new to this code follow it? | Nothing. It returns proposals and the glossary; the parent applies them |
| 3 | Content review | Is every claim true of the code? | Edits claims, returning each change with its evidence. The parent reverts any it rejects |
| 4 | Style check | Does the document meet this contract? | Edits style only. Always last |

The background section and the glossary are new claims about the code, and the
clarity rewrites restate existing claims in new words, so the content review
runs after both and checks all of them. Content runs before style because a
heading polished to state a claim that turns out to be false is worse than the
vague heading it replaced, and because a sentence cut as a tell may have been
the only place a caveat was recorded.

### The background context pass runs in a subagent

This pass writes
[Background technical context](#background-technical-context), and it is the
only pass that adds a section rather than reviewing one. A separate reader
decides what background is needed because the author cannot: having just
worked in this code, the author no longer sees which modules a newcomer has
never heard of.

Dispatch it with:

- the absolute path of `-walkthrough.md`,
- the branch and comparison the walkthrough describes, so it can read the diff,
- the absolute path of this SKILL.md, told to read
  [Background technical context](#background-technical-context) and
  [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code)
  before writing anything,
- authority to edit the Background technical context section of the
  walkthrough and nothing else.

It works in three steps:

1. **Read the whole walkthrough,** and list every model, module, directory, and
   table it names, or relies on without naming.
2. **Measure the blast radius** from the diff: which layers and directories the
   change touches, such as models, clients, views, the database, or workers,
   and which unchanged units the changed code calls into or is called from. The
   blast radius sets the depth. A change confined to one module needs two or
   three entries; a change that crosses the model, client, and view layers
   needs an anchor in each layer.
3. **Keep only what a reader needs as background:** a unit is in when a later
   section names it without saying what it is, or when the reader needs it to
   place the change in the codebase. A unit a strand section introduces itself
   stays out, and so does a changed file nothing in the walkthrough depends
   on. When the result will not fit on one page, keep each area's anchor unit
   and drop the rest.

It returns the units it included, the ones it considered and left out, and why,
so the parent can judge the cut.

### The clarity pass runs in a subagent

This pass reads the draft as the reader in
[Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code):
a software engineer who knows the product and has never worked in this part of
the code. It edits nothing. It returns proposals to the parent, and it delivers
the [Glossary](#glossary).

Dispatch it with:

- the absolute path of `-walkthrough.md`,
- the branch and comparison the walkthrough describes,
- the absolute path of this SKILL.md, told to read
  [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code),
  [Glossary](#glossary), and the heading rules in [Sections](#sections) first,
- read-only access to the walkthrough, the diff, the code, and the project's
  docs.

**Cold read first, research second.** Once the subagent has read the code, it
can no longer see what a newcomer cannot. So it reads the walkthrough alone, top
to bottom, and records every point where a newcomer would stall before it opens
anything else:

- **Nomenclature and vernacular:** a term it cannot resolve from the product or
  from general engineering vocabulary, a relationship word missing one side, an
  abstract noun whose owner is not in the same or the previous sentence, or a
  generic word that could name more than one thing.
- **Problems and solutions:** a problem it could not restate as what a user did
  and what went wrong, or a solution whose mechanism it could not name.
- **Algorithms:** a step it could not trace using the worked example given.
- **Architecture:** a component it could not place in the Shape diagram or the
  Background tree, or a data flow it could not follow end to end.
- **Heading order:** a heading that depends on a term or mechanism introduced
  only later, or a heading list that does not tell the story of the change when
  read alone.

Only then does it read the diff, the code, and the docs, to turn each stall
into a concrete fix and to write glossary definitions that are true.

It returns three things:

1. **Proposals,** one per stall: the location (section number and the quoted
   text), what the newcomer could not work out, and the replacement text. When
   rewording cannot fix a stall because the underlying claim is unclear, it
   returns a question for the parent instead of a guessed rewrite.
2. **Heading order changes,** each with the dependency that motivates it.
3. **The glossary,** ready to paste, per [Glossary](#glossary).

The parent reads every proposal and accepts or rejects it. It applies the
accepted ones, checking that each rewrite still states the same claim, then
writes the glossary into its section, dropping any entry for a term the
accepted rewrites removed from the body. A rejection is a normal outcome, and
the content review that follows checks the result against the code.

### The content review runs in a subagent

The third pass, per [Review passes](#review-passes). It reads the draft for
ACCURACY. Its question is never "does this read well", it is "is this true, and
is it what the code does". Dispatch it with:

- the absolute path of `-walkthrough.md`,
- the branch and comparison the walkthrough describes, so it can read the diff
  itself rather than trusting the prose,
- authority to edit the walkthrough file, and to run read-only verification:
  `git show` and `git diff` against the base, reads of the working tree and the
  test suites, and read-only queries against a LOCAL database that already has
  the change applied. Never a write, and never the production database.

It applies its fixes to the markdown and returns every change with the evidence
behind it. The parent then accepts or rejects each one: the subagent has read
the code more recently, the author knows what the change was for, and neither
alone is a good judge of a disputed claim.

#### Verify against the sources, never against the document

A claim cannot be checked by reading the sentence next to it. Every finding has
to come from a primary source: the diff, the surrounding code the diff calls
into, the tests that pin the behaviour, or a query against a local database.
Where a claim asserts a privilege, a constraint, a default, or a count, run it.
Where it asserts what the code used to do, read the base revision. A claim the
reviewer cannot reach a source for is reported as unverified rather than
accepted.

#### The problem-to-solution join is the highest-yield check

For every section carrying `The Problem` and `The Solution`, and for every pair
that is implicit, ask one question: does the mechanism named in the solution
actually close the failure named in the problem? A section can be accurate in
both halves and wrong in the join, which is why this needs asking separately
from checking the claims.

The failure mode, from a real review. A section explained that a helper
returning a whole roster was callable by `anon`, then presented a narrower
signature as the fix. Both halves were true and the join was wrong: the
signature was not what stopped `anon`, a `revoke ... from public` in the same
hunk was, and the signature defended against a different caller entirely, one
whose grant could not be revoked at all. No sentence in the section was false.

So for each pair, report three things:

- **The mechanism that actually does the work,** named exactly, and whether the
  document names it. When one change defends against two callers, inputs, or
  states, the document needs to separate them, because a reader who attributes
  the fix to the wrong line will later remove the right one.
- **Whether the solution eliminates the problem or reduces it.** A reduction
  presented as an elimination is a defect. The same section was missing its
  residual: a caller who already holds a user id can still test one membership
  at a time, which is a large reduction and not a closure.
- **What each half is about.** Two halves that quietly concern different actors
  or different inputs are the shape this defect takes.

#### Claims, snippets, and highlights

Beyond the joins, check and fix:

- **Every factual assertion**, against a source. Privileges, constraints,
  defaults, orderings, and "X cannot happen because Y" are the ones that fail.
- **Every number**, including counts of files, sections, values in an enum, and
  entries in a list, against what is actually there.
- **Every cross-file claim.** "Mirrored in TypeScript by `f`" requires that `f`
  exists and still agrees.
- **Snippet relevance.** The excerpt must contain the lines the paragraph
  discusses, and its enclosing signature must be the scope those lines really
  sit in. An excerpt whose paragraph discusses something not in it is the
  defect.
- **Highlight specs**, by counting the printed snippet's lines. A clause the
  prose points at that spans two source lines needs both, and a spec naming
  only the first shades half a claim.
- **The opening sections.** Every Glossary definition and Background entry,
  against the code. Every command, path, test file, and fixture file in Manual
  testing exists under that name, and each before-and-after matches what the
  base revision and the change actually do. Check these by reading, never by
  running a database command.
- **Every path the document cites,** for being tracked in the repository at
  the compared revision (`git cat-file -e <rev>:<path>`). A citation of a
  `.difit/` artifact, a gitignored file, or a local-only path is a defect, per
  [The walkthrough stands alone](#the-walkthrough-stands-alone): replace it
  with the verified claim it stood for, or remove it.
- **Decisions**, for a rejected alternative that is real and a stated reason
  that is true.
- **Open questions**, for whether the code has since answered one.
- **Deliberately not handled**, for whether each gap is still a gap.

Its remit stops at accuracy. It does not rewrite for tone, restructure a
section, retitle a heading that is merely dull, or touch a diagram for
legibility: those are the style check's, and doing them here costs the parent
the ability to tell a correction from a preference. Where a claim is
unrecoverable from the code, it adds an Open question rather than inventing a
rationale. A correction it writes follows
[Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code),
so fixing a claim never brings back vernacular the clarity pass grounded.

### The style check runs in a subagent

The last review pass, per [Review passes](#review-passes), dispatched once the
content review's changes have been accepted or rejected. Nothing runs after it.
It reads the document against this contract and fixes what it finds, so the
pass is done by a reader who did not choose the words.

Dispatch it with:

- the absolute path of `-walkthrough.md`,
- the absolute path of this SKILL.md, told to read
  [Sections](#sections), [Glossary](#glossary),
  [Background technical context](#background-technical-context),
  [Manual testing](#manual-testing), [Diagrams](#diagrams),
  [Screenshots](#screenshots),
  [Code alongside the prose](#code-alongside-the-prose),
  [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code),
  [How much to explain](#how-much-to-explain),
  [Explaining a multi-step algorithm or pipeline](#explaining-a-multi-step-algorithm-or-pipeline),
  [Factual prose](#factual-prose), [Closing checks](#closing-checks) and
  [Rules](#rules) before changing anything,
- authority to edit the walkthrough file and nothing else.

It returns the list of changes it made and anything it judged out of scope.

**Its remit is style, never substance.** It may rewrite a heading, cut a tell,
retitle a caption, add a missing glossary, reflow a diagram, and correct a
highlight spec. It may not change a technical claim, add or remove a decision
or an open question, or alter the meaning of any sentence. Nor may it shorten a
heading or sentence by dropping a qualifier or a phrase that grounds a term for
a new reader: clarity outranks brevity, per
[Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code).
When a passage reads badly because the underlying claim is unclear, it reports
that rather than guessing at a fix.

#### The diagrams are checked visually, in a loop

Every rule in [Diagrams](#diagrams) is about what a reader sees, and none of
them can be verified by reading mermaid source. Overlapping labels, a node whose
text breaks mid-identifier, an edge label sitting on top of an edge: all of them
are invisible in the fence and obvious on the page. So the subagent renders and
looks.

The loop:

1. Render the walkthrough to PDF with `markdown-to-pdf <file.md> --out <pdf>`.
2. Rasterize the pages that carry diagrams (`pdftoppm -r 80 -png -f N -l N`)
   and **look at each image**.
3. Judge each diagram against three things, all of them visual:
   - **No overlap.** No label over another label, over a node, or over an edge.
   - **No awkward break.** A label must not break mid-word, mid-identifier, or
     leave a single word stranded on its own line.
   - **Legible type.** Diagram labels a little under body text, never so small
     that the reader would lean in.
4. Fix what failed and go back to step 1. Keep looping until every diagram
   passes, then report how many rounds it took.

**Only two levers are permitted, and the diagram's text content is not one of
them.** The wording of every node and edge label is the author's and must
survive the check byte for byte. What may change:

- **Type size**, via a `%%{init: {'themeVariables': {'fontSize': '16px'}}}%%`
  line, up or down.
- **Layout**: `TD` versus `LR`, where a line breaks inside a label (`<br/>`),
  node ordering, splitting one diagram into two, or spacing through
  `nodeSpacing` and `rankSpacing`.

If a diagram cannot be made legible by those two levers alone, the subagent
says so and leaves it, rather than rewriting a label to make the problem go
away.

### Rules

- Length is earned per passage and is never capped. It tracks the number of
  ideas in the change, never its file count and never a word count. See
  [How much to explain](#how-much-to-explain).
- Quote code as evidence for a claim, never as a tour: see
  [Code alongside the prose](#code-alongside-the-prose).
- Every rationale must stand on its own without the old code in view. "We used
  to do X" fails; "do not do X, because Y" passes.
- Name the uncertain calls. Where the author was unsure, or the decision was
  close, say so: that is where reviewer attention pays best.
- Never restate the diff, never narrate file by file, and never explain a
  function whose name already does.
- Ground the code's informal vocabulary in what a user does or sees, and never
  trade clarity for brevity. See
  [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code).
- Never hand-wrap a code excerpt to fit the page. `markdown-to-pdf` 0.8.0 and
  later break a long line at the measured column budget and mark the
  continuation with `\u21b3`, so a manual break only adds a wrap the source does
  not have. Quote the line as it is written.
- No em dashes.

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
progressively. The guides are what the reviewer is waiting on, so they go up
first. Explainer threads come after the walkthrough, because they cite its
sections, and the walkthrough takes longer than everything else combined.

1. Resolve the repo root, branch, comparison, stem, and artifacts. Do the
   comparison handoff now if a live session needs it.
2. If `.difit/<exact-branch-name>_explanations.md` exists, use it as a candidate
   list but verify each entry against the current diff. Otherwise inspect:
   - `.`: `git diff HEAD`, plus untracked files
   - `staged`: `git diff --staged`
   - `working`: `git diff`, plus untracked files
   - branch: `git diff <base>...HEAD`
3. Write all guide artifacts, with thread counts taken from the transcript as
   it stands. Initialize reviewed state only when it is absent; otherwise
   preserve and reconcile it. Pass the coverage gate.
4. When `-walkthrough.md` does not exist for the selected comparison, write it
   by running steps 2 to 10 of [Walkthrough](#walkthrough). When it exists,
   leave it untouched, per
   [When a walkthrough is written](#when-a-walkthrough-is-written).
5. Write the explainer threads, pointing into the walkthrough per
   [As the reviewer](#as-the-reviewer). For a new transcript (absent, or the
   `[]` one `dif` created), write helpful explainer threads or leave it `[]`.
   For a new round on an existing transcript, preserve every entry and append
   only new `claude` threads; never replace the conversation with the new
   round alone. With a live session, follow [Writing the transcript while a
   session is live](#writing-the-transcript-while-a-session-is-live).
6. Validate the transcript, then update the guides' thread counts and pass the
   coverage gate again.
7. Send the Initial chat summary. When this round wrote the walkthrough, follow
   it with the report from step 11 of [Walkthrough](#walkthrough).

A reviewer comment may arrive mid-round: `dif` types it into your input as soon
as it is written, so it lands as a queued message while you work. Before the
guides are written, finish them first. After that, answer the comment as a
Continue round at the next break between steps, then resume the Initial round
where it stopped: a reviewer should not wait for a walkthrough to get a reply.
When the reply changed code, the walkthrough describes the code as it stands
after that change.

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
   [`references/review-comment-style.md`](references/review-comment-style.md),
   plus `~/.diff-review/review-comment-style.md` when it exists, before writing
   any finding. This mode is the reviewer voice, never the reply voice.
3. Review the PR with `git diff <baseRefName>...HEAD`; for a local critique,
   review the selected comparison. Check correctness, edge cases, architecture,
   data modeling, documented conventions, and useful nits.
4. Write one thread per finding, then use the Initial artifact, validation,
   coverage, reporting, and walkthrough steps with the selected comparison.

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
4. Read [`references/reply-style.md`](references/reply-style.md), plus
   `~/.diff-review/reply-style.md` when it exists, before writing any reply.
   This mode is the engineer voice, never the reviewer voice. Then create only
   new entries. A question requires a reply. A completed change may omit the
   reply or use `Done.`; if declining a requested change, explain why in a
   reply. Copy the parent location exactly and use fresh ids and timestamps.
5. Validate the full transcript plus new entries in a temporary file, or for one
   reply verify its parent location exactly. POST only new entries:

   ```bash
   curl -sS -X POST "http://localhost:<port>/api/comment-imports" \
     -H 'Content-Type: application/json' \
     --data '<json-array-of-new-entries>'
   ```

6. If code changed, regenerate the guides and reviewed signatures, run the
   coverage gate, and update the summary or test plan only if stale. Never
   touch the walkthrough, even when the change makes it stale, per
   [When a walkthrough is written](#when-a-walkthrough-is-written).
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
6. Update the summary or test plan only when stale. Never touch the
   walkthrough.
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

### Walkthrough

Selected only by an explicit request, such as `/diff-review walkthrough`, and
the only mode that changes an existing walkthrough. Initial and PR review run
steps 2 to 10 when no walkthrough exists, and a plain `/diff-review` on a
prepared review with no walkthrough runs steps 2 to 11. Apart from what Initial
does when step 1 runs it, read-only with respect to source.

1. Resolve the artifacts for the selected comparison. Require `-guide.md` and
   `-guide.json`, because a walkthrough belongs to a prepared review. When
   either is absent, run Initial. If Initial wrote the walkthrough because
   none existed, stop there rather than writing it a second time. If a
   walkthrough already existed, Initial left it untouched, so continue from
   step 2: this request asked for it to change.
2. Start from what `.difit/` already holds, then go past it. The guide's
   grouping and file tags, the transcript's threads, `-summary.md`,
   `-test-plan.md`, any `<branch>_explanations.md`, and the current
   `-walkthrough.md` when one is being regenerated are a prepared map of this
   diff: read them first to orient, and to avoid re-deriving conclusions an
   earlier round already reached. None of it is required content, none of it
   is authoritative, and none of it is cited, per
   [The walkthrough stands alone](#the-walkthrough-stands-alone). Verify
   anything you carry forward against the code, and treat a disagreement
   between an artifact and the code as a finding worth stating.
3. Read the full diff, then read the surrounding code the diff calls into and
   is called from. The walkthrough describes the system as it now stands, so
   unchanged collaborators are in scope for understanding even though they are
   out of scope for review.
4. Capture screenshots for user-visible changes, per
   [Screenshots](#screenshots).
5. Where a decision's rationale is not recoverable from the code, say so
   rather than inventing one, and add it to Open questions.
6. Write `-walkthrough.md`, including Manual testing per
   [Manual testing](#manual-testing). Write the Glossary and Background
   technical context headings with a one-line placeholder each, so section
   numbers are final from the first draft; the next two passes fill them.
   When regenerating, keep each section's number where its content still
   fits, because earlier explainer threads cite those numbers. Do not touch
   the transcript, the guides, the reviewed state, or any source file. When a strand is a pipeline or a multi-pass algorithm, read
   [`references/pipeline-explanation.md`](references/pipeline-explanation.md)
   before writing that section.
7. Run the background context pass, by dispatching a subagent per
   [The background context pass runs in a subagent](#the-background-context-pass-runs-in-a-subagent).
   Read what it included and what it left out, and correct the section when a
   unit a later section depends on is missing.
8. Run the clarity pass, by dispatching a subagent per
   [The clarity pass runs in a subagent](#the-clarity-pass-runs-in-a-subagent).
   Read every proposal and accept or reject it, apply the accepted ones, answer
   its questions in the text, and write the glossary it returned into the
   Glossary section.
9. Enter the content review phase, by dispatching a subagent per
   [The content review runs in a subagent](#the-content-review-runs-in-a-subagent).
   It checks the draft for accuracy against the code, fixes what it finds, and
   reports each change with its evidence. Read every change and accept or
   reject it: a rejection is a normal outcome, and a change accepted without
   reading it defeats the phase.
10. Then run the style check, always the last pass, by dispatching a subagent
    per [The style check runs in a subagent](#the-style-check-runs-in-a-subagent).
    It applies [Closing checks](#closing-checks) and loops on the rendered PDF
    until every diagram is visually legible. Do not skip it because the draft
    looks finished: looking finished to its author is the condition the phase
    exists to test.
11. Report the section count, which units the background context pass
    included, what the clarity pass proposed and what you rejected, what the
    content review changed and what you rejected, what the style check
    changed, and any section the deletion test shortened or removed. When a
    regeneration moved a section that an existing thread cites, list those
    threads. Then end the response with a table naming the walkthrough. One row is expected; the
    table is there so the path stands out at the end of a long reply.

    ```markdown
    | Walkthrough | Location |
    | --- | --- |
    | <the document's H1 title> | `.difit/<stem>-walkthrough.md` |
    ```

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
