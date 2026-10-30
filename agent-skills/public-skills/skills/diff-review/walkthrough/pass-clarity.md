# The clarity pass runs in a subagent

This pass reads the draft as the reader in
[Writing for a reader new to this code](writing.md#writing-for-a-reader-new-to-this-code):
a software engineer who knows the product and has never worked in this part of
the code. It edits nothing. It returns proposals to the parent, and it delivers
the [Glossary](glossary.md).

The parent dispatches it with the walkthrough's path, the branch and
comparison, and this file's path.

**Read first,** each file whole, before reading the walkthrough:
[`writing.md`](writing.md), which holds
[Writing for a reader new to this code](writing.md#writing-for-a-reader-new-to-this-code)
and [Flow and orientation](writing.md#flow-and-orientation);
[`purpose.md`](purpose.md); [`glossary.md`](glossary.md);
[`structure.md`](structure.md), which holds the heading rules in
[Sections](structure.md#sections); and
[`code-and-citations.md`](code-and-citations.md), which holds how a pipeline's
step headings are named in
[Explaining a multi-step algorithm or pipeline](code-and-citations.md#explaining-a-multi-step-algorithm-or-pipeline);
and [`figures.md`](figures.md), which holds which UI elements need a capture
in [Name a UI element, show the UI element](figures.md#name-a-ui-element-show-the-ui-element).

**Authority:** read-only access to the walkthrough, the diff, the code, and
the project's docs.

**Cold read first, research second.** Once the subagent has read the code, it
can no longer see what a newcomer cannot. So it reads the walkthrough alone, top
to bottom, and records every point where a newcomer would stall before it opens
anything else:

- **Nomenclature and vernacular:** a term it cannot resolve from the product or
  from general engineering vocabulary, a relationship word missing one side, an
  abstract noun whose owner is not in the same or the previous sentence, or a
  generic word that could name more than one thing.
- **Purpose:** after the Purpose section alone, it cannot say in a sentence or
  two why the change exists and what it changes, or a bullet explains a
  mechanism instead of stating what changes, per [Purpose](purpose.md).
- **Problems and solutions:** a problem it could not restate as what a user did
  and what went wrong, or a solution whose mechanism it could not name.
- **Algorithms:** a step it could not trace using the worked example given.
- **Architecture:** a component it could not place in the Shape diagram or the
  Background tree, or a data flow it could not follow end to end.
- **Interface:** a named UI element it cannot picture from the product alone
  that has no capture beside it, per
  [Name a UI element, show the UI element](figures.md#name-a-ui-element-show-the-ui-element).
- **Heading order:** a heading that depends on a term or mechanism introduced
  only later, or a heading list that does not tell the story of the change when
  read alone.

Only then does it read the diff, the code, and the docs, to turn each stall
into a concrete fix and to write glossary definitions that are true.

A glossary entry fixes a term that is merely undefined, so most term stalls
need no rewrite. A sentence still needs one when:

- it is text read on its own: a heading, a section's opening sentence, the
  bold lead-in of a list item or a decision, a table's row label, or a
  caption, because those are read without the glossary at hand,
- a process word in it is missing its actor or its object, which no
  definition supplies,
- one word stands for several different things across the document, so a
  definition cannot say which one this sentence means,
- it would still fail with every term defined, because a relationship word is
  missing a side, an abstract noun has no owner, or the sentence names a
  process without saying what it acts on.

It returns five things:

1. **Proposals,** one per stall that needs a rewrite: the location (section
   number and the quoted text), what the newcomer could not work out, and the
   replacement text. A replacement that adds a fact the draft did not state is
   tagged `[adds fact]` with the source it was checked against, so the parent
   and the content review can verify it. When rewording cannot fix a stall
   because the underlying claim is unclear, it returns a question for the
   parent instead of a guessed rewrite.
2. **Heading renames and order changes:** every heading that fails the
   cold-read test, with its replacement, and every move, each with the
   dependency that motivates it.
3. **Questions for the parent,** for the stalls only the author can resolve.
4. **UI elements it could not picture,** each with the section that names it,
   so the parent can take the capture.
5. **The glossary,** as table rows ready to paste, per [Glossary](glossary.md),
   without a header or separator row: each term spelled the way the text uses
   it, with other spellings the text uses in parentheses. It need not number
   them.

The parent accepts, corrects, or rejects each proposal, writes the glossary
into Appendix B, and runs the marking script, so the glossary rows need no
markers and no numbers.
