# Transcript contract

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

Contents:

- [Writing the transcript while a session is live](#writing-the-transcript-while-a-session-is-live)
- [Comment style](#comment-style)

## Writing the transcript while a session is live

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

## Comment style

Never use em dashes. Keep every comment direct and concise.

Two different voices live in this skill, and they must not be mixed:

| You are | You write | Follow |
| --- | --- | --- |
| The **reviewer**, leaving findings on someone's diff | PR findings, review summaries | [`references/review-comment-style.md`](../references/review-comment-style.md) |
| The **author**, explaining your own diff | Explainer threads | [Explainer threads](#explainer-threads), and the Non-negotiables in [`references/review-comment-style.md`](../references/review-comment-style.md#non-negotiables) |
| The **engineer**, answering a reviewer's comment | Continue-mode replies | [`references/reply-style.md`](../references/reply-style.md) |

Read the matching file before writing, and read the personal override next to
it when it exists (`~/.diff-review/review-comment-style.md`,
`~/.diff-review/reply-style.md`); the override wins on any conflict. Every
voice also follows [`contracts/prose.md`](prose.md).

### Explainer threads

**Explainer threads cover the code; the walkthrough covers the design.** The
walkthrough explains a change's architecture, its UI and data design, and its
algorithms, and deliberately does not go unit by unit. Explaining each unit is
the explainer threads' job, so every core unit of the agent's own diff gets
one:

1. List the units with
   `python3 <skill-dir>/scripts/list-changed-units.py <comparison-key>`. A
   unit is one top-level declaration in one file, with the comment above it.
2. Sort each into core or exempt:
   - **Core:** it carries architecture, data flow, a data model or a stored
     shape, UI behavior, a business rule or invariant, or an algorithm, and a
     reader seeing it cold would need something its name, signature, and body
     do not make evident on one read: why it exists, what it guarantees, or
     how it fits.
   - **Exempt:** formatting, a rename with no change in behavior, and a
     declaration whose name and signature say all a reader needs, such as a
     type that restates its fields or aliases another type, a constant whose
     name and value say what it is for, or a small helper. So is everything the script leaves out: tests, generated
     files, and lockfiles. No thread is owed on a test, though one may explain
     a test whose purpose its test names do not state. A move with no change
     gets one thread at its destination saying where it came from.
3. Write one thread per core unit, anchored on its declaration line when that
   line is part of the diff, and otherwise on the unit's first changed line,
   since difit shows threads only on lines in the diff. When one
   explanation serves several units that sit next to each other in one file,
   write one thread anchored on a range from the first unit's declaration line
   to the last one's, so it shows beside the code it explains. Units far
   apart get a thread each.
4. Run the script again with `--transcript <transcript-path>`. It lists the
   units no thread is anchored in; confirm each one it still lists is exempt.
   A core unit there is a thread still owed.

Never comment outside the requested diff scope.

**What a thread says** is the context the diff does not state: why the unit
exists, what it guarantees or assumes, how data moves through it, which domain
rule applies, or why a fallback or integration works that way. Lead with what
the unit does or guarantees. An explainer is the author speaking about their
own code, so it never asks the reviewer a question: when a reason is not
recoverable from the code, leave it out rather than guess. Never narrate the
attached lines.

**How long a thread runs** is as long as a reader new to this code needs to
understand the unit, and no longer. Usually that is two to four sentences. An
invariant or an algorithm may need a worked example, and gets one. An essay
never helps: cut any sentence whose absence would leave the reader concluding
the same thing, per the deletion test in
[How much to explain](../walkthrough/writing.md#how-much-to-explain). Every
thread follows [`contracts/prose.md`](prose.md): leave out every tell in
[Factual prose](prose.md#factual-prose), and ground each term the reader would
not know. A term the walkthrough's glossary defines may be used without
redefining it, because the reviewer has the walkthrough beside the diff; do
not repeat the same gloss thread after thread.

**Explainers point into the walkthrough; the walkthrough never points back.**
When a walkthrough section already explains the context of a unit, the thread
cites that section by number and heading instead of repeating it, and adds
only what is specific to the attached lines:

```markdown
Keeps the earlier column ID only for an unchanged expression. Why, with a
worked example: §6.2, "When a user edits and re-runs a query, each result
column keeps its earlier column ID only when the app can prove it is the same
column".
```

Cite a section when it holds what a thread cannot: a worked example, a figure,
or a decision's reasoning. When stating the fact takes fewer words than citing
the section, state it. Most units are not in the walkthrough, by design, and
their threads stand alone; a citation to a section that does not explain the
unit is noise. A heading with no number of its own, such as a pipeline step,
takes its section's number (`§6, "Step 3. _getPriorMatch"`), and a heading
longer than about ten words may be cited by its number and opening words.

When writing a thread shows a walkthrough claim to be wrong or imprecise, and
this round wrote the walkthrough, correct the walkthrough, run its marking
script again, and cite the corrected section. When the walkthrough predates
this round, describe the code as it is, leave the walkthrough alone, and name
the discrepancy and `/diff-review walkthrough` in the chat report.

### As the reviewer

PR findings never cite the walkthrough, because they are pasted into GitHub,
where it does not exist.

For PR findings, write text a human can paste into GitHub unchanged, in the
voice `references/review-comment-style.md` describes:

- Nit: state the correction only.
- Documented rule violation: state the fix and cite the rule.
- Undocumented convention: identify it without presenting it as a rule.
- Bug: explain the failure condition and concrete fix.
- Architecture or data-model concern: use concise bullets.

### As the engineer

The default reply to a change request is exactly `Done.` Add a line beyond it
only for what the reviewer cannot get from their own request plus the diff:
a decision their request left open, a deviation or refusal, a verification
result, a consequence they did not ask about, or the answer to a question. A
question always gets a reply.

Never restate the reviewer's own ask, rationale already written into the code
or rule, where in the file the change landed, or code visible in the diff.
Past one point, use bullets, one line each.
`references/reply-style.md` carries the full rule with worked examples.
