# Review execution

## Execution Model With Sub-Agents

The phases in this skill are independent: each applies an orthogonal rule
set to the same read-only diff, and no phase consumes another phase's
output. That makes the review parallelizable. When enough phases fire,
fan them out across read-only sub-agents instead of running them
sequentially in one context.

Priorities, in order:

1. **Accuracy is first.** A single agent carrying every checklist plus a
   large diff loses rules in the middle of its context. Giving each
   sub-agent one focused checklist against only the relevant slice keeps
   every rule under full attention, so fewer rules are forgotten.
2. **Review latency is second.** Fanned-out phases run concurrently, so
   wall-clock time is the slowest single lane, not the sum of all lanes.
3. **Token usage is a distant third.** This model re-sends diff slices to
   several agents and adds a verify pass, so it spends more tokens. That
   trade is acceptable: it buys both accuracy and speed.

### When To Fan Out

Count the phases that actually fire for this diff (after gating).

**Focused review:** count only the selected packs. Do not open
`extra-checklist.md`. Do not count library-gated or other
language-specific phases. Fewer than 3 selected packs run inline; 3 or
more fan out.

**Full review:** this count MUST include the repo-local phases: every
phase declared in `extra-checklist.md` plus every further ruleset it
references (see "Additional Checklist File"), not only this skill's
built-in phases. Open `extra-checklist.md` and resolve its referenced
phases BEFORE deciding whether to fan out, so the repo's own rules are
never the reason the count is undercounted. A diff that trips only one
built-in phase but three repo-local phases still fans out.

- **Fewer than 3 phases fire:** do NOT fan out. Run the phases inline and
  sequentially in this agent. Spawning sub-agents for one or two small
  phases costs more in spawn and merge overhead than it saves. A SQL-only
  or CSS-only diff runs inline.
- **3 or more phases fire:** fan out using the four-stage pipeline below.
  A diff spanning, for example, TypeScript, React, and SQL fans out.

### Four Stages: Find → Verify → Merge → Apply

Run the review as **Find (parallel) → Verify (parallel) → Merge (serial)
→ Apply (serial)**. Only the final Apply stage edits files, and only this
orchestrator agent performs it. **Sub-agents are strictly read-only and
must never edit a file.** Because every edit happens in one serial
orchestrator pass after all finding is done, two writers never touch the
same file at once. This is how the model avoids simultaneous edits.

#### Stage 1: Find (parallel, read-only)

Spawn one find sub-agent per lane below whose gate matches the diff.
**Focused review:** spawn only the `focused-*` lanes for the selected
packs (see **Focused Reviews**). Do not spawn `common-and-general`,
`comments-and-module`, `typescript`, or any other full-review lane.

Give each agent only:

- the diff slice for the files its gate covers (not the whole diff, except
  the `common-and-general` lane, which covers all reviewable files),
- the shared review constraints it must respect (Review Scope: flag only
  `+` lines; Files To Skip),
- its own checklist,
- exact retained/omitted rule-language-file-capability outcomes from the handoff.
  The fallback lane applies only retained AF capabilities. Every other lane
  keeps its contextual/JR obligations without repeating omitted detectors.

Each find agent is READ-ONLY. It returns structured findings, one record
per finding: `{ file, lines, phase, severity, description,
recommendedFix }`. It must not modify code.

**Find lanes:**

The table below is the **full-review** set. A focused review uses only
the `focused-*` lanes in **Focused Reviews**; do not spawn any row
below for a focused review.

| Lane | Checklist(s) | Gate |
|------|--------------|------|
| `deterministic-fallback` | selected AF IDs and exact uncovered capabilities only | full review; at least one retained detector obligation |
| `common-and-general` | common-and-general-checklist | full review (always) |
| `comments-and-module` | comments + module hierarchy | full review; diff has `.ts`/`.tsx` |
| `code-smells` | code-smells-checklist | full review; diff has `.ts`/`.tsx` |
| `typescript` | typescript-checklist | full review; diff has `.ts`/`.tsx` |
| `types` | types-checklist | full review; diff has `.ts`/`.tsx` |
| `functional-style` | functional-style-checklist | full review; diff has `.ts`/`.tsx` |
| `react` | react-checklist (plus `react-doctor` if available) | full review; diff has a `.tsx` component |
| `react-hooks` | react-hooks-checklist | full review; diff uses hooks |
| `css-modules` | css-modules-checklist | full review; diff touches `*.module.css` |
| `sql` | sql-checklist | full review; diff has `.sql` |
| `tests` | tests-checklist | full review; diff has a `*.test.*` / `*.spec.*` file |
| `lib:@avandar/utils` | libraries/avandar-utils-checklist | full review; package present |
| `lib:@avandar/models` | libraries/avandar-models-checklist | full review; package present |
| `lib:@avandar/modules` | libraries/avandar-modules-checklist | full review; package present |
| `lib:supabase` | libraries/supabase-checklist (+ the `supabase-declarative-schema` skill when available) | full review; repo has `supabase/migrations/` or `supabase/schemas/` and the diff touches one |
| `extra-checklist:<phase>` (one lane per repo-local phase, including each referenced ruleset) | that phase's section in repo-local `extra-checklist.md` and any file it references | full review; that phase's own gate matches |

On a **full review**, repo-local phases fan out too. Spawn one find lane
per phase declared in `extra-checklist.md` (and per ruleset it
references), each gated independently, exactly like a built-in lane. Do
not collapse several firing repo-local phases into a single
`extra-checklist` agent: the repo's own rules get the same accuracy
treatment as the built-ins, and they count toward the fan-out threshold
in "When To Fan Out". On a focused review they do not run.

On a **full review**, the TypeScript rule family is deliberately split
across four lanes (`typescript`, `types`, `functional-style`,
`comments-and-module`) rather than run as one agent. `typescript`,
`types`, and `functional-style` are each large enough to saturate a
single agent's attention, so keeping them apart is the highest-value
accuracy split in the review. **Do not merge those three into one
agent.** `types` carries a distinct lens from `typescript`: the type
system itself (declarations, assertions and escape hatches, absence,
literal unions, readonly contracts) rather than naming, module and file
structure, function shape, and import/export form. `comments` and
`module` are small and mechanical, so they share one lane on a full
review. A focused `comments` / `files` / `naming` review splits them
into the `focused-*` lanes instead, because the point of those packs is
to apply one subset in isolation. Each lane reads its full file slice as
context but applies only its own rule lens.

#### Stage 2: Verify (parallel, adversarial)

Parallel finding maximizes recall, which raises false positives. For every
finding from Stage 1, spawn an adversarial verifier whose job is to
**refute** the finding, not confirm it. Each verifier checks:

- Is the flagged line actually a `+` line in the diff? Context and `-`
  lines are out of scope and must be dropped.
- Does the cited rule genuinely apply, or is this a documented exception
  (for example the `for`-loop exceptions, or the `null`-over-`undefined`
  exception)?
- Is the recommended alternative (a helper, a library util) actually
  present in this repo?
- For an unneeded-cast finding, did the verifier delete the cast and run
  the type checker? Settle it by the compiler's output, never by reading
  the code: a clean type check confirms the finding.

Default to refuted when uncertain. A finding survives only if the verifier
cannot refute it. For high-severity findings, use three verifiers with
distinct lenses (scope, rule-applicability, exception) and drop the
finding if a majority refute it.

#### Stage 3: Merge (serial, orchestrator)

Collect the surviving findings in this orchestrator. Deduplicate overlaps
(the same code flagged by more than one lane, such as a vague name caught
by both `common-and-general` and `typescript`). Order by severity. This is
a plain reasoning step; do not spawn a sub-agent for it.

#### Stage 4: Apply (serial, orchestrator)

Only the orchestrator edits, only here, one file at a time. Sub-agents
edited nothing, so there is no write contention.

Apply **every** surviving fix (never defer one as a follow-up), grouped by
file, then run the **Finish protocol** defined under "How The Review Runs"
(format → lint and typecheck with zero errors → targeted tests → re-verify
no reviewed line still breaks a rule). Do not ask the user anything.

### Inline Fallback

When fewer than 3 phases fire, skip the sub-agents entirely. Run the firing
phases in this agent, in the order given in **Review Order**, and fix
each finding as in Stage 4. Everything else in this skill (gates,
scope, Files To Skip, testing, output) applies unchanged.
