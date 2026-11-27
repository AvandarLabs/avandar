# Oxlint phase 3 safe fixers design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-3-safe-fixers.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 3 establishes the polyglot lint umbrella, its canonical rule catalog,
the core host, TypeScript, and CSS packages, and every TypeScript, JavaScript,
or CSS current-file convention with a behavior-preserving repair. A green Phase 3 run
lets `avandar-code-review` skip shipped safe-fix detection only for file and
capability outcomes whose coverage command proves that the repository enables
them.

## Goals

- Create `packages/lint` as the owner of the complete cross-language catalog.
- Publish `packages/lint/core` as `@avandar/lint`.
- Publish the Oxlint entry from `@avandar/lint-typescript` and the Stylelint
  entry from `@avandar/lint-css`.
- Add an `avandar-lint coverage` command that reports `enforced`,
  `not-applicable`, or `fallback` for reviewed paths.
- Enable native Oxlint safe rules before writing local equivalents.
- Implement only fixers that can prove their safety boundary.
- Move shipped safe-fix detection from the always-loaded skill into an on-demand
  deterministic fallback checklist.
- Record cold and warm lint timing plus the package-size baseline.

## Non-goals

- Phase 3 does not implement diagnostics whose repair needs judgment.
- Phase 3 does not add repository, TypeScript compiler, Git diff, SQL, Python,
  Rust, or universal companion analysis.
- Phase 3 does not claim non-TypeScript coverage for generic avlint-common-001 or avlint-common-002.
- Phase 3 does not run suggestions or dangerous fixes automatically.
- Phase 3 does not delete fallback detection for missing tools, disabled rules,
  unsupported languages, or repositories that do not install Avandar lint.

## Selected architecture

### Polyglot umbrella with ecosystem implementations

The umbrella contains the canonical data and human reference. Runtime-specific
packages sit beneath it:

```text
packages/lint/
  README.md
  rules.schema.json
  rules.yaml
  docs/rules/
  core/
    package.json
    src/catalog/
    src/cli/
  typescript/
    package.json
    src/oxlint/
  css/
    package.json
    src/stylelint/
```

`rules.yaml` is the single machine source. `README.md` contains the complete
catalog rendered from it. A test regenerates the README section and fails when
the checked-in content differs.

The umbrella does not pretend one runtime owns every language. Phase 5 adds
`sql`; Phase 6 adds `generic`, `python`, and `rust` without moving the catalog.

### Rejected: canonical catalog inside the Node package

Placing the catalog in `packages/lint/core` would make one implementation look
authoritative over other ecosystems and would force Python and Rust tooling to
depend conceptually on an npm package.

### Rejected: one mixed-runtime release artifact

One directory can own the system without forcing npm, PyPI, and Cargo
artifacts into one package. Each ecosystem retains its normal build and release
metadata under the umbrella.

## Package and catalog contract

| Surface | Contract |
| --- | --- |
| Canonical data | `packages/lint/rules.yaml` validated by `rules.schema.json` |
| Human catalog | Full generated table in `packages/lint/README.md` |
| Core package | `@avandar/lint` in `packages/lint/core` |
| TypeScript package | `@avandar/lint-typescript` in `packages/lint/typescript` |
| CSS package | `@avandar/lint-css` in `packages/lint/css` |
| Oxlint export | `@avandar/lint-typescript/oxlint` |
| Stylelint export | `@avandar/lint-css/stylelint` |
| Catalog export | `@avandar/lint/catalog` |
| Rule namespace | `avandar/<rule-name>` in Node lint engines |
| Rule docs | `packages/lint/docs/rules/<rule-name>.md` |
| Runtime | Node 24.x with native type stripping for package CLIs |
| Publication | Existing package release workflow, extended to all npm package directories under `packages/lint` |

The root workspace depends on all three packages through `workspace:*` and
keeps them in one fixed release group. `@avandar/lint-typescript` and
`@avandar/lint-css` depend on `@avandar/lint` for catalog and diagnostic
contracts. `@oxlint/plugins` exactly matches Oxlint while its JavaScript plugin
API is alpha. Stylelint remains an optional peer of the CSS package.

The Oxlint entry uses `eslintCompatPlugin` and `createOnce` when shared
traversal reduces work. Stylelint uses `stylelint.createPlugin` and declares
safe fixability in metadata.

## Coverage command

Phase 3 introduces one explicit command:

```text
avandar-lint coverage [PATH]... [--format stylish|agent|json]
```

Root and subcommand `-h` and `--help` print complete help to stdout and exit
zero before configuration, dependency, or repository access. In a terminal, a
bare `coverage` action starts its full wizard and offers paths, format, and
visible defaults. With no terminal, omitted optional values use the current
directory and `stylish`. Fully explicit values never prompt. JSON stdout
contains only the documented result. Human diagnostics and progress use
stderr or the controlling terminal.

Coverage is derived from the catalog, detected file languages, enabled root
lint configuration, plugin availability, and integration-tested engine
registrations. A declaration in `rules.yaml` cannot prove coverage by itself.
If configuration cannot be read, a plugin is missing, or a rule is disabled,
the affected file and capability outcome reports `fallback` with a recovery
message.

The skill may suppress a detector only when this command returns `enforced`
or `not-applicable` for the exact rule, language, file, and capability. A
language summary is enforced only if every applicable file and subpredicate is
enforced. Mixed supported and unsupported frameworks in the same language
remain independently visible.

## Rule scope

Phase 3 owns avlint-ts-001 through avlint-ts-014, avlint-ts-016, and avlint-css-001 for their TypeScript,
JavaScript, JSX, TSX, and CSS scope. avlint-ts-015 and avlint-sql-001 belong to Phase 5. avlint-common-001
and avlint-common-002 are generic, so Phase 3 covers only their JavaScript-family syntax
and leaves every other applicable language in fallback until Phase 6.

| Batch | Inventory | Enforcement |
| --- | --- | --- |
| Native Oxlint | avlint-ts-001 through avlint-ts-005, avlint-ts-016 | Existing native rules, including type-aware rules when required |
| Comment and documentation fixers | avlint-common-001, avlint-common-002, avlint-ts-009 | `@avandar/lint-typescript/oxlint`; avlint-common-001 and avlint-common-002 coverage limited to TS/JS |
| Function, naming, React, and utility fixers | avlint-ts-006 through avlint-ts-008, avlint-ts-010 through avlint-ts-014 | `@avandar/lint-typescript/oxlint` |
| CSS comment fixer | avlint-css-001 | `@avandar/lint-css/stylelint` |

Unsupported syntax remains unchanged. A deterministic but unsafe shape becomes
a Phase 4 diagnostic; an unsupported language remains a fallback outcome.

## Safety and test contract

Every fixer has positive, negative, idempotence, and safety-boundary fixtures.
Symbol renames reject exports, cross-file reach, collisions, computed
references, and string references. Function rewrites reject hoisting,
recursion, overloads, lexical bindings, and collisions. Object and array
rewrites preserve evaluation order and control flow.

Ordinary repair invokes only Oxlint safe fixes and Stylelint rules whose
metadata marks the edit safe. Normal commands never use
`--fix-suggestions` or `--fix-dangerously`.

Coverage fixtures seed one violation per claimed file and capability and invoke
the same root lint configuration a repository uses. A claim is accepted only
when the violation produces the canonical rule ID and nonzero status. Mixed
supported and unsupported capability fixtures prove conservative aggregation.

## Skill handoff

Phase 3 creates
`agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/deterministic-fallback-checklist.md`.
Shipped safe-fix detection moves there rather than being deleted. The always-loaded
skill runs lint and coverage first, then loads only the returned fallback IDs
for the languages in the diff.

Repo-local duplicates may be removed after this repository proves
`enforced`. Public fallback rules remain available for other repositories and
unknown languages.

## Performance and release gates

Record a root baseline before enabling the package, then cold and five-run warm
measurements after each batch. Stop and profile a batch whose warm median adds
both more than 25 percent and more than 2 seconds to the preceding baseline.

All three packages must pass build, import, and pack verification. Record their
compressed tarball sizes for Phase 5 and add `@avandar/lint`,
`@avandar/lint-typescript`, and `@avandar/lint-css` to one fixed release group.
Update the pnpm workspace to include the package directories beneath
`packages/lint`.

## Acceptance criteria

- The umbrella catalog validates and its README cannot drift from
  `rules.yaml`.
- `@avandar/lint/catalog`, `@avandar/lint-typescript/oxlint`, and
  `@avandar/lint-css/stylelint` resolve without a prebuild.
- `avandar-lint coverage` obeys the help, output, exit, and fail-closed
  contracts.
- Every in-scope fixture proves safe, idempotent repair.
- Root lint and package verification pass after applying the fixers.
- Covered safe-fix outcomes leave the normal skill path, while uncovered outcomes
  still load the deterministic fallback.
- The benchmark and package-size baseline are committed.
- No compiler program, repository graph, Git diff, SQL parser, Python checker,
  Rust checker, or universal language parser is introduced.
