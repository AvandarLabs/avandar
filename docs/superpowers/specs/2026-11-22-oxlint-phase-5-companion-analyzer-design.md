# Oxlint phase 5 companion analyzer design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-5-companion-analyzer.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 5 moves every remaining deterministic convention into a companion
analyzer because Oxlint and Stylelint plugins cannot directly own its required
evidence. The companion covers Avandar-specific type analysis, paths and
repository graphs, Git diffs, and SQL without pretending those checks are
single-file lint rules.

## Goals

- Add a programmatic companion API and the `avandar-lint` executable to
  `@avandar/lint`.
- Build each expensive repository fact once and share it across rules.
- Report diagnostics through the same identifiers and remediation contract as
  phases 3 and 4.
- Integrate the companion into root `pnpm lint` after Oxlint and Stylelint.
- Remove every shipped companion detector from `avandar-code-review`.
- Measure runtime, memory, and package installation cost before deciding
  whether the companion must split into a second package.

## Non-goals

- Phase 5 does not reimplement current-file rules already owned by Oxlint or
  Stylelint.
- Phase 5 does not turn JR candidates into deterministic violations.
- Phase 5 does not mutate production data, run migrations, or reset a database.
- Phase 5 does not add interactive prompts to lint.

## Approaches

### Selected: one package with a lazily loaded companion entry

Add `@avandar/lint/companion` and the `avandar-lint` binary to
`packages/node/lint`. Compiler, graph, Git, and SQL dependencies load only when
the companion entry runs. One package preserves stable rule IDs, one diagnostic
schema, one documentation tree, and one release version.

### Conditional fallback: split only the companion

If `pnpm pack` shows that phase 5 adds more than 10 MiB compressed, or if its
runtime dependencies install native platform artifacts, split the companion to
`@avandar/lint-companion`. The new package depends on `@avandar/lint` for rule
metadata and diagnostics. This is a measured escape hatch, not the default
architecture.

### Rejected: private script or app

A root script hides a reusable lint interface outside the package release
system. An app creates a false deployment boundary and cannot be consumed as a
normal package API.

## Public interface

```ts
export type LintFormat = "stylish" | "agent" | "json";

export interface LintRepositoryOptions {
  readonly cwd: string;
  readonly paths: readonly string[];
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

export function lintRepository(
  options: LintRepositoryOptions,
): Promise<readonly LintDiagnostic[]>;
```

The executable contract is `avandar-lint [PATH]...`. It supports
`-h, --help`, `--format stylish|agent|json`, and `--fix`. A bare invocation
checks the current working directory. Help exits zero before reading repository
configuration or loading optional analyzers. JSON writes only the result to
stdout; progress and diagnostics intended for humans use stderr. The command is
non-interactive and uses nonzero status for findings or operational failure.

`--fix` may apply only companion edits whose exact filesystem or configuration
change is proven and idempotent. Guided rules remain diagnostics. Normal
repository lint does not enable speculative edits.

## Shared repository context

The companion creates one immutable context per run:

- a normalized, ignored-path-aware file index;
- a parsed module and export graph;
- one TypeScript `Program` and `TypeChecker` for selected projects;
- one Git diff snapshot when a rule requires changed-file evidence;
- cached SQL parse results per file;
- package manifests, exports, Deno import maps, and relevant config files.

Rules declare the evidence they need. The runner does not construct the
TypeScript program, Git snapshot, or SQL parser unless at least one enabled rule
requires it.

## Rule scope

Phase 5 owns AF-18, AF-21, GD-17, GD-20, GD-28, GD-29, GD-31, and RP-01
through RP-19.

| Analyzer | Inventory |
| --- | --- |
| Filesystem, module graph, tests, and package topology | RP-01 through RP-09, RP-14, RP-16, RP-19 |
| Type-aware Avandar rules | AF-18, GD-17, GD-20, GD-28, GD-29, GD-31, RP-09, RP-13, RP-15 |
| Git-diff and migration state | RP-10, RP-11, RP-13, RP-15, RP-18, RP-19 |
| SQL syntax and dependency graph | AF-21, RP-11, RP-12, RP-17, RP-18 |

Overlapping rows reuse the same context rather than running a second scan.
Rules report only violations their evidence proves. For example, RP-15 reports
a cache-schema omission only when type and serializer evidence proves that a
serialized shape changed.

## SQL parser gate

Before selecting a parser, run each candidate against all committed declarative
schema and migration SQL. The selected parser must either parse every file or
surface unsupported syntax as an explicit analyzer limitation without false
diagnostics. Record parse coverage, compressed dependency size, native-artifact
requirements, cold load time, and source-location fidelity.

No regex-only implementation may classify SQL declaration ownership, policy
operations, dependencies, or comment placement.

## Performance and cache contract

Record cold and five-run warm timings for each analyzer group, peak resident
memory, TypeScript program construction time, SQL parse time, and complete root
lint time. Repeated rules must share context. Persistent caches key on tool
version, configuration, file content, and relevant compiler settings so stale
facts cannot survive a rule or config change.

The final root `pnpm lint` order is Oxlint, Stylelint, companion, then any
existing advisory diagnostics. Machine-oriented CI output selects a stable
format explicitly instead of relying on terminal detection.

## Skill handoff

Remove a companion detector from the skill only after its enabled rule passes
positive, negative, cross-platform path, and repository integration fixtures.
The skill retains JR-01 through JR-17 and reviews the truthfulness of changed
disable reasons. It never duplicates a green deterministic scan.

## Acceptance criteria

- `@avandar/lint/companion` and `avandar-lint` expose the documented API and
  CLI behavior.
- Every in-scope deterministic rule uses the minimum required evidence and
  shares repository context.
- SQL rules use a parser validated against the complete committed corpus.
- JSON output is stable and uncontaminated by progress text.
- Root lint invokes the companion and returns nonzero when it reports a
  violation.
- Shipped companion searches are removed from every review lane.
- Runtime, memory, cache behavior, compressed package delta, and installation
  artifacts are measured.
- The companion splits packages only if the documented size or native-artifact
  gate is crossed.
