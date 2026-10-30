# Walkthrough

Selected only by an explicit request, such as `/diff-review walkthrough`, and
the only mode that changes an existing walkthrough. Initial and PR review run
steps 2 to 12 when no walkthrough exists, and a plain `/diff-review` on a
prepared review with no walkthrough runs steps 2 to 13. Apart from what Initial
does when step 1 runs it, read-only with respect to source.

Before step 2, read these in full. Together they are the contract the draft
is written to:

- [`walkthrough/planning.md`](../walkthrough/planning.md): the questions the
  plan answers before the draft starts.
- [`walkthrough/structure.md`](../walkthrough/structure.md): what a walkthrough
  is, what it may cite, its sections in order, and the rules that apply
  throughout.
- [`walkthrough/purpose.md`](../walkthrough/purpose.md) and
  [`walkthrough/manual-testing.md`](../walkthrough/manual-testing.md): the two
  parts the author writes besides the strands.
- [`contracts/prose.md`](../contracts/prose.md): the reader new to this code
  and factual prose, which every piece of prose the skill writes follows.
- [`walkthrough/writing.md`](../walkthrough/writing.md): flow, the cold-read
  test, and how much to explain.
- [`walkthrough/figures.md`](../walkthrough/figures.md): diagrams and
  screenshots.
- [`walkthrough/code-and-citations.md`](../walkthrough/code-and-citations.md):
  code excerpts, multi-step algorithms and pipelines, and citations.

1. Resolve the artifacts for the selected comparison. Require `-guide.md` and
   `-guide.json`, because a walkthrough belongs to a prepared review. When
   either is absent, run Initial. A guide older than the branch head still
   counts: step 3 reads the current diff, and the walkthrough describes that.
   If Initial wrote the walkthrough because
   none existed, stop there rather than writing it a second time. If a
   walkthrough already existed, Initial left it untouched, so continue from
   step 2: this request asked for it to change.
2. Start from what `.difit/` already holds, then go past it. The guide's
   grouping and file tags, the transcript's threads, `-summary.md`,
   `-test-plan.md`, any `<branch>_explanations.md`, and the current
   `-walkthrough.md` when one is being regenerated are a prepared map of this
   diff: read them first to orient, and to avoid re-deriving conclusions an
   earlier round already reached. None of it is required content, none of it
   is authoritative, and none of it is cited, per
   [The walkthrough stands alone](../walkthrough/structure.md#the-walkthrough-stands-alone). Verify
   anything you carry forward against the code, and treat a disagreement
   between an artifact and the code as a finding worth stating.
3. Read the full diff, then read the surrounding code the diff calls into and
   is called from. The walkthrough describes the system as it now stands, so
   unchanged collaborators are in scope for understanding even though they are
   out of scope for review.
4. Write the plan, per [`walkthrough/planning.md`](../walkthrough/planning.md):
   written answers to its questions about the change's architecture, UI and
   data design, lifecycles, algorithms, and decisions, the form they call
   for (full or short, per
   [Choosing the form](../walkthrough/planning.md#choosing-the-form)), and the
   strand list they lead to. Keep it in a scratch file outside the
   repository; it is an input to the draft, never cited by it.
5. Capture the changed states of user-visible changes, per
   [Screenshots](../walkthrough/figures.md#screenshots). Keep the app running:
   step 8 and the review passes may send you back for more captures.
6. Where a decision's rationale is not recoverable from the code, say so
   rather than inventing one, and add it to Open questions.
7. Write `-walkthrough.md` in the form the plan chose, including Purpose per [Purpose](../walkthrough/purpose.md) and
   Appendix A. Manual testing per [Manual testing](../walkthrough/manual-testing.md), each
   appendix after its page-break line per
   [Sections](../walkthrough/structure.md#sections) or
   [The short form](../walkthrough/structure.md#the-short-form), with the
   plan's strands in the plan's order. Write the
   Background technical context heading and `## Appendix B. Glossary` with a one-line
   placeholder each, so section numbers are final from the first draft; the
   next two passes fill them, and when regenerating they replace the old
   content of both rather than edit it. When regenerating, keep each section's
   number where its content still fits, because earlier explainer threads cite
   those numbers; where the current section order forces a renumber, make it
   and list the affected threads in step 13. Do not touch
   the transcript, the guides, the reviewed state, or any source file. When a
   strand is a pipeline or a multi-pass algorithm, read
   [`references/pipeline-explanation.md`](../references/pipeline-explanation.md)
   before writing that section.
8. Take the capture inventory, per
   [Screenshots](../walkthrough/figures.md#screenshots): starting from the
   plan's UI design answer, list every UI element the draft names, and capture, crop, or letter each one that is not
   exempt and has no capture yet, per
   [Crop and letter the capture](../walkthrough/figures.md#crop-and-letter-the-capture).
   Re-take any capture of a named element that is a bare full-window
   screenshot, under the same file name. A capture skipped for any reason short of a block, per
   [Screenshots](../walkthrough/figures.md#screenshots), is a capture still
   owed.
9. Run the background context pass, by dispatching a subagent per
   [Dispatching a review pass](#dispatching-a-review-pass) with
   [`walkthrough/pass-background.md`](../walkthrough/pass-background.md). It
   returns the units it included and the ones it left out, with reasons. Read
   [`walkthrough/background-context.md`](../walkthrough/background-context.md),
   judge the cut, and correct the section when a unit a later section depends
   on is missing.
10. Run the clarity pass, by dispatching a subagent per
    [Dispatching a review pass](#dispatching-a-review-pass) with
    [`walkthrough/pass-clarity.md`](../walkthrough/pass-clarity.md). It edits
    nothing, and returns proposals, heading renames and moves, questions for
    you, the UI elements it could not picture, and the glossary rows. Read
    [`walkthrough/glossary.md`](../walkthrough/glossary.md), then act on the
    result per [Applying the clarity pass](#applying-the-clarity-pass).
11. Enter the content review phase, by dispatching a subagent per
    [Dispatching a review pass](#dispatching-a-review-pass) with
    [`walkthrough/pass-content-review.md`](../walkthrough/pass-content-review.md).
    Copy the draft to a temporary file outside the repository first, so a
    change you reject can be restored. It checks the draft for accuracy against
    the code, fixes what it finds, and
    reports each change with its evidence. Read every change and accept or
    reject it: the subagent has read the code more recently, you know what the
    change was for, and neither alone is a good judge of a disputed claim. A
    rejection is a normal outcome, and a change accepted without reading it
    defeats the phase. Then run the marking script again.
12. Then run the style check, always the last pass, by dispatching a subagent
    per [Dispatching a review pass](#dispatching-a-review-pass) with
    [`walkthrough/pass-style-check.md`](../walkthrough/pass-style-check.md).
    It applies the closing checks, loops on the rendered PDF until every
    diagram is visually legible, and runs the marking script after its last
    edit, so nothing needs re-marking after it. Do not skip it because the draft looks
    finished: looking finished to its author is the condition the phase exists
    to test. When it reports a contract violation outside its remit, such as a
    Background figure that splits across two pages, fix it yourself, then run
    the style check again so it stays the last pass. A missing or bare
    capture it reports under check 6 is one of these: take it per step 8,
    then run the style check again. Only a capture that is genuinely blocked
    stays out, with its one-sentence reason in the document. A plan answer it
    reports under check 11 as missing from the draft is one too: write it in,
    checking it against the code, then run the style check again. A coverage gap or
    a judgment call it reports goes into the step 13 report instead.
13. Report the plan's path, the form it chose and why, and every answer it
    cut. Then report the walkthrough's size beside the diff's in one line,
    so a walkthrough out of proportion to its change is visible: its words
    and printed pages (from the style check's last render), its strand count,
    and the summary line of
    `python3 <skill-dir>/scripts/list-changed-units.py <comparison-key>`,
    which counts the diff's changed units, files, and lines without tests or
    generated files. Then report the section count, which
    units the background context pass
    included, what the clarity pass proposed and what you rejected, what the
    content review changed and what you rejected, what the style check
    changed, the captures steps 8 and 12 added and any left out as blocked,
    and any section the deletion test shortened or removed. When a
    regeneration moved a section that an existing thread cites, list those
    threads. Then end the response with a table naming the walkthrough. One row is expected; the
    table is there so the path stands out at the end of a long reply.

    ```markdown
    | Walkthrough | Location |
    | --- | --- |
    | <the document's H1 title> | `.difit/<stem>-walkthrough.md` |
    ```

Contents:

- [Review passes](#review-passes)
- [Dispatching a review pass](#dispatching-a-review-pass)
- [Applying the clarity pass](#applying-the-clarity-pass)

## Review passes

A drafted walkthrough goes through four review passes, each dispatched to its
own subagent, one at a time and in this order. Each pass reads the document the
previous one left, and each is done by a reader who did not choose the words.

| Order | Pass | Question it answers | What it changes |
| --- | --- | --- | --- |
| 1 | Background context | What code does a reader need to know to follow this change? | Writes the Background technical context section |
| 2 | Clarity | Can an engineer new to this code follow it? | Nothing. It returns proposals and the glossary; the parent applies them |
| 3 | Content review | Is every claim true of the code? | Edits claims, returning each change with its evidence. The parent reverts any it rejects |
| 4 | Style check | Does the document meet the walkthrough contract? | Edits style only. Always last |

The background section and the glossary are new claims about the code, and the
clarity rewrites restate existing claims in new words, so the content review
runs after both and checks all of them. Content runs before style because a
heading polished to state a claim that turns out to be false is worse than the
vague heading it replaced, and because a sentence cut as a tell may have been
the only place a caveat was recorded.

## Dispatching a review pass

Dispatch each pass to a fresh subagent, one at a time, and give it:

- the absolute path of `-walkthrough.md`,
- the branch and comparison the walkthrough describes, so it can read the diff
  itself rather than trusting the prose,
- for the style check, the absolute path of the plan, which its last closing
  check reads,
- the absolute path of its pass file under `walkthrough/`, told to read that
  file and every file it lists under **Read first**, in full, before doing
  anything else.

The pass file states what the subagent may change and what it returns. Do not
widen its authority in the dispatch.

## Applying the clarity pass

Read every proposal, heading rename, and move, and accept, correct, or reject
each. Apply the accepted ones, checking that each rewrite keeps the original
claim, or corrects it on purpose where you know the original was imprecise,
and that every fact a rewrite adds is true, tagged `[adds fact]` or not. A move
that leaves a section without its locating sentence gets one. A proposal may
add a unit to Background technical context when a later section depends on
it; add it to the existing tree and table rather than starting a new one, and
drop a less needed unit when the addition would push the figure past one
page.

Take a capture for each UI element the pass could not picture, per step 8.
Answer the questions in the text or the figures, then write the glossary into
Appendix B per [`walkthrough/glossary.md`](../walkthrough/glossary.md):
dropping any entry for a term the reader no longer meets, in prose or in a
code name the document asks them to read, and adding one for any new term
your own rewrites introduced. Last, run the marking script per
[Marking glossary terms in the text](../walkthrough/glossary.md#marking-glossary-terms-in-the-text)
and act on its unused-entry report. A rejection is a normal outcome, and the
content review that follows checks the result against the code.
