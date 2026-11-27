# Oxlint phase 5 language-specific companion analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable companion host with separate TypeScript/JavaScript and
SQL packages for deterministic conventions that their current-file linters
cannot own.

**Architecture:** `@avandar/lint/companion` hosts packs selected by
`avandar-lint.config.json`. `@avandar/lint-typescript/companion` and
`@avandar/lint-sql/companion` register their own rules and lazy evidence.
File, module, TypeScript, Git, and SQL facts are built once and shared only by
rules in enabled packages. `avandar-lint check` joins root lint, while
`avandar-lint coverage` prevents a language-specific package from claiming
generic coverage in other languages.

**Tech Stack:** Node 24.x native TypeScript, TypeScript compiler API, pnpm
workspaces, Vitest, Git CLI read operations, a PostgreSQL parser selected by
corpus testing, tsup.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-5-companion-analyzer-design.md`

## Global Constraints

- The host lives in `packages/lint/core`, the TypeScript implementation in
  `packages/lint/typescript`, and the SQL implementation in
  `packages/lint/sql`.
- The public entries are `@avandar/lint/companion`,
  `@avandar/lint-typescript/companion`, and `@avandar/lint-sql/companion`.
- The CLI actions are `check` and `coverage`. Root and action help support
  `-h, --help`; `check` supports `--format stylish|agent|json` and `--fix`.
- A bare interactive root opens the action menu. A bare unattended root fails
  with usage and an exact `avandar-lint check .` recovery command.
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
- Generic avlint-common-001, avlint-common-002, avlint-common-003, avlint-common-004, avlint-common-005, avlint-common-006, avlint-common-007, avlint-common-008, avlint-common-009,
  avlint-common-010, and avlint-common-011 remain Phase 6 fallback outside covered earlier-language
  outcomes.
- A detector leaves the normal review path only after the exact pack, rule,
  language, file, capability, and repository integration are proven.

## Review Focus

- Paths and module identities must be stable on case-sensitive and
  case-insensitive filesystems; Tasks 2 and 3 use synthetic mixed-case trees.
- Project references and Deno modules must not enter the wrong TypeScript
  program or leak that pack into Python or Rust; Tasks 1, 4, and 7 pin both.
- Git-diff rules must behave in clean trees, shallow clones, merge bases, and
  untracked files; Task 6 tests every state without changing repository data.
- SQL parser failures must not become false violations; Task 5 turns unsupported
  syntax into one explicit operational diagnostic.
- Persistent caches must invalidate on tool, config, compiler-option, and file
  content changes; Tasks 2, 4, and 5 pin each cache key component.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/lint/core/avandar-lint.schema.json` | Repository languages, language-specific packs, and rule overrides |
| `packages/lint/core/src/companion/` | Public API, configuration, CLI check action, formatters, and orchestration |
| `packages/lint/core/src/companion/context/` | Shared lazy file, Git, and cache evidence |
| `packages/lint/typescript/src/companion/` | TypeScript program, graph, repository, type, package, and Playwright rules |
| `packages/lint/typescript/package.json` | Oxlint and TypeScript companion exports |
| `packages/lint/sql/src/companion/` | SQL parser, schema, migration, and RLS rules |
| `packages/lint/sql/package.json` | SQL companion export and parser dependencies |
| `packages/lint/core/test/companion/fixtures/` | Synthetic repositories and SQL corpus fixtures |
| `packages/lint/core/test/coverage/phase5.test.ts` | Pack isolation and exact coverage integration |
| `docs/lint-benchmarks/oxlint-phase-5.md` | Runtime, memory, cache, and package-size results |
| `docs/lint-benchmarks/oxlint-phase-5-sql-parser.md` | Parser corpus and dependency comparison |

---

### Task 1: Configuration, companion API, check action, and output formats

**Files:**

- Create: `packages/lint/core/avandar-lint.schema.json`
- Create: `packages/lint/core/src/companion/AvandarLintConfig.types.ts`
- Create: `packages/lint/core/src/companion/loadAvandarLintConfig.ts`
- Create: `packages/lint/core/src/companion/LintDiagnostic.types.ts`
- Create: `packages/lint/core/src/companion/EngineRunResult.types.ts`
- Create: `packages/lint/core/src/companion/LintRepositoryOptions.types.ts`
- Create: `packages/lint/core/src/companion/CompanionRule.types.ts`
- Create: `packages/lint/core/src/companion/lintRepository.ts`
- Create: `packages/lint/core/src/companion/checkAction.ts`
- Create: `packages/lint/core/src/companion/index.ts`
- Create: `packages/lint/core/src/companion/formatters/formatStylish.ts`
- Create: `packages/lint/core/src/companion/formatters/formatAgent.ts`
- Create: `packages/lint/core/src/companion/formatters/formatJson.ts`
- Create: matching `*.test.ts` beside the config, action, and repository modules
- Create: `docs/lint-benchmarks/oxlint-phase-5.md`
- Create: `avandar-lint.config.json`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/core/src/cli/main.ts`
- Modify: `packages/lint/core/package.json`
- Modify: `packages/lint/core/tsup.config.ts`

**Interfaces:**

- Consumes: Phase 4 rule metadata and diagnostic-message contract.
- Produces: validated `languages` and `packs`,
  `lintRepository(options): Promise<EngineRunResult>`, the
  `CompanionRule` interface, three formatters, and the `avandar-lint check`
  action added to the Phase 3 CLI.

- [ ] **Step 1: Write failing public API and CLI tests**

  Pin the exact repository option, diagnostic, text-edit, file-move, fix,
  analyzed-path, coverage-gap, and tagged available/unavailable fields from
  the spec. Test valid config, unknown keys, unknown languages,
  unknown packs, and rule overrides. Keep output format in CLI options rather
  than `LintRepositoryOptions`. Test explicit `check`, positional paths, each
  format, `--fix`, unknown options, missing values, root and action help, root
  action selection, the bare `check` wizard with every optional field and
  visible default, arrow and j/k wrapping, g/G, Enter, Ctrl-C, EOF, unattended
  root failure, explicit no-prompt execution, stdout and stderr separation, and
  exit codes 0, 1, and 2.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/src/companion`

  Expected: FAIL because the companion entry does not exist.

- [ ] **Step 3: Implement the API and command shell with an empty rule set**

  Use Node's argument parser and the shared CLI semantic theme. Default check
  output to `stylish`; callers select `agent` or `json`. Parse help before
  loading config or importing analyzers. Keep prompt IO separate and use the
  controlling terminal for the bare root menu. Sort diagnostics by normalized
  path, start position, and rule ID. Require every pack result to return
  analyzed paths and coverage gaps. Propagate pack, parser, and framework
  limitations instead of treating an empty diagnostic array as a clean
  coverage claim.

- [ ] **Step 4: Add source and packed exports**

  Add `./companion` and `avandar-lint.schema.json` to development exports and
  `publishConfig`. Extend the existing bin entry and shebang-preserving tsup
  banner rather than creating a second CLI.

- [ ] **Step 5: Run tests, build, packed-bin help, and baseline benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint build`

  Pack the package, install it into a temporary directory, and run
  `avandar-lint check --help` with repository configuration intentionally
  absent, then test unattended bare invocation.

  Run: `pnpm lint:benchmark --label phase-5-empty-companion`

  Expected: PASS, help exits zero before config access, unattended bare
  invocation exits 2 with recovery guidance, and JSON stdout contains no other
  bytes.

- [ ] **Step 6: Commit**

  ```bash
  git add avandar-lint.config.json packages/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add companion host and configuration"
  ```

### Task 2: Shared repository context and cache

**Files:**

- Create: `packages/lint/core/src/companion/context/RepositoryContext.types.ts`
- Create: `packages/lint/core/src/companion/context/createRepositoryContext.ts`
- Create: `packages/lint/core/src/companion/context/createFileIndex.ts`
- Create: `packages/lint/core/src/companion/context/createCache.ts`
- Create: matching `*.test.ts` beside each creator above
- Create: `packages/lint/core/test/companion/fixtures/repository-context/`
- Modify: `packages/lint/core/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 1 `CompanionRule.evidence` and normalized diagnostics.
- Produces: `createRepositoryContext(options)`, one eager `fileIndex`, lazy
  `getGitContext()` and pack-context factories, plus a content-addressed cache.

- [ ] **Step 1: Write failing repository-context tests**

  Cover ignored directories, symlinks, path separators, mixed-case files,
  package exports, Deno import maps, unresolved imports, cycles, and duplicate
  module identities. Assert that no lazy analyzer loads for a rule that does not
  declare its evidence.

- [ ] **Step 2: Write failing cache invalidation tests**

  Assert cache misses when tool version, config, compiler options, or file
  content changes and cache hits when only modification time changes.

- [ ] **Step 3: Run the focused tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/src/companion/context`

  Expected: FAIL because the context creators are absent.

- [ ] **Step 4: Implement immutable context construction**

  Build the file index once and expose pack-context promises that memoize the
  first request. Do not build a TypeScript module graph or SQL document unless
  its pack is enabled and a rule requests it. Store cache data outside tracked
  source and include a schema version.

- [ ] **Step 5: Run context tests and benchmark the base scan**

  Run: `pnpm vitest run packages/lint/core/src/companion/context`

  Run: `pnpm lint:benchmark --label phase-5-repository-context`

  Expected: PASS within the stop threshold and no TypeScript, Git, or SQL load
  appears in the base-scan profile.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add shared repository context"
  ```

### Task 3: Filesystem, module, test, and package rules

**Files:**

- Create: `packages/lint/typescript/src/companion/index.ts`
- Create: `packages/lint/typescript/src/companion/rules/moduleLayout.ts`
- Create: `packages/lint/typescript/src/companion/context/createModuleGraph.ts`
- Create: `packages/lint/typescript/src/companion/context/createModuleGraph.test.ts`
- Create: `packages/lint/typescript/src/companion/rules/importTopology.ts`
- Create: `packages/lint/typescript/src/companion/rules/testLayout.ts`
- Create: `packages/lint/typescript/src/companion/rules/cssModuleOwnership.ts`
- Create: `packages/lint/typescript/src/companion/rules/modelLocation.ts`
- Create: `packages/lint/typescript/src/companion/rules/playwrightStaticRules.ts`
- Create: `packages/lint/typescript/src/companion/rules/packageImportMaps.ts`
- Create: matching `*.test.ts` beside each rule family above
- Create: matching pages under `packages/lint/docs/rules/`
- Create: `packages/lint/core/test/companion/fixtures/repository-rules/`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/typescript/package.json`
- Modify: `packages/lint/typescript/tsup.config.ts`
- Modify: `packages/lint/core/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 file index and lazy pack-context interface.
- Produces: `@avandar/lint-typescript/companion`, plus the TypeScript pack's
  avlint-ts-042 through avlint-ts-049, avlint-ts-052, avlint-ts-054, and avlint-ts-055. avlint-ts-050 remains for Task 4;
  avlint-common-011 remains Phase 6 fallback.

- [ ] **Step 1: Write failing synthetic-repository fixtures**

  Give every rule family one clean tree, one invalid tree, mixed-case and
  Windows-separator projections, ignored generated paths, and an ambiguous case
  that must not report. For avlint-ts-055, assert an idempotent exact import-map edit;
  all other multi-file repairs remain guided unless separately proven.

- [ ] **Step 2: Run the rule tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/companion/rules/{moduleLayout,importTopology,testLayout,cssModuleOwnership,modelLocation,playwrightStaticRules,packageImportMaps}.test.ts`

  Expected: FAIL because the rule families are absent.

- [ ] **Step 3: Implement and register the repository rules**

  Build the module graph only for the enabled `typescript` pack. Return
  diagnostics through the Task 1 schema. Register every rule under that pack
  and declare only `files` and `modules` evidence. Keep test
  behavior, domain naming quality, generic E2E mutation semantics, and CSS
  token choice in judgment or Phase 6 fallback. Export the registration through
  `@avandar/lint-typescript/companion` and preserve the existing Oxlint export.

- [ ] **Step 4: Run tests, package verification, and benchmark**

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-typescript type-check && pnpm --filter @avandar/lint test`

  Run: `pnpm lint:benchmark --label phase-5-repository-rules`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add repository convention rules"
  ```

### Task 4: TypeScript program and type-aware rules

**Files:**

- Create: `packages/lint/typescript/src/companion/context/createTypeScriptContext.ts`
- Create: `packages/lint/typescript/src/companion/context/createTypeScriptContext.test.ts`
- Create: `packages/lint/typescript/src/companion/rules/typeAwareErrors.ts`
- Create: `packages/lint/typescript/src/companion/rules/functionSignatureRepository.ts`
- Create: `packages/lint/typescript/src/companion/rules/nullabilityBoundaries.ts`
- Create: `packages/lint/typescript/src/companion/rules/immutabilityContracts.ts`
- Create: `packages/lint/typescript/src/companion/rules/modelContracts.ts`
- Create: `packages/lint/typescript/src/companion/rules/unionDispatch.ts`
- Create: `packages/lint/typescript/src/companion/rules/copyFunctions.ts`
- Create: `packages/lint/typescript/src/companion/rules/avaPageVersions.ts`
- Create: `packages/lint/typescript/src/companion/rules/cacheSchemaVersion.ts`
- Create: matching `*.test.ts` beside each rule family above
- Create: matching pages under `packages/lint/docs/rules/`
- Create: `packages/lint/core/test/companion/fixtures/type-aware-rules/`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/core/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 lazy context and cache.
- Produces: One cached TypeScript `Program` and `TypeChecker` per selected
  project, plus avlint-ts-015, repository-aware avlint-ts-032, avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038,
  avlint-ts-040, avlint-ts-050, avlint-ts-051, and avlint-ts-053.

- [ ] **Step 1: Write failing TypeScript-context tests**

  Cover project references, package configs, Deno-reachable modules, generated
  exclusions, compiler-option cache invalidation, and two rules sharing the
  same `Program` identity.

- [ ] **Step 2: Write failing rule fixtures**

  Pin the exact proof boundaries from the inventory. Include external null
  contracts, intentional mutation APIs, repository-visible function call
  shapes, public API signatures, model-folder exceptions, open versus closed
  unions, copy caller counts, old AvaPage snapshots, serializer-only shape
  changes, and every ambiguous case that must not report.

- [ ] **Step 3: Run the type-aware tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/companion/{context/createTypeScriptContext,rules/typeAwareErrors,rules/functionSignatureRepository,rules/nullabilityBoundaries,rules/immutabilityContracts,rules/modelContracts,rules/unionDispatch,rules/copyFunctions,rules/avaPageVersions,rules/cacheSchemaVersion}.test.ts`

  Expected: FAIL because the type context and rules are absent.

- [ ] **Step 4: Implement the shared type context and rules**

  Resolve each file to exactly one selected project. avlint-ts-015 may expose a safe
  edit only when the type checker and control-flow shape prove equivalence.
  Every other rule emits a guided diagnostic.

- [ ] **Step 5: Run tests and record cold, warm, and cached timing**

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-typescript type-check && pnpm --filter @avandar/lint test`

  Run: `pnpm lint:benchmark --label phase-5-type-aware-rules`

  Expected: PASS within the stop threshold, with one program construction per
  project and cache behavior recorded.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add type-aware convention rules"
  ```

### Task 5: SQL parser selection and SQL-aware rules

**Files:**

- Create: `packages/lint/sql/package.json`
- Create: `packages/lint/sql/README.md`
- Create: `packages/lint/sql/tsconfig.json`
- Create: `packages/lint/sql/tsconfig.build.json`
- Create: `packages/lint/sql/tsup.config.ts`
- Create: `packages/lint/sql/vitest.config.ts`
- Create: `packages/lint/sql/src/companion/index.ts`
- Create: `packages/lint/sql/src/companion/context/createSqlContext.ts`
- Create: `packages/lint/sql/src/companion/context/createSqlContext.test.ts`
- Create: `packages/lint/sql/src/companion/rules/sqlComments.ts`
- Create: `packages/lint/sql/src/companion/rules/storageMigrations.ts`
- Create: `packages/lint/sql/src/companion/rules/schemaDependencyLayers.ts`
- Create: `packages/lint/sql/src/companion/rules/sqlIdentifiers.ts`
- Create: `packages/lint/sql/src/companion/rules/rlsTestCoverage.ts`
- Create: matching `*.test.ts` beside each rule family above
- Create: matching pages under `packages/lint/docs/rules/`
- Create: `packages/lint/core/test/companion/fixtures/sql-rules/`
- Create: `docs/lint-benchmarks/oxlint-phase-5-sql-parser.md`
- Modify: `package.json`
- Modify: `.changeset/config.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/core/src/companion/lintRepository.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 lazy context and cache.
- Produces: `@avandar/lint-sql/companion`, cached SQL documents with source
  locations, avlint-sql-001, avlint-sql-003, avlint-sql-004, avlint-sql-005, and avlint-sql-006.

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

  Cache by content and parser version. avlint-sql-001 exposes fixes only where parsed
  node ownership proves the exact comment form. All structural SQL rules remain
  guided. Publish the pack through `@avandar/lint-sql/companion`, add the SQL
  package to the root workspace dependencies and fixed Changesets group, and
  keep its parser dependencies out of the core package.

- [ ] **Step 5: Run corpus, rule, package, and benchmark checks**

  Run: `pnpm vitest run packages/lint/sql/src/companion/{context/createSqlContext,rules/sqlComments,rules/storageMigrations,rules/schemaDependencyLayers,rules/sqlIdentifiers,rules/rlsTestCoverage}.test.ts`

  Run: `pnpm --filter @avandar/lint-sql test && pnpm --filter @avandar/lint-sql type-check && pnpm --filter @avandar/lint test`

  Run: `pnpm lint:benchmark --label phase-5-sql-rules`

  Expected: PASS for the complete committed SQL corpus within the stop
  threshold.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint pnpm-lock.yaml docs/lint-benchmarks/oxlint-phase-5.md docs/lint-benchmarks/oxlint-phase-5-sql-parser.md
  git commit -m "feat(lint): add SQL-aware convention rules"
  ```

### Task 6: Git-diff and migration-state rules

**Files:**

- Create: `packages/lint/core/src/companion/context/createGitContext.ts`
- Create: `packages/lint/core/src/companion/context/createGitContext.test.ts`
- Create: `packages/lint/sql/src/companion/rules/migrationSequence.ts`
- Create: `packages/lint/sql/src/companion/rules/migrationSequence.test.ts`
- Create: `packages/lint/core/test/companion/fixtures/git-rules/`
- Modify: `packages/lint/sql/src/companion/rules/storageMigrations.ts`
- Modify: `packages/lint/typescript/src/companion/rules/avaPageVersions.ts`
- Modify: `packages/lint/typescript/src/companion/rules/cacheSchemaVersion.ts`
- Modify: `packages/lint/sql/src/companion/rules/rlsTestCoverage.ts`
- Modify: `packages/lint/typescript/src/companion/rules/packageImportMaps.ts`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: Task 2 lazy context and rule families from Tasks 3 through 5.
- Produces: One immutable Git snapshot, avlint-sql-002, and the changed-file evidence
  portions of avlint-sql-003, avlint-ts-051, avlint-ts-053, avlint-sql-006, and avlint-ts-055.

- [ ] **Step 1: Write failing Git-state fixtures**

  Cover clean and dirty trees, staged and unstaged changes, untracked files,
  renamed paths, merge-base selection, shallow clones without the requested
  base, and multiple newly added migrations. Assert no command mutates the
  fixture repository.

- [ ] **Step 2: Run the Git tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/src/companion/context/createGitContext.test.ts packages/lint/sql/src/companion/rules/migrationSequence.test.ts`

  Expected: FAIL because the Git context is absent.

- [ ] **Step 3: Implement the read-only Git snapshot and diff-aware rules**

  Use explicit Git argument arrays with no shell interpolation. Return an
  operational diagnostic when the configured base is unavailable. Reuse the
  same snapshot for every changed-file rule.

- [ ] **Step 4: Run all companion tests and benchmark Git rules**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-sql test`

  Run: `pnpm lint:benchmark --label phase-5-git-rules`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-5.md
  git commit -m "feat(lint): add diff-aware convention rules"
  ```

### Task 7: Root integration, package verification, and coverage-gated handoff

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/lint/core/package.json`
- Modify: `packages/lint/typescript/package.json`
- Modify: `packages/lint/sql/package.json`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Create: `packages/lint/core/test/coverage/phase5.test.ts`
- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: Relevant files under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-5.md`

**Interfaces:**

- Consumes: All phase 5 rules and the phase 3 compressed-size baseline.
- Produces: Root lint integration, verified fixed package boundaries, and a
  review skill that skips proven Phase 5 file and capability outcomes while
  retaining generic Phase 6 and missing-pack fallback.

- [ ] **Step 1: Add failing root integration tests**

  In a temporary repository, assert that the root lint command invokes Oxlint,
  Stylelint, then `avandar-lint check . --format agent`, returns 1 for
  companion findings, and does not run later advisory checks after a
  deterministic failure.

- [ ] **Step 2: Integrate the companion into root lint**

  Add an explicit root script for the companion and call it after Stylelint.
  Keep advisory React diagnostics last and preserve their existing nonblocking
  behavior.

- [ ] **Step 3: Verify the fixed package boundaries**

  Pack `@avandar/lint`, `@avandar/lint-typescript`, and `@avandar/lint-sql`.
  Record compressed and installed sizes, inspect tarball contents and
  dependency install scripts, and compare against Phase 3. Assert the core
  tarball contains no TypeScript compiler or SQL parser and that installing one
  language package does not install the other. Keep all npm lint packages in
  one fixed Changesets release group and rerun every packed-export test.

- [ ] **Step 4: Load rule-writing and skill-writing instructions**

  Read the `writing-code-review-rules` and `writing-skills` skills before
  editing the public review skill.

- [ ] **Step 5: Move shipped companion detectors behind coverage gating**

  Remove avlint-ts-015, avlint-sql-001, repository-aware avlint-ts-032, avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038,
  avlint-ts-040, avlint-ts-042 through avlint-ts-053, avlint-ts-054, and avlint-sql-005 through avlint-ts-055 prose from
  always-loaded review lanes. Preserve their canonical detectors in the
  fallback checklist for repositories without enabled packs. Preserve avlint-common-011
  and all other Phase 6 generic outcomes, avlint-common-012 through avlint-ts-058, and
  changed-disable-reason judgment.

- [ ] **Step 6: Prove pack isolation and coverage fallback**

  Assert that a repository enabling only `sql` never loads TypeScript context,
  a repository enabling only `typescript` never loads the SQL parser, and a
  Python file never receives a TypeScript pack diagnostic. Disable each pack
  and assert its outcomes return `fallback`. Assert avlint-ts-054 is enforced only by
  the Playwright adapter while avlint-common-011 remains fallback. Inject a parser
  limitation and a mixed supported/unsupported Playwright capability and prove
  the tagged result sends only the affected files and capabilities to
  fallback.

- [ ] **Step 7: Record the token and runtime outcome**

  Record final cold, warm, and warm-cache lint time, peak resident memory,
  package size, and the number of review-skill bytes and checklist families
  removed. Compare the final deterministic pipeline with the pre-phase-3
  benchmark and inventory.

- [ ] **Step 8: Run complete verification**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-typescript type-check && pnpm --filter @avandar/lint-typescript build`

  Run: `pnpm --filter @avandar/lint-sql test && pnpm --filter @avandar/lint-sql type-check && pnpm --filter @avandar/lint-sql build`

  Run: `pnpm verify:packages`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-5-complete`

  Expected: all checks PASS within the stop threshold, with one shared context
  per enabled pack and only uncovered deterministic outcomes remaining in
  fallback review.

- [ ] **Step 9: Commit**

  ```bash
  git add package.json pnpm-lock.yaml packages/lint agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-5.md .changeset/config.json
  git commit -m "refactor(review): gate repository checks on companion coverage"
  ```
