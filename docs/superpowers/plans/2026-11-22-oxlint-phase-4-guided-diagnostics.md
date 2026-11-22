# Oxlint phase 4 guided diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every deterministic current-file convention whose repair needs
judgment into actionable Oxlint or Stylelint diagnostics without adding unsafe
fixes.

**Architecture:** Native rules own closed behavior they already implement, and
`@avandar/lint` supplies the remaining current-file rules. Diagnostics share a
terse agent-oriented schema and point to package-owned documentation only when
repair branches. A reason is required for every Avandar rule disable.

**Tech Stack:** Node 24.x, Oxlint native rules and JavaScript plugins,
Stylelint plugin API, `@oxlint/plugins`, Vitest, pnpm workspaces.

**Spec:**
`docs/superpowers/specs/2026-11-22-oxlint-phase-4-guided-diagnostics-design.md`

## Global Constraints

- Phase 4 uses the existing `packages/node/lint` package and adds no companion
  process.
- A GD rule reports only a deterministic violation and never a candidate.
- No phase 4 rule is fixable unless its safe AF subset shipped in phase 3.
- A branching repair points to `packages/node/lint/docs/rules/<rule>.md`.
- Every `avandar/*` disable requires a non-empty reason.
- New production behavior follows red-green TDD.
- Stop and profile a batch whose warm median adds both more than 25 percent
  and more than 2 seconds to the preceding lint baseline.
- A skill detector is removed only after its replacement is enabled and the
  complete lint run is green.

## Review Focus

- Agent output must remain actionable when one rule fires hundreds of times;
  Task 1 pins repeated-output size and repair success fixtures.
- Comment rules must distinguish declarations from detached prose; Task 3
  tests nested exports, overloads, and file headers.
- Native and custom partial rules must not duplicate diagnostics; Tasks 2, 4,
  and 5 assert one diagnostic per violation.
- JSX copy and style rules must ignore non-display strings and dynamic styles;
  Task 5 tests logs, errors, IDs, enum values, and computed style values.
- Disable enforcement must accept supported multiline syntax without allowing
  an empty or punctuation-only reason; Task 1 tests both engines.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/node/lint/src/shared/diagnosticMessage.ts` | Stable terse diagnostic construction |
| `packages/node/lint/src/oxlint/rules/*.js` | Guided current-file Oxlint rules |
| `packages/node/lint/src/stylelint/rules/*.js` | Guided CSS rules and disable enforcement |
| `packages/node/lint/docs/rules/*.md` | On-demand repair branches and valid exceptions |
| `packages/node/lint/test/agentOutput.test.ts` | Token size and actionable-output contract |
| `docs/lint-benchmarks/oxlint-phase-4.md` | Per-batch cold and warm measurements |

---

### Task 1: Guided diagnostic and disable-reason contract

**Files:**

- Create: `packages/node/lint/src/shared/diagnosticMessage.ts`
- Create: `packages/node/lint/src/shared/diagnosticMessage.test.ts`
- Create: `packages/node/lint/src/oxlint/rules/require-disable-reason.js`
- Create: `packages/node/lint/src/oxlint/rules/require-disable-reason.test.ts`
- Create: `packages/node/lint/src/stylelint/rules/require-disable-reason.js`
- Create: `packages/node/lint/src/stylelint/rules/require-disable-reason.test.ts`
- Create: `packages/node/lint/test/agentOutput.test.ts`
- Create: `packages/node/lint/docs/rules/README.md`
- Create: `docs/lint-benchmarks/oxlint-phase-4.md`
- Modify: `packages/node/lint/src/oxlint/index.js`
- Modify: `packages/node/lint/src/stylelint/index.js`
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

  Run: `pnpm vitest run packages/node/lint/src/shared/diagnosticMessage.test.ts packages/node/lint/test/agentOutput.test.ts packages/node/lint/src/{oxlint,stylelint}/rules/require-disable-reason.test.ts`

  Expected: FAIL because the shared builder and rules are absent.

- [ ] **Step 4: Select and implement the smallest successful format**

  Record the measured variants in `agentOutput.test.ts`. Implement the shared
  builder and both disable rules. Help text and rule metadata own the stable
  docs root; individual messages include a path only when the formatter cannot
  surface metadata.

- [ ] **Step 5: Enable both disable rules and verify root lint**

  Run: `pnpm --filter @avandar/lint test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-diagnostic-contract`

  Expected: PASS within the stop threshold.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/node/lint .oxlintrc.json stylelint.config.js docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add guided diagnostic contract"
  ```

### Task 2: Native guided Oxlint rules

**Files:**

- Create: `packages/node/lint/src/oxlint/nativeGuidedRules.test.ts`
- Create: `packages/node/lint/docs/rules/function-length.md`
- Create: `packages/node/lint/docs/rules/file-length.md`
- Create: `packages/node/lint/docs/rules/named-exports.md`
- Create: `packages/node/lint/docs/rules/identifier-names.md`
- Create: `packages/node/lint/docs/rules/function-style.md`
- Create: `packages/node/lint/docs/rules/object-type-style.md`
- Create: `packages/node/lint/docs/rules/explicit-any.md`
- Create: `packages/node/lint/docs/rules/module-boundary-types.md`
- Create: `packages/node/lint/docs/rules/imperative-syntax.md`
- Create: `packages/node/lint/docs/rules/one-component-per-file.md`
- Create: `packages/node/lint/docs/rules/test-assertions.md`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostic and documentation contract.
- Produces: Native enforcement for GD-06 through GD-10, GD-12 through GD-14,
  GD-19, and native subsets of GD-22, GD-23, and GD-25.

- [ ] **Step 1: Write failing native-rule configuration fixtures**

  Pin file and function exclusions, the exact closed identifier denylist,
  handler positions, function-style exceptions, type-definition behavior,
  explicit-any and boundary behavior, restricted loop and class syntax,
  component counting, and meaningful assertion detection. Assert one diagnostic
  and no fix for each invalid fixture.

- [ ] **Step 2: Run the fixtures to verify current config fails them**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/nativeGuidedRules.test.ts`

  Expected: FAIL because the rules or required options are not enabled.

- [ ] **Step 3: Configure native rules and write branching repair docs**

  Use native rules only for the semantics their tests prove. Document valid
  exceptions and disable criteria without repeating basic message text.

- [ ] **Step 4: Run tests, lint, and benchmark**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/nativeGuidedRules.test.ts && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-native-guided-rules`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add .oxlintrc.json packages/node/lint/src/oxlint/nativeGuidedRules.test.ts packages/node/lint/docs/rules docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): enable native guided diagnostics"
  ```

### Task 3: Comment and public-contract diagnostics

**Files:**

- Create: `packages/node/lint/src/oxlint/rules/no-comment-em-dash.js`
- Create: `packages/node/lint/src/oxlint/rules/public-documentation.js`
- Create: `packages/node/lint/src/oxlint/rules/no-main-export-file-header.js`
- Create: `packages/node/lint/src/oxlint/rules/export-key-documentation.js`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/node/lint/docs/rules/comment-punctuation.md`
- Create: `packages/node/lint/docs/rules/public-documentation.md`
- Modify: `packages/node/lint/src/oxlint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostic builder.
- Produces: GD-01 and GD-03 through GD-05. Existing comment-aware `max-len`
  continues to own GD-02.

- [ ] **Step 1: Write failing valid and invalid fixtures**

  Cover code versus comment em dashes, exported variables and overloads,
  declarations documented by owning interfaces, detached file headers,
  basename-matching exports, nested declarations, and exported object keys.
  Assert no fixer and exactly one actionable diagnostic per fact.

- [ ] **Step 2: Run the four rule tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/rules/{no-comment-em-dash,public-documentation,no-main-export-file-header,export-key-documentation}.test.ts`

  Expected: FAIL because the rules are absent.

- [ ] **Step 3: Implement, document, register, and enable the rules**

  Reuse one comment attachment utility. Keep documentation quality in JR-01;
  these rules prove presence and ownership only.

- [ ] **Step 4: Run package tests, lint, and benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-comment-diagnostics`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/node/lint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add comment diagnostics"
  ```

### Task 4: TypeScript and API-shape diagnostics

**Files:**

- Create: `packages/node/lint/src/oxlint/rules/helper-declaration-order.js`
- Create: `packages/node/lint/src/oxlint/rules/no-double-assertion.js`
- Create: `packages/node/lint/src/oxlint/rules/prefer-string-union.js`
- Create: `packages/node/lint/src/oxlint/rules/name-large-inline-object-type.js`
- Create: `packages/node/lint/src/oxlint/rules/function-signature-shape.js`
- Create: `packages/node/lint/src/oxlint/rules/require-imperative-reason.js`
- Create: matching `*.test.ts` beside every rule above
- Create: one matching Markdown page under `packages/node/lint/docs/rules/` for
  each rule above
- Modify: `packages/node/lint/src/oxlint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostics and Task 2 native partial coverage.
- Produces: GD-11, GD-15, GD-16, GD-18, GD-21, and the custom exception
  portion of GD-22.

- [ ] **Step 1: Write failing fixtures for each deterministic boundary**

  Pin dependency order exceptions, double-assertion syntax, string-only enums,
  four-property inline object types, positional and one-property options
  signatures, allowed parameter nouns, one-use options aliases, and reasoned
  imperative disables. Assert no duplicates with Task 2 native rules.

- [ ] **Step 2: Run the six rule tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/oxlint/rules`

  Expected: FAIL for the new rule IDs.

- [ ] **Step 3: Implement and register the rules without fixes**

  Report exact local facts through `buildDiagnosticMessage`. Keep naming,
  extraction, and API redesign choices in the documentation, not the detector.

- [ ] **Step 4: Run package tests, lint, and benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-typescript-diagnostics`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/node/lint .oxlintrc.json docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add API shape diagnostics"
  ```

### Task 5: React, tests, localization, modules, and static styles

**Files:**

- Create: `packages/node/lint/src/oxlint/rules/no-jsx-render-helper.js`
- Create: `packages/node/lint/src/oxlint/rules/named-effect-callback.js`
- Create: `packages/node/lint/src/oxlint/rules/no-tautological-test.js`
- Create: `packages/node/lint/src/oxlint/rules/translated-display-copy.js`
- Create: `packages/node/lint/src/oxlint/rules/no-translation-function-escape.js`
- Create: `packages/node/lint/src/oxlint/rules/no-stateless-create-module.js`
- Create: `packages/node/lint/src/oxlint/rules/static-ui-styles.js`
- Create: matching `*.test.ts` beside every rule above
- Create: `packages/node/lint/src/stylelint/rules/no-tailwind-directives.js`
- Create: `packages/node/lint/src/stylelint/rules/no-tailwind-directives.test.ts`
- Create: one matching Markdown page under `packages/node/lint/docs/rules/` for
  each rule family above
- Modify: `packages/node/lint/src/oxlint/index.js`
- Modify: `packages/node/lint/src/stylelint/index.js`
- Modify: `.oxlintrc.json`
- Modify: `stylelint.config.js`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Task 1 diagnostic builder and Task 2 native React and test rules.
- Produces: Custom portions of GD-23 and GD-25, plus GD-24, GD-26, GD-27,
  and GD-30.

- [ ] **Step 1: Write failing boundary fixtures**

  Cover top-level JSX helpers, one-line and multiline effects, closed tautology
  patterns, display and non-display string positions, Lingui macro scopes,
  stateful and stateless `createModule`, static and computed inline styles,
  Tailwind class tokens, and Tailwind CSS directives. Assert no duplicate with
  native rules and no diagnostic for logs, thrown errors, IDs, or enum values.

- [ ] **Step 2: Run the new rule tests to verify they fail**

  Run: `pnpm vitest run packages/node/lint/src/{oxlint,stylelint}/rules`

  Expected: FAIL for the new rule IDs.

- [ ] **Step 3: Implement, document, register, and enable the rules**

  Use JSX prop and call-position allowlists for display copy. Report only static
  styles and closed Tailwind syntax. Leave dynamic style legitimacy and token
  choice in JR-17.

- [ ] **Step 4: Run package tests, lint, and benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-ui-test-diagnostics`

  Expected: PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/node/lint .oxlintrc.json stylelint.config.js docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "feat(lint): add UI and test diagnostics"
  ```

### Task 6: Lint-first remediation and review-skill pruning

**Files:**

- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: Relevant files under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Modify: `docs/code-reviews/extra-checklist.md`
- Modify: `docs/lint-benchmarks/oxlint-phase-4.md`

**Interfaces:**

- Consumes: Every enabled phase 4 rule and its package documentation.
- Produces: A lint-first review skill containing JR detection, phase 5
  carryover, and changed-disable-reason judgment only.

- [ ] **Step 1: Load rule-writing and skill-writing instructions**

  Read the `writing-code-review-rules` and `writing-skills` skills before
  editing the public review skill.

- [ ] **Step 2: Test the remediation flow on one fixture per rule family**

  Run lint with agent output, repair from the message or linked page without
  loading the review checklist, and rerun lint. Record any message that did not
  provide enough information as a failing agent-output fixture before changing
  its contract.

- [ ] **Step 3: Remove only shipped phase 4 detectors from the skill**

  Remove enabled GD searches from full review, focused packs, find lanes,
  common checks, phase checklists, library checklists, and repo-local
  duplicates. Preserve JR-01 through JR-17 and phase 5 rows GD-17, GD-20,
  GD-28, GD-29, and GD-31. Add the lint-first remediation protocol and review
  only new or changed disable reasons.

- [ ] **Step 4: Run complete verification and final benchmark**

  Run: `pnpm --filter @avandar/lint test && pnpm --filter @avandar/lint type-check && pnpm --filter @avandar/lint build`

  Run: `.github/scripts/verify-packages.sh`

  Run: `pnpm lint`

  Run: `pnpm lint:benchmark --label phase-4-complete`

  Expected: all checks PASS within the stop threshold.

- [ ] **Step 5: Commit**

  ```bash
  git add .oxlintrc.json stylelint.config.js packages/node/lint agent-skills/public-skills/skills/avandar-code-review docs/code-reviews docs/lint-benchmarks/oxlint-phase-4.md
  git commit -m "refactor(review): replace guided convention searches with lint"
  ```
