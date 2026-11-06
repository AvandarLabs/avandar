# Writing the prose

Contents:

- [Flow and orientation](#flow-and-orientation)
- [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code)
- [How much to explain](#how-much-to-explain)
- [Factual prose](#factual-prose)

## Flow and orientation

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
  sentence.** That pass is part of [Closing checks](pass-style-check.md#closing-checks).

## Writing for a reader new to this code

The reader, and the rules for grounding the vocabulary they meet, are in
[Writing for a reader new to this code](../contracts/prose.md#writing-for-a-reader-new-to-this-code)
in `contracts/prose.md`. They apply to the whole walkthrough. A walkthrough
defines the vernacular it keeps in its [Glossary](glossary.md).

**The cold-read test.** Read each heading, the first sentence of each section,
and every other piece of text read on its own (bold lead-ins, table row
labels, captions) as that new reader. For every noun, say what concrete thing it names;
for every verb, say who does it to what. An answer that needs knowledge of this
code means the sentence needs grounding. One exception: each step heading
inside a pipeline section, though not the section's own heading, is named for
the code that runs it, per
[Explaining a multi-step algorithm or pipeline](code-and-citations.md#explaining-a-multi-step-algorithm-or-pipeline),
so the grounding moves to that step's first sentence, which the test still
applies to. The [clarity pass](pass-clarity.md) applies
this test to the whole draft.

## How much to explain

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
  [Sections](structure.md#sections); past those, the author is enjoying the topic.

A figure's caption box is part of the figure, not prose. Never shorten a
section by trimming a row of a diagram key or the caption: the row exists
because a label needs resolving, and cutting it breaks the figure rather than
tightening the section. Appendix B's entries are held to their own one-or-two-sentence
limit, per [Glossary](glossary.md).

## Factual prose

Every sentence follows
[Factual prose](../contracts/prose.md#factual-prose) in `contracts/prose.md`:
what a sentence may contribute, how an importance claim names its reason, and
the tells to remove.

Captions follow the same rule. State what the diagram or screenshot proves;
do not turn the caption into a slogan or punchline.
