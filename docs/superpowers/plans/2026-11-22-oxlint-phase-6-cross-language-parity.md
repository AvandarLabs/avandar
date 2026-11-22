# Oxlint phase 6 cross-language parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every language-agnostic deterministic review rule across
Python, Rust, CSS, SQL, shell, YAML, JSONC, and the other languages explicitly
covered by the canonical inventory.

**Architecture:** Native language rules own exact matches, `pylint-avandar`
and `avandar-dylint` fill ecosystem semantic gaps, and the `generic` companion
package supplies shared lexical, structural, test, and E2E adapters. One
coverage resolver selects exactly one owner per rule, language, file, and
capability and retains skill fallback for unknown languages, unsupported
frameworks, or failed tools.

**Tech Stack:** Node 24.x native TypeScript, Tree-sitter, Oxlint and Stylelint,
Python 3.12+, Pylint and Astroid, Rust stable rustc and Clippy, a pinned Dylint
toolchain, Vitest, pytest, Cargo test, pnpm workspaces.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-6-cross-language-parity-design.md`

## Global Constraints

- The canonical catalog remains `packages/lint/rules.yaml`, with the full
  generated human catalog in `packages/lint/README.md`.
- Python lives in `packages/lint/python`, Rust in `packages/lint/rust`, and the
  generic companion in `packages/lint/generic`.
- Native rules win when their semantics match exactly. Custom extensions and
  companion adapters must not duplicate their diagnostics.
- Repositories select generic enforcement through the `languages` list and
  language-specific conventions through the independent `packs` list.
- A coverage outcome is keyed by rule, language, file, and capability and is
  only `enforced`, `not-applicable`, or `fallback`. Blank or unclassified
  outcomes fail verification.
- Missing tools, disabled rules, unsupported frameworks, parser failures, and
  unknown languages never count as covered merely because an implementation
  exists somewhere in the monorepo.
- Only AF-06 and AF-07 proven syntax shapes may receive a generic safe fix.
  Every other Phase 6 rule is diagnostic-only.
- New production behavior follows red-green TDD.
- Help exits zero before repository, configuration, dependency, or toolchain
  access. JSON stdout contains only the documented result.
- Stop and profile a batch whose warm median adds both more than 25 percent
  and more than 2 seconds to the preceding repository lint baseline.
- No task publishes to npm, PyPI, or crates.io. It produces verified local
  artifacts; external publication requires separate authorization.

## Review Focus

- Lexical scanners must not treat strings, raw strings, heredocs, or regex
  literals as comments; Task 4 pins every delimiter family and malformed file.
- Direct and fallback owners must never report the same violation; Tasks 2, 3,
  and 7 disable each engine and assert exactly one canonical diagnostic.
- Dylint toolchain drift must fail with a recovery command rather than compiler
  internals; Task 3 tests the pinned and mismatched toolchains.
- Unsupported Tree-sitter grammars or test frameworks must remain fallback;
  Tasks 5 and 6 test parser failure, unknown nodes, and unknown assertion APIs.
- Language selection must be lazy and exact; Task 7 proves a Python-only repo
  loads no Rust, TypeScript, SQL, CSS, or unrelated parser dependencies.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/lint/python/` | Installable `pylint-avandar` distribution, native config fragment, custom checkers, and pytest suite |
| `packages/lint/rust/` | `avandar-dylint` library, native rustc/Clippy config fragment, pinned toolchain, and UI tests |
| `packages/lint/generic/src/companion/` | Shared file classifier, owner resolver, adapters, framework registry, and fixes |
| `packages/lint/generic/package.json` | Universal companion export and lazy parser dependencies |
| `packages/lint/generic/src/companion/adapters/` | One language adapter per supported syntax family |
| `packages/lint/generic/src/companion/frameworks/` | Test and E2E API registries |
| `packages/lint/core/test/coverage/phase6-matrix.test.ts` | Complete rule-language-file-capability coverage closure |
| `packages/lint/core/test/companion/fixtures/generic/` | Cross-language source and repository fixtures |
| `docs/lint-benchmarks/oxlint-phase-6.md` | Per-engine, per-adapter, package, memory, and complete runtime results |

---

### Task 1: Cross-language catalog bindings and matrix harness

**Files:**

- Create: `packages/lint/core/src/catalog/generateEcosystemBindings.ts`
- Create: `packages/lint/core/src/catalog/generateEcosystemBindings.test.ts`
- Create: `packages/lint/generic/package.json`
- Create: `packages/lint/generic/README.md`
- Create: `packages/lint/generic/tsconfig.json`
- Create: `packages/lint/generic/tsconfig.build.json`
- Create: `packages/lint/generic/tsup.config.ts`
- Create: `packages/lint/generic/vitest.config.ts`
- Create: `packages/lint/generic/src/companion/index.ts`
- Create: `packages/lint/generic/src/companion/LanguageAdapter.types.ts`
- Create: `packages/lint/generic/src/companion/resolveCoverageOwner.ts`
- Create: `packages/lint/generic/src/companion/resolveCoverageOwner.test.ts`
- Create: `packages/lint/core/test/coverage/phase6-matrix.test.ts`
- Create: `packages/lint/core/test/companion/fixtures/generic/coverage-matrix/`
- Create: `docs/lint-benchmarks/oxlint-phase-6.md`
- Modify: `packages/lint/rules.schema.json`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/core/avandar-lint.schema.json`
- Modify: `packages/lint/core/src/companion/AvandarLintConfig.types.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.changeset/config.json`

**Interfaces:**

- Consumes: Phase 5 catalog, coverage command, host configuration, and
  `CompanionRule` registration.
- Produces: `LanguageAdapter`, `CoverageOwner`,
  `resolveCoverageOwner({ ruleId, languageId, filePath, capabilityId,
  availableEngines })`, generated Python and Rust catalog bindings,
  `@avandar/lint-generic/companion`, and a matrix test with one outcome per
  declared file and capability.

- [ ] **Step 1: Write failing schema, binding, and owner-resolution tests**

  Add language IDs for TypeScript, JavaScript, Python, Rust, Go, Ruby, Java,
  Kotlin, Swift, C, C++, C#, SQL, CSS, shell, YAML, JSONC, and JSON. Assert the
  owner order native, ecosystem extension, Dylint, generic companion, then
  skill fallback. Assert a disabled or unavailable owner is skipped and two
  enabled owners still produce exactly one selection.

- [ ] **Step 2: Write the failing matrix and fallback tests**

  Expand AF-06, AF-07, GD-01, GD-02, GD-03, GD-06, GD-07, GD-09, GD-22,
  GD-25, and RP-16B across their catalog applicability. Begin with a tested
  fallback registration for every unimplemented applicable outcome, not a
  blank cell. Add same-language files with supported and unsupported framework
  capabilities and assert conservative aggregation.

- [ ] **Step 3: Run focused tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/src/catalog/generateEcosystemBindings.test.ts packages/lint/generic/src/companion/resolveCoverageOwner.test.ts packages/lint/core/test/coverage/phase6-matrix.test.ts`

  Expected: FAIL because Phase 6 languages, owners, and bindings do not exist.

- [ ] **Step 4: Implement schema extensions, binding generation, and owner resolution**

  Generate immutable Python and Rust constants from `rules.yaml`; do not hand
  maintain duplicate rule lists. Create the generic npm package, add it to the
  root workspace dependencies and fixed Changesets group, and initialize
  unimplemented outcomes as explicit tested fallback so the committed suite
  stays green. Later tasks replace their mandatory fallback outcomes with
  enforced registrations.

- [ ] **Step 5: Run catalog and focused tests**

  Run: `pnpm vitest run packages/lint/core/test/catalog.test.ts packages/lint/core/src/catalog/generateEcosystemBindings.test.ts packages/lint/generic/src/companion/resolveCoverageOwner.test.ts`

  Expected: PASS with every unimplemented applicable outcome explicitly in
  tested fallback.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-6.md
  git commit -m "feat(lint): add cross-language coverage matrix"
  ```

### Task 2: Python native configuration and Pylint extension

**Files:**

- Create: `packages/lint/python/README.md`
- Create: `packages/lint/python/pyproject.toml`
- Create: `packages/lint/python/avandar-pylint.toml`
- Create: `packages/lint/python/src/avandar_pylint/__init__.py`
- Create: `packages/lint/python/src/avandar_pylint/catalog.py`
- Create: `packages/lint/python/src/avandar_pylint/plugin.py`
- Create: `packages/lint/python/src/avandar_pylint/checkers/comments.py`
- Create: `packages/lint/python/src/avandar_pylint/checkers/public_documentation.py`
- Create: `packages/lint/python/src/avandar_pylint/checkers/function_length.py`
- Create: `packages/lint/python/src/avandar_pylint/checkers/imperative_loops.py`
- Create: `packages/lint/python/src/avandar_pylint/checkers/tests.py`
- Create: `packages/lint/python/tests/test_catalog.py`
- Create: `packages/lint/python/tests/test_comments.py`
- Create: `packages/lint/python/tests/test_public_documentation.py`
- Create: `packages/lint/python/tests/test_function_length.py`
- Create: `packages/lint/python/tests/test_imperative_loops.py`
- Create: `packages/lint/python/tests/test_tests.py`
- Create: `packages/lint/python/tests/test_integration.py`
- Create: `packages/lint/generic/src/companion/engines/runPylint.ts`
- Create: `packages/lint/generic/src/companion/engines/runPylint.test.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-6.md`

**Interfaces:**

- Consumes: Generated Python catalog constants and the host engine interface.
- Produces: the `pylint-avandar` distribution, plugin registration function,
  message symbols mapped to GD-01, GD-02, the public-value subset of GD-03,
  GD-06, GD-22, and GD-25, `runPylint(options): Promise<EngineRunResult>`, and
  native config for the module, class, function, and method subset of GD-03,
  plus GD-07 and GD-09.

- [ ] **Step 1: Write failing native-config and checker tests**

  Use Pylint checker test utilities for raw, token, and Astroid checkers. Pin
  comments versus strings, Python docstrings, exact 45-line function spans,
  undocumented public values and constants, collection loops and valid
  reasons, pytest and unittest assertions, empty tests, and closed tautologies.
  Add integration fixtures for native missing-docstring, too-many-lines, and
  disallowed-name behavior. Prove the native and custom GD-03 subsets do not
  duplicate each other.

- [ ] **Step 2: Create an isolated test environment and verify failure**

  Run: `python3 -m venv .temp/lint-python-venv`

  Run: `.temp/lint-python-venv/bin/python -m pip install -e 'packages/lint/python[test]'`

  Run: `.temp/lint-python-venv/bin/python -m pytest packages/lint/python/tests`

  Expected: FAIL because the plugin modules and generated catalog binding are
  absent.

- [ ] **Step 3: Implement the minimum native config and custom checkers**

  Register checkers through `avandar_pylint.plugin.register(linter)`. Emit
  canonical IDs in message metadata. Treat a function's first string literal
  as a docstring, never AF-06. Add the public-value checker rather than
  claiming that Pylint's native missing-docstring family covers constants and
  objects. Require a reason on custom checker disables.

- [ ] **Step 4: Implement the Node Pylint bridge**

  Invoke Pylint with argument arrays, parse JSON output, normalize paths and
  canonical IDs, stream progress to stderr, and return the tagged
  `EngineRunResult`. Include analyzed paths and coverage gaps when available;
  return `unavailable` without a false coverage claim when Python, Pylint, the
  plugin, or config is missing.

- [ ] **Step 5: Run Python, bridge, integration, and package checks**

  Run: `.temp/lint-python-venv/bin/python -m pytest packages/lint/python/tests`

  Run: `.temp/lint-python-venv/bin/python -m build packages/lint/python`

  Run: `pnpm vitest run packages/lint/generic/src/companion/engines/runPylint.test.ts`

  Expected: PASS with one canonical diagnostic per violation and wheel/sdist
  contents recorded in the benchmark.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-6.md
  git commit -m "feat(lint): add Python lint coverage"
  ```

### Task 3: Rust native configuration and Dylint extension

**Files:**

- Create: `packages/lint/rust/README.md`
- Create: `packages/lint/rust/Cargo.toml`
- Create: `packages/lint/rust/Cargo.lock`
- Create: `packages/lint/rust/rust-toolchain.toml`
- Create: `packages/lint/rust/clippy.toml`
- Create: `packages/lint/rust/src/catalog.rs`
- Create: `packages/lint/rust/src/lib.rs`
- Create: `packages/lint/rust/src/imperative_collection_loop.rs`
- Create: `packages/lint/rust/src/test_assertions.rs`
- Create: `packages/lint/rust/tests/ui/`
- Create: `packages/lint/generic/src/companion/engines/runRustLint.ts`
- Create: `packages/lint/generic/src/companion/engines/runRustLint.test.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-6.md`

**Interfaces:**

- Consumes: Generated Rust catalog constants and the host engine interface.
- Produces: native config for GD-03, GD-06, and GD-09,
  `avandar_dylint::IMPERATIVE_COLLECTION_LOOP`,
  `avandar_dylint::TEST_ASSERTIONS`, and
  `runRustLint(options): Promise<EngineRunResult>`.

- [ ] **Step 1: Write failing Clippy, Dylint UI, and mismatch tests**

  Pin `missing_docs`, 45-line functions, denied identifiers, collection loops
  and valid exceptions, assertion-free `#[test]` functions, and closed
  tautological assertions. Test the pinned toolchain and one mismatched
  toolchain that must print a concise recovery command rather than rustc
  internals.

- [ ] **Step 2: Run the Rust tests to verify they fail**

  Working directory: `packages/lint/rust`

  Run: `cargo test`

  Expected: FAIL because the crate and lint passes do not exist.

- [ ] **Step 3: Implement native configuration and Dylint rules**

  Set Clippy's line threshold to 45 and the catalog denylist. Register Dylint
  late lint passes for semantic loop and test rules. Use canonical IDs in
  diagnostics and require reasons on allow attributes for these lints.

- [ ] **Step 4: Implement the Node Rust bridge**

  Run rustc/Clippy and Dylint through argument arrays and JSON message formats.
  Normalize diagnostics and toolchain errors into the tagged
  `EngineRunResult`, including analyzed paths and coverage gaps. Return
  `unavailable` when Cargo, the pinned toolchain, Dylint, or the lint library
  is missing.

- [ ] **Step 5: Run Rust, bridge, artifact, and benchmark checks**

  Working directory: `packages/lint/rust`

  Run: `cargo test`

  Run: `cargo build`

  Run: `cargo dylint list --path .`

  Return to the repository root before the pnpm command.

  Run: `pnpm vitest run packages/lint/generic/src/companion/engines/runRustLint.test.ts`

  Expected: PASS with one canonical diagnostic per violation, cached warm
  behavior and build artifacts recorded, and no lexical or file-metric claim.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-6.md
  git commit -m "feat(lint): add Rust lint coverage"
  ```

### Task 4: Generic file and lexical metrics

**Files:**

- Create: `packages/lint/generic/src/companion/classifySourceFile.ts`
- Create: `packages/lint/generic/src/companion/classifySourceFile.test.ts`
- Create: `packages/lint/generic/src/companion/createLexicalContext.ts`
- Create: `packages/lint/generic/src/companion/createLexicalContext.test.ts`
- Create: `packages/lint/generic/src/companion/rules/commentPunctuation.ts`
- Create: `packages/lint/generic/src/companion/rules/commentWidth.ts`
- Create: `packages/lint/generic/src/companion/rules/fileLength.ts`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/lint/generic/src/companion/adapters/commentSyntax.ts`
- Create: `packages/lint/core/test/companion/fixtures/generic/lexical/`
- Modify: `packages/lint/core/src/companion/lintRepository.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-6.md`

**Interfaces:**

- Consumes: `LanguageAdapter`, repository languages, ignored paths, and owner
  resolution from Task 1.
- Produces: file classification, one cached lexical context per file, and
  GD-01, GD-02, and GD-07 diagnostics. It does not claim declaration or
  function-body ownership before structural adapters exist.

- [ ] **Step 1: Write failing classifier and delimiter fixtures**

  Cover every configured extension and shell shebang, generated files,
  migrations, dependencies, caches, strings, template literals, raw strings,
  regex literals, heredocs, nested comments, malformed input, and disable
  regions. Assert CSS receives GD-01 through Stylelint rather than duplicate
  generic output, JSON is not applicable, and JSONC comments are recognized.

- [ ] **Step 2: Write failing lexical metric fixtures**

  Cover comment punctuation and width, file thresholds and exclusions,
  tokenizer failures, and exact comment ranges. Assert this task reports no
  AF-06 or AF-07 fix because it cannot yet prove declaration, nested-node, or
  function-body ownership.

- [ ] **Step 3: Run focused tests to verify they fail**

  Run: `pnpm vitest run packages/lint/generic/src/companion/{classifySourceFile,createLexicalContext}.test.ts packages/lint/generic/src/companion/rules`

  Expected: FAIL because the generic pack and adapters are absent.

- [ ] **Step 4: Implement file classification and one lexical pass per file**

  Use a tokenizer only for syntax families whose fixtures prove strings and
  malformed input cannot become false comments. Task 5 validates and reuses or
  replaces these ranges once structural parsers exist. Reuse one lexical
  context across all three rules.

- [ ] **Step 5: Run tests, root lint, and benchmark**

  Run: `pnpm vitest run packages/lint/generic/src/companion packages/lint/core/test/companion/fixtures/generic/lexical`

  Run: `pnpm --filter @avandar/lint-generic test && pnpm --filter @avandar/lint-generic build`

  Run: `pnpm lint:benchmark --label phase-6-generic-lexical`

  Expected: PASS and only encountered language adapters load.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-6.md
  git commit -m "feat(lint): add generic lexical metrics"
  ```

### Task 5: Generic structural language adapters

**Files:**

- Create: `packages/lint/generic/src/companion/createSyntaxContext.ts`
- Create: `packages/lint/generic/src/companion/createSyntaxContext.test.ts`
- Create: `packages/lint/generic/src/companion/rules/publicDocumentation.ts`
- Create: `packages/lint/generic/src/companion/rules/functionBodyComments.ts`
- Create: `packages/lint/generic/src/companion/rules/singleLineShortDocstrings.ts`
- Create: `packages/lint/generic/src/companion/rules/safeCommentFixes.integration.test.ts`
- Create: `packages/lint/generic/src/companion/rules/functionLength.ts`
- Create: `packages/lint/generic/src/companion/rules/identifierNames.ts`
- Create: `packages/lint/generic/src/companion/rules/imperativeLoops.ts`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/lint/generic/src/companion/adapters/<language>.ts` for each declared structural adapter
- Create: `packages/lint/core/test/companion/fixtures/generic/structural/`
- Create: `docs/lint-benchmarks/oxlint-phase-6-parsers.md`
- Modify: `packages/lint/generic/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`

**Interfaces:**

- Consumes: the generic file classifier, `LanguageAdapter`, and owner resolver.
- Produces: one cached syntax tree per file and exact GD-03, GD-06, GD-09, and
  GD-22 adapters, plus syntax-proven AF-06 and AF-07 safe fixes, for Go, Ruby,
  Java, Kotlin, Swift, C, C++, C#, shell, SQL where applicable, and any Python
  or Rust outcome not owned by a direct engine.

- [ ] **Step 1: Build the parser provenance and compatibility matrix**

  Record source, version, license, maintained status, native artifact, package
  size, load time, source locations, malformed-input behavior, and grammar
  coverage for every parser candidate. Reject a parser that cannot produce
  stable ranges or whose license is incompatible.

- [ ] **Step 2: Write failing adapter contract fixtures**

  For every language, pin public declarations, function and method spans,
  closed denied identifiers, collection loops, non-collection loops, reasoned
  exceptions, syntax errors, and constructs the grammar represents
  differently. Include public values and constants wherever the language has
  them. Assert direct Pylint or Rust owners suppress companion duplicates when
  available and that a failed parse returns a file-level coverage gap.

- [ ] **Step 3: Write failing AF-06 and AF-07 safety fixtures**

  Cover Rust, Go, Java, Kotlin, Swift, C, C++, and C# unattached function-body
  block comments. Reject declaration docs, nested declarations, comment forms
  without an exact ordinary-comment equivalent, and edits that change line
  directives or source maps. Cover short, tag-free block docstrings in Python,
  Rust, SQL, and other applicable adapters. Reject any collapse that changes a
  string value, indentation, quoting, escapes, comment ownership, or complete
  rendered width. The integration test copies mixed AF and GD fixtures to a
  temporary repository, asserts the first run's documented nonzero status and
  diagnostics, verifies only AF output changed, and asserts second-run
  idempotence without modifying checked-in fixtures.

- [ ] **Step 4: Run structural tests to verify they fail**

  Run: `pnpm vitest run packages/lint/generic/src/companion/{createSyntaxContext,rules,adapters}`

  Expected: FAIL with missing adapters and explicit matrix cells.

- [ ] **Step 5: Implement the minimum query adapters and safe fixes**

  Each adapter returns normalized public declarations, functions, identifiers,
  collection loops, comment ranges when needed, and parse errors. Keep
  language-specific queries in the adapter and canonical rule semantics in the
  shared rule modules. Attach AF-06 and AF-07 edits only after the syntax tree
  proves ownership and every safety fixture passes.

- [ ] **Step 6: Run adapter, owner, fixes, package, and benchmark checks**

  Run: `pnpm vitest run packages/lint/generic/src/companion packages/lint/core/test/companion/fixtures/generic/structural`

  Run: `pnpm --filter @avandar/lint-generic test && pnpm --filter @avandar/lint-generic build && pnpm --filter @avandar/lint test`

  Run: `pnpm lint:benchmark --label phase-6-generic-structural`

  Expected: PASS with the integration test proving the first run's expected
  diagnostics and status, safe fixed output, and second-run idempotence. One
  parse tree exists per file, direct owners suppress duplicates, and
  unsupported grammar cases remain fallback.

- [ ] **Step 7: Commit**

  ```bash
  git add packages/lint pnpm-lock.yaml docs/lint-benchmarks/oxlint-phase-6.md docs/lint-benchmarks/oxlint-phase-6-parsers.md
  git commit -m "feat(lint): add generic structural coverage and safe fixes"
  ```

### Task 6: Generic test and E2E framework adapters

**Files:**

- Create: `packages/lint/generic/src/companion/frameworks/TestFramework.types.ts`
- Create: `packages/lint/generic/src/companion/frameworks/E2EFramework.types.ts`
- Create: `packages/lint/generic/src/companion/frameworks/testFrameworks.ts`
- Create: `packages/lint/generic/src/companion/frameworks/e2eFrameworks.ts`
- Create: `packages/lint/generic/src/companion/rules/testAssertions.ts`
- Create: `packages/lint/generic/src/companion/rules/testAssertions.test.ts`
- Create: `packages/lint/generic/src/companion/rules/e2eDatabaseMutations.ts`
- Create: `packages/lint/generic/src/companion/rules/e2eDatabaseMutations.test.ts`
- Create: `packages/lint/core/test/companion/fixtures/generic/frameworks/`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-6.md`

**Interfaces:**

- Consumes: normalized syntax contexts from Task 5 and repository control-flow
  evidence from the companion host.
- Produces: framework registries, GD-25 generic test diagnostics, and RP-16B
  generic E2E mutation and cleanup diagnostics.

- [ ] **Step 1: Write failing test-framework fixtures**

  Cover Vitest/Jest, pytest/unittest, Rust `#[test]`, Go testing, Ruby
  RSpec/Minitest, JUnit for Java and Kotlin, XCTest, C/C++ GoogleTest and
  Catch2, C# xUnit and NUnit, shell Bats, and SQL pgTAP. Pin assertion-free
  tests, literal self-assertions, type-only checks where applicable,
  constructed-value self-checks, and real behavioral assertions. Put a
  supported and an unknown framework in separate files of the same language
  and prove the supported capability is enforced while the unknown capability
  returns fallback.

- [ ] **Step 2: Write failing E2E framework fixtures**

  Pin setup-only mutations before load, read-only oracles, database writes
  after load that perform the behavior under test, cleanup in `finally` or
  lifecycle hooks, early-return cleanup gaps, and unknown database clients.
  Assert RP-16A Playwright static rules remain owned by the TypeScript pack and
  RP-16B owns only the generic mutation contract. Mix a configured client and
  unknown client in one language fixture and assert per-file capability
  outcomes.

- [ ] **Step 3: Run framework tests to verify they fail**

  Run: `pnpm vitest run packages/lint/generic/src/companion/{frameworks,rules/testAssertions.test.ts,rules/e2eDatabaseMutations.test.ts}`

  Expected: FAIL because registries and rules do not exist.

- [ ] **Step 4: Implement explicit framework registries and rules**

  A registry entry names test/lifecycle APIs, assertion APIs, page or app load
  boundaries, database mutation and read-only calls, and cleanup constructs.
  Do not infer unknown calls by vague method names. Return explicit capability
  gaps through `EngineRunResult` for unregistered frameworks and APIs.

- [ ] **Step 5: Run framework, coverage, and benchmark checks**

  Run: `pnpm vitest run packages/lint/generic/src/companion packages/lint/core/test/companion/fixtures/generic/frameworks`

  Run: `pnpm lint:benchmark --label phase-6-generic-frameworks`

  Expected: PASS within the stop threshold with unsupported frameworks still
  reported as fallback.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint docs/lint-benchmarks/oxlint-phase-6.md
  git commit -m "feat(lint): add generic test and E2E coverage"
  ```

### Task 7: Coverage closure, root integration, and skill handoff

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `avandar-lint.config.json`
- Modify: `.github/workflows/pr-develop.yaml`
- Modify: `packages/lint/core/src/companion/lintRepository.ts`
- Modify: `packages/lint/core/src/cli/coverage.ts`
- Modify: `packages/lint/core/test/coverage/phase6-matrix.test.ts`
- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/deterministic-fallback-checklist.md`
- Modify: relevant focused and full review checklist files
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-6.md`

**Interfaces:**

- Consumes: every Phase 6 engine, adapter, framework registry, catalog cell,
  and the Phase 3 through 5 skill handoff.
- Produces: a closed coverage matrix, lazy root lint integration, package test
  CI, and a review skill whose normal path contains only JR and disable-reason
  judgment while retaining deterministic fallback on demand.

- [ ] **Step 1: Write failing complete-matrix and lazy-loading tests**

  Assert the mandatory Python, Rust, declared-language, and configured RP-16B
  framework outcomes from the spec are enforced and every inapplicable outcome
  is explicit. Accept fallback only for an enumerated parser or syntax
  limitation, unregistered framework or API, missing or unavailable tool,
  excluded path, operational failure, or unknown language. Test Python-only,
  Rust-only, all-language, disabled-engine, missing-tool, parser-failure,
  mixed supported and unsupported same-language frameworks, and unknown
  language repositories. Assert no unselected parser or engine loads.

- [ ] **Step 2: Integrate engine selection into `avandar-lint check`**

  For each selected language, choose the first available exact owner. Run
  direct engines when available and generic adapters for remaining cells.
  Deduplicate by canonical ID, file, range, and fact. Missing direct engines
  may fall through only to an exact generic adapter; otherwise emit fallback
  coverage and an operational warning. Consume `EngineRunResult` so analyzed
  paths, capability gaps, and unavailable engines reach the coverage command.

- [ ] **Step 3: Add package verification to CI**

  Add one isolated Python package-test step and one cached Rust package-test
  step to the pull-request workflow. Keep root `pnpm lint` responsible for
  repository source diagnostics. Do not publish any artifact.

- [ ] **Step 4: Load rule-writing and skill-writing instructions**

  Read `writing-code-review-rules` and `writing-skills` before changing the
  public review skill.

- [ ] **Step 5: Finalize the coverage-driven review protocol**

  Remove generic deterministic prose from always-loaded lanes. Keep every rule
  under its canonical ID in the fallback checklist. Run `avandar-lint coverage`
  for reviewed paths after lint is green, load only returned fallback IDs, then
  run JR phases and changed-disable-reason review. Preserve current behavior
  when the command is absent or fails.

- [ ] **Step 6: Run the complete verification matrix**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run: `pnpm --filter @avandar/lint-generic test && pnpm --filter @avandar/lint-generic type-check && pnpm --filter @avandar/lint-generic build`

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-css test && pnpm --filter @avandar/lint-sql test`

  Run: `.temp/lint-python-venv/bin/python -m pytest packages/lint/python/tests`

  Working directory: `packages/lint/rust`

  Run: `cargo test`

  Return to the repository root before the remaining verification commands.

  Run: `pnpm verify:packages`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-6-complete`

  Expected: PASS with the mandatory enforcement baseline met, no blank
  coverage outcomes, no duplicate diagnostics, only selected adapters loaded,
  and the complete lint runtime inside the stop threshold.

- [ ] **Step 7: Verify package artifacts and final skill fallback**

  Build the npm tarball, Python wheel and sdist, and Rust library artifacts.
  Record sizes and contents. In fixture repositories without Avandar lint,
  without Pylint/Dylint, with unsupported frameworks, and with an unknown
  language, assert the deterministic fallback still loads.

- [ ] **Step 8: Commit**

  ```bash
  git add package.json pnpm-lock.yaml avandar-lint.config.json .github/workflows/pr-develop.yaml packages/lint agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-6.md
  git commit -m "refactor(review): add cross-language lint parity"
  ```
