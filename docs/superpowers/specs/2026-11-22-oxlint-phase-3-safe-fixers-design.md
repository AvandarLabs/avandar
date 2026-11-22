# Oxlint phase 3 safe fixers design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-3-safe-fixers.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 3 establishes the Avandar lint package and moves every current-file
convention with a behavior-preserving, unambiguous repair into the normal lint
fix path. A green phase 3 run means `avandar-code-review` no longer spends
tokens finding the shipped AF violations.

## Goals

- Publish one Node-only package at `packages/node/lint` as `@avandar/lint`.
- Export Oxlint and Stylelint plugin entries from the package.
- Enable native Oxlint safe rules before writing local equivalents.
- Implement only fixers that can prove their safety boundary.
- Apply safe fixes through the existing `pnpm lint:ts:fix-changed` and style
  lint workflows.
- Delete shipped AF detection from every full and focused review lane.
- Record cold and warm lint timing plus the package size baseline.

## Non-goals

- Phase 3 does not implement diagnostics whose repair needs judgment.
- Phase 3 does not add a repository companion process.
- Phase 3 does not add TypeScript compiler, filesystem graph, Git diff, or SQL
  analysis.
- Phase 3 does not run Oxlint suggestions or dangerous fixes automatically.

## Approaches

### Selected: one public Node tooling package

Create `packages/node/lint`, published as `@avandar/lint`, with
`@avandar/lint/oxlint` and `@avandar/lint/stylelint` exports. Phase 5 adds the
companion export and executable to the same package. This keeps rule IDs,
fixtures, diagnostics, documentation, and versions together.

### Rejected: separate package per lint engine

Independent Oxlint, Stylelint, and companion packages isolate dependency
weight, but they duplicate package infrastructure and make one convention span
several release versions. Phase 5 may split only the companion if measured
install size proves that necessary.

### Rejected: an app or a shared-runtime package

An app implies a deployed or independently operated runtime that does not
exist. `packages/shared` promises browser, Node, and Deno reach, while this
tooling depends on Node, linter runtimes, and eventually filesystem and compiler
APIs.

## Package contract

| Surface | Contract |
| --- | --- |
| Package | `@avandar/lint` in `packages/node/lint` |
| Oxlint export | `@avandar/lint/oxlint` |
| Stylelint export | `@avandar/lint/stylelint` |
| Rule namespace | `avandar/<rule-name>` in both engines |
| Rule documentation | `packages/node/lint/docs/rules/<rule-name>.md` |
| Runtime | Node 24.x |
| Publication | Public package through the existing `packages/**` release workflow |

The root workspace depends on `@avandar/lint` through `workspace:*` so root
lint configuration can resolve both plugin entries. `@oxlint/plugins` must
exactly match the installed Oxlint version while the JavaScript plugin API is
alpha. Stylelint is an optional peer dependency rather than a bundled runtime.

The Oxlint entry uses `eslintCompatPlugin` and `createOnce` where a shared
traversal materially reduces work. Tests use the supported Oxlint RuleTester.
The Stylelint entry uses `stylelint.createPlugin` and declares fixability in
rule metadata.

## Rule scope

Phase 3 owns AF-01 through AF-17, AF-19, and AF-20. AF-18 and AF-21 belong to
the phase 5 companion because they require type-aware Avandar analysis or SQL
parsing.

| Batch | Inventory | Enforcement |
| --- | --- | --- |
| Native Oxlint | AF-01 through AF-05, AF-19 | Configure and test the existing native rules, including native type-aware rules where required |
| Comment and documentation fixers | AF-06, AF-07, AF-11 | `@avandar/lint/oxlint` |
| Function, naming, React, and utility fixers | AF-08 through AF-10, AF-12 through AF-17 | `@avandar/lint/oxlint` |
| CSS comment fixer | AF-20 | `@avandar/lint/stylelint` |

Each local fixer reports and edits only its proven syntax subset. Unsupported
syntax remains unchanged and is reserved for phase 4 guided diagnostics when a
deterministic gate exists.

## Safety and test contract

Every fixer has positive, negative, idempotence, and safety-boundary fixtures.
Symbol renames reject exports, cross-file reach, collisions, computed
references, and string-based references. Function rewrites reject semantic
changes involving hoisting, recursion, overloads, lexical bindings, and name
collisions. Object and array construction rewrites preserve evaluation order
and control flow.

Ordinary lint repair invokes only Oxlint safe fixes and Stylelint rules whose
metadata marks the edit safe. `--fix-suggestions` and `--fix-dangerously` are
not added to normal commands.

## Performance and release gates

The phase records a root lint baseline before enabling the package, then cold
and five-run warm measurements after each rule batch. Stop and profile a batch
whose warm median adds both more than 25 percent and more than 2 seconds to the
preceding baseline.

The public package must pass the existing package build and pack verification.
Its compressed tarball size is recorded as the baseline for phase 5. Add
`@avandar/lint` to the fixed release group so all Avandar packages remain on a
coordinated version.

## Skill handoff

After a rule is enabled and the complete lint run is green, remove its AF
search from the main skill, focused packs, find lanes, phase checklists, and
library or repo-local duplicates. Mixed conventions retain only their JR or
not-yet-shipped portions. The skill continues to run lint before judgment
review.

## Acceptance criteria

- `@avandar/lint/oxlint` and `@avandar/lint/stylelint` resolve from root lint
  configuration without a prebuild.
- Every in-scope AF fixture proves safe, idempotent repair.
- Repository lint and package verification pass after applying the fixers.
- No in-scope AF detector remains in `avandar-code-review` after its rule ships.
- The phase 3 benchmark and package-size baseline are committed.
- No companion process, compiler program, repository graph, Git diff, or SQL
  parser is introduced.
