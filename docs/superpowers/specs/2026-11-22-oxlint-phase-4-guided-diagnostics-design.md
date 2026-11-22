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

- Add every Phase 4 current-file GD rule that Oxlint or Stylelint can own.
- Define one agent-efficient diagnostic and documentation contract.
- Require a non-empty reason when an Avandar rule is disabled.
- Keep judgment repairs out of automatic fix paths.
- Register exact TypeScript, JavaScript, and CSS coverage in the umbrella
  catalog.
- Move only covered detector-language-file-capability outcomes out of the
  normal review path.
- Leave JR detection and changed-disable-reason review in the skill.

## Non-goals

- Phase 4 does not add repository, filesystem, compiler, Git diff, or SQL
  evidence.
- Phase 4 does not implement Pylint, rustc, Clippy, Dylint, or universal
  language adapters.
- Phase 4 does not claim that TypeScript coverage satisfies a generic rule for
  another language.
- Phase 4 does not make unsafe edits to reduce diagnostic count.
- Phase 4 does not remove JR conventions from `avandar-code-review`.

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

Phase 4 owns GD-01 through GD-16, GD-18, GD-19, the current-file subset of
GD-21, GD-22 through GD-27, GD-30, and GD-32 only for the TypeScript,
JavaScript, JSX, TSX, and CSS applicability recorded below. The
repository-aware GD-21 subset, GD-17, GD-20, GD-28, GD-29, and GD-31 move to
Phase 5.

| Batch | Inventory | Enforcement and coverage |
| --- | --- | --- |
| Native guided rules | GD-06 through GD-10, GD-12 through GD-14, GD-19, native parts of GD-22, GD-23, GD-25, GD-32 | Native Oxlint for TS/JS paths only |
| Comments and public contracts | GD-01 through GD-05 | `@avandar/lint-typescript/oxlint`; GD-01 through GD-03 remain fallback for other languages |
| TypeScript and API shape | GD-11, GD-15, GD-16, GD-18, current-file GD-21, custom GD-22 | `@avandar/lint-typescript/oxlint` |
| React, tests, localization, modules | GD-23 through GD-27 | `@avandar/lint-typescript/oxlint`; generic GD-25 remains fallback elsewhere |
| CSS comment punctuation | CSS part of GD-01 | `@avandar/lint-css/stylelint` |
| Static UI styling | GD-30 | Oxlint plus Stylelint |

GD-02 does not gain CSS coverage because the live skill's CSS gate does not
apply the 80-column comment rule. AF-20 remains the separate CSS comment-shape
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
7. run JR review and changed-disable-reason judgment.

The fallback checklist keeps generic GD-01, GD-02, GD-03, GD-06, GD-07,
GD-09, GD-22, and GD-25 available for other languages. TypeScript-specific
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
- No rule is marked fixable unless its safe AF subset shipped in Phase 3.
- Every branching repair is actionable without loading the review skill.
- Every Avandar disable requires a reason.
- Coverage integration fixtures prove each registered file and capability
  outcome through the root lint command.
- Covered outcomes leave the normal full and focused lanes, while uncovered
  outcomes still load fallback detection.
- JR-01 through JR-17 remain in `avandar-code-review`.
- Root lint and package verification pass inside the performance threshold.
