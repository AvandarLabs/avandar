# Planning the walkthrough

Before drafting, write down an answer to each question below, in a plan file
outside the repository. Writing the answers is the point. An answer held only
in mind gets dropped somewhere in a long draft, and a written one can be
checked against the draft afterwards.

The questions cover the four things a walkthrough explains: the change's
architecture, its UI design, its data model and data flow, and its
algorithms. They are not a list of the diff's units. Explaining every unit is
the explainer threads' job, per
[Explainer threads](../contracts/transcript.md#explainer-threads), so a plan that
walks the diff file by file has answered the wrong question.

## The questions

Answer from the code, read per step 3 of [Walkthrough](../modes/walkthrough.md),
not from the guide or the summary. Where a question has no answer for this
change, write `none`, so the omission is a decision rather than a lapse.

| Question | Write down | The draft uses it for |
| --- | --- | --- |
| **Problem.** What did a user do, what went wrong or was missing, and what will they notice now? | One short paragraph in product terms | [Purpose](purpose.md) |
| **Architecture.** Which modules or components does the change add, remove, or reconnect, and what depends on what afterwards? | Each component, and each dependency as "A calls B to do C" | The shape-of-the-solution figure and the strand order |
| **Data model and data flow.** Which stored or passed shapes change? How is data written before the change read or converted? What path does data take from a user action to storage and back? | Each changed shape with its old and new form, each conversion, and the path | The data sections and their `erDiagram` or `flowchart` |
| **Lifecycles.** Which value moves between states over time or across versions, such as draft and saved, an old and a new format, or pending and failed? What moves it? | One list of states and transitions per lifecycle | A `stateDiagram-v2` for each, per [Diagrams](figures.md#diagrams) |
| **Algorithms.** Which logic would a reader not follow on one read? Which input with real values reaches its boundary cases? | The steps, and the example input with its expected output | The algorithm sections, per [Explaining a multi-step algorithm or pipeline](code-and-citations.md#explaining-a-multi-step-algorithm-or-pipeline) |
| **UI design.** What does a user see change, and which UI elements will the prose need to name? | The changed screens and states, and the elements | The captures, per [Screenshots](figures.md#screenshots) |
| **Decisions.** What was chosen, what alternative was rejected, why, and what evidence would reverse the choice? | One line per decision with all four parts | The Decisions section, per [Sections](structure.md#sections); the short form writes the choice and the rejected alternative, in at most two sentences |
| **Prerequisites.** What existing code must a reader understand before the first strand makes sense? | The modules, each with what the reader needs from it | A check on the background context pass's cut |
| **Misreadings.** What would a competent reviewer most likely get wrong, or ask first? | A ranked list | The strand order, the emphasis inside each strand, and Open questions |

## Choosing the form

Then decide the walkthrough's form, and write the decision and the answer
that settled it into the plan:

- **The full form,** per [Sections](structure.md#sections), when at least one
  answer to Architecture, Data model and data flow, Lifecycles, Algorithms, or
  UI design needs a section of its own to be understood clearly: a component
  added or reconnected so that other parts of the system now depend on each
  other differently, a stored or passed shape that changed, a value with
  states and transitions, logic a reader would not follow on one read, or a
  screen whose behavior changed in more than one way. These examples
  illustrate a section of its own; none forces the full form by itself. A
  helper extracted from duplicated code, called from the same places, is not
  a new component.
- **The short form,** per [The short form](structure.md#the-short-form),
  otherwise.

Judge by the ideas in the change, never by its size: a rename across two
hundred files is the short form, and a ten-line change to a matching rule may
not be.

## The strands

End the plan with **the strands**: each idea the walkthrough will explain, in
dependency order, with the answers above that it carries. Every answer to
Architecture, Data model and data flow, Lifecycles, Algorithms, UI design, and
Decisions lands in a strand, or is cut with its reason stated in the plan. A
cut is fine; an answer that vanished between plan and draft is not. The short
form has no strands: its answers all land in Shape of the solution, each in
as few sentences as clarity allows.

The plan is an input, like the guide: the walkthrough never cites it, per
[The walkthrough stands alone](structure.md#the-walkthrough-stands-alone).
