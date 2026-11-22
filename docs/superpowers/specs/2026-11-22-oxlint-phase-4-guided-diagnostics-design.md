# Oxlint phase 4 guided diagnostics design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-4-guided-diagnostics.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 4 moves deterministic current-file detection out of judgment review even
when the repair itself needs human or agent judgment. Oxlint or Stylelint names
the exact violation and immediate repair objective. Detailed guidance loads
only when a rule actually fires.

## Goals

- Add all current-file GD rules that Oxlint or Stylelint can own directly.
- Define an agent-efficient diagnostic and documentation contract.
- Require a non-empty reason when an Avandar rule is disabled.
- Keep judgment-based repairs out of automatic fix paths.
- Remove shipped GD searches from every review lane.
- Leave only JR detection and changed-disable-reason review in the skill.

## Non-goals

- Phase 4 does not add repository, filesystem, compiler, Git diff, or SQL
  analysis.
- Phase 4 does not make unsafe edits merely to reduce diagnostic count.
- Phase 4 does not embed full tutorials in every diagnostic.
- Phase 4 does not remove JR conventions from `avandar-code-review`.

## Approaches

### Selected: concise diagnostics plus on-demand package documentation

Each diagnostic states the requirement, the exact local fact, and the repair
objective. Branching repairs end with a repo-relative path under
`packages/node/lint/docs/rules/`. A short rule with an obvious repair needs no
separate page. This minimizes repeated tokens while preserving enough context
for an agent to act accurately.

### Rejected: keep the GD prose in the review skill

This still pays detection tokens after lint has already proven the violation,
and it allows the linter and skill to drift.

### Rejected: print complete rule documentation for every violation

This makes automated review output larger than the current skill prompt when a
rule repeats. It also obscures the local fact that caused each diagnostic.

## Diagnostic contract

The first guided rule compares three fixture outputs through Oxlint's `agent`
formatter:

1. a detailed message repeated for every violation;
2. a terse message with a repeated documentation path;
3. a terse message whose rule metadata owns the documentation path.

Select the smallest format that lets an agent repair every fixture correctly.
The chosen schema becomes the shared diagnostic builder for Oxlint and
Stylelint rules. Messages do not claim that a repair is automatic.

Rule documentation contains purpose, invalid and valid examples, repair
branches, valid exceptions, disable criteria, and the canonical convention
source. A rule identifier is stable across its Oxlint, Stylelint, and future
companion implementations.

## Disable contract

An `avandar/*` disable requires a non-empty reason on the same directive or in
the engine's supported reason syntax. A valid exception becomes explicit code
instead of hidden review knowledge. `avandar-code-review` checks only whether a
new or changed reason is truthful and sufficient. It does not repeat the
underlying deterministic detector.

## Rule scope

Phase 4 owns GD-01 through GD-16, GD-18, GD-19, GD-21 through GD-27, and
GD-30. GD-17, GD-20, GD-28, GD-29, and GD-31 move to phase 5 because they need
Avandar-specific type or repository evidence.

| Batch | Inventory | Enforcement |
| --- | --- | --- |
| Native guided rules | GD-06 through GD-10, GD-12 through GD-14, GD-19, native portions of GD-22, GD-23, and GD-25 | Configure native Oxlint with repo exclusions and tested options |
| Comments and public contracts | GD-01 through GD-05 | `@avandar/lint/oxlint` |
| TypeScript and API shape | GD-11, GD-15, GD-16, GD-18, GD-21, GD-22 | `@avandar/lint/oxlint` |
| React, tests, localization, and modules | GD-23 through GD-27 | `@avandar/lint/oxlint` |
| Static UI styling | GD-30 | `@avandar/lint/oxlint` plus `@avandar/lint/stylelint` |

Where a native rule proves only part of a convention, the Avandar rule covers
only the remaining closed syntax. Neither implementation reports speculative
candidates as violations.

## Execution flow

The normal agent flow is:

1. run safe fixes;
2. run lint in agent-oriented output;
3. repair all GD diagnostics using the message or linked rule page;
4. rerun lint until green;
5. start `avandar-code-review` with only JR detection and disable-reason
   judgment.

## Performance gate

Measure cold and five-run warm lint timing after each rule batch. Stop and
profile a batch whose warm median adds both more than 25 percent and more than
2 seconds to the preceding baseline. Prefer shared `createOnce` traversal when
several rules need the same current-file facts.

## Acceptance criteria

- Every in-scope GD violation is deterministically detected by Oxlint or
  Stylelint with no companion process.
- No in-scope rule is marked fixable unless its safe AF subset already shipped
  in phase 3.
- Every branching repair is actionable from its diagnostic and on-demand rule
  page without loading the review skill.
- Every Avandar disable requires a reason.
- No shipped GD detector remains in the full or focused review lanes.
- JR-01 through JR-17 remain in `avandar-code-review`.
- Root lint and package verification pass within the recorded performance
  threshold.
