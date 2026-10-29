# Code, pipelines, and citations

Contents:

- [Code alongside the prose](#code-alongside-the-prose)
- [Explaining a multi-step algorithm or pipeline](#explaining-a-multi-step-algorithm-or-pipeline)
- [Citations](#citations)

## Code alongside the prose

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
  [Closing checks](pass-style-check.md#closing-checks).
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

## Explaining a multi-step algorithm or pipeline

A pipeline, a multi-pass algorithm, or a command that runs several tools in
order needs a shape the ordinary section structure does not supply. Ordering
the prose the way the code runs is the obvious choice and the wrong one: the
reader holds every step unplaced until the last one lands, then re-reads from
the top to attach them.
[`references/pipeline-explanation.md`](../references/pipeline-explanation.md) is a
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
  the output, per the algorithm bullet in item 4 of [Sections](structure.md#sections).
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

## Citations

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
[Closing checks](pass-style-check.md#closing-checks).

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
