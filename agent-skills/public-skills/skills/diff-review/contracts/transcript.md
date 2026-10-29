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
| The **reviewer**, leaving findings on a diff | PR findings, review summaries, explainer threads | [`references/review-comment-style.md`](../references/review-comment-style.md) |
| The **engineer**, answering a reviewer's comment | Continue-mode replies | [`references/reply-style.md`](../references/reply-style.md) |

Read the matching file before writing, and read the personal override next to
it when it exists (`~/.diff-review/review-comment-style.md`,
`~/.diff-review/reply-style.md`); the override wins on any conflict.

### As the reviewer

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
