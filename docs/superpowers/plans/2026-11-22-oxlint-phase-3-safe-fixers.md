# Oxlint phase 3 safe fixers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@avandar/lint` and move every current-file convention with a
proven behavior-preserving repair into Oxlint or Stylelint safe fixes.

**Architecture:** One public Node package exposes separate Oxlint and Stylelint
entries while sharing rule metadata and fixtures. Native Oxlint rules are used
first; local JavaScript rules cover only syntax whose fix safety can be proven.
The repository applies those fixes before judgment review and removes shipped
AF searches from the review skill.

**Tech Stack:** Node 24.x, Oxlint JavaScript plugins, `@oxlint/plugins`,
Stylelint plugin API, TypeScript, Vitest, tsup, pnpm workspaces.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-3-safe-fixers-design.md`

## Global Constraints

- The package path is `packages/node/lint` and its npm name is
  `@avandar/lint`.
- The public entries are `@avandar/lint/oxlint` and
  `@avandar/lint/stylelint`.
- `@oxlint/plugins` exactly matches the installed Oxlint version while the
  JavaScript plugin API is alpha.
- Ordinary `--fix` contains only behavior-preserving, unambiguous edits.
- Suggestions and dangerous fixes never run in normal lint or format commands.
- Each custom fixer refuses unsupported syntax instead of guessing.
- New production behavior follows red-green TDD.
- Stop and profile a batch whose warm median adds both more than 25 percent
  and more than 2 seconds to the preceding lint baseline.
- A skill detector is removed only after its enforcing rule is enabled and the
  complete lint run is green.

## Review Focus

- Root lint must resolve workspace plugin entries without a prebuild; Task 1
  pins source exports and a clean-checkout resolution test.
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
| `packages/node/lint/package.json` | Public exports, peers, scripts, and package metadata |
| `packages/node/lint/src/oxlint/index.js` | Oxlint plugin registry |
| `packages/node/lint/src/oxlint/rules/*.js` | One current-file Oxlint rule per module |
| `packages/node/lint/src/oxlint/rules/*.test.ts` | RuleTester fixtures and safety boundaries |
| `packages/node/lint/src/stylelint/index.js` | Stylelint plugin registry |
| `packages/node/lint/src/stylelint/rules/*.js` | One Stylelint rule per module |
| `packages/node/lint/src/stylelint/rules/*.test.ts` | Stylelint fixture tests |
| `packages/node/lint/src/shared/ruleMetadata.ts` | Stable rule identifiers and documentation metadata |
| `packages/node/lint/test/imports.test.ts` | Development and packed export resolution |
| `scripts/lint-benchmark/benchmarkLint.mjs` | Cold and five-run warm lint measurement |
| `docs/lint-benchmarks/oxlint-phase-3.md` | Baseline and per-batch measurements |

---

### Task 1: Package foundation and benchmark baseline

**Files:**

- Create: `packages/node/lint/package.json`
- Create: `packages/node/lint/README.md`
- Create: `packages/node/lint/tsconfig.json`
- Create: `packages/node/lint/tsconfig.build.json`
- Create: `packages/node/lint/tsup.config.ts`
- Create: `packages/node/lint/vitest.config.ts`
- Create: `packages/node/lint/src/oxlint/index.js`
- Create: `packages/node/lint/src/stylelint/index.js`
- Create: `packages/node/lint/src/shared/ruleMetadata.ts`
- Create: `packages/node/lint/test/imports.test.ts`
- Create: `scripts/lint-benchmark/benchmarkLint.mjs`
- Create: `docs/lint-benchmarks/oxlint-phase-3.md`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.changeset/config.json`

**Interfaces:**

- Consumes: Existing workspace package and publication conventions from
  `packages/node/etl/package.json` and `.github/scripts/verify-packages.sh`.
- Produces: `@avandar/lint/oxlint`, `@avandar/lint/stylelint`,
  `createRuleMetadata(ruleId, documentationPath)`, and
  `pnpm lint:benchmark --label <name>`.

- [ ] **Step 1: Write the failing package resolution tests**

  Add tests named `resolves the oxlint source export without a build`,
  `resolves the stylelint source export without a build`, and
  `resolves both exports from the packed tarball`. Assert that each entry has a
  plugin object with an empty `rules` registry.

- [ ] **Step 2: Run the package tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/test/imports.test.ts`

  Expected: FAIL because `@avandar/lint` does not exist.

- [ ] **Step 3: Create the package and workspace wiring**

  Follow the source-export plus `publishConfig.exports` pattern in
  `packages/node/etl`. Add `@avandar/lint: workspace:*` to root development
  dependencies. Add the package to the fixed Changesets group. Give
  `@oxlint/plugins` the exact root Oxlint version, and make Oxlint and Stylelint
  optional peers.

- [ ] **Step 4: Implement the benchmark command and capture the clean baseline**

  `benchmarkLint.mjs` accepts `--label <name>`, runs one cold and five warm
  `pnpm lint` samples, records individual durations plus the warm median, and
  appends a Markdown table row. Capture `phase-3-before-package` before enabling
  either plugin.

- [ ] **Step 5: Run package and publication verification**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint build`

  Run: `.github/scripts/verify-packages.sh`

  Expected: PASS, with both packed exports resolving from `dist`.

- [ ] **Step 6: Commit**

  ```bash
  git add package.json pnpm-lock.yaml .changeset/config.json packages/node/lint scripts/lint-benchmark docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add Avandar lint package"
  ```

### Task 2: Native Oxlint safe rules

**Files:**

- Create: `packages/node/lint/src/oxlint/nativeSafeRules.test.ts`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: Root Oxlint configuration and the benchmark command from Task 1.
- Produces: Enabled AF-01 through AF-05 and AF-19 native rules with tested
  repository options.

- [ ] **Step 1: Write failing fixtures for each native rule**

  Cover `curly`, `prefer-template`,
  `typescript/consistent-type-imports`, type-aware
  `typescript/consistent-type-exports`, `typescript/prefer-as-const`,
  type-aware `typescript/no-unnecessary-type-assertion`, and
  `import/extensions`. Assert the fixed text and a second-pass zero diff.

- [ ] **Step 2: Run the fixtures to verify they fail under current config**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/nativeSafeRules.test.ts`

  Expected: FAIL because the relevant root rules are disabled or incomplete.

- [ ] **Step 3: Enable the minimum native configurations**

  Enable only the safe-fix behavior proven by the fixtures. Configure native
  type-aware rules through the supported Oxlint type-aware project mechanism.
  Do not create a local replacement for native coverage.

- [ ] **Step 4: Run fixtures, root lint, and the batch benchmark**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/nativeSafeRules.test.ts`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-native-safe-rules`

  Expected: PASS and the recorded warm median stays below the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add .oxlintrc.json packages/node/lint/src/oxlint/nativeSafeRules.test.ts docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): enable native safe fixes"
  ```

### Task 3: Comment and documentation fixers

**Files:**

- Create: `packages/node/lint/src/oxlint/rules/function-body-line-comments.js`
- Create: `packages/node/lint/src/oxlint/rules/function-body-line-comments.test.ts`
- Create: `packages/node/lint/src/oxlint/rules/single-line-short-jsdoc.js`
- Create: `packages/node/lint/src/oxlint/rules/single-line-short-jsdoc.test.ts`
- Create: `packages/node/lint/src/oxlint/rules/export-key-jsdoc.js`
- Create: `packages/node/lint/src/oxlint/rules/export-key-jsdoc.test.ts`
- Modify: `packages/node/lint/src/oxlint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: Oxlint plugin registry and rule metadata from Task 1.
- Produces: `avandar/function-body-line-comments` (AF-06),
  `avandar/single-line-short-jsdoc` (AF-07), and
  `avandar/export-key-jsdoc` (AF-11).

- [ ] **Step 1: Write failing RuleTester cases**

  For every rule, add valid, invalid, fixed-output, second-pass idempotence, and
  unsupported-shape cases. Pin nested-declaration JSDoc, tagged JSDoc, line
  width overflow, documented interfaces, and ambiguous export mappings.

- [ ] **Step 2: Run the rule tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/rules/{function-body-line-comments,single-line-short-jsdoc,export-key-jsdoc}.test.ts`

  Expected: FAIL because the rule modules are absent.

- [ ] **Step 3: Implement and register the three rules**

  Export one ESLint-compatible rule object from each module. Mark each rule
  fixable only for the exact AF boundary. Use a shared `createOnce` traversal
  if it removes a repeated full-file walk.

- [ ] **Step 4: Run rule tests, root lint, and the batch benchmark**

  Run: `pnpm --filter @avandar/lint test`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-comment-fixers`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/node/lint/src/oxlint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add safe comment fixers"
  ```

### Task 4: Function, naming, React, and utility fixers

**Files:**

- Create: `packages/node/lint/src/oxlint/rules/top-level-function-declarations.js`
- Create: `packages/node/lint/src/oxlint/rules/nested-arrow-functions.js`
- Create: `packages/node/lint/src/oxlint/rules/private-helper-prefix.js`
- Create: `packages/node/lint/src/oxlint/rules/component-props-name.js`
- Create: `packages/node/lint/src/oxlint/rules/local-e2e-casing.js`
- Create: `packages/node/lint/src/oxlint/rules/jsx-conditional-ternary.js`
- Create: `packages/node/lint/src/oxlint/rules/property-helper-callbacks.js`
- Create: `packages/node/lint/src/oxlint/rules/straight-line-object-construction.js`
- Create: `packages/node/lint/src/oxlint/rules/optional-array-candidates.js`
- Create: matching `*.test.ts` beside every rule above
- Modify: `packages/node/lint/src/oxlint/index.js`
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

  Run: `pnpm vitest run packages/node/lint/src/oxlint/rules`

  Expected: FAIL with missing rule implementations.

- [ ] **Step 3: Implement one rule at a time with the minimum proof**

  Use Oxlint scope information for references and collisions. Insert imports
  only through a shared import utility after its own tests prove merge,
  ordering, alias, and existing-import behavior. Unsupported syntax produces no
  AF fix.

- [ ] **Step 4: Register and enable the rules**

  Add the nine rule objects to `@avandar/lint/oxlint`, add the workspace plugin
  to `.oxlintrc.json`, and enable each rule at error severity.

- [ ] **Step 5: Run package tests, safe fixes, root lint, and benchmark**

  Run: `pnpm --filter @avandar/lint test`

  Run: `pnpm lint:ts:fix-changed && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-source-fixers`

  Expected: PASS within the stop threshold and a second fix run has no diff.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/node/lint/src/oxlint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add safe source fixers"
  ```

### Task 5: Stylelint CSS comment fixer

**Files:**

- Create: `packages/node/lint/src/stylelint/rules/canonical-block-comments.js`
- Create: `packages/node/lint/src/stylelint/rules/canonical-block-comments.test.ts`
- Modify: `packages/node/lint/src/stylelint/index.js`
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

  Run: `pnpm vitest run packages/node/lint/src/stylelint/rules/canonical-block-comments.test.ts`

  Expected: FAIL because the rule is absent.

- [ ] **Step 3: Implement, register, and enable the Stylelint rule**

  Use `stylelint.createPlugin`, PostCSS comment nodes, `meta.fixable = true`,
  and source ranges from the parsed node. Do not parse CSS with regular
  expressions. Expand `lint:css:fix` to the same CSS path set as `lint:css` so
  every linted stylesheet can receive the safe fix.

- [ ] **Step 4: Run package tests, CSS fix, root lint, and benchmark**

  Run: `pnpm --filter @avandar/lint test`

  Run: `pnpm lint:css:fix && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-stylelint-fixer`

  Expected: PASS within the stop threshold and a second CSS fix has no diff.

- [ ] **Step 5: Commit**

  ```bash
  git add package.json packages/node/lint/src/stylelint stylelint.config.js docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "feat(lint): add CSS comment fixer"
  ```

### Task 6: Repository application and review-skill pruning

**Files:**

- Modify: Files changed by `pnpm lint:ts:fix-changed` and
  `pnpm lint:css:fix`
- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: Relevant files under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-3.md`

**Interfaces:**

- Consumes: All enabled phase 3 rules.
- Produces: A green repository, an idempotent safe-fix pass, and a skill with no
  shipped AF detector duplicates.

- [ ] **Step 1: Load the rule-writing and skill-writing instructions**

  Read the `writing-code-review-rules` and `writing-skills` skills before
  changing the public review skill.

- [ ] **Step 2: Apply all phase 3 safe fixes and inspect the diff**

  Run: `pnpm lint:ts:fix-changed && pnpm lint:css:fix`

  Inspect every transformation by rule family. Revert only a transformation
  whose rule violated its documented safety boundary, then fix the rule and
  add the regression fixture before rerunning.

- [ ] **Step 3: Remove only shipped AF detection from the skill**

  Remove each enabled AF search from full review, focused packs, find lanes,
  common checks, phase checklists, library checklists, and repo-local
  duplicates. Preserve JR prose and every AF-18 or AF-21 detector for phase 5.
  Keep a lint-first protocol in the skill.

- [ ] **Step 4: Verify package release shape and final runtime**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run: `.github/scripts/verify-packages.sh`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-3-complete`

  Expected: all checks PASS and the final benchmark stays below the stop
  threshold.

- [ ] **Step 5: Verify fixer idempotence**

  Stage the intended Task 6 changes, run
  `pnpm lint:ts:fix-changed && pnpm lint:css:fix`, then run
  `git diff --exit-code`. Any unstaged diff is an idempotence failure. Unstage
  only after the check if further review requires it.

- [ ] **Step 6: Record the compressed package baseline**

  Run `pnpm --filter @avandar/lint pack`, record the tarball byte size and
  contents in the benchmark document, then delete the generated tarball.

- [ ] **Step 7: Commit**

  ```bash
  git add package.json pnpm-lock.yaml .oxlintrc.json stylelint.config.js packages/node/lint agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-3.md
  git commit -m "refactor(review): replace safe convention searches with lint"
  ```
