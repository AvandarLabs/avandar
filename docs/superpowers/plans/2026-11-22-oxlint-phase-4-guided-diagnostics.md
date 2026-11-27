# Oxlint phase 4 guided diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every deterministic TypeScript, JavaScript, JSX, TSX, and CSS
current-file convention whose repair needs judgment into coverage-gated Oxlint
or Stylelint diagnostics without adding unsafe fixes.

**Architecture:** Native rules own closed behavior they already implement, and
`@avandar/lint-typescript` and `@avandar/lint-css` supply the remaining
current-file rules while `@avandar/lint` supplies shared diagnostics and
coverage. Diagnostics share a terse agent-oriented schema and point to
package-owned documentation only when repair branches. Coverage suppresses
review only for exact enabled file and capability outcomes, and generic rules
remain fallback for other languages.

**Tech Stack:** Node 24.x, Oxlint native rules and JavaScript plugins,
Stylelint plugin API, `@oxlint/plugins`, Vitest, pnpm workspaces.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-4-guided-diagnostics-design.md`

## Global Constraints

- Phase 4 uses the existing core, TypeScript, and CSS packages and adds no
  companion process.
- Every coverage claim updates `packages/lint/rules.yaml` and its generated
  README catalog.
- A guided rule reports only a deterministic violation and never a candidate.
- No phase 4 rule is fixable unless its safe safe-fix subset shipped in phase 3.
- A branching repair points to `packages/lint/docs/rules/<rule>.md`.
- Every `avandar/*` disable requires a non-empty reason.
- Before each green root-lint gate, run the newly enabled batch across the
  complete root lint path set and remediate all diagnostics from that batch.
  Do not clean unrelated findings.
- New production behavior follows red-green TDD.
- Stop and profile a batch whose warm median adds both more than 25 percent
  and more than 2 seconds to the preceding lint baseline.
- A skill detector leaves the normal path only after coverage proves its exact
  rule, language, file, and capability. It remains in the deterministic
  fallback for missing tools, disabled rules, and other languages.

## Review Focus

- Agent output must remain actionable when one rule fires hundreds of times;
  Task 1 pins repeated-output size and repair success fixtures.
- Comment rules must distinguish declarations from detached prose; Task 3
  tests nested exports, overloads, and file headers.
- Native and custom partial rules must not duplicate diagnostics or suppress
  fallback in another language; Tasks 2, 4, 5, and 6 pin both boundaries.
- JSX copy and style rules must ignore non-display strings and dynamic styles;
  Task 5 tests logs, errors, IDs, enum values, and computed style values.
- Disable enforcement must accept supported multiline syntax without allowing
  an empty or punctuation-only reason; Task 1 tests both engines.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/lint/core/src/shared/diagnosticMessage.ts` | Stable terse diagnostic construction |
| `packages/lint/typescript/src/oxlint/rules/*.js` | Guided current-file Oxlint rules |
| `packages/lint/css/src/stylelint/rules/*.js` | Guided CSS rules and disable enforcement |
| `packages/lint/docs/rules/*.md` | On-demand repair branches and valid exceptions |
| `packages/lint/rules.yaml` | Canonical applicability and Phase 4 owner registrations |
| `packages/lint/README.md` | Generated complete rule catalog |
| `packages/lint/core/test/coverage/phase4.test.ts` | Root-config coverage and fallback integration |
| `packages/lint/core/test/agentOutput.test.ts` | Token size and actionable-output contract |
| `docs/lint-benchmarks/oxlint-phase-4.md` | Per-batch cold and warm measurements |

---

### Task 1: Guided diagnostic and disable-reason contract

**Files:**

- Create: `packages/lint/core/src/shared/diagnosticMessage.ts`
- Create: `packages/lint/core/src/shared/diagnosticMessage.test.ts`
- Create: `packages/lint/typescript/src/oxlint/rules/require-disable-reason.js`
- Create: `packages/lint/typescript/src/oxlint/rules/require-disable-reason.test.ts`
- Create: `packages/lint/css/src/stylelint/rules/require-disable-reason.js`
- Create: `packages/lint/css/src/stylelint/rules/require-disable-reason.test.ts`
- Create: `packages/lint/core/test/agentOutput.test.ts`
- Create: `packages/lint/docs/rules/README.md`
- Create: `docs/lint-benchmarks/oxlint-phase-4.md`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/typescript/src/oxlint/index.js`
- Modify: `packages/lint/css/src/stylelint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `stylelint.config.js`

**Interfaces:**

- Consumes: Phase 3 `createRuleMetadata` and both plugin registries.
- Produces: `buildDiagnosticMessage({ requirement, fact, objective })`,
  `avandar/require-disable-reason` in both engines, and the chosen agent-output
  contract.

- [ ] **Step 1: Write the three diagnostic-format experiments**

  Run the same repair fixtures with a repeated detailed message, a terse
  message plus repeated doc path, and a terse message whose metadata owns the
  path. Assert byte counts and that each fixture exposes the requirement,
  concrete fact, repair objective, and documentation location when required.

- [ ] **Step 2: Write failing disable-reason tests**

  Cover single-line and multiline directives, multiple rule names, empty,
  whitespace-only, punctuation-only, and meaningful reasons in Oxlint and
  Stylelint syntax.

- [ ] **Step 3: Run the contract tests to verify they fail**

  Run: `pnpm vitest run packages/lint/core/src/shared/diagnosticMessage.test.ts packages/lint/core/test/agentOutput.test.ts packages/lint/typescript/src/oxlint/rules/require-disable-reason.test.ts packages/lint/css/src/stylelint/rules/require-disable-reason.test.ts`

  Expected: FAIL because the shared builder and rules are absent.

- [ ] **Step 4: Select and implement the smallest successful format**

  Record the measured variants in `agentOutput.test.ts`. Implement the shared
  builder and both disable rules. Help text and rule metadata own the stable
  docs root; individual messages include a path only when the formatter cannot
  surface metadata.

- [ ] **Step 5: Enable both disable rules and verify root lint**

  Run root lint once, repair every newly introduced disable-reason diagnostic
  across the complete linted path set, then rerun the command below.

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-css test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-diagnostic-contract`

  Expected: PASS within the stop threshold.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/lint .oxlintrc.json stylelint.config.js docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add guided diagnostic contract"
  ```

### Task 2: Native guided Oxlint rules

**Files:**

- Create: `packages/lint/typescript/src/oxlint/nativeGuidedRules.test.ts`
- Create: `packages/lint/docs/rules/function-length.md`
- Create: `packages/lint/docs/rules/file-length.md`
- Create: `packages/lint/docs/rules/named-exports.md`
- Create: `packages/lint/docs/rules/identifier-names.md`
- Create: `packages/lint/docs/rules/function-style.md`
- Create: `packages/lint/docs/rules/object-type-style.md`
- Create: `packages/lint/docs/rules/explicit-any.md`
- Create: `packages/lint/docs/rules/module-boundary-types.md`
- Create: `packages/lint/docs/rules/imperative-syntax.md`
- Create: `packages/lint/docs/rules/class-declarations.md`
- Create: `packages/lint/docs/rules/one-component-per-file.md`
- Create: `packages/lint/docs/rules/test-assertions.md`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostic and documentation contract.
- Produces: Native enforcement for avlint-common-006 through avlint-ts-021, avlint-ts-023 through avlint-ts-025,
  avlint-ts-030, native subsets of avlint-common-009, avlint-ts-033, and avlint-common-010, plus avlint-ts-041.

- [ ] **Step 1: Write failing native-rule configuration fixtures**

  Pin file and function exclusions, the exact closed identifier denylist,
  handler positions, function-style exceptions, type-definition behavior,
  explicit-any and boundary behavior, restricted loop syntax, class
  declarations with reasoned exceptions,
  component counting, and meaningful assertion detection. Assert one diagnostic
  and no fix for each invalid fixture.

- [ ] **Step 2: Run the fixtures to verify current config fails them**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/nativeGuidedRules.test.ts`

  Expected: FAIL because the rules or required options are not enabled.

- [ ] **Step 3: Configure native rules and write branching repair docs**

  Use native rules only for the semantics their tests prove. Document valid
  exceptions and disable criteria without repeating basic message text.

- [ ] **Step 4: Run tests, lint, and benchmark**

  Run root lint once, remediate every diagnostic introduced by this native
  batch across the complete linted path set, then rerun the command below.

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/nativeGuidedRules.test.ts && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-native-guided-rules`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add .oxlintrc.json packages/lint docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): enable native guided diagnostics"
  ```

### Task 3: Comment and public-contract diagnostics

**Files:**

- Create: `packages/lint/typescript/src/oxlint/rules/no-comment-em-dash.js`
- Create: `packages/lint/typescript/src/oxlint/rules/public-documentation.js`
- Create: `packages/lint/typescript/src/oxlint/rules/no-main-export-file-header.js`
- Create: `packages/lint/typescript/src/oxlint/rules/export-key-documentation.js`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/lint/css/src/stylelint/rules/no-comment-em-dash.js`
- Create: `packages/lint/css/src/stylelint/rules/no-comment-em-dash.test.ts`
- Create: `packages/lint/docs/rules/comment-punctuation.md`
- Create: `packages/lint/docs/rules/public-documentation.md`
- Modify: `packages/lint/typescript/src/oxlint/index.js`
- Modify: `packages/lint/css/src/stylelint/index.js`
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `.oxlintrc.json`
- Modify: `stylelint.config.js`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostic builder.
- Produces: avlint-common-003 and avlint-common-005 through avlint-ts-019 for TS/JS, CSS coverage for avlint-common-003,
  and no non-TS coverage claim. Existing comment-aware `max-len` continues to
  own TS/JS avlint-common-004.

- [ ] **Step 1: Write failing valid and invalid fixtures**

  Cover code versus comment em dashes, exported variables and overloads,
  declarations documented by owning interfaces, detached file headers,
  basename-matching exports, nested declarations, and exported object keys.
  Assert no fixer and exactly one actionable diagnostic per fact.

- [ ] **Step 2: Run the four rule tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/rules/{no-comment-em-dash,public-documentation,no-main-export-file-header,export-key-documentation}.test.ts packages/lint/css/src/stylelint/rules/no-comment-em-dash.test.ts`

  Expected: FAIL because the rules are absent.

- [ ] **Step 3: Implement, document, register, and enable the rules**

  Reuse one comment attachment utility. Keep documentation quality in avlint-common-012;
  these rules prove presence and ownership only.

- [ ] **Step 4: Run package tests, lint, and benchmark**

  Run root lint once, remediate every avlint-common-003 through avlint-ts-019 diagnostic introduced
  by this batch across the complete linted path set, then rerun the command
  below.

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-css test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-comment-diagnostics`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/lint .oxlintrc.json stylelint.config.js docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add comment diagnostics"
  ```

### Task 4: TypeScript and API-shape diagnostics

**Files:**

- Create: `packages/lint/typescript/src/oxlint/rules/helper-declaration-order.js`
- Create: `packages/lint/typescript/src/oxlint/rules/no-double-assertion.js`
- Create: `packages/lint/typescript/src/oxlint/rules/prefer-string-union.js`
- Create: `packages/lint/typescript/src/oxlint/rules/name-large-inline-object-type.js`
- Create: `packages/lint/typescript/src/oxlint/rules/function-signature-shape.js`
- Create: `packages/lint/typescript/src/oxlint/rules/require-imperative-reason.js`
- Create: matching `*.test.ts` beside every rule above
- Create: one matching Markdown page under `packages/lint/docs/rules/` for
  each rule above
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/typescript/src/oxlint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostics and Task 2 native partial coverage.
- Produces: avlint-ts-022, avlint-ts-026, avlint-ts-027, avlint-ts-029, avlint-ts-032, and the custom exception
  portion of avlint-common-009.

- [ ] **Step 1: Write failing fixtures for each deterministic boundary**

  Pin dependency order exceptions, double-assertion syntax, string-only enums,
  four-property inline object types, positional and one-property options
  signatures whose complete decision is current-file local, allowed parameter
  nouns, one-use options aliases, and reasoned imperative disables. Assert no
  duplicates with Task 2 native rules and leave call-site or public-API
  evidence for Phase 5.

- [ ] **Step 2: Run the six rule tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/rules`

  Expected: FAIL for the new rule IDs.

- [ ] **Step 3: Implement and register the rules without fixes**

  Report exact local facts through `buildDiagnosticMessage`. Keep naming,
  extraction, and API redesign choices in the documentation, not the detector.

- [ ] **Step 4: Run package tests, lint, and benchmark**

  Run root lint once, remediate every API-shape diagnostic introduced by this
  batch across the complete linted path set, then rerun the command below.

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-typescript-diagnostics`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/lint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add API shape diagnostics"
  ```

### Task 5: React, tests, localization, modules, and static styles

**Files:**

- Create: `packages/lint/typescript/src/oxlint/rules/no-jsx-render-helper.js`
- Create: `packages/lint/typescript/src/oxlint/rules/named-effect-callback.js`
- Create: `packages/lint/typescript/src/oxlint/rules/no-tautological-test.js`
- Create: `packages/lint/typescript/src/oxlint/rules/translated-display-copy.js`
- Create: `packages/lint/typescript/src/oxlint/rules/no-translation-function-escape.js`
- Create: `packages/lint/typescript/src/oxlint/rules/no-stateless-create-module.js`
- Create: `packages/lint/typescript/src/oxlint/rules/static-ui-styles.js`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/lint/css/src/stylelint/rules/no-tailwind-directives.js`
- Create: `packages/lint/css/src/stylelint/rules/no-tailwind-directives.test.ts`
- Create: one matching Markdown page under `packages/lint/docs/rules/` for
  each rule family above
- Modify: `packages/lint/rules.yaml`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/typescript/src/oxlint/index.js`
- Modify: `packages/lint/css/src/stylelint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `stylelint.config.js`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostic builder and Task 2 native React and test rules.
- Produces: Custom portions of avlint-ts-033 and avlint-common-010, plus avlint-ts-034, avlint-ts-035, avlint-ts-036,
  and avlint-ts-039.

- [ ] **Step 1: Write failing boundary fixtures**

  Cover top-level JSX helpers, one-line and multiline effects, closed tautology
  patterns, display and non-display string positions, Lingui macro scopes,
  stateful and stateless `createModule`, static and computed inline styles,
  Tailwind class tokens, and Tailwind CSS directives. Assert no duplicate with
  native rules and no diagnostic for logs, thrown errors, IDs, or enum values.

- [ ] **Step 2: Run the new rule tests to verify they fail**

  Run: `pnpm vitest run packages/lint/typescript/src/oxlint/rules packages/lint/css/src/stylelint/rules`

  Expected: FAIL for the new rule IDs.

- [ ] **Step 3: Implement, document, register, and enable the rules**

  Use JSX prop and call-position allowlists for display copy. Report only static
  styles and closed Tailwind syntax. Leave dynamic style legitimacy and token
  choice in avlint-ts-058.

- [ ] **Step 4: Run package tests, lint, and benchmark**

  Run root lint once, remediate every React, test, localization, module, and
  static-style diagnostic introduced by this batch across the complete linted
  path set, then rerun the command below.

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-css test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-ui-test-diagnostics`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/lint .oxlintrc.json stylelint.config.js docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add UI and test diagnostics"
  ```

### Task 6: Lint-first remediation and coverage-gated skill handoff

**Files:**

- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: Relevant files under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Create: `packages/lint/core/test/coverage/phase4.test.ts`
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Every enabled phase 4 rule and its package documentation.
- Produces: A lint-first review skill that skips proven TS/JS/CSS outcomes, loads
  fallback for uncovered languages and configurations, retains Phase 5
  carryover, and judges changed disable reasons.

- [ ] **Step 1: Load rule-writing and skill-writing instructions**

  Read the `writing-code-review-rules` and `writing-skills` skills before
  editing the public review skill.

- [ ] **Step 2: Test the remediation flow on one fixture per rule family**

  Run lint with agent output, repair from the message or linked page without
  loading the review checklist, and rerun lint. Record any message that did not
  provide enough information as a failing agent-output fixture before changing
  its contract.

- [ ] **Step 3: Move shipped Phase 4 detectors behind coverage gating**

  Remove enabled guided prose from always-loaded full review, focused packs, find
  lanes, common checks, and phase checklists. Preserve each deterministic
  detector under its canonical ID in the fallback checklist. Preserve avlint-common-012
  through avlint-ts-058 and Phase 5 rows avlint-ts-028, avlint-ts-031, repository-aware avlint-ts-032, avlint-ts-037,
  avlint-ts-038, and avlint-ts-040. Review only new or changed disable reasons after lint is
  green.

- [ ] **Step 4: Prove mixed-language coverage behavior**

  Seed the same generic violation in TypeScript, Python, and Rust fixtures.
  Assert the configured TypeScript rule is `enforced`, while Python and Rust
  remain `fallback`. Disable the Oxlint plugin and assert TypeScript returns to
  fallback. Assert CSS reports only avlint-common-003 and does not claim avlint-common-004. Add two
  TypeScript test files using supported and unknown framework capabilities and
  assert that the unknown capability remains fallback without hiding the
  enforced file.

- [ ] **Step 5: Run complete verification and final benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run: `pnpm --filter @avandar/lint-typescript test && pnpm --filter @avandar/lint-typescript type-check && pnpm --filter @avandar/lint-typescript build`

  Run: `pnpm --filter @avandar/lint-css test && pnpm --filter @avandar/lint-css type-check && pnpm --filter @avandar/lint-css build`

  Run: `pnpm verify:packages`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-complete`

  Expected: all checks PASS within the stop threshold.

- [ ] **Step 6: Commit**

  ```bash
  git add .oxlintrc.json stylelint.config.js packages/lint agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "refactor(review): gate guided checks on lint coverage"
  ```
