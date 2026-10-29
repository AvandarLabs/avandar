# The content review runs in a subagent

The third pass, per [Review passes](../modes/walkthrough.md#review-passes). It reads the draft for
ACCURACY. Its question is never "does this read well", it is "is this true, and
is it what the code does". The parent dispatches it with the walkthrough's
path, the branch and comparison, so it can read the diff itself rather than
trusting the prose, and this file's path.

**Read first,** each file whole, before changing anything:
[`structure.md`](structure.md), which holds
[The walkthrough stands alone](structure.md#the-walkthrough-stands-alone), and
[`writing.md`](writing.md), which holds
[Writing for a reader new to this code](writing.md#writing-for-a-reader-new-to-this-code).

**Authority:** edit the walkthrough file, and run read-only verification:
`git show` and `git diff` against the base, reads of the working tree and the
test suites, and read-only queries against a LOCAL database that already has
the change applied. Never a write, and never the production database.

It applies its fixes to the markdown and returns every change with the evidence
behind it. It leaves glossary markers alone, even where an edit strands one,
because the parent runs the marking script afterwards. The parent then accepts
or rejects each change.

Contents:

- [Verify against the sources, never against the document](#verify-against-the-sources-never-against-the-document)
- [The problem-to-solution join is the highest-yield check](#the-problem-to-solution-join-is-the-highest-yield-check)
- [Claims, snippets, and highlights](#claims-snippets-and-highlights)

## Verify against the sources, never against the document

A claim cannot be checked by reading the sentence next to it. Every finding has
to come from a primary source: the diff, the surrounding code the diff calls
into, the tests that pin the behaviour, or a query against a local database.
Where a claim asserts a privilege, a constraint, a default, or a count, run it.
Where it asserts what the code used to do, read the base revision. A claim the
reviewer cannot reach a source for is reported as unverified rather than
accepted.

## The problem-to-solution join is the highest-yield check

For every section carrying `The Problem` and `The Solution`, and for every pair
that is implicit, ask one question: does the mechanism named in the solution
actually close the failure named in the problem? A section can be accurate in
both halves and wrong in the join, which is why this needs asking separately
from checking the claims.

The failure mode, from a real review. A section explained that a helper
returning a whole roster was callable by `anon`, then presented a narrower
signature as the fix. Both halves were true and the join was wrong: the
signature was not what stopped `anon`, a `revoke ... from public` in the same
hunk was, and the signature defended against a different caller entirely, one
whose grant could not be revoked at all. No sentence in the section was false.

So for each pair, report three things:

- **The mechanism that actually does the work,** named exactly, and whether the
  document names it. When one change defends against two callers, inputs, or
  states, the document needs to separate them, because a reader who attributes
  the fix to the wrong line will later remove the right one.
- **Whether the solution eliminates the problem or reduces it.** A reduction
  presented as an elimination is a defect. The same section was missing its
  residual: a caller who already holds a user id can still test one membership
  at a time, which is a large reduction and not a closure.
- **What each half is about.** Two halves that quietly concern different actors
  or different inputs are the shape this defect takes.

## Claims, snippets, and highlights

Beyond the joins, check and fix:

- **Every factual assertion**, against a source. Privileges, constraints,
  defaults, orderings, and "X cannot happen because Y" are the ones that fail.
- **Every number**, including counts of files, sections, values in an enum, and
  entries in a list, against what is actually there.
- **Every cross-file claim.** "Mirrored in TypeScript by `f`" requires that `f`
  exists and still agrees.
- **Snippet relevance.** The excerpt must contain the lines the paragraph
  discusses, and its enclosing signature must be the scope those lines really
  sit in. An excerpt whose paragraph discusses something not in it is the
  defect.
- **Highlight specs**, by counting the printed snippet's lines. A clause the
  prose points at that spans two source lines needs both, and a spec naming
  only the first shades half a claim.
- **The opening sections and appendices.** Every Glossary definition and Background row,
  against the code. Every command, path, test file, and fixture file in Manual
  testing exists under that name, and each before-and-after matches what the
  base revision and the change actually do. Check these by reading, never by
  running a database command.
- **Every path the document cites,** for being tracked in the repository at
  the compared revision (`git cat-file -e <rev>:<path>`). A citation of a
  `.difit/` artifact, a gitignored file, or a local-only path is a defect, per
  [The walkthrough stands alone](structure.md#the-walkthrough-stands-alone): replace it
  with the verified claim it stood for, or remove it.
- **Decisions**, for a rejected alternative that is real and a stated reason
  that is true.
- **Open questions**, for whether the code has since answered one.
- **Deliberately not handled**, for whether each gap is still a gap.

Its remit stops at accuracy. A diagram label, caption, or diagram key row that
states something false is a claim, so correcting it is in scope. It does not rewrite for tone,
restructure a section, retitle a heading that is merely dull, or touch a
diagram for legibility: those are the style check's, and doing them here costs the parent
the ability to tell a correction from a preference. Where a claim is
unrecoverable from the code, it adds an Open question rather than inventing a
rationale. A correction it writes follows
[Writing for a reader new to this code](writing.md#writing-for-a-reader-new-to-this-code),
so fixing a claim never brings back vernacular the clarity pass grounded.
