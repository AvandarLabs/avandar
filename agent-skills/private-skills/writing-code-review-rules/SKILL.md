---
name: writing-code-review-rules
description: Use when adding, editing, or removing a rule for the avandar-code-review skill, or when adding or editing rules in a repo's docs/code-reviews/extra-checklist.md. Triggers include "add a review rule", "remember this in code review", "add this to the code review checklist", "add to extra-checklist", or any request to change what avandar-code-review checks.
metadata:
  author: jpsyx
  version: "1.0.0"
  tags: avandar, code-review, meta, authoring, skill-maintenance
---

# Writing Code Review Rules

This skill governs how new rules are added to, edited in, or removed from
the `avandar-code-review` skill and its repo-local
`docs/code-reviews/extra-checklist.md`. It is the maintainer-facing
counterpart to `avandar-code-review`: that skill runs reviews, this one
changes what those reviews check.

This skill is Avandar-repo-specific and lives in `private-skills/`. It
edits files inside `agent-skills/public-skills/skills/avandar-code-review/`
and the repo-local extra checklist. It is not useful in a repo that does
not contain the `avandar-code-review` source.

## Core Principle

**A review rule is an instruction to another LLM.** It is read by a
find sub-agent that must apply it to a diff, and by an adversarial
verifier that must decide whether a flagged line truly violates it.
Every rule must therefore be optimized for **LLM interpretability and
accuracy**, not for human brevity. A rule that a verifier cannot check
against a single `+` line, or whose exceptions are implicit, produces
false positives and lost findings.

**Place first, then optimize.** Always decide *where* a rule belongs
(public skill vs. repo-local extra checklist) before you touch file
length or sub-agent structure. A misplaced rule that is also well-split
is still wrong.

## Pass Order

Run these passes in order. Do not reorder them: placement comes before
any length or coherence work, because splitting a file is meaningless
until the rule is in the correct file.

1. **Placement pass** - public skill vs. repo-local extra checklist.
2. **Authoring pass** - write the rule using the Rule Pattern.
3. **File-length pass** - did this file grow large enough to warrant a
   sub-agent split?
4. **Logical-coherence pass** - does this file now mix distinct mental
   models such that it should be split for accuracy?
5. **Orchestration-sync pass** - if a split is warranted, update
   `avandar-code-review`'s find lanes and phase list to match.

### Pass 1: Placement (do this first)

Decide which file the rule belongs in. The test is **applicability, not
specificity of convention.** `avandar-code-review` is opinionated on
purpose; a strongly-held style rule (naming, immutability, functional
style) still belongs in the public skill as long as it would *make sense*
in any repo that installs the skill.

Route the rule as follows:

- **General rule** (would make sense in any TypeScript / React / SQL /
  CSS repo, references no repo-specific file, path, table, or business
  concept): belongs in the **public skill**, under the appropriate
  sub-checklist in
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`.
- **Library-specific rule** (tied to an installable `@avandar/*` package
  or another named package): belongs in the public skill under
  `docs/code-reviews/libraries/`, behind that package's presence gate.
- **Repo-specific rule** (mentions a path, file, table, migration, or
  business concept unique to this checkout): belongs in the repo-local
  `docs/code-reviews/extra-checklist.md`.

Two directions to check explicitly, because requests come in mislabeled:

- **Requested for the public skill, but repo-specific:** if the rule
  references any avandar-repo-only file, path, or business concept, it is
  NOT a good fit for the public skill. A public installer would get a rule
  that cannot fire or makes no sense in their repo. Move it to
  `extra-checklist.md` instead.
- **Requested for `extra-checklist.md`, but actually general:** if the
  rule would apply to *any* repo the skill is installed in and names
  nothing repo-specific, it does not belong in the repo-local file. Promote
  it into the public skill's sub-checklists instead.

When in doubt, apply the concrete test: *would this rule still make sense
if a stranger installed avandar-code-review into an unrelated TypeScript
repo?* Yes -> public skill. No -> extra checklist.

### Pass 2: Authoring (write the rule)

Write the rule into the file chosen in Pass 1, following the **Rule
Pattern** below. Match the surrounding file's tone and formatting exactly.

### Pass 3: File-length check

After writing, measure the file you edited (line count and top-level rule
count). Length is a **smoke alarm, not a decision** - it tells you to look
at coherence (Pass 4), it does not by itself force a split.

- **Under ~250 lines and ~35 rules:** no action. Continue.
- **At or over ~250 lines or ~35 rules:** flag the file as a split
  candidate and continue to Pass 4 to decide.
- **Over ~600 lines:** the file is too large regardless of coherence;
  a split is required. Go to Pass 5.

Calibration: in the public skill, `typescript-checklist.md` (~405 lines)
and `functional-style-checklist.md` (~345 lines) are each *already* their
own find lane. That is why their size is acceptable - each is one focused
agent. The alarm is for a single lane's file growing past that range while
still spanning more than one concern.

### Pass 4: Logical-coherence check

This is the real decision. **Split by cognitive coherence, not by line
count.** The question is: *can one find sub-agent hold this file as a
single coherent mental model?*

- If the file is long but covers **one** coherent topic (like
  `functional-style-checklist.md`), keep it whole. Do not split a
  long-but-coherent file just because the length alarm rang.
- If the file spans **two or more distinct mental models** (for example,
  type-system rules vs. naming/structure rules) AND it tripped the length
  alarm, split it along the mental-model seam into separate checklist
  files, each destined to become its own find lane.

Priorities when deciding, highest first:

1. **Accuracy.** A split that gives each agent a tighter, more coherent
   rule set improves recall and reduces missed rules. This is the reason
   to split.
2. **Review latency.** New lanes run concurrently, so a split does not add
   wall-clock time; it usually removes it by shrinking the longest lane.
3. **Token usage (a distant third).** A split re-sends the shared file
   slice to one more agent. Do not let this cost block a split that
   accuracy justifies, but do not split gratuitously either - avoid
   splitting a coherent file into fragments that each need the others'
   context to be judged, since that hurts accuracy and wastes tokens.

Do not split finer than one checklist file per coherent topic. Per-rule
agents explode the merge/dedupe burden for no recall gain.

### Pass 5: Orchestration sync (only if Pass 3/4 forces a split)

A new checklist file is not a review lane until `avandar-code-review`
knows about it. When you split a file, update the public skill's
`SKILL.md` in the same change:

1. Add the new checklist file under `docs/code-reviews/` (or
   `docs/code-reviews/libraries/` for a library rule).
2. Add a row to the **Find lanes** table in the "Execution Model With
   Sub-Agents" section, with the new lane's checklist and gate.
3. Add or update the matching entry under "Phase Checklists" (or
   "Library-Gated Phases") with the gate and reference link.
4. If the split changes how many phases can fire, re-check that the
   "When To Fan Out" threshold guidance still reads correctly.

If no split was warranted (the common case), skip this pass entirely.

## Rule Pattern

Every rule is a top-level `- ` bullet inside a checklist file. Optimize
each rule for the LLM that will apply and verify it.

A well-formed rule has, in order:

1. **Directive first.** Open with an imperative so the rule is scannable:
   `Prefer ...`, `Avoid ...`, `Never ...`, `Always ...`, `Use ...`. State
   the check before the reasoning.
2. **Rationale (required).** One or two sentences on *why*. The verifier
   uses the reason to reject false positives, so an unexplained rule is
   harder to verify accurately. Keep it concrete.
3. **Exceptions, made explicit.** If the rule has carve-outs, enumerate
   them (`Exceptions: 1) ...; 2) ...`) or use sub-bullets. The adversarial
   verify stage refutes findings using stated exceptions; an implicit
   exception becomes a false positive.
4. **Before/after example, when the rule is about code shape.** Use the
   file's convention: a `This is bad:` fenced block followed by a
   `This is good:` block. One concept per example; keep it minimal.

Formatting conventions, matching the existing checklists:

- Put identifiers, keywords, types, and file names in backticks.
- Keep comment and prose lines at 80 characters or fewer.
- One check per bullet. Do not bundle several independent checks into one
  rule; bundled rules are harder to locate to a single `+` line and harder
  to dedupe across lanes.
- Give concrete thresholds, not vague quantifiers (`45 lines or fewer`,
  `4 or more properties`), so the check is deterministic.
- Write the rule so it can be evaluated against a single added (`+`) line
  wherever possible. A rule that needs whole-repo reasoning is expensive
  and error-prone; only write one when nothing local suffices.

### Example of a well-formed rule

```markdown
- Prefer `undefined` over `null` for absent values. Mixing both forces
  callers to guard for two empty states, and our types treat `undefined`
  as the single absence signal. Exception: use `null` only when an
  external API or framework contract requires it (for example a database
  column that is explicitly nullable).

  This is bad:

  ```ts
  function findUser(id: string): User | null {
    return cache.get(id) ?? null;
  }
  ```

  This is good:

  ```ts
  function findUser(id: string): User | undefined {
    return cache.get(id);
  }
  ```
```

## Where Rules Live

| Rule kind | Destination |
|-----------|-------------|
| General TS/React/SQL/CSS/naming/style | `public-skills/.../docs/code-reviews/<topic>-checklist.md` |
| Tied to an `@avandar/*` or named package | `public-skills/.../docs/code-reviews/libraries/<pkg>-checklist.md` |
| Always-run, cross-cutting mistake | `SKILL.md` "Most Common Mistakes" or "General Checks" |
| Repo-specific (paths, tables, business concepts) | repo-local `docs/code-reviews/extra-checklist.md` |

## Red Flags - Stop And Recheck

- You wrote the rule before deciding where it goes. Do Pass 1 first.
- You split a file only because it was long. Length is the alarm;
  coherence is the decision (Pass 4).
- You added a repo-specific path to a public sub-checklist. It belongs in
  `extra-checklist.md`.
- You created a new checklist file but did not update the find-lanes table
  and phase list in `avandar-code-review/SKILL.md`. The lane will never
  run. Do Pass 5.
- You bundled several checks into one bullet. Split them so each can be
  located to a `+` line and deduped independently.
