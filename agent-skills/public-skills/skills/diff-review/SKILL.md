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
| Explicit request for a walkthrough, an as-built design doc, or a document to read before the code | Walkthrough |
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

Write `-walkthrough.md` in Walkthrough mode only. Never write it automatically:
it costs real effort and is worth nothing to a reader who did not ask for it.

The walkthrough is always a markdown file in `.difit/`, named from the same
stem as every other artifact (see [Artifact names](#artifact-names)). It is
printed from that file. Never publish it to a hosting service, and never
substitute a hosted page for the file.

### Sections

Use these headings in this order, numbered, omitting any that would be empty.
Numbers are stable for the life of the review so the reviewer can annotate a
printout and cite `§3.2` back to you.

Headings are factual navigation, not titles. A correct, specific, boring
heading beats an elegant one every time; this is a reference document a
reviewer navigates under time pressure, not an article they read for pleasure.
Name the concrete subject and the condition in plain language, and never use
wordplay, suspense, alliteration, or a phrase whose meaning only resolves after
reading the section.

Two failure modes, and the second is the one that survives review because it
reads well:

- **Vague:** the heading names a topic but not a claim, so it cannot be
  distinguished from three neighbouring sections.
- **Literary:** the heading is memorable and says nothing checkable. A heading
  built on a metaphor ("as a durable transition"), an abstract noun phrase
  ("Claim, then settle"), or a value judgement ("Visibility replaces a
  boolean") names the author's framing rather than the mechanism.

| Avoid | Use |
| --- | --- |
| `The 404 that means two things` | `Ambiguous 404 when getting a file from Drive` |
| `A view's scope is the whole view` | `Picker views cannot combine Drive scopes` |
| `Dashboard publication as a durable transition` | `Publishing a dashboard writes storage objects and the row in two steps` |
| `Claim, then settle` | `A publish claims a revision, uploads objects, then commits visibility` |
| `Visibility replaces a boolean` | `is_public becomes a three-state visibility column` |

The test: read the heading alone and say what the section will assert. If the
answer is "something about publishing", rename it. A heading may be a full
clause and may run to a dozen words; length is not the constraint, and a
shorter heading that has stopped being specific is worse.

1. **Purpose.** The problem in the reader's terms and what "done" means. No
   file names, no module names. Two paragraphs at most, and it must **name
   every strand of work in the change**, because a strand the reader has not
   been told about will read as a non sequitur when its section arrives.
   Finish with a one-line map, strand to section number, so the reader can
   predict the section list before reading it.
2. **Shape of the solution.** The mental model: the moving parts and how data
   flows between them, as prose plus at least one mermaid diagram. When the
   change has more than one strand, say here how they relate, including "these
   two are independent" when that is the truth.
3. **One section per strand of work,** named after the concern rather than the
   kind of thing it contains. Use numbered subsections (`3.1`, `3.2`) for the
   pieces inside a strand, so the reviewer can cite one.

   When a section explains one specific defect and its resolution, add `The
   Problem` and `The Solution` one heading level below it:

   ```markdown
   ### 3.1 Ambiguous 404 when getting a file from Drive

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
     mermaid state diagram for anything with lifecycle states.
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
4. **Interface changes.** Any user-visible change, with evidence. See
   [Screenshots](#screenshots).
5. **Decisions.** One bullet per real decision: what was chosen, the
   alternative that was rejected, why, and what evidence would reverse it. A
   decision with no rejected alternative is not a decision, it is narration:
   cut it, or say plainly that the choice was arbitrary. Cite precedent per
   [Citations](#citations).
6. **Deliberately not handled.** Scope boundaries and known gaps, so the
   reviewer does not spend attention rediscovering them.
7. **Open questions.** Explicit asks for the reviewer, each answerable. A
   change with genuinely no open question probably did not need a walkthrough.
8. **Reading order.** Map each section to the `-guide.md` group numbers that
   implement it, so the reviewer can go from a section straight to its code.
9. **Sources.** The numbered reference list, present whenever the body cites
    anything.

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

### Factual prose

Every sentence contributes one of six things: a technical fact, evidence, a
consequence, a decision, a transition, or a scope boundary. Delete or rewrite
sentences that only make the document sound engaging.

Importance claims name their reason in the same sentence. Replace a bare label
such as `important`, `critical`, `central`, or `load-bearing` with the behavior,
dependency, or failure, or connect the label directly to that reason.

| Remove | Write instead |
| --- | --- |
| Reader coaching: `This one is worth dwelling on.` | State the finding: `The existing unit test hid the defect.` |
| Inflated significance: `This strand is the point of the branch.` | State the coverage gap: `No existing test covered these failures.` |
| Vague importance: `The separator row is load-bearing.` | State the behavior and failure: `The separator row distinguishes a table from a paragraph; without it, the parser renders the pipes as body text.` |
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

Five passes over the finished draft, before handing it over. Each catches a
class of defect that reading the document top to bottom does not.

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

2. **Audit the coverage,** per the checklist in section 3 of
   [Sections](#sections): walk it against every strand and confirm where each
   item landed, saying so when an item does not apply.

3. **Read only the headings and each section's first sentence.** If that alone
   does not tell the story of the change, the structure is wrong, and no detail
   inside the sections will fix it.

4. **Cover the caption and read each diagram cold,** per
   [A diagram must stand alone](#a-diagram-must-stand-alone). Every node and
   edge label must resolve without the surrounding prose. Any label that is a
   single word, an acronym, or a bare identifier requires a glossary directly
   under the fence; a missing glossary is a defect, not a stylistic
   preference. Then check the shape per
   [Size a diagram by its shape](#size-a-diagram-by-its-shape-not-by-shrinking-its-type):
   a diagram wider than it is tall wastes the page and prints small type.

5. **Audit the writing contract.** Read the headings without the body and
   confirm each names a checkable claim rather than a topic or a metaphor.
   Check every solved-problem section for `The Problem` and `The Solution`,
   every repository code excerpt for its project-relative file label AND its
   enclosing signature, and every paragraph and caption against
   [Factual prose](#factual-prose). Read the draft once looking only for the
   tells in that table; they cluster at the start of sections and in the
   sentence before a diagram.

### Rules

- Target 1,200 to 3,000 words of prose. Hard cap 4,000, excluding diagrams,
  code excerpts, and sources. Length tracks the number of ideas in the change,
  never its file count.
- Quote code as evidence for a claim, never as a tour: see
  [Code alongside the prose](#code-alongside-the-prose).
- Every rationale must stand on its own without the old code in view. "We used
  to do X" fails; "do not do X, because Y" passes.
- Name the uncertain calls. Where the author was unsure, or the decision was
  close, say so: that is where reviewer attention pays best.
- Never restate the diff, never narrate file by file, and never explain a
  function whose name already does.
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
   [`references/review-comment-style.md`](references/review-comment-style.md),
   plus `~/.diff-review/review-comment-style.md` when it exists, before writing
   any finding. This mode is the reviewer voice, never the reply voice.
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

### Walkthrough

Selected only by an explicit request. Read-only with respect to source.

1. Resolve the artifacts for the selected comparison. Require `-guide.md` and
   `-guide.json`; when either is absent, run Initial first, because the
   walkthrough cites group numbers.
2. Start from what `.difit/` already holds, then go past it. The guide's
   grouping and file tags, the transcript's threads, `-summary.md`,
   `-test-plan.md`, and any `<branch>_explanations.md` are a prepared map of
   this diff: read them first to orient, and to avoid re-deriving conclusions
   an earlier round already reached. None of it is required content and none of
   it is authoritative. Verify anything you carry forward against the code, and
   treat a disagreement between an artifact and the code as a finding worth
   stating.
3. Read the full diff, then read the surrounding code the diff calls into and
   is called from. The walkthrough describes the system as it now stands, so
   unchanged collaborators are in scope for understanding even though they are
   out of scope for review.
4. Capture screenshots for user-visible changes, per
   [Screenshots](#screenshots).
5. Where a decision's rationale is not recoverable from the code, say so
   rather than inventing one, and add it to Open questions.
6. Write `-walkthrough.md`. Do not touch the transcript, the guides, the
   reviewed state, or any source file.
7. Report the section count and the prose word count, then end the response
   with a table naming the walkthrough. One row is expected; the table is
   there so the path stands out at the end of a long reply.

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
