# Reply style

How to write a reply **as the engineer** answering a reviewer's comment on
your own diff. This is the Continue-mode voice.

This is not the file for reviewing someone else's code. When you are the
reviewer leaving findings on a diff, follow
[`review-comment-style.md`](review-comment-style.md) instead. The two voices
are different: a reviewer opens a topic, an engineer closes one.

A personal override may exist at `~/.diff-review/reply-style.md`. When it
does, read it and let it win on any conflict with this file.

## The default reply is `Done.`

A reviewer who asked for a change and got it needs one word. They will read
the diff for the rest.

Add a line beyond `Done.` only for something the reviewer **cannot** get
from their own request plus the diff in front of them:

1. **A decision you had to make** that their request left open, and which
   way you went.
2. **A deviation**: something you did differently from what they asked, or
   declined to do, with the reason.
3. **A verification result** they would otherwise have to run themselves.
4. **A consequence they did not ask about** but will hit, such as a file
   dropping out of the diff or a follow-up left undone.
5. **An answer**, when the comment was a question. A question always gets a
   reply.

If none of those apply, the reply is `Done.` and nothing else.

## Never write

- **The reviewer's own ask, read back to them.** They wrote it. Repeating
  the list of things they asked you to exclude, or restating the rule they
  asked you to add, proves nothing.
- **Rationale you already wrote into the code, the rule, or the comment.**
  If the "why" is in the file, the reviewer will read it in the file. Do not
  duplicate it in the reply.
- **Narration of where the change landed.** "Two exceptions in the prose and
  a second filter in the command", "I updated the imports and the export
  block". The diff shows this.
- **Code or values visible in the attached diff.** No restating a renamed
  symbol, a changed line, or a moved file that the reviewer is looking at.
- **Commit hashes, file counts, or line counts offered as evidence of
  effort.** A line count is content only when the reviewer's comment was
  about size.
- **A preamble.** No "Great catch", no "You're right", no summary sentence
  before the actual point.

## Use bullets past one point

One point is one sentence, or `Done.` alone. Two or more points are bullets,
one line each, no sub-bullets. Bullets keep a reviewer from parsing a
paragraph to find the two facts inside it.

Bad:

> Done. Two exceptions in the prose and a second filter in the command.
> Migrations are called out as never a finding at any length, because a
> migration is one unit by construction and splitting it changes what runs.
> Separately, anything that is not reviewed source is excluded:
> `node_modules/`, `dist/`, `build/`, `out/`, `coverage/`, `.next/`, Cargo's
> `target/` and `vendor/`, and Python's `__pycache__/`, `.venv/`, `venv/`,
> and `site-packages/`. The command now drops those paths before measuring,
> and the prose tells the reviewer to add the repo's own equivalents.
> Running it on this diff returns only `shared/types/database.types.ts`,
> which "Files To Skip" already covers as generated.

Good:

> Done.
>
> - Also excluded `.next/`, `out/`, `coverage/`, `.venv/`, `venv/`, and
>   `site-packages/` beyond the ones you named, and the prose tells the
>   reviewer to add the repo's own equivalents.
> - On this diff the command now returns only
>   `shared/types/database.types.ts`, which "Files To Skip" already drops.

The cut removed the reviewer's own list, the rationale already written into
the rule, and the narration of where the edit landed.

## Length

- **A change you made as asked:** `Done.`
- **A change plus one thing they cannot see:** `Done.` and one line.
- **A question:** answer it directly, in as few sentences as the question
  needs. Do not add status on unrelated work.
- **A declined change or a real disagreement:** as long as the reasoning
  needs, which is rarely more than a short paragraph. State the position
  first, then the reason.

A reply longer than the comment it answers is nearly always too long. Reread
it and delete every sentence the reviewer could have written themselves.

## Never use em dashes

Use a comma, colon, semicolon, or parentheses.
