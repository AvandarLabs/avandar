# Oxlint phase 5 companion analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable repository companion analyzer for every deterministic
Avandar convention that Oxlint and Stylelint cannot directly own.

**Architecture:** `@avandar/lint/companion` and the `avandar-lint` executable
run rules against one lazily constructed repository context. File, module,
TypeScript, Git, and SQL facts are built once and shared by all enabled rules.
The companion uses the same rule IDs, diagnostics, and documentation as the
lint plugins and joins root `pnpm lint` before judgment review.

**Tech Stack:** Node 24.x native TypeScript, TypeScript compiler API, pnpm
workspaces, Vitest, Git CLI read operations, a PostgreSQL parser selected by
corpus testing, tsup.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-5-companion-analyzer-design.md`

## Global Constraints

- The default home is `packages/node/lint`, with the public entry
  `@avandar/lint/companion` and binary `avandar-lint`.
- Split to `@avandar/lint-companion` only if phase 5 adds more than 10 MiB to
  the compressed tarball or installs native platform artifacts.
- The command is non-interactive and supports `-h, --help`,
  `--format stylish|agent|json`, and `--fix`.
- Help exits zero before repository reads or optional analyzer loads.
- JSON writes only the result to stdout; progress and human diagnostics use
  stderr.
- Exit code 0 means clean or help, 1 means lint findings, and 2 means an
  operational or configuration failure.
- `--fix` applies only proven, idempotent edits; guided rules never guess.
- SQL classification uses a parser validated against the complete committed
  SQL corpus, never regular expressions alone.
- The analyzer performs no production writes, database mutations, migrations,
  resets, or reseeds.
- New production behavior follows red-green TDD.
- Stop and profile a batch whose warm median adds both more than 25 percent
  and more than 2 seconds to the preceding complete lint baseline.
- A review-skill detector is removed only after its replacement is enabled and
  repository integration tests pass.

## Review Focus

- Paths and module identities must be stable on case-sensitive and
  case-insensitive filesystems; Tasks 2 and 3 use synthetic mixed-case trees.
- Project references and Deno modules must not enter the wrong TypeScript
  program; Task 4 tests multiple configs and unreachable packages.
- Git-diff rules must behave in clean trees, shallow clones, merge bases, and
  untracked files; Task 6 tests every state without changing repository data.
- SQL parser failures must not become false violations; Task 5 turns unsupported
  syntax into one explicit operational diagnostic.
- Persistent caches must invalidate on tool, config, compiler-option, and file
  content changes; Tasks 2, 4, and 5 pin each cache key component.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/node/lint/src/companion/cli.ts` | Argument parsing, help, streams, and exit status |
| `packages/node/lint/src/companion/lintRepository.ts` | Public API and rule orchestration |
| `packages/node/lint/src/companion/LintDiagnostic.types.ts` | Stable diagnostic and safe-fix types |
| `packages/node/lint/src/companion/rules/CompanionRule.types.ts` | Rule interface and evidence declarations |
| `packages/node/lint/src/companion/context/` | Lazy file, graph, TypeScript, Git, and SQL evidence |
| `packages/node/lint/src/companion/formatters/` | Stylish, agent, and JSON serialization |
| `packages/node/lint/src/companion/rules/*.ts` | Rule families grouped by shared evidence |
| `packages/node/lint/test/companion/fixtures/` | Synthetic repositories and SQL corpus fixtures |
| `docs/lint-benchmarks/oxlint-phase-5.md` | Runtime, memory, cache, and package-size results |
| `docs/lint-benchmarks/oxlint-phase-5-sql-parser.md` | Parser corpus and dependency comparison |

---

### Task 1: Companion API, CLI, and output formats

**Files:**

- Create: `packages/node/lint/src/companion/LintDiagnostic.types.ts`
- Create: `packages/node/lint/src/companion/LintRepositoryOptions.types.ts`
- Create: `packages/node/lint/src/companion/rules/CompanionRule.types.ts`
- Create: `packages/node/lint/src/companion/lintRepository.ts`
- Create: `packages/node/lint/src/companion/index.ts`
- Create: `packages/node/lint/src/companion/cli.ts`
- Create: `packages/node/lint/src/companion/formatters/formatStylish.ts`
- Create: `packages/node/lint/src/companion/formatters/formatAgent.ts`
- Create: `packages/node/lint/src/companion/formatters/formatJson.ts`
- Create: `packages/node/lint/src/companion/cli.test.ts`
- Create: `packages/node/lint/src/companion/lintRepository.test.ts`
- Create: `docs/lint-benchmarks/oxlint-phase-5.md`
- Modify: `packages/node/lint/package.json`
- Modify: `packages/node/lint/tsup.config.ts`

**Interfaces:**

- Consumes: Phase 4 rule metadata and diagnostic-message contract.
- Produces: `lintRepository(options): Promise<readonly LintDiagnostic[]>`, the
  `CompanionRule` interface with declared evidence kinds, the three formatters,
  and the `avandar-lint` executable.

- [ ] **Step 1: Write failing public API and CLI tests**

  Pin the exact repository option, diagnostic, text-edit, file-move, and fix
  fields from the spec. Keep output format in CLI options rather than
  `LintRepositoryOptions`. Test bare current directory, positional paths, each
  format, `--fix`, unknown options, missing option values, `-h` and `--help` in
  every position, TTY-independent defaults, stdout and stderr separation, and
  exit codes 0, 1, and 2.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/companion/{cli,lintRepository}.test.ts`

  Expected: FAIL because the companion entry does not exist.

- [ ] **Step 3: Implement the API and command shell with an empty rule set**

  Use Node's argument parser. Default to `stylish`; callers select `agent` or
  `json` explicitly. Parse help before loading config or importing optional
  analyzers. Sort diagnostics by normalized path, start position, and rule ID
  before formatting.

- [ ] **Step 4: Add source and packed exports**

  Add `./companion` and the `avandar-lint` bin to development exports and
  `publishConfig`. Add the entry and shebang-preserving banner to tsup.

- [ ] **Step 5: Run tests, build, packed-bin help, and baseline benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint build`

  Pack the package, install it into a temporary directory, and run
  `avandar-lint --help` with repository configuration intentionally absent.

  Run: `pnpm lint:benchmark --label phase-5-empty-companion`

  Expected: PASS, help exits zero, and JSON stdout is valid JSON with no other
  bytes.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/node/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add companion API and CLI"
  ```

### Task 2: Shared repository context and cache

**Files:**

- Create: `packages/node/lint/src/companion/context/RepositoryContext.types.ts`
- Create: `packages/node/lint/src/companion/context/createRepositoryContext.ts`
- Create: `packages/node/lint/src/companion/context/createFileIndex.ts`
- Create: `packages/node/lint/src/companion/context/createModuleGraph.ts`
- Create: `packages/node/lint/src/companion/context/createCache.ts`
- Create: matching `*.test.ts` beside each creator above
- Create: `packages/node/lint/test/companion/fixtures/repository-context/`
- Modify: `packages/node/lint/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 1 `CompanionRule.evidence` and normalized diagnostics.
- Produces: `createRepositoryContext(options)`, eager `fileIndex` and
  `moduleGraph`, lazy `getTypeScriptContext()`, `getGitContext()`, and
  `getSqlContext()`, plus a content-addressed cache.

- [ ] **Step 1: Write failing repository-context tests**

  Cover ignored directories, symlinks, path separators, mixed-case files,
  package exports, Deno import maps, unresolved imports, cycles, and duplicate
  module identities. Assert that no lazy analyzer loads for a rule that does not
  declare its evidence.

- [ ] **Step 2: Write failing cache invalidation tests**

  Assert cache misses when tool version, config, compiler options, or file
  content changes and cache hits when only modification time changes.

- [ ] **Step 3: Run the focused tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/companion/context`

  Expected: FAIL because the context creators are absent.

- [ ] **Step 4: Implement immutable context construction**

  Build the file index once, resolve graph nodes against package and Deno
  configuration, and expose analyzer promises that memoize the first request.
  Store cache data outside tracked source and include a schema version.

- [ ] **Step 5: Run context tests and benchmark the base scan**

  Run: `pnpm vitest run packages/node/lint/src/companion/context`

  Run: `pnpm lint:benchmark --label phase-5-repository-context`

  Expected: PASS within the stop threshold and no TypeScript, Git, or SQL load
  appears in the base-scan profile.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/node/lint/src/companion packages/node/lint/test/companion docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add shared repository context"
  ```

### Task 3: Filesystem, module, test, and package rules

**Files:**

- Create: `packages/node/lint/src/companion/rules/moduleLayout.ts`
- Create: `packages/node/lint/src/companion/rules/importTopology.ts`
- Create: `packages/node/lint/src/companion/rules/testLayout.ts`
- Create: `packages/node/lint/src/companion/rules/cssModuleOwnership.ts`
- Create: `packages/node/lint/src/companion/rules/modelLocation.ts`
- Create: `packages/node/lint/src/companion/rules/e2eStaticRules.ts`
- Create: `packages/node/lint/src/companion/rules/packageImportMaps.ts`
- Create: matching `*.test.ts` beside each rule family above
- Create: matching pages under `packages/node/lint/docs/rules/`
- Create: `packages/node/lint/test/companion/fixtures/repository-rules/`
- Modify: `packages/node/lint/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 file index and module graph.
- Produces: RP-01 through RP-08, RP-14, RP-16, and RP-19. RP-09 remains for
  Task 4.

- [ ] **Step 1: Write failing synthetic-repository fixtures**

  Give every rule family one clean tree, one invalid tree, mixed-case and
  Windows-separator projections, ignored generated paths, and an ambiguous case
  that must not report. For RP-19, assert an idempotent exact import-map edit;
  all other multi-file repairs remain guided unless separately proven.

- [ ] **Step 2: Run the rule tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/companion/rules/{moduleLayout,importTopology,testLayout,cssModuleOwnership,modelLocation,e2eStaticRules,packageImportMaps}.test.ts`

  Expected: FAIL because the rule families are absent.

- [ ] **Step 3: Implement and register the repository rules**

  Return diagnostics through the Task 1 schema. Declare only `files` and
  `modules` evidence. Keep test behavior, domain naming quality, and CSS token
  choice in JR.

- [ ] **Step 4: Run tests, package verification, and benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check`

  Run: `pnpm lint:benchmark --label phase-5-repository-rules`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/node/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add repository convention rules"
  ```

### Task 4: TypeScript program and type-aware rules

**Files:**

- Create: `packages/node/lint/src/companion/context/createTypeScriptContext.ts`
- Create: `packages/node/lint/src/companion/context/createTypeScriptContext.test.ts`
- Create: `packages/node/lint/src/companion/rules/typeAwareErrors.ts`
- Create: `packages/node/lint/src/companion/rules/nullabilityBoundaries.ts`
- Create: `packages/node/lint/src/companion/rules/immutabilityContracts.ts`
- Create: `packages/node/lint/src/companion/rules/modelContracts.ts`
- Create: `packages/node/lint/src/companion/rules/unionDispatch.ts`
- Create: `packages/node/lint/src/companion/rules/copyFunctions.ts`
- Create: `packages/node/lint/src/companion/rules/avaPageVersions.ts`
- Create: `packages/node/lint/src/companion/rules/cacheSchemaVersion.ts`
- Create: matching `*.test.ts` beside each rule family above
- Create: matching pages under `packages/node/lint/docs/rules/`
- Create: `packages/node/lint/test/companion/fixtures/type-aware-rules/`
- Modify: `packages/node/lint/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 lazy context and cache.
- Produces: One cached TypeScript `Program` and `TypeChecker` per selected
  project, plus AF-18, GD-17, GD-20, GD-28, GD-29, GD-31, RP-09, RP-13, and
  RP-15.

- [ ] **Step 1: Write failing TypeScript-context tests**

  Cover project references, package configs, Deno-reachable modules, generated
  exclusions, compiler-option cache invalidation, and two rules sharing the
  same `Program` identity.

- [ ] **Step 2: Write failing rule fixtures**

  Pin the exact proof boundaries from the inventory. Include external null
  contracts, intentional mutation APIs, model-folder exceptions, open versus
  closed unions, copy caller counts, old AvaPage snapshots, serializer-only
  shape changes, and every ambiguous case that must not report.

- [ ] **Step 3: Run the type-aware tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/companion/{context/createTypeScriptContext,rules/typeAwareErrors,rules/nullabilityBoundaries,rules/immutabilityContracts,rules/modelContracts,rules/unionDispatch,rules/copyFunctions,rules/avaPageVersions,rules/cacheSchemaVersion}.test.ts`

  Expected: FAIL because the type context and rules are absent.

- [ ] **Step 4: Implement the shared type context and rules**

  Resolve each file to exactly one selected project. AF-18 may expose a safe
  edit only when the type checker and control-flow shape prove equivalence.
  Every other rule emits a guided diagnostic.

- [ ] **Step 5: Run tests and record cold, warm, and cached timing**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check`

  Run: `pnpm lint:benchmark --label phase-5-type-aware-rules`

  Expected: PASS within the stop threshold, with one program construction per
  project and cache behavior recorded.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/node/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add type-aware convention rules"
  ```

### Task 5: SQL parser selection and SQL-aware rules

**Files:**

- Create: `packages/node/lint/src/companion/context/createSqlContext.ts`
- Create: `packages/node/lint/src/companion/context/createSqlContext.test.ts`
- Create: `packages/node/lint/src/companion/rules/sqlComments.ts`
- Create: `packages/node/lint/src/companion/rules/storageMigrations.ts`
- Create: `packages/node/lint/src/companion/rules/schemaDependencyLayers.ts`
- Create: `packages/node/lint/src/companion/rules/sqlIdentifiers.ts`
- Create: `packages/node/lint/src/companion/rules/rlsTestCoverage.ts`
- Create: matching `*.test.ts` beside each rule family above
- Create: matching pages under `packages/node/lint/docs/rules/`
- Create: `packages/node/lint/test/companion/fixtures/sql-rules/`
- Create: `docs/lint-benchmarks/oxlint-phase-5-sql-parser.md`
- Modify: `packages/node/lint/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/node/lint/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 lazy context and cache.
- Produces: Cached SQL documents with source locations, AF-21, RP-11, RP-12,
  RP-17, and RP-18.

- [ ] **Step 1: Build the committed SQL corpus test**

  Enumerate every tracked file under `supabase/schemas/` and the migration
  directories. For each parser candidate, record successful files, unsupported
  syntax, source-location fidelity, compressed dependency size, native
  artifacts, cold load time, and parse time.

- [ ] **Step 2: Select a parser against the documented gate**

  Choose only a parser that handles the entire corpus or returns an explicit
  unsupported-syntax result without partial false diagnostics. If no candidate
  passes, stop this task and record the blocking syntax instead of implementing
  regex-based SQL classification.

- [ ] **Step 3: Write failing parser-cache and SQL-rule fixtures**

  Cover declaration and body comments, storage-only migration statements,
  idempotent bucket creation, seed reachability, schema policy mirrors, numeric
  dependency layers, identifier and trigger forms, policy operations, and
  required positive and negative pgTAP inventory. Assert parse failures produce
  one operational diagnostic and no convention findings.

- [ ] **Step 4: Implement the SQL context and rules**

  Cache by content and parser version. AF-21 exposes fixes only where parsed
  node ownership proves the exact comment form. All structural SQL rules remain
  guided.

- [ ] **Step 5: Run corpus, rule, package, and benchmark checks**

  Run: `pnpm vitest run packages/node/lint/src/companion/{context/createSqlContext,rules/sqlComments,rules/storageMigrations,rules/schemaDependencyLayers,rules/sqlIdentifiers,rules/rlsTestCoverage}.test.ts`

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check`

  Run: `pnpm lint:benchmark --label phase-5-sql-rules`

  Expected: PASS for the complete committed SQL corpus within the stop
  threshold.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/node/lint pnpm-lock.yaml docs/lint-benchmarks/oxlint-phase-5.md docs/lint-benchmarks/oxlint-phase-5-sql-parser.md
  git commit -m "feat(lint): add SQL-aware convention rules"
  ```

### Task 6: Git-diff and migration-state rules

**Files:**

- Create: `packages/node/lint/src/companion/context/createGitContext.ts`
- Create: `packages/node/lint/src/companion/context/createGitContext.test.ts`
- Create: `packages/node/lint/src/companion/rules/migrationSequence.ts`
- Create: `packages/node/lint/src/companion/rules/migrationSequence.test.ts`
- Create: `packages/node/lint/test/companion/fixtures/git-rules/`
- Modify: `packages/node/lint/src/companion/rules/storageMigrations.ts`
- Modify: `packages/node/lint/src/companion/rules/avaPageVersions.ts`
- Modify: `packages/node/lint/src/companion/rules/cacheSchemaVersion.ts`
- Modify: `packages/node/lint/src/companion/rules/rlsTestCoverage.ts`
- Modify: `packages/node/lint/src/companion/rules/packageImportMaps.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 lazy context and rule families from Tasks 3 through 5.
- Produces: One immutable Git snapshot, RP-10, and the changed-file evidence
  portions of RP-11, RP-13, RP-15, RP-18, and RP-19.

- [ ] **Step 1: Write failing Git-state fixtures**

  Cover clean and dirty trees, staged and unstaged changes, untracked files,
  renamed paths, merge-base selection, shallow clones without the requested
  base, and multiple newly added migrations. Assert no command mutates the
  fixture repository.

- [ ] **Step 2: Run the Git tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/companion/{context/createGitContext,rules/migrationSequence}.test.ts`

  Expected: FAIL because the Git context is absent.

- [ ] **Step 3: Implement the read-only Git snapshot and diff-aware rules**

  Use explicit Git argument arrays with no shell interpolation. Return an
  operational diagnostic when the configured base is unavailable. Reuse the
  same snapshot for every changed-file rule.

- [ ] **Step 4: Run all companion tests and benchmark Git rules**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check`

  Run: `pnpm lint:benchmark --label phase-5-git-rules`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/node/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add diff-aware convention rules"
  ```

### Task 7: Root integration, package-size gate, and skill pruning

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/node/lint/package.json`
- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: Relevant files under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`
- Create only if the split gate is crossed: `packages/node/lint-companion/`

**Interfaces:**

- Consumes: All phase 5 rules and the phase 3 compressed-size baseline.
- Produces: Root lint integration, a measured one-package or two-package
  decision, and a review skill containing only JR detection plus disable-reason
  judgment.

- [ ] **Step 1: Add failing root integration tests**

  In a temporary repository, assert that the root lint command invokes Oxlint,
  Stylelint, then `avandar-lint . --format agent`, returns 1 for companion
  findings, and does not run later advisory checks after a deterministic
  failure.

- [ ] **Step 2: Integrate the companion into root lint**

  Add an explicit root script for the companion and call it after Stylelint.
  Keep advisory React diagnostics last and preserve their existing nonblocking
  behavior.

- [ ] **Step 3: Measure the package-size split gate**

  Pack `@avandar/lint`, record compressed and installed sizes, inspect tarball
  contents and dependency install scripts, and compare against phase 3. If the
  compressed delta is at most 10 MiB and no native platform artifact installs,
  keep one package. Otherwise create `@avandar/lint-companion`, move only the
  companion entry and binary, depend on `@avandar/lint` for shared contracts,
  add it to the fixed Changesets group, and rerun all packed-export tests.

- [ ] **Step 4: Load rule-writing and skill-writing instructions**

  Read the `writing-code-review-rules` and `writing-skills` skills before
  editing the public review skill.

- [ ] **Step 5: Remove all shipped companion detectors from review**

  Remove AF-18, AF-21, GD-17, GD-20, GD-28, GD-29, GD-31, and RP-01 through
  RP-19 searches from full review, focused packs, find lanes, common checks,
  phase checklists, library checklists, and repo-local duplicates. Preserve
  JR-01 through JR-17 and changed-disable-reason judgment.

- [ ] **Step 6: Record the token and runtime outcome**

  Record final cold, warm, and warm-cache lint time, peak resident memory,
  package size, and the number of review-skill bytes and checklist families
  removed. Compare the final deterministic pipeline with the pre-phase-3
  benchmark and inventory.

- [ ] **Step 7: Run complete verification**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run the same commands for `@avandar/lint-companion` only if the split gate
  created it.

  Run: `.github/scripts/verify-packages.sh`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-5-complete`

  Expected: all checks PASS within the stop threshold, with one shared context
  per analyzer and no deterministic detector remaining in review.

- [ ] **Step 8: Commit**

  ```bash
  git add package.json pnpm-lock.yaml packages/node/lint packages/node/lint-companion agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-5.md .changeset/config.json
  git commit -m "refactor(review): replace repository searches with companion lint"
  ```

  If the split gate did not create `packages/node/lint-companion`, omit that
  path from `git add`.
