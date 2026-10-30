# Prose rules

Every piece of prose this skill writes follows these rules: the walkthrough,
explainer threads, PR findings, review summaries, Continue-mode replies, and
chat reports. They say what each sentence must do for a reader. The voice files,
[`review-comment-style.md`](../references/review-comment-style.md) and
[`reply-style.md`](../references/reply-style.md), say how long a comment runs
and in what voice, and the walkthrough files add what a document needs; none of
them relaxes a rule here.

Never use em dashes.

Contents:

- [Writing for a reader new to this code](#writing-for-a-reader-new-to-this-code)
- [Factual prose](#factual-prose)

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

Vernacular is not banned. The reader will meet it in the diff, and the text
should prepare them for it. It must be grounded: either replaced with a plain
description, or introduced in product terms and defined where the reader meets
it. In a walkthrough, that is the [Glossary](../walkthrough/glossary.md).

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
  text, as `identity` can cover a source column's ID, a selected column's
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
  or a comment's opening sentence, the bold lead-in of a list item or a
  decision, a table's row label, and a caption are each read without the
  paragraph around them, and usually without any glossary, by a reviewer
  skimming. None of them may lean on a defined term in place of a plain
  description, and none may compress a mechanism into a slogan.
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

## Factual prose

Every sentence contributes one of six things: a technical fact, evidence, a
consequence, a decision, a transition, or a scope boundary. Delete or rewrite
sentences that only make the text sound engaging.

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
