# Oxlint phase 4 guided diagnostics design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-4-guided-diagnostics.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 4 moves deterministic TypeScript, JavaScript, JSX, TSX, and CSS
current-file detection out of the normal judgment pass even when repair needs
human or agent judgment. Oxlint or Stylelint names the exact violation and
objective. Detailed guidance loads only when a rule fires.

Generic rules remain active in the deterministic fallback for Python, Rust,
and every other language until Phase 6 proves their file and capability
outcomes.

## Goals

- Add every Phase 4 current-file guided rule that Oxlint or Stylelint can own.
- Define one agent-efficient diagnostic and documentation contract.
- Require a non-empty reason when an Avandar rule is disabled.
- Keep judgment repairs out of automatic fix paths.
- Register exact TypeScript, JavaScript, and CSS coverage in the umbrella
  catalog.
- Move only covered detector-language-file-capability outcomes out of the
  normal review path.
- Leave judgment detection and changed-disable-reason review in the skill.

## Non-goals

- Phase 4 does not add repository, filesystem, compiler, Git diff, or SQL
  evidence.
- Phase 4 does not implement Pylint, rustc, Clippy, Dylint, or universal
  language adapters.
- Phase 4 does not claim that TypeScript coverage satisfies a generic rule for
  another language.
- Phase 4 does not make unsafe edits to reduce diagnostic count.
- Phase 4 does not remove judgment conventions from `avandar-code-review`.

## Diagnostic architecture

Each diagnostic states:

1. the violated requirement;
2. the exact local fact;
3. the immediate repair objective;
4. one repo-relative rule page when repair branches.

The first guided rule compares three fixture outputs through Oxlint's `agent`
formatter: detailed repeated text, terse text with a repeated path, and terse
text whose metadata owns the path. Select the smallest format that lets an
agent repair every fixture correctly.

Rule documentation lives under `packages/lint/docs/rules/` and contains
purpose, invalid and valid examples, repair branches, exceptions, disable
criteria, and canonical catalog ID. A short rule with one obvious repair needs
no separate page.

Rule IDs remain stable across Oxlint, Stylelint, Pylint, Dylint, and companion
implementations. Engine-specific rule names map back to the same catalog ID.

## Disable contract

An `avandar/*` disable requires a non-empty reason in the engine's supported
syntax. The disable represents a valid exception explicitly. Review checks
only whether a changed reason is truthful and sufficient. It does not repeat a
covered detector.

Phase 6 extends the same requirement to `avandar_pylint` and
`avandar_dylint` rule namespaces.

## Rule scope

Phase 4 owns avlint-common-003 through avlint-ts-027, avlint-ts-029, avlint-ts-030, the current-file subset of
avlint-ts-032, avlint-common-009 through avlint-ts-036, avlint-ts-039, and avlint-ts-041 only for the TypeScript,
JavaScript, JSX, TSX, and CSS applicability recorded below. The
repository-aware avlint-ts-032 subset, avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038, and avlint-ts-040 move to
Phase 5.

| Batch | Inventory | Enforcement and coverage |
| --- | --- | --- |
| Native guided rules | avlint-common-006 through avlint-ts-021, avlint-ts-023 through avlint-ts-025, avlint-ts-030, native parts of avlint-common-009, avlint-ts-033, avlint-common-010, avlint-ts-041 | Native Oxlint for TS/JS paths only |
| Comments and public contracts | avlint-common-003 through avlint-ts-019 | `@avandar/lint-typescript/oxlint`; avlint-common-003 through avlint-common-005 remain fallback for other languages |
| TypeScript and API shape | avlint-ts-022, avlint-ts-026, avlint-ts-027, avlint-ts-029, current-file avlint-ts-032, custom avlint-common-009 | `@avandar/lint-typescript/oxlint` |
| React, tests, localization, modules | avlint-ts-033 through avlint-ts-036 | `@avandar/lint-typescript/oxlint`; generic avlint-common-010 remains fallback elsewhere |
| CSS comment punctuation | CSS part of avlint-common-003 | `@avandar/lint-css/stylelint` |
| Static UI styling | avlint-ts-039 | Oxlint plus Stylelint |

avlint-common-004 does not gain CSS coverage because the live skill's CSS gate does not
apply the 80-column comment rule. avlint-css-001 remains the separate CSS comment-shape
rule from Phase 3.

Where a native rule proves only part of a convention, the Avandar rule covers
only the remaining closed syntax. Neither implementation reports candidates as
violations.

## Coverage and skill handoff

Every new rule registers its exact language IDs, file and capability outcomes,
and integration fixtures in the Phase 3 catalog. `avandar-lint coverage` must
prove that the root config enables the rule for every applicable file and
subpredicate before review skips it.

The normal agent flow is:

1. run Phase 3 safe fixes;
2. run repository lint in agent-oriented output;
3. repair all guided diagnostics using the message or linked page;
4. rerun lint until green;
5. run coverage for the reviewed paths;
6. load deterministic fallback rules only for uncovered outcomes;
7. run judgment review and changed-disable-reason judgment.

The fallback checklist keeps generic avlint-common-003, avlint-common-004, avlint-common-005, avlint-common-006, avlint-common-007,
avlint-common-008, avlint-common-009, and avlint-common-010 available for other languages. TypeScript-specific
rules also remain available when a repository does not install or enable the
corresponding lint implementation.

## Performance gate

Measure cold and five-run warm lint timing after each batch. Stop and profile a
batch whose warm median adds both more than 25 percent and more than 2 seconds
to the preceding baseline. Prefer shared `createOnce` traversal when several
rules need the same facts.

## Acceptance criteria

- Every in-scope TypeScript, JavaScript, JSX, TSX, or CSS violation is
  deterministically detected by Oxlint or Stylelint without a companion.
- No rule is marked fixable unless its safe safe-fix subset shipped in Phase 3.
- Every branching repair is actionable without loading the review skill.
- Every Avandar disable requires a reason.
- Coverage integration fixtures prove each registered file and capability
  outcome through the root lint command.
- Covered outcomes leave the normal full and focused lanes, while uncovered
  outcomes still load fallback detection.
- avlint-common-012 through avlint-ts-058 remain in `avandar-code-review`.
- Root lint and package verification pass inside the performance threshold.
