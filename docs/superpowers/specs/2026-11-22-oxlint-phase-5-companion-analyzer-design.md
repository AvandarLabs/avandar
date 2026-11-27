# Oxlint phase 5 language-specific companion analyzer design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-5-companion-analyzer.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 5 builds the reusable companion host and the analyzers whose conventions
are truly language- or ecosystem-specific. The first packs cover
TypeScript/JavaScript repository structure and type-aware Avandar rules, plus
SQL syntax and migration evidence. Generic cross-language rules stay out of
these packs and move to Phase 6.

## Goals

- Add a programmatic companion API and the `avandar-lint check` command to
  `@avandar/lint` under `packages/lint/core`.
- Add explicit repository configuration for enabled languages and
  language-specific packs.
- Build expensive facts once and share them across rules.
- Implement TypeScript/JavaScript repository, compiler, path, package, test,
  and Playwright rules.
- Implement SQL parser, migration, schema, and Git-diff rules.
- Report through the same canonical IDs and remediation contract as Phases 3
  and 4.
- Integrate the companion into root `pnpm lint`.
- Move covered companion detectors into the on-demand skill fallback.
- Measure runtime, memory, and installation cost.

## Non-goals

- Phase 5 does not reimplement current-file rules owned by Oxlint or
  Stylelint.
- Phase 5 does not implement generic Python, Rust, Go, Ruby, Java, Kotlin,
  Swift, C-family, shell, YAML, or JSONC coverage.
- Phase 5 does not put generic file length, function length, comment,
  identifier, loop, or test rules inside the TypeScript pack.
- Phase 5 does not implement avlint-common-011 generic E2E mutation analysis.
- Phase 5 does not turn judgment candidates into deterministic violations.
- Phase 5 does not mutate production data, run migrations, or reset a database.

## Selected architecture

### One host with explicit language-specific packages

`@avandar/lint/companion` exports the host and shared contracts. The
TypeScript and SQL packages export pack registrations and lazy evidence
providers:

```text
packages/lint/core/src/companion/
  host/
  context/
packages/lint/typescript/src/companion/
packages/lint/sql/src/companion/
```

Phase 6 adds `packages/lint/generic` without changing the host API. Keeping
generic rules in their own package prevents TypeScript directory conventions
from leaking into Python or Rust repositories. The host resolves configured,
installed pack packages lazily and reports a missing package as a coverage gap.

### Repository configuration

Repositories configure the host in `avandar-lint.config.json`:

```json
{
  "$schema": "./node_modules/@avandar/lint/avandar-lint.schema.json",
  "languages": ["typescript", "javascript", "sql"],
  "packs": ["typescript", "sql"]
}
```

`languages` controls which generic language coverage may apply once Phase 6 is
installed. `packs` opts into truly language-specific conventions. A repository
can therefore enable Python generic rules later without inheriting TypeScript
file or directory rules.

Unknown keys, language IDs, pack IDs, or rule IDs are configuration errors.
Detected supported source that is not listed remains `fallback` in the
coverage report rather than silently passing.

### Fixed package boundaries

The core host, TypeScript implementation, and SQL implementation remain
separate packages regardless of measured size. This keeps language parsers and
compiler dependencies out of repositories that do not enable them. All npm
packages under `packages/lint` share one fixed release group and depend on
`@avandar/lint` for the catalog, diagnostics, coverage, and host contracts.

## CLI contract

Phase 5 extends the Phase 3 root CLI with two actions:

```text
avandar-lint check [PATH]... [--fix] [--format stylish|agent|json]
avandar-lint coverage [PATH]... [--format stylish|agent|json]
```

A bare root invocation in an interactive terminal opens the action menu. A
bare unattended root fails promptly with full usage and an exact
`avandar-lint check .` recovery command. A bare action in a terminal starts its
full wizard and offers paths, format, `--fix` where applicable, and visible
defaults. Fully explicit actions never prompt. Root and subcommand help take
precedence over configuration, dependency checks, prompts, and repository
access.

`check` announces work on stderr before analysis starts. JSON stdout contains
only the result. Errors use the shared CLI error and recovery shape. The
command is noninteractive once an action and paths are supplied. Root
`pnpm lint` always invokes the explicit `check` action.

## Public interface

```ts
export type LintFormat = "stylish" | "agent" | "json";
export type CompanionPackId = "sql" | "typescript";
export type LanguageId =
  | "javascript"
  | "sql"
  | "typescript";

export interface LintRepositoryOptions {
  readonly cwd: string;
  readonly paths: readonly string[];
  readonly languages: readonly LanguageId[];
  readonly packs: readonly CompanionPackId[];
  readonly fix: boolean;
}

export interface LintTextEdit {
  readonly filePath: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly text: string;
}

export interface LintFileMove {
  readonly fromPath: string;
  readonly toPath: string;
}

export interface LintFix {
  readonly description: string;
  readonly textEdits: readonly LintTextEdit[];
  readonly fileMoves: readonly LintFileMove[];
}

export interface LintDiagnostic {
  readonly ruleId: string;
  readonly message: string;
  readonly filePath: string;
  readonly start: { readonly line: number; readonly column: number };
  readonly end?: { readonly line: number; readonly column: number };
  readonly documentationPath?: string;
  readonly fix?: LintFix;
}

export interface CoverageGap {
  readonly ruleId: string;
  readonly languageId: LanguageId;
  readonly filePath: string;
  readonly capabilityId?: string;
  readonly reason: string;
  readonly recovery?: string;
}

export type EngineRunResult =
  | {
      readonly status: "available";
      readonly diagnostics: readonly LintDiagnostic[];
      readonly analyzedPaths: readonly string[];
      readonly coverageGaps: readonly CoverageGap[];
    }
  | {
      readonly status: "unavailable";
      readonly reason: string;
      readonly recovery?: string;
    };

export function lintRepository(
  options: LintRepositoryOptions,
): Promise<EngineRunResult>;
```

`--fix` applies only proven, idempotent filesystem or configuration changes.
Guided rules remain diagnostics. Pack and parser interfaces use the same tagged
result so a partial parser, unsupported framework, excluded file, or failed
evidence provider reaches coverage instead of disappearing as an empty
diagnostic list.

## Shared repository context

The host creates one immutable context per run:

- a normalized, ignored-path-aware file index;
- a parsed TypeScript/JavaScript module and export graph;
- one TypeScript `Program` and `TypeChecker` per selected project;
- one Git diff snapshot when required;
- cached SQL documents with source locations;
- package manifests, exports, Deno import maps, and relevant config files.

Rules declare their evidence. The host does not load a pack, TypeScript
program, Git snapshot, or SQL parser unless an enabled rule requires it.

## Rule scope

Phase 5 owns avlint-ts-015, avlint-sql-001, the repository-aware subset of avlint-ts-032, avlint-ts-028, avlint-ts-031,
avlint-ts-037, avlint-ts-038, avlint-ts-040, avlint-ts-042 through avlint-ts-053, avlint-ts-054, and avlint-sql-005 through avlint-ts-055.

| Pack | Inventory |
| --- | --- |
| TypeScript filesystem, module graph, tests, packages, Playwright | avlint-ts-042 through avlint-ts-050, avlint-ts-052, avlint-ts-054, avlint-ts-055 |
| TypeScript type-aware rules | avlint-ts-015, repository-aware avlint-ts-032, avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038, avlint-ts-040, avlint-ts-050, avlint-ts-051, avlint-ts-053 |
| SQL and migration state | avlint-sql-001, avlint-sql-002 through avlint-sql-004, avlint-sql-005, avlint-sql-006 |
| Shared Git evidence | avlint-sql-002, avlint-sql-003, avlint-ts-051, avlint-ts-053, avlint-sql-006, avlint-ts-055 |

avlint-common-011 moves to the Phase 6 generic pack. Phase 5 Playwright analysis may
provide reusable framework interfaces, but it cannot claim generic E2E
coverage.

## SQL parser gate

Run parser candidates against all committed declarative schema and migration
SQL. The selected parser must parse every file or surface unsupported syntax as
an explicit limitation without false diagnostics. Record coverage, compressed
dependency size, native-artifact requirements, cold load time, and source
locations.

Regex-only implementations may not classify SQL declaration ownership, policy
operations, dependencies, or comment placement.

## Performance and cache contract

Record cold and five-run warm timings per pack, peak resident memory,
TypeScript construction time, SQL parse time, and complete root lint time.
Persistent caches key on tool version, catalog version, configuration, file
content, and compiler settings.

Root `pnpm lint` invokes Oxlint, Stylelint, `avandar-lint check`, then existing
advisory diagnostics. CI selects an explicit format rather than relying on
terminal detection.

## Skill handoff

Coverage for a companion rule becomes `enforced` only after positive,
negative, cross-platform path, configuration, and repository integration
fixtures pass. The skill keeps the detector in its on-demand fallback and
loads it whenever the pack is absent, disabled, or unable to analyze a file.

The always-loaded skill retains avlint-common-012 through avlint-ts-058 and the truthfulness review
for changed disable reasons.

## Acceptance criteria

- `@avandar/lint/companion`, `avandar-lint check`, and the configuration schema
  expose the documented interfaces.
- `@avandar/lint-typescript/companion` and `@avandar/lint-sql/companion` load
  only when configured.
- Generic rule families are absent from the language-specific packs except
  where a TypeScript or SQL implementation is already owned by an earlier
  linter phase.
- Every rule uses minimum evidence and shared repository context.
- Every pack reports analyzed paths and explicit limitations through
  `EngineRunResult`; an empty diagnostic list never implies coverage.
- SQL rules use a parser validated against the committed corpus.
- JSON output is stable and uncontaminated by progress text.
- Root lint returns nonzero for companion findings.
- Coverage suppresses review only for enabled, proven pack, rule, language,
  file, and capability outcomes.
- Runtime, memory, cache behavior, compressed size for each package, and
  installation artifacts are measured.
