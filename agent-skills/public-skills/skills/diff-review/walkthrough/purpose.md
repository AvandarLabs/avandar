# Purpose

The section every reader reads first, and often the only one a skimming
reviewer reads. It answers two questions fast: why does this change exist, and
what does it change. Two parts, in this order:

1. **The problem, as one paragraph.** What a user did, what went wrong or was
   missing, and why that matters, in the product's terms. Name one concrete
   case the reader will recognise, such as the edit that broke a chart. This is
   the part that earns the reader's attention, so it may take a full paragraph.
2. **What the change does, as a bulleted list** under the line `This change:`.
   One bullet per strand of work, in section order, each ending with its
   section number in parentheses. Every strand gets a bullet, unrelated changes
   that shipped on the same branch included (one bullet may list those
   together), because a strand the reader has not been told about reads as a
   non sequitur when its section arrives. The section numbers are the map;
   there is no separate strand map.

Each bullet is a line of a diff summary, not an explanation:

- **Lead with a verb whose subject is the change:** "Stores", "Gives",
  "Keeps", "Moves", "Waits".
- **Say what changes, not how.** State the outcome a user or reviewer would
  notice, or the one structural fact that defines the strand. Mechanism,
  conditions, and edge cases belong to the strand's own section.
- **One sentence of about 25 words at most.** A bullet that needs a semicolon,
  a second clause of conditions, or a parenthetical has started explaining;
  move the detail to the section. The one exception is a shared bullet for
  unrelated changes, which may run longer because it only lists them, a few
  words each.
- **Plain words.** The bullets are read before any other section, so they use
  product vocabulary and general engineering terms. A glossary marker helps a
  reader who wants more, and never stands in for a plain description.

| Avoid | Use |
| --- | --- |
| A paragraph that chains every strand's mechanism into one sentence: `Done means: dashboards carry a visibility level that survives a copy; publishing writes objects first and commits visibility after, retrying only while the claimed revision is current; the share dialog...` | One bullet per strand, each stating one outcome, as in the example below. |
| `- Publishing claims a revision, uploads, then settles visibility only if the claim still holds (§5)`: the mechanism, compressed into the code's vocabulary. | `- Publishes in two steps, so a failed upload leaves the previous published copy online (§5)` |

```markdown
## 1. Purpose

A dashboard was either private or visible to anyone with its link, and
publishing one uploaded its charts and made it public in a single request. When
the upload failed partway, people who followed the shared link saw a dashboard
with blank charts, and the editor could not retry without unpublishing it
first. Teams also had no way to share a dashboard with their own workspace
without making it public.

This change:

- Replaces the public on/off switch with three visibility levels: private,
  workspace, and public (§4).
- Publishes in two steps, so a failed upload leaves the previous published
  copy online (§5).
- Adds a **Retry publish** button to the share dialog after a failed
  publish (§6).
- Also ships, unrelated: a lint rule against unused imports (§7).
```

## In the short form

A [short-form walkthrough](structure.md#the-short-form) has no strand sections,
so the bullets under `This change:` are the diff summary: one bullet per idea
a reviewer will meet in the diff (not per file or unit), unrelated changes
included, held to the same rules as above but without section numbers. The problem paragraph is unchanged,
and as short as the problem.
