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

Write for a software engineer who knows the product and has never worked in
this part of the codebase. They know what the product's screens do, and they
know general engineering vocabulary: tables, indexes, caches, inheritance, a SQL
alias. They do not know the vocabulary this area of the code has grown, and
they were not in the conversations it grew in.

That vocabulary comes in two kinds, and the second is the trap:

- **Nomenclature** is documented: a label in the product's UI, a term the
  project's docs define, a model the codebase names on purpose. A reader can
  look it up.
- **Vernacular** is informal: words that emerged while the code was being
  built, living in comments, variable names, and discussion, and defined
  nowhere. `binding`, `identity`, `owner`, `descriptor`, and `evidence` in the
  examples below are all vernacular. A reader cannot look it up, and an author
  who has used a word for a week no longer hears it as jargon.

Vernacular is not banned. The reader will meet it in the diff, and the document
should prepare them for it. It must be grounded: either replaced with a plain
description, or introduced in product terms and defined in the
[Glossary](glossary.md).

- **Ground each mechanism in what a user does or sees.** Name the user action
  that triggers it, or the screen that shows its effect, then use the technical
  vocabulary freely. "Column ID" means something to a reader once they know it
  is what keeps a chart series' label when the user renames the column on the
  Query tab.
- **Name both sides of every relationship word.** `binding`, `mapping`, `link`,
  `match`, `reference`, and `target` each join two things, so say which two:
  not "an Explorer binding" but "the link between a chart setting in the Data
  Explorer and one column of the query's results".
- **Name the owner of every abstract noun.** `identity`, `state`, `metadata`,
  `schema`, `evidence`, `scope`, and `provenance` say nothing until the reader
  knows whose. The owner goes in the same sentence or the one before;
  otherwise restate it. When one word covers several things across the
  document, as `identity` can cover a source column's ID, a selected column's
  ID, and a result column's ID, name the specific thing every time.
- **Qualify a generic word that names more than one thing in the codebase.**
  `descriptor`, `config`, `settings`, `registry`, `context`, and `schema`
  usually name several unrelated types. A reader resolves the bare word to
  whichever one they already know, which is often the wrong one. The same
  goes for a word with a common general-engineering meaning, such as
  `session`, `snapshot`, `index`, or `version`: the reader takes that meaning
  unless the sentence says this code means something else.
- **Give every process word its actor and its object.** `bind`, `resolve`,
  `reconcile`, `normalize`, `hydrate`, `prepare`, `upgrade`, `sync`, and their
  noun forms each name something done by something to something. Say what
  does it, what it acts on, and where the result goes. Two shapes always drop
  them: a process noun as a sentence's subject ("the reconciliation step
  follows"), and a string of bare process verbs ("charts sync, resolve, and
  write"). Rewrite either with the actor as the subject and the object named.
- **Text read on its own is grounded like a heading.** A heading, a section's
  opening sentence, the bold lead-in of a list item or a decision, a table's
  row label, and a caption are each read without the paragraph around them,
  and usually without the glossary, by a reviewer skimming the document. None
  of them may lean on a glossary term in place of a plain description, and
  none may compress a mechanism into a slogan.
- **Clarity outranks brevity.** Write as briefly as clarity allows, and no more
  briefly. A heading or sentence that grew by the qualifier a reader needed has
  improved; one that lost it to save words has not. Shortening is worth doing
  only until the reader starts to lose the meaning.

| Avoid | What a new reader cannot tell | Use |
| --- | --- | --- |
| `4. Executed results need evidence before they can inherit identity` | What ran, what the evidence proves, and whose identity is inherited by what. | `4. When a user edits and re-runs a query, each result column keeps its earlier column ID only when the app can prove it is the same column` |
| `When no descriptor exists, a unique output receives an ID.` | Which descriptor. The codebase also has visualization setting descriptors, so the reader picks the wrong one. | `When the app cannot describe the query's SELECT list as projection descriptors, for example because the query has a join, each uniquely named result column receives an ID.` |
| `4.3 Old rows cannot establish a new Explorer binding` | What is bound to what. "Explorer binding" reads like a documented term, and is not one. | `4.3 After a user edits the SQL in the Data Explorer, results from the old SQL cannot supply column IDs to the chart settings` |
| `Source-field identity and result identity meet at compilation and reconciliation.` | Two identities of unnamed things, joined by two process nouns the reader has not met. | `WHERE filters save IDs of the data source's columns, while chart settings and HAVING filters save IDs of the columns the query selects. The two kinds of ID meet only when the query is compiled to SQL and when its results are matched back to IDs.` |
| `**Dashboard filters bind per chart.**` (a decision's bold lead-in) | Bind what to what, and who does it. The lead-in is read alone when a reviewer skims the decisions. | `**Each dashboard chart matches every dashboard filter that applies to it to one of that chart's own result columns.**` |
| `**Ambiguity produces no ID.**` (a decision's bold lead-in) | Ambiguity of what, and what goes without an ID. | `**When a saved column name or a result column could match more than one column, the app assigns no column ID rather than guess.**` |

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

Every sentence contributes one of six things: a technical fact, evidence, a
consequence, a decision, a transition, or a scope boundary. Delete or rewrite
sentences that only make the document sound engaging.

Importance claims name their reason in the same sentence, wherever in it the
label sits. Replace a bare label such as `important`, `critical`, `central`, or
`load-bearing` with the behavior, dependency, or failure, or connect the label
directly to that reason. A label attached to a clause that merely enumerates
its parts is still bare: `two parts, and both are load-bearing: (1)... (2)...`
numbers the parts without saying what breaks if either is missing, so the
label has not earned its place. Each item needs its own stated consequence,
not just its own number.

| Remove | Write instead |
| --- | --- |
| Reader coaching: `This one is worth dwelling on.` | State the finding: `The existing unit test hid the defect.` |
| Inflated significance: `This strand is the point of the branch.` | State the coverage gap: `No existing test covered these failures.` |
| Vague importance: `The separator row is load-bearing.` | State the behavior and failure: `The separator row distinguishes a table from a paragraph; without it, the parser renders the pipes as body text.` |
| Tag-on importance before a list: `The argument has two parts, and both are load-bearing: (1) service_role is unreachable from a browser; (2) the one caller scopes the id by workspace.` | State what fails without each part: `(1) ...; (2) .... Without (1), any authenticated session could call this directly; without (2), nothing scopes the id to the caller's workspace.` |
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
