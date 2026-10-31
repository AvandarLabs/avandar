# Walkthrough contract

The walkthrough is the as-built design document for one change: the theory of
the change, written to be read before any code. It is indexed by idea, not by
file. It explains the change's architecture, its design (the UI, the data model,
and how data flows), and its algorithms. It does not explain every unit the
diff touches: that is the explainer threads' job, per
[Explainer threads](../contracts/transcript.md#explainer-threads), and a
walkthrough that goes file by file or unit by unit is longer and no more
useful. The guide answers "where do I go next", a thread answers "why is this
line like this", and the walkthrough answers "what is this change, and why is
it shaped this way".

The walkthrough is always a markdown file in `.difit/`, named from the same
stem as every other artifact (see [Artifact names](../SKILL.md#artifact-names)). It is
printed from that file. Never publish it to a hosting service, and never
substitute a hosted page for the file.

Contents:

- [The walkthrough stands alone](#the-walkthrough-stands-alone)
- [Sections](#sections)
- [The short form](#the-short-form)
- [Rules](#rules)

## The walkthrough stands alone

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

**The walkthrough does not know the explainer threads exist.** The PDF is
emailed, printed, and attached to the pull request, and none of its readers
has the threads, which live in the author's local review session. So it never
mentions them, never sends the reader to them, and never says what it leaves
to them. References run one way: a thread may cite a walkthrough section, and
no section cites a thread.

## Sections

A walkthrough is always written, in one of two forms, and the plan chooses
which, per [Choosing the form](planning.md#choosing-the-form). This section
describes the full form; [The short form](#the-short-form) describes the other.
In the full form, use these headings in this order, numbered, omitting any that
would be empty.
Purpose, Background technical context, and both appendices are never omitted. The list gives the order, not literal numbers: each
strand takes its own top-level number, and the sections after the strands
number on from the last one. Once the walkthrough is handed over, numbers are
stable for the life of the review so the reviewer can annotate a printout and
cite `§5.2` back to you; before that, the review passes may renumber.

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
  [Writing for a reader new to this code](../contracts/prose.md#writing-for-a-reader-new-to-this-code).

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

A strand's top-level heading states the one claim that unites its
subsections, and never chains the subsections' claims one by one: those claims
are the subsection headings. A heading that lists three or four findings joined
by commas and "and" cannot be read at a glance, so it fails as navigation
however accurate each clause is. When no single claim unites the subsections,
name the area and the change in plain words and let the subsection headings
carry the specifics.

1. **Purpose.** Why the change exists, as one paragraph, then what it
   changes, as one short bullet per strand of work. No file names, no module
   names. See [Purpose](purpose.md).
2. **Background technical context.** A directory tree of the code the reader
   needs to know about, then a table with one or two sentences per model or
   module. See [Background technical context](background-context.md).
3. **Shape of the solution.** The mental model: the moving parts and how data
   flows between them, as prose plus at least one mermaid diagram (in the full
   form; see [The short form](#the-short-form) for the other). When the
   change has more than one strand, say here how they relate, including "these
   two are independent" when that is the truth.
4. **One section per strand of work,** named after the concern rather than the
   kind of thing it contains. Use numbered subsections (`4.1`, `4.2`) for the
   pieces inside a strand, so the reviewer can cite one.

   When a section explains one specific defect and its resolution, add `The
   Problem` and `The Solution` one heading level below it:

   ```markdown
   ### 4.1 Ambiguous 404 when getting a file from Drive

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
     lives in (see [Code alongside the prose](code-and-citations.md#code-alongside-the-prose)), one
     concrete worked example giving actual inputs, the intermediate states and
     the output, the invariant the code maintains, and what breaks when that
     invariant is violated. Add a mermaid flowchart for branching logic and a
     mermaid state diagram for anything with lifecycle states. When the
     algorithm runs in several ordered steps or spans several tools, structure
     the section per
     [Explaining a multi-step algorithm or pipeline](code-and-citations.md#explaining-a-multi-step-algorithm-or-pipeline).
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
   [Closing checks](pass-style-check.md#closing-checks).
5. **Interface changes.** Any user-visible change, with evidence. See
   [Screenshots](figures.md#screenshots).
6. **Decisions.** One bullet per real decision: what was chosen, the
   alternative that was rejected, why, and what evidence would reverse it.
   Lead with the choice as one bold sentence that a reviewer skimming the list
   can parse on its own, per
   [Writing for a reader new to this code](../contracts/prose.md#writing-for-a-reader-new-to-this-code). A
   decision with no rejected alternative is not a decision, it is narration:
   cut it, or say plainly that the choice was arbitrary. Cite precedent per
   [Citations](code-and-citations.md#citations).
7. **Deliberately not handled.** Scope boundaries and known gaps, so the
   reviewer does not spend attention rediscovering them.
8. **Open questions.** Explicit asks for the reviewer, each answerable.
9. **Sources.** The numbered reference list, present whenever the body cites
   anything.

Then, after Sources, or after Open questions when nothing is cited, two
appendices. They are lettered rather than numbered, so
adding either never shifts a section number:

- **Appendix A. Manual testing.** Numbered steps the reviewer can follow to
  exercise the change themselves. See [Manual testing](manual-testing.md).
- **Appendix B. Glossary.** Every term the reader will meet that is not
  general software-engineering vocabulary, defined in plain words and
  numbered, with each use in the text pointing to it. See
  [Glossary](glossary.md).

Each appendix starts on a new page. Markdown has no page break, so put a line
holding only `<div style="page-break-before: always"></div>` directly before each
appendix heading, with a blank line on each side. It is the CSS page-break
idiom: `markdown-to-pdf` 0.14.0 and later and HTML-based converters break the
page there, and GitHub shows nothing. The appendices are the only place a page
break goes: never add one to move a figure or a section onto a fresh page.

There is no reading-order or navigation section. Mapping sections to code is
the explainer threads' job, per [Explainer threads](../contracts/transcript.md#explainer-threads), because
the walkthrough stands alone.

## The short form

A change whose plan has nothing that needs a section of its own still gets a
walkthrough: the short form, which has only the sections such a change needs,
numbered 1 to 3.

1. **Purpose:** the problem paragraph, then the diff summary, per
   [Purpose](purpose.md#in-the-short-form).
2. **Background technical context,** as in the full form, holding only the
   units Shape of the solution relies on that the diff does not show. The
   changed files are the diff, not background, so they get no row unless
   Shape depends on knowing what one of them is. One unit is a complete
   section when one is all the reader needs.
3. **Shape of the solution:** how the change works and why it is shaped that
   way, in as little as one paragraph, with a code excerpt only where the
   paragraph cannot carry the mechanism. After it, and only where they apply,
   each under a plain lead-in line:
   - `Interface change:` the user-visible change, with its capture, or with
     the wireframe that stands in for a blocked one;
   - `Decisions:` a bulleted list, each decision in at most two sentences in
     all: the choice, in bold, then the alternative it rejected and why;
   - `Not handled:` a bulleted list, each scope boundary in one sentence;
   - `Questions for the reviewer:` a numbered list, each question in one or
     two sentences.

   A decision whose reason the code does not record is a question, so it is
   written once, as a question. A decision whose rejected alternative nobody
   would choose is narration, and comes out. A figure belongs here only when
   it shows what the prose cannot. An item that cannot be said at its length
   is either a strand, which means the plan chose the wrong form, or detail
   for an explainer thread.

Then Appendix A. Manual testing and Appendix B. Glossary, as in the full form,
each on its own page.

There is no floor. No section is padded to look complete, and none grows to
match its full-form counterpart: the rules in
[`contracts/prose.md`](../contracts/prose.md) and the deletion test in
[How much to explain](writing.md#how-much-to-explain) set every passage's
length, in either form. A short-form walkthrough of a page or two is the
expected result for a small change.

## Rules

- Length is earned per passage and is never capped. It tracks the number of
  ideas in the change, never its file count and never a word count. See
  [How much to explain](writing.md#how-much-to-explain).
- Quote code as evidence for a claim, never as a tour: see
  [Code alongside the prose](code-and-citations.md#code-alongside-the-prose).
- Every rationale must stand on its own without the old code in view. "We used
  to do X" fails; "do not do X, because Y" passes.
- Name the uncertain calls. Where the author was unsure, or the decision was
  close, say so: that is where reviewer attention pays best.
- Never restate the diff, never narrate file by file, and never explain a
  function whose name already does.
- Ground the code's informal vocabulary in what a user does or sees, and never
  trade clarity for brevity. See
  [Writing for a reader new to this code](../contracts/prose.md#writing-for-a-reader-new-to-this-code).
- Never hand-wrap a code excerpt to fit the page. `markdown-to-pdf` 0.8.0 and
  later break a long line at the measured column budget and mark the
  continuation with `\u21b3`, so a manual break only adds a wrap the source does
  not have. Quote the line as it is written.
- No em dashes.
