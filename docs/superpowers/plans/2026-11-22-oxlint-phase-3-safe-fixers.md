# Oxlint phase 3 safe fixers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `packages/lint` umbrella, publish its core, TypeScript,
and CSS packages, and move every TypeScript, JavaScript, and CSS current-file
convention with a proven behavior-preserving repair into coverage-gated safe
fixes.

**Architecture:** `packages/lint/rules.yaml` owns machine-readable rule data and
`packages/lint/README.md` renders the complete canonical catalog. The
`@avandar/lint` exposes the catalog, CLI, diagnostics, and coverage surfaces.
`@avandar/lint-typescript` owns Oxlint and `@avandar/lint-css` owns Stylelint.
Native rules are used first, custom rules fix only proven syntax, and the
review skill skips a detector only when coverage proves every applicable file
and capability.

**Tech Stack:** YAML Schema, Node 24.x native TypeScript, Oxlint JavaScript
plugins, `@oxlint/plugins`, Stylelint plugin API, Vitest, tsup, pnpm workspaces.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-3-safe-fixers-design.md`

## Global Constraints

- The package paths and names are `packages/lint/core` as `@avandar/lint`,
  `packages/lint/typescript` as `@avandar/lint-typescript`, and
  `packages/lint/css` as `@avandar/lint-css`.
- `packages/lint/rules.yaml` is the machine source and the full catalog in
  `packages/lint/README.md` must be generated from it.
- The public entries are `@avandar/lint/catalog`,
  `@avandar/lint-typescript/oxlint`, and `@avandar/lint-css/stylelint`.
- `avandar-lint coverage` reports `enforced`, `not-applicable`, or `fallback`.
- `@oxlint/plugins` exactly matches the installed Oxlint version while the
  JavaScript plugin API is alpha.
- Ordinary `--fix` contains only behavior-preserving, unambiguous edits.
- Suggestions and dangerous fixes never run in normal lint or format commands.
- Each custom fixer refuses unsupported syntax instead of guessing.
- Before each green root-lint gate, apply the newly enabled safe fixes across
  the complete path set that root lint checks. Inspect and commit only changes
  caused by the requested rule batch.
- New production behavior follows red-green TDD.
- Stop and profile a batch whose warm median adds both more than 25 percent
  and more than 2 seconds to the preceding lint baseline.
- A skill detector leaves the normal path only after coverage integration
  proves the exact rule, language, file, and capability. It remains available
  in the on-demand deterministic fallback checklist.

## Review Focus

- Root lint must resolve workspace entries without a prebuild and catalog
  coverage must fail closed for disabled or missing plugins; Task 1 pins both.
- Function rewrites must preserve hoisting and lexical bindings; Task 4 tests
  recursion, overloads, `this`, `arguments`, `super`, and `new.target`.
- Same-file renames must not reach public or computed contracts; Task 4 tests
  exports, collisions, computed access, and string references.
- Object and array rewrites must preserve evaluation order; Task 4 tests
  getters, aliases, branching, interleaved side effects, and early returns.
- CSS comment fixes must not rewrite declaration documentation or source-map
  comments; Task 5 tests both exclusions.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/lint/rules.yaml` | Canonical rule IDs, classes, language applicability, repair classes, phases, and documentation slugs |
| `packages/lint/rules.schema.json` | Schema for canonical rule data |
| `packages/lint/README.md` | Complete generated human rule catalog |
| `packages/lint/core/package.json` | Public exports, peers, scripts, and package metadata |
| `packages/lint/typescript/package.json` | Oxlint export, peer, scripts, and package metadata |
| `packages/lint/css/package.json` | Stylelint export, peer, scripts, and package metadata |
| `packages/lint/core/src/catalog/` | Schema validation, typed catalog loading, and README rendering |
| `packages/lint/core/src/cli/coverage.ts` | Fail-closed coverage report for reviewed paths |
| `packages/lint/core/src/cli/main.ts` | Root and coverage help, argument parsing, streams, and status |
| `packages/lint/typescript/src/oxlint/index.js` | Oxlint plugin registry |
| `packages/lint/typescript/src/oxlint/rules/*.js` | One current-file Oxlint rule per module |
| `packages/lint/typescript/src/oxlint/rules/*.test.ts` | RuleTester fixtures and safety boundaries |
| `packages/lint/css/src/stylelint/index.js` | Stylelint plugin registry |
| `packages/lint/css/src/stylelint/rules/*.js` | One Stylelint rule per module |
| `packages/lint/css/src/stylelint/rules/*.test.ts` | Stylelint fixture tests |
| `packages/lint/core/src/shared/ruleMetadata.ts` | Stable rule identifiers and documentation metadata |
| `packages/lint/core/test/catalog.test.ts` | Schema, uniqueness, applicability, and README drift checks |
| `packages/lint/core/test/coverage.test.ts` | Coverage owner selection and fallback behavior |
| `packages/lint/core/test/imports.test.ts` | Development and packed export resolution |
| `scripts/lint-benchmark/benchmarkLint.mjs` | Cold and five-run warm lint measurement |
| `docs/lint-benchmarks/oxlint-phase-3.md` | Baseline and per-batch measurements |

---

### Task 1: Umbrella catalog, coverage CLI, package foundation, and baseline

**Files:**

- Create: `packages/lint/README.md`
- Create: `packages/lint/rules.schema.json`
- Create: `packages/lint/rules.yaml`
- Create: `packages/lint/core/package.json`
- Create: `packages/lint/core/README.md`
- Create: `packages/lint/core/tsconfig.json`
- Create: `packages/lint/core/tsconfig.build.json`
- Create: `packages/lint/core/tsup.config.ts`
- Create: `packages/lint/core/vitest.config.ts`
- Create: `packages/lint/typescript/package.json`
- Create: `packages/lint/typescript/README.md`
- Create: `packages/lint/typescript/tsconfig.json`
- Create: `packages/lint/typescript/tsconfig.build.json`
- Create: `packages/lint/typescript/tsup.config.ts`
- Create: `packages/lint/typescript/vitest.config.ts`
- Create: `packages/lint/typescript/src/oxlint/index.js`
- Create: `packages/lint/css/package.json`
- Create: `packages/lint/css/README.md`
- Create: `packages/lint/css/tsconfig.json`
- Create: `packages/lint/css/tsconfig.build.json`
- Create: `packages/lint/css/tsup.config.ts`
- Create: `packages/lint/css/vitest.config.ts`
- Create: `packages/lint/css/src/stylelint/index.js`
- Create: `packages/lint/core/src/catalog/RuleCatalog.types.ts`
- Create: `packages/lint/core/src/catalog/loadRuleCatalog.ts`
- Create: `packages/lint/core/src/catalog/renderRuleCatalog.ts`
- Create: `packages/lint/core/src/catalog/index.ts`
- Create: `packages/lint/core/src/cli/coverage.ts`
- Create: `packages/lint/core/src/cli/main.ts`
- Create: `packages/lint/core/src/shared/ruleMetadata.ts`
- Create: `packages/lint/core/test/catalog.test.ts`
- Create: `packages/lint/core/test/coverage.test.ts`
- Create: `packages/lint/core/test/imports.test.ts`
- Create: `scripts/lint-benchmark/benchmarkLint.mjs`
- Create: `docs/lint-benchmarks/oxlint-phase-3.md`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Modify: `pnpm-lock.yaml`
- Modify: `.changeset/config.json`

**Interfaces:**

- Consumes: Existing workspace package and publication conventions from
  `packages/node/etl/package.json` and `pnpm verify:packages`.
- Produces: `@avandar/lint/catalog`, `@avandar/lint-typescript/oxlint`,
  `@avandar/lint-css/stylelint`, `createRuleMetadata(ruleId,
  documentationPath)`, `avandar-lint coverage [PATH]...`, and
  `pnpm lint:benchmark --label <name>`.

- [ ] **Step 1: Write the failing catalog and README drift tests**

  Assert that `rules.yaml` validates, IDs and slugs are unique, every
  deterministic rule has applicability and a phase, every JR rule names the
  skill as owner, and `renderRuleCatalog(catalog)` exactly matches the catalog
  section checked into `packages/lint/README.md`.

- [ ] **Step 2: Run the catalog tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/test/catalog.test.ts`

  Expected: FAIL because the umbrella catalog and loader do not exist.

- [ ] **Step 3: Add the umbrella catalog and generated README**

  Encode AF-01 through AF-21, GD-01 through GD-32, RP-01 through RP-19 with
  RP-16A and RP-16B, and JR-01 through JR-17 from the inventory. Implement
  schema validation and a renderer whose output is deterministic.

- [ ] **Step 4: Write the failing package and coverage tests**

  Add tests named `resolves the oxlint source export without a build`,
  `resolves the stylelint source export without a build`, and
  `resolves the catalog export from the packed tarball`. Coverage tests assert
  `enforced` for an enabled seeded rule, `fallback` for a disabled rule,
  missing plugin, excluded path, operational error, and unknown language, and
  `not-applicable` for JSON comment rules. Add one language fixture with both
  supported and unsupported capabilities and assert that only the supported
  file is enforced while the language summary remains fallback. CLI tests
  cover the bare coverage
  wizard, every optional field and visible default, arrow and j/k wrapping,
  g/G, Enter, Ctrl-C, EOF, explicit no-prompt execution, and unattended
  defaults.

- [ ] **Step 5: Run the package and coverage tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/test/{imports,coverage}.test.ts`

  Expected: FAIL because the three lint packages do not exist.

- [ ] **Step 6: Create the package, CLI, and workspace wiring**

  Follow the source-export plus `publishConfig.exports` pattern in
  `packages/node/etl`. Add the package directories under `packages/lint` to
  `pnpm-workspace.yaml`, add all three packages through `workspace:*` to root
  development dependencies, and add them to one fixed Changesets group. Give
  `@oxlint/plugins` the exact root Oxlint version in the TypeScript package,
  make Oxlint its optional peer, and make Stylelint the CSS package's optional
  peer. Implement root
  and `coverage` help before configuration access, prompt IO on the controlling
  terminal, the shared menu key contract, machine-clean JSON stdout, progress
  on stderr, and recovery guidance for operational errors.

- [ ] **Step 7: Implement the benchmark command and capture the clean baseline**

  `benchmarkLint.mjs` accepts `--label <name>`, runs one cold and five warm
  `pnpm lint` samples, records individual durations plus the warm median, and
  appends a Markdown table row. Capture `phase-3-before-package` before enabling
  either plugin.

- [ ] **Step 8: Run catalog, CLI, package, and publication verification**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint build`

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-typescript build`

  Run: `pnpm --filter @avandar/lint-css test && pnpm --filter @avandar/lint-css build`

  Run: `pnpm exec avandar-lint coverage --help`

  Run: `pnpm verify:packages`

  Expected: PASS, help exits zero without repository access, and every packed
  export resolves from `dist`.

- [ ] **Step 9: Commit**

  ```bash
  git add package.json pnpm-workspace.yaml pnpm-lock.yaml .changeset/config.json packages/lint scripts/lint-benchmark docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add canonical lint catalog"
  ```

### Task 2: Native Oxlint safe rules

**Files:**

- Create: `packages/lint/typescript/src/oxlint/nativeSafeRules.test.ts`
- Create: `packages/lint/core/test/coverage/nativeSafeRules.test.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: Root Oxlint configuration and the benchmark command from Task 1.
- Produces: Enabled AF-01 through AF-05 and AF-19 native rules with tested
  repository options and proven TS/JS coverage claims.

- [ ] **Step 1: Write failing fixtures for each native rule**

  Cover `curly`, `prefer-template`,
  `typescript/consistent-type-imports`, type-aware
  `typescript/consistent-type-exports`, `typescript/prefer-as-const`,
  type-aware `typescript/no-unnecessary-type-assertion`, and
  `import/extensions`. Assert the fixed text and a second-pass zero diff.

- [ ] **Step 2: Run the fixtures to verify they fail under current config**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/nativeSafeRules.test.ts`

  Expected: FAIL because the relevant root rules are disabled or incomplete.

- [ ] **Step 3: Enable the minimum native configurations**

  Enable only the safe-fix behavior proven by the fixtures. Configure native
  type-aware rules through the supported Oxlint type-aware project mechanism.
  Do not create a local replacement for native coverage.

- [ ] **Step 4: Run fixtures, root lint, and the batch benchmark**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/nativeSafeRules.test.ts`

  Run: `pnpm exec oxlint --fix .`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-native-safe-rules`

  Expected: PASS and the recorded warm median stays below the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add .oxlintrc.json packages/lint docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): enable native safe fixes"
  ```

### Task 3: Comment and documentation fixers

**Files:**

- Create: `packages/lint/typescript/src/oxlint/rules/function-body-line-comments.js`
- Create: `packages/lint/typescript/src/oxlint/rules/function-body-line-comments.test.ts`
- Create: `packages/lint/typescript/src/oxlint/rules/single-line-short-jsdoc.js`
- Create: `packages/lint/typescript/src/oxlint/rules/single-line-short-jsdoc.test.ts`
- Create: `packages/lint/typescript/src/oxlint/rules/export-key-jsdoc.js`
- Create: `packages/lint/typescript/src/oxlint/rules/export-key-jsdoc.test.ts`
- Create: `packages/lint/core/test/coverage/commentFixers.test.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/typescript/src/oxlint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: Oxlint plugin registry and rule metadata from Task 1.
- Produces: `avandar/function-body-line-comments` (AF-06),
  `avandar/single-line-short-jsdoc` (AF-07), and
  `avandar/export-key-jsdoc` (AF-11), with AF-06 coverage limited to
  TypeScript and JavaScript.

- [ ] **Step 1: Write failing RuleTester cases**

  For every rule, add valid, invalid, fixed-output, second-pass idempotence, and
  unsupported-shape cases. Pin nested-declaration JSDoc, tagged JSDoc, line
  width overflow, documented interfaces, and ambiguous export mappings.

- [ ] **Step 2: Run the rule tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/rules/{function-body-line-comments,single-line-short-jsdoc,export-key-jsdoc}.test.ts`

  Expected: FAIL because the rule modules are absent.

- [ ] **Step 3: Implement and register the three rules**

  Export one ESLint-compatible rule object from each module. Mark each rule
  fixable only for the exact AF boundary. Use a shared `createOnce` traversal
  if it removes a repeated full-file walk.

- [ ] **Step 4: Run rule tests, root lint, and the batch benchmark**

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint test`

  Run: `pnpm exec oxlint --fix .`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-comment-fixers`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/lint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add safe comment fixers"
  ```

### Task 4: Function, naming, React, and utility fixers

**Files:**

- Create: `packages/lint/typescript/src/oxlint/rules/top-level-function-declarations.js`
- Create: `packages/lint/typescript/src/oxlint/rules/nested-arrow-functions.js`
- Create: `packages/lint/typescript/src/oxlint/rules/private-helper-prefix.js`
- Create: `packages/lint/typescript/src/oxlint/rules/component-props-name.js`
- Create: `packages/lint/typescript/src/oxlint/rules/local-e2e-casing.js`
- Create: `packages/lint/typescript/src/oxlint/rules/jsx-conditional-ternary.js`
- Create: `packages/lint/typescript/src/oxlint/rules/property-helper-callbacks.js`
- Create: `packages/lint/typescript/src/oxlint/rules/straight-line-object-construction.js`
- Create: `packages/lint/typescript/src/oxlint/rules/optional-array-candidates.js`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/lint/core/test/coverage/sourceFixers.test.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/typescript/src/oxlint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: Task 1 plugin registry and Oxlint scope analysis.
- Produces: AF-08 through AF-10 and AF-12 through AF-17 under stable
  `avandar/*` rule IDs matching each filename.

- [ ] **Step 1: Write failing safety matrices for all nine rules**

  Each test file covers valid, fixed invalid, second-pass idempotence, and every
  refusal listed in the spec. Add explicit fixtures for exported symbols,
  collisions, recursion, overloads, lexical bindings, computed references,
  string references, getters, aliases, branches, interleaved side effects, and
  early returns.

- [ ] **Step 2: Run the nine rule tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/rules`

  Expected: FAIL with missing rule implementations.

- [ ] **Step 3: Implement one rule at a time with the minimum proof**

  Use Oxlint scope information for references and collisions. Insert imports
  only through a shared import utility after its own tests prove merge,
  ordering, alias, and existing-import behavior. Unsupported syntax produces no
  AF fix.

- [ ] **Step 4: Register and enable the rules**

  Add the nine rule objects to `@avandar/lint-typescript/oxlint`, add the workspace plugin
  to `.oxlintrc.json`, and enable each rule at error severity.

- [ ] **Step 5: Run package tests, safe fixes, root lint, and benchmark**

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint test`

  Run: `pnpm exec oxlint --fix .`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-source-fixers`

  Expected: PASS within the stop threshold and a second fix run has no diff.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add safe source fixers"
  ```

### Task 5: Stylelint CSS comment fixer

**Files:**

- Create: `packages/lint/css/src/stylelint/rules/canonical-block-comments.js`
- Create: `packages/lint/css/src/stylelint/rules/canonical-block-comments.test.ts`
- Create: `packages/lint/core/test/coverage/cssCommentFixer.test.ts`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/css/src/stylelint/index.js`
- Modify: `stylelint.config.js`
- Modify: `package.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: Stylelint entry from Task 1.
- Produces: `avandar/canonical-block-comments` implementing AF-20.

- [ ] **Step 1: Write failing Stylelint rule tests**

  Assert canonical output for supported single-line and multi-line comments,
  second-pass idempotence, and unchanged declaration docs, source-map comments,
  CSS hacks, and malformed comments.

- [ ] **Step 2: Run the rule test to verify it fails**

  Run: `pnpm vitest run packages/lint/css/src/stylelint/rules/canonical-block-comments.test.ts`

  Expected: FAIL because the rule is absent.

- [ ] **Step 3: Implement, register, and enable the Stylelint rule**

  Use `stylelint.createPlugin`, PostCSS comment nodes, `meta.fixable = true`,
  and source ranges from the parsed node. Do not parse CSS with regular
  expressions. Expand `lint:css:fix` to the same CSS path set as `lint:css` so
  every linted stylesheet can receive the safe fix.

- [ ] **Step 4: Run package tests, CSS fix, root lint, and benchmark**

  Run: `pnpm --filter @avandar/lint-css test && pnpm --filter @avandar/lint test`

  Run: `pnpm exec stylelint "src/**/*.css" "apps/ava-video-producer/**/*.css" --fix`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-stylelint-fixer`

  Expected: PASS within the stop threshold and a second CSS fix has no diff.

- [ ] **Step 5: Commit**

  ```bash
  git add package.json packages/lint stylelint.config.js docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add CSS comment fixer"
  ```

### Task 6: Repository application and coverage-gated skill handoff

**Files:**

- Modify: Files changed by the full-repository Oxlint and Stylelint safe-fix
  commands
- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Create: `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/deterministic-fallback-checklist.md`
- Modify: Relevant files under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: All enabled phase 3 rules.
- Produces: A green repository, an idempotent safe-fix pass, and a skill that
  loads AF detectors only for uncovered rule-language-file-capability outcomes.

- [ ] **Step 1: Load the rule-writing and skill-writing instructions**

  Read the `writing-code-review-rules` and `writing-skills` skills before
  changing the public review skill.

- [ ] **Step 2: Apply all phase 3 safe fixes and inspect the diff**

  Run: `pnpm exec oxlint --fix .`

  Run: `pnpm exec stylelint "src/**/*.css" "apps/ava-video-producer/**/*.css" --fix`

  Inspect every transformation by rule family. Revert only a transformation
  whose rule violated its documented safety boundary, then fix the rule and
  add the regression fixture before rerunning.

- [ ] **Step 3: Move deterministic AF detection into the fallback checklist**

  Remove shipped AF prose from always-loaded full review, focused packs, find
  lanes, common checks, and phase checklists. Preserve each detector under its
  canonical ID in the fallback checklist. Update the core skill to run lint,
  call `avandar-lint coverage` for reviewed paths, and load only returned
  fallback IDs. Preserve AF-18 and AF-21 for Phase 5 and all JR prose.

- [ ] **Step 4: Write and run skill coverage-handoff fixtures**

  Test a repo with all Phase 3 rules enabled, one with the plugin disabled, one
  without `@avandar/lint`, and one with an unknown source extension. Assert
  covered TS/CSS outcomes skip fallback while every missing or unknown outcome loads
  it.

- [ ] **Step 5: Verify package release shape and final runtime**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-typescript type-check && pnpm --filter @avandar/lint-typescript build`

  Run: `pnpm --filter @avandar/lint-css test && pnpm --filter @avandar/lint-css type-check && pnpm --filter @avandar/lint-css build`

  Run: `pnpm verify:packages`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-complete`

  Expected: all checks PASS and the final benchmark stays below the stop
  threshold.

- [ ] **Step 6: Verify fixer idempotence**

  Stage the intended Task 6 changes, run
  the full-repository Oxlint and Stylelint safe-fix commands, then run
  `git diff --exit-code`. Any unstaged diff is an idempotence failure. Unstage
  only after the check if further review requires it.

- [ ] **Step 7: Record the compressed package baseline**

  Run `pnpm --filter @avandar/lint pack`, record the tarball byte size and
  contents in the benchmark document, then delete the generated tarball.

- [ ] **Step 8: Commit**

  ```bash
  git add package.json pnpm-lock.yaml .oxlintrc.json stylelint.config.js packages/lint agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "refactor(review): gate safe checks on lint coverage"
  ```
