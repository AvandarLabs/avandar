# The style check runs in a subagent

The last review pass, per [Review passes](../modes/walkthrough.md#review-passes), dispatched once the
content review's changes have been accepted or rejected. Nothing runs after it.
It reads the document against the walkthrough contract and fixes what it
finds, so the pass is done by a reader who did not choose the words. The
parent dispatches it with the walkthrough's path, the branch and comparison,
and this file's path.

**Read first,** each file whole, before changing anything: this file, which ends with
the [Closing checks](#closing-checks), then every contract file it checks
against: [`structure.md`](structure.md), [`purpose.md`](purpose.md),
[`background-context.md`](background-context.md),
[`manual-testing.md`](manual-testing.md), [`glossary.md`](glossary.md),
[`figures.md`](figures.md), [`code-and-citations.md`](code-and-citations.md),
[`writing.md`](writing.md), and [`contracts/prose.md`](../contracts/prose.md).

**Authority:** edit the walkthrough file and nothing else.

It runs the marking script after its last edit and before its last render, per
closing check 10, and returns the list of changes it made and anything it
judged out of scope.

**Its remit is style, never substance.** It may rewrite a heading, cut a tell,
retitle a caption, add a missing diagram key, reflow a diagram, and correct a
highlight spec. It may not change a technical claim, add or remove a decision
or an open question, or alter the meaning of any sentence. Nor may it shorten a
heading or sentence by dropping a qualifier or a phrase that grounds a term for
a new reader: clarity outranks brevity, per
[Writing for a reader new to this code](../contracts/prose.md#writing-for-a-reader-new-to-this-code).
When a passage reads badly because the underlying claim is unclear, it reports
that rather than guessing at a fix.

Contents:

- [The diagrams are checked visually, in a loop](#the-diagrams-are-checked-visually-in-a-loop)
- [Closing checks](#closing-checks)

## The diagrams are checked visually, in a loop

Every rule in [Diagrams](figures.md#diagrams) is about what a reader sees, and none of
them can be verified by reading mermaid source. Overlapping labels, a node whose
text breaks mid-identifier, an edge label sitting on top of an edge: all of them
are invisible in the fence and obvious on the page. So the subagent renders and
looks.

The loop:

1. Render the walkthrough to PDF with `markdown-to-pdf <file.md> --out <pdf>`,
   giving each round its own output name, because the tool writes a `-v2`
   copy rather than overwrite an existing PDF.
2. Find the pages that carry diagrams, for example by searching each
   caption's text with `pdftotext -f N -l N <pdf> -`, rasterize them with
   `pdftoppm -r 80 -png -f N -l N <pdf> <prefix>`, and **look at each
   image**.
3. Judge each diagram against three things, all of them visual:
   - **No overlap.** No label over another label, over a node, or over an edge.
   - **No awkward break.** A label must not break mid-word, mid-identifier, or
     leave a single word stranded on its own line.
   - **Legible type.** Diagram labels a little under body text, never so small
     that the reader would lean in.
4. Fix what failed and go back to step 1. Keep looping until every diagram
   passes or a diagram has gone three rounds without improving, then report
   how many rounds it took and which diagrams still fail.

**Only two levers are permitted, and the diagram's text content is not one of
them.** The wording of every node and edge label is the author's and must
survive the check word for word; only where a line breaks inside it may move.
What may change:

- **Type size**, via a `%%{init: {'themeVariables': {'fontSize': '20px'}}}%%`
  line, up or down from mermaid's default of 16px. A diagram scaled to fit the
  page height prints at the same size whatever this says, so for a tall
  diagram the layout lever is the one that works.
- **Layout**: `TD` versus `LR`, where a line breaks inside a label (`<br/>`),
  the label wrapping width (`wrappingWidth`), node ordering, splitting one
  diagram into two, or spacing through `nodeSpacing` and `rankSpacing`.

If a diagram cannot be made legible by those two levers alone, the subagent
says so and leaves it, rather than rewriting a label to make the problem go
away.

## Closing checks

Ten passes over the finished draft, before handing it over. Each catches a
class of defect that reading the document top to bottom does not.

This subagent runs them, and only after the content review has settled, per
[Review passes](../modes/walkthrough.md#review-passes). The author of a
document is the worst reader of it: having just chosen every
sentence, they read the intent rather than the text, and the tells in
[Factual prose](../contracts/prose.md#factual-prose) are exactly what an author cannot see in their
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
   - The section number on each Purpose bullet against the sections
     delivered, and one bullet per strand.
   - A section cross-reference (`§4.2`) against where that content now lives.
   - The Glossary against the body: an entry for a term the body no longer
     uses, which the marking script reports, or a term the body leans on with
     no entry.
   - The Background tree against the table under it: every unit in the tree
     has a row, and every row's subject is in the tree. A function named
     inside a row is not a unit and needs no node.

2. **Audit the coverage,** per the checklist in item 4 of
   [Sections](structure.md#sections): walk it against every strand and confirm where each
   item landed, saying so when an item does not apply.

3. **Read only the headings and each section's first sentence.** If that alone
   does not tell the story of the change, the structure is wrong, and no detail
   inside the sections will fix it. For a section covering a pipeline or a
   multi-step algorithm, confirm it opens on the structural fact rather than on
   step one, and that each guarantee it claims has its own heading, per
   [Explaining a multi-step algorithm or pipeline](code-and-citations.md#explaining-a-multi-step-algorithm-or-pipeline).

4. **Cover the caption box and read each diagram cold,** per
   [A diagram must stand alone](figures.md#a-diagram-must-stand-alone). Every node and
   edge label must resolve without the surrounding prose. Any label that is a
   single word, an acronym, or a bare identifier requires a row in the diagram
   key; a missing key is a defect, not a stylistic preference. Then confirm the
   box itself per [The caption box](figures.md#the-caption-box): directly under
   the fence, caption sentence first, then the key table. Then check the shape per
   [Size a diagram by its shape](figures.md#size-a-diagram-by-its-shape-not-by-shrinking-its-type):
   a diagram wider than it is tall wastes the page and prints small type. Then
   check the budget per
   [A figure never spans two pages](figures.md#a-figure-never-spans-two-pages): a long
   key shrinks the drawing it exists to explain.

5. **Audit the writing contract.** Read the headings and every bold lead-in
   without the body, and confirm each names a checkable claim that a new
   reader can parse without the glossary, rather than a topic, a metaphor, or
   a glossary term standing in for a description. Rewording one for that
   reason is style; the claim it states must not change.
   Check every solved-problem section for `The Problem` and `The Solution`,
   every repository code excerpt for its project-relative file label AND its
   enclosing signature, and every paragraph and caption against
   [Factual prose](../contracts/prose.md#factual-prose). Then read the draft once more, sentence by
   sentence, looking only for the tells in that table. They cluster at the
   start of sections and in the sentence before a diagram, but a tell buried
   mid-paragraph is just as much a defect; the clustering is where to expect
   more of them, not where to stop looking. A label attached to an
   enumeration's lead-in clause is easy to skip on a skim read precisely
   because it sits mid-sentence rather than as the sentence's main claim.

6. **List every UI element the document names,** and confirm each
   non-obvious one has its zoomed-in or annotated capture, per
   [Name a UI element, show the UI element](figures.md#name-a-ui-element-show-the-ui-element),
   and that no capture of a named element is a bare full-window screenshot,
   per [Crop and letter the capture](figures.md#crop-and-letter-the-capture).
   A sentence saying a capture was not taken counts as a miss unless it names
   a block, per [Screenshots](figures.md#screenshots). Report every miss
   rather than fixing it: this pass cannot drive the app, so the author takes
   the capture and runs this pass again.

7. **Run the deletion test on every section,** per
   [How much to explain](writing.md#how-much-to-explain): name what a reviewer would get
   wrong if the section were not there. A section that cannot produce that
   answer is narration and comes out, whatever its subject. Run it on the
   longest sections first, where the answer is least likely to cover the whole
   length.

8. **Check the opening sections and the appendices against their contracts.**
   Purpose and Background technical context come first, in that order, and
   after Sources, or after Open questions when nothing is cited, come
   Appendix A. Manual testing and Appendix B. Glossary, in
   that order, each heading directly after its page-break line, per
   [Sections](structure.md#sections). Purpose is one
   problem paragraph and one bullet per strand, and every bullet passes
   [Purpose](purpose.md): it leads with a verb, says what changes rather than
   how, and fits one sentence of about 25 words. Read the bullets alone and
   confirm a reviewer could say what the change does without reading further.
   No glossary definition uses a term that would itself need defining, per
   [Glossary](glossary.md). No Background row runs past two sentences, per
   [Background technical context](background-context.md). Both tables
   and the whole of Manual testing sit inside a `<small>` wrapper. Every Manual testing step is runnable as
   written, setup comes first, and each fixed defect has its before-and-after,
   per [Manual testing](manual-testing.md).

9. **Confirm the document stands alone,** per
   [The walkthrough stands alone](structure.md#the-walkthrough-stands-alone). Search it for
   `.difit`, `guide`, `group`, `transcript`, `test plan`, `thread`, and
   absolute paths, and remove every pointer to something a reader of the pull
   request cannot open. There is no reading-order section.

10. **Confirm the glossary markers are current,** per
    [Marking glossary terms in the text](glossary.md#marking-glossary-terms-in-the-text).
    Run `mark-glossary-terms.py` after the last edit, then again with
    `--check`, which must pass. Act on every entry it reports as unused. Skim
    the markers on everyday words and confirm each marks the glossary's
    meaning; where one does not, qualify the entry's term or reword the
    sentence, then run the script again.

11. **Check the draft against the plan,** when the parent gave you its path,
    per [Planning the walkthrough](planning.md). Every lifecycle it lists has
    a `stateDiagram-v2`, every decision it lists appears in Decisions with its
    rejected alternative and the evidence that would reverse it, and every
    other answer it did not cut lands in a strand. Report each miss rather
    than fixing it: restoring a dropped answer adds a claim, which is outside
    this pass's remit.
