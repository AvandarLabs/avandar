# Oxlint phase 3 deterministic review rules Implementation Plan

> **Superseded on 2026-11-22.** This combined plan is retained as historical
> context. Use the phase-specific plans instead:
>
> - `docs/superpowers/plans/2026-11-22-oxlint-phase-3-safe-fixers.md`
> - `docs/superpowers/plans/2026-11-22-oxlint-phase-4-guided-diagnostics.md`
> - `docs/superpowers/plans/2026-11-22-oxlint-phase-5-companion-analyzer.md`

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move deterministic TypeScript, React, comment, test, module-layout,
and CSS convention detection out of `avandar-code-review`, while applying
only behavior-preserving automatic fixes.

**Architecture:** Native Oxlint owns existing rules, and a local
`oxlint-plugin-avandar` owns current-file JavaScript, TypeScript, and TSX
rules. A companion repo analyzer owns paths and multi-file evidence, while
Stylelint owns CSS. Guided diagnostics point to on-demand docs instead of
loading their rules into the judgment review skill.

**Tech Stack:** Oxlint 1.93+, ESLint-compatible Oxlint JS plugin API, Vitest,
Node 24 type stripping, Stylelint, TypeScript compiler APIs where required.

**Spec:**
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`

## Global Constraints

- Ordinary `--fix` contains only behavior-preserving, unambiguous edits.
- Suggestions and dangerous fixes never run in `pnpm format` or the normal
  lint-remediation path.
- A custom rule reports only the subset it can prove. Unsafe shapes use a
  separate no-fixer diagnostic.
- Use native Oxlint before writing an equivalent Avandar rule.
- Custom JS plugin rules are current-file and not type-aware.
- File moves, import-graph changes, and multi-file checks belong to the repo
  analyzer, not a pretend single-file fixer.
- CSS rules extend the existing Stylelint pipeline. SQL rules receive a
  separate plan after the first three enforcement engines prove the contract.
- A shipped deterministic rule is removed from every duplicate review lane,
  including focused packs and their find instructions.
- New production behavior follows red-green TDD.
- Benchmark each rule batch against the immediately preceding commit. Stop and
  profile a batch whose warm median adds more than 25 percent and more than
  2 seconds to `pnpm lint`.

## Review Focus

- A fixer must leave unsupported syntax unchanged and emit a guided diagnostic
  instead of guessing.
- A symbol rename must reject exports, collisions, computed references, and
  cross-file consumers unless a repo-wide codemod owns the change.
- Comments attached to nested declarations must not be mistaken for free
  comments in an outer function body.
- A repo-layout diagnostic must be stable on macOS and Linux path semantics
  and must ignore generated, dependency, build, and migration paths.
- Removing a rule from the review skill must remove every focused-pack and
  candidate-search duplicate while retaining the judgment portion of a mixed
  convention.

---

## Delivery slices

This plan is the first phase 3 tranche and is independently useful when
complete. It delivers the plugin foundation, current-file rules, high-value
module and test layout checks, CSS rules, and skill pruning.

Create follow-up plans after Task 9 for:

1. Avandar-specific type-aware rules: avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038, avlint-ts-040,
   avlint-ts-050, avlint-ts-051, and avlint-ts-053, plus avlint-ts-003 type exports and avlint-ts-005.
2. SQL-aware rules: avlint-sql-001 and avlint-sql-002 through avlint-sql-004, avlint-sql-005, and avlint-sql-006.
3. Lower-priority repo graph rules not shipped by Task 7.

Do not mix those parser and type-checker decisions into the plugin foundation.

## Inventory coverage

| Inventory rows | Delivery |
| --- | --- |
| avlint-ts-001 through avlint-ts-004 | Task 2, except avlint-ts-003 type exports move to the type-aware follow-up |
| avlint-ts-005 | Type-aware follow-up |
| avlint-common-001, avlint-common-002, avlint-ts-009 | Task 3 |
| avlint-ts-006 through avlint-ts-008, avlint-ts-010 through avlint-ts-014 | Task 4 |
| avlint-ts-015 | Type-aware follow-up |
| avlint-ts-016 | Audit the existing native configuration in Task 2; avlint-ts-047 owns unresolved graph cases |
| avlint-css-001 | Task 8 |
| avlint-sql-001 | SQL follow-up |
| avlint-common-003 | Task 1 |
| avlint-common-004 | Already enforced; Task 9 removes its duplicate review searches |
| avlint-common-005 through avlint-ts-019 | Task 3 |
| avlint-common-006 through avlint-ts-021, avlint-ts-024, avlint-ts-025, avlint-ts-030, native avlint-ts-033 and native avlint-common-010 | Task 5 |
| avlint-ts-022, avlint-ts-023, avlint-ts-026, avlint-ts-027, avlint-ts-029, avlint-ts-032 through avlint-ts-036, and avlint-ts-039 | Tasks 4, 6, and 8 as named in their interfaces |
| avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038, avlint-ts-040 | Type-aware follow-up |
| avlint-ts-042 through avlint-ts-045 and avlint-ts-048 | Task 7 |
| avlint-ts-049 selector enforcement | Task 8; component ownership moves to the repo-graph follow-up |
| avlint-ts-046, avlint-ts-047, avlint-ts-052, avlint-ts-054, avlint-common-011, avlint-ts-055 | Repo-graph follow-up |
| avlint-ts-050, avlint-ts-051, avlint-ts-053 | Type-aware follow-up |
| avlint-sql-002 through avlint-sql-004, avlint-sql-005, avlint-sql-006 | SQL follow-up |
| avlint-common-012 through avlint-ts-058 | Task 9 retains them in judgment review |

## File structure

| File | Responsibility |
| --- | --- |
| `oxlint-plugin-avandar/index.js` | Plugin metadata and rule registry |
| `oxlint-plugin-avandar/runOxlintFixture.ts` | Execute one fixture with one rule and parse diagnostics |
| `oxlint-plugin-avandar/vitest.config.ts` | Node-only plugin test environment |
| `oxlint-plugin-avandar/rules/*.js` | One current-file rule per module |
| `oxlint-plugin-avandar/rules/*.test.ts` | Rule behavior, fixer, and safety-boundary fixtures |
| `docs/lint-rules/*.md` | On-demand repair guidance for branching guided rules |
| `scripts/lint-avandar/index.ts` | Repo analyzer CLI and diagnostic formatting |
| `scripts/lint-avandar/LintDiagnostic.types.ts` | Shared diagnostic contract |
| `scripts/lint-avandar/rules/*.ts` | One repository rule family per module |
| `scripts/lint-avandar/rules/*.test.ts` | Temporary-tree fixtures for repo rules |
| `scripts/lint-benchmark/benchmarkLint.mjs` | Cold and warm lint timing report |
| `stylelint/avandar-rules.mjs` | Local CSS comment and domain-prefix rules |

Keep every rule module below the repo's 400-line threshold. Split shared AST,
scope, diagnostic, or fixture utilities by responsibility when a second rule
needs them.

### Task 1: Plugin harness, benchmark, and diagnostic experiment

**Files:**

- Create: `oxlint-plugin-avandar/package.json`
- Create: `oxlint-plugin-avandar/index.js`
- Create: `oxlint-plugin-avandar/runOxlintFixture.ts`
- Create: `oxlint-plugin-avandar/vitest.config.ts`
- Create: `oxlint-plugin-avandar/rules/no-em-dash-in-comments.js`
- Create: `oxlint-plugin-avandar/rules/no-em-dash-in-comments.test.ts`
- Create: `oxlint-plugin-avandar/diagnosticContract.test.ts`
- Create: `docs/lint-rules/no-em-dash-in-comments.md`
- Create: `scripts/lint-benchmark/benchmarkLint.mjs`
- Modify: `.oxlintrc.json`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `scripts/test-runners/run-all-tests.sh`

**Interfaces:**

- `runOxlintFixture(options: Readonly<RunOxlintFixtureOptions>):
  OxlintFixtureResult`, where options contain `rule`, `code`, optional
  `filename`, optional `fix`, and optional `format`.
- `OxlintFixtureResult` contains parsed `diagnostics`, final `output`, raw
  `stdout`, and `exitCode`.
- Plugin metadata name is `avandar`, so configured rule IDs are
  `avandar/<rule>`.
- `pnpm test:lint-plugin` runs only the plugin suite under a Node environment.
- `pnpm lint:benchmark` writes cold and warm timings to stdout without changing
  tracked files.

- [ ] **Step 1: Write the failing harness and registry tests**

Add tests named:

- `loads the local plugin through the repository config`;
- `returns parsed rule ids locations and messages`;
- `returns the fixed source when fix is true`;
- `leaves source unchanged when a rule has no safe fixer`.

Run:

```bash
pnpm exec vitest run --config oxlint-plugin-avandar/vitest.config.ts
```

Expected: FAIL because the harness and plugin do not exist.

- [ ] **Step 2: Implement the smallest plugin and fixture runner**

Use a temporary directory per fixture, an absolute plugin specifier, Oxlint's
JSON formatter for parsed assertions, and the agent formatter for message
contract assertions. Always remove the temporary directory in `finally`.

- [ ] **Step 3: Implement avlint-common-003 without a fixer**

`avandar/no-em-dash-in-comments` reports U+2014 only in comments. It ignores
strings, templates, regular expressions, and JSX text. Its normal message
identifies the character and repair objective. Its rule documentation explains
the punctuation choices.

Required fixtures:

- line comment;
- JSDoc;
- ordinary block comment;
- string and template non-hits;
- JSX text non-hit;
- `--fix` leaves a hit unchanged.

- [ ] **Step 4: Compare the three remediation encodings**

`diagnosticContract.test.ts` runs twenty em-dash hits through the agent
formatter and records the output length for:

1. detailed text repeated per hit;
2. terse text with a repeated repo-relative doc path;
3. terse text with the path in rule metadata.

Select the smallest format that visibly preserves the repair objective and
documentation path in actual agent output. Put the selected contract in a
test. Do not infer support for rule metadata from the API alone.

- [ ] **Step 5: Add the benchmark command**

`benchmarkLint.mjs` runs a supplied command once cold, three warmups, then five
measured warm runs. It prints command, individual durations, median, minimum,
and maximum as JSON. It exits nonzero when the command itself fails.

Run:

```bash
pnpm lint:benchmark -- pnpm exec oxlint --silent .
```

Expected: valid JSON and a zero exit status.

- [ ] **Step 6: Register tests and exclude them from frontend Vitest**

Add `test:lint-plugin` and `lint:benchmark` scripts. Add
`oxlint-plugin-avandar/**` to the root frontend exclusions and call
`pnpm test:lint-plugin` from the all-tests script.

- [ ] **Step 7: Verify and commit**

```bash
pnpm test:lint-plugin
pnpm lint
git diff --check
git add oxlint-plugin-avandar docs/lint-rules/no-em-dash-in-comments.md scripts/lint-benchmark package.json vite.config.ts scripts/test-runners/run-all-tests.sh .oxlintrc.json
git commit -m "feat(lint): add Avandar Oxlint plugin foundation"
```

### Task 2: Native safe-fix rules

**Files:**

- Modify: `.oxlintrc.json`
- Modify: source files changed by native safe fixes
- Test: Oxlint's installed rule implementations through repo lint

**Interfaces:**

- Enables avlint-ts-001 `curly`, avlint-ts-002 `prefer-template`, avlint-ts-003
  `typescript/consistent-type-imports`, and its safe fixer.
- Keeps avlint-ts-004 `typescript/prefer-as-const` enabled.
- Does not enable type-aware avlint-ts-003 exports or avlint-ts-005 in this task.

- [ ] **Step 1: Capture candidate counts and baseline timing**

Run each rule alone against the repo using a temporary Oxlint config generated
by the fixture harness. Record diagnostics by rule and file in the commit body.
Run the benchmark command from Task 1 and save the before JSON in the task
notes, not as a tracked artifact.

- [ ] **Step 2: Enable one native rule and verify it fails on its candidates**

Start with `curly`. Run `pnpm exec oxlint .` and confirm every reported
diagnostic belongs to the enabled rule or the existing configuration.

- [ ] **Step 3: Apply and verify its safe fixes**

Run `pnpm exec oxlint --fix .`, inspect the diff for behavior changes, then run
the tests nearest changed control flow. Repeat Steps 2 and 3 for each remaining
rule.

- [ ] **Step 4: Benchmark and commit**

```bash
pnpm lint:benchmark -- pnpm exec oxlint --silent .
pnpm lint
pnpm test:lint-plugin
git diff --check
git add .oxlintrc.json
git add -u
git commit -m "feat(lint): enable native deterministic fixes"
```

Stop and profile if the global performance gate fires.

### Task 3: Comment and documentation rules

**Files:**

- Create: `oxlint-plugin-avandar/rules/prefer-line-comments-in-functions.js`
- Create: `oxlint-plugin-avandar/rules/prefer-line-comments-in-functions.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-single-line-jsdoc.js`
- Create: `oxlint-plugin-avandar/rules/prefer-single-line-jsdoc.test.ts`
- Create: `oxlint-plugin-avandar/rules/require-jsdoc-on-exports.js`
- Create: `oxlint-plugin-avandar/rules/require-jsdoc-on-exports.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-file-level-comment.js`
- Create: `oxlint-plugin-avandar/rules/no-file-level-comment.test.ts`
- Create: `oxlint-plugin-avandar/rules/require-jsdoc-on-exported-keys.js`
- Create: `oxlint-plugin-avandar/rules/require-jsdoc-on-exported-keys.test.ts`
- Create: `docs/lint-rules/require-jsdoc-on-exports.md`
- Create: `docs/lint-rules/no-file-level-comment.md`
- Create: `docs/lint-rules/require-jsdoc-on-exported-keys.md`
- Modify: `oxlint-plugin-avandar/index.js`
- Modify: `.oxlintrc.json`

**Interfaces:**

- Implements avlint-common-001, avlint-common-002, avlint-ts-009, avlint-common-005, avlint-ts-018, and avlint-ts-019.
- avlint-ts-009 and avlint-ts-019 are separate message IDs in one exported-key rule. The first
  moves an existing comment only within its proven safety boundary. The second
  asks for judgment when useful text does not already exist.

- [ ] **Step 1: Write failing rule fixtures**

Each safe-fix rule gets positive, negative, fixed-output, idempotence, and every
Review Focus safety fixture. Each guided rule proves its location, message, linked
doc path, exclusions for test and type-collection files, and unchanged
`--fix` output.

- [ ] **Step 2: Implement avlint-common-001 and avlint-common-002**

Use comment attachment and token ranges from the Oxlint plugin API. Preserve
indentation and comment text exactly apart from the delimiter or line shape.

- [ ] **Step 3: Implement avlint-ts-009 and avlint-common-005 through avlint-ts-019**

Skip declarations whose documentation comes from an explicitly annotated
interface. Never write placeholder prose. Never delete a detached comment as
a fix.

- [ ] **Step 4: Enable the rules and repair existing diagnostics**

Run safe fixes first. Resolve guided hits from the diagnostics and on-demand docs,
without invoking the full review skill.

- [ ] **Step 5: Verify, benchmark, and commit**

```bash
pnpm test:lint-plugin
pnpm lint:benchmark -- pnpm exec oxlint --silent .
pnpm lint
git diff --check
git add oxlint-plugin-avandar docs/lint-rules .oxlintrc.json
git add -u
git commit -m "feat(lint): enforce comment and documentation structure"
```

### Task 4: Function, naming, React, and utility safe fixers

**Files:**

- Create: `oxlint-plugin-avandar/rules/prefer-function-declaration.js`
- Create: `oxlint-plugin-avandar/rules/prefer-function-declaration.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-nested-arrow-functions.js`
- Create: `oxlint-plugin-avandar/rules/prefer-nested-arrow-functions.test.ts`
- Create: `oxlint-plugin-avandar/rules/underscore-private-helpers.js`
- Create: `oxlint-plugin-avandar/rules/underscore-private-helpers.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-props-type-name.js`
- Create: `oxlint-plugin-avandar/rules/prefer-props-type-name.test.ts`
- Create: `oxlint-plugin-avandar/rules/consistent-e2e-casing.js`
- Create: `oxlint-plugin-avandar/rules/consistent-e2e-casing.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-jsx-and-conditional.js`
- Create: `oxlint-plugin-avandar/rules/no-jsx-and-conditional.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-prop-helpers.js`
- Create: `oxlint-plugin-avandar/rules/prefer-prop-helpers.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-object-literal-construction.js`
- Create: `oxlint-plugin-avandar/rules/prefer-object-literal-construction.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-inline-array-candidates.js`
- Create: `oxlint-plugin-avandar/rules/prefer-inline-array-candidates.test.ts`
- Modify: `oxlint-plugin-avandar/index.js`
- Modify: `.oxlintrc.json`

**Interfaces:**

- Implements avlint-ts-006 through avlint-ts-008 and avlint-ts-010 through avlint-ts-014.
- `prefer-function-declaration` and `prefer-nested-arrow-functions` emit a
  no-fixer `unsafeRewrite` diagnostic outside their safe-fix safety boundary.
- Rename rules use scope references and reject any export, collision,
  computed/string reference, or unresolved reference.

- [ ] **Step 1: Write failing tests for every safe-fix and unsafe boundary**

Include lexical `this`, `arguments`, recursion, overloads, hoisting, name
collision, exported symbol, computed property, type reference, JSX reference,
and second-fix idempotence fixtures where relevant.

- [ ] **Step 2: Implement one rule at a time until its focused suite passes**

Do not share a helper until two passing rule implementations need the same
operation. When sharing begins, place scope-safe renaming and import insertion
in separate utility modules.

- [ ] **Step 3: Enable and apply safe fixes**

Resolve remaining `unsafeRewrite` diagnostics manually or with justified
disable reasons. Do not relax a safety check to make the repo green.

- [ ] **Step 4: Verify, benchmark, and commit**

```bash
pnpm test:lint-plugin
pnpm lint:benchmark -- pnpm exec oxlint --silent .
pnpm lint
git diff --check
git add oxlint-plugin-avandar .oxlintrc.json
git add -u
git commit -m "feat(lint): add safe Avandar convention fixers"
```

### Task 5: Native guided gates and disable reasons

**Files:**

- Create: `oxlint-plugin-avandar/rules/require-disable-reason.js`
- Create: `oxlint-plugin-avandar/rules/require-disable-reason.test.ts`
- Create: `oxlint-plugin-avandar/rules/max-file-lines-hard.js`
- Create: `oxlint-plugin-avandar/rules/max-file-lines-hard.test.ts`
- Create: `docs/lint-rules/max-file-lines.md`
- Create: `docs/lint-rules/max-function-lines.md`
- Create: `docs/lint-rules/named-exports.md`
- Create: `docs/lint-rules/vague-identifiers.md`
- Create: `docs/lint-rules/event-handler-names.md`
- Create: `docs/lint-rules/one-component-per-file.md`
- Create: `docs/lint-rules/type-definitions.md`
- Create: `docs/lint-rules/meaningful-test-assertions.md`
- Modify: `oxlint-plugin-avandar/index.js`
- Modify: `.oxlintrc.json`

**Interfaces:**

- Enables avlint-common-006 through avlint-ts-021, avlint-ts-024, avlint-ts-025, avlint-ts-030, the native part of avlint-ts-033,
  and the native part of avlint-common-010.
- Uses `max-lines`, `max-lines-per-function`, `import/no-default-export`,
  `id-denylist`, `react/jsx-handler-names`, `react/no-multi-comp`,
  `typescript/consistent-type-definitions`,
  `typescript/no-explicit-any`,
  `typescript/explicit-module-boundary-types`, and `vitest/expect-expect`.
- Native `max-lines` enforces 400 with a reasoned-disable escape hatch.
  `avandar/max-file-lines-hard` independently reports 501 and above so a
  disable of the soft threshold does not hide the hard threshold.
- `avandar/require-disable-reason` requires `-- <non-empty reason>` for an
  inline disable mentioning `avandar/*` or any phase-3 native rule listed in
  its options.

- [ ] **Step 1: Test the disable-reason rule**

Cover file, next-line, and line directives; one and several rule IDs; empty
reasons; non-Avandar rules; and unused-disable reporting interaction.

- [ ] **Step 2: Scan each native rule before enabling it**

Record candidate count, false-positive sample, required config options, and
repo exceptions. Reject a native rule whose selectable syntax is broader than
the convention and cannot be configured precisely. Use a narrower custom rule
instead.

- [ ] **Step 3: Enable and remediate one native rule per cycle**

For each rule: enable, prove failure, repair every existing hit or add a
specific reasoned disable, rerun lint, and commit the config only after the
repo is green. Config files that require a default export receive an exact
override, never a broad directory exemption.

- [ ] **Step 4: Verify the agent can remediate without the review skill**

On at least one fixture per rule family, give a clean-context agent only the
agent-formatted diagnostic and linked page. It must produce a valid repair or
a valid disable reason. Record failures in the rule test or documentation,
then repeat.

- [ ] **Step 5: Verify, benchmark, and commit**

```bash
pnpm test:lint-plugin
pnpm lint:benchmark -- pnpm exec oxlint --silent .
pnpm lint
git diff --check
git add oxlint-plugin-avandar docs/lint-rules .oxlintrc.json
git add -u
git commit -m "feat(lint): add deterministic guided gates"
```

### Task 6: Custom guided TypeScript, React, test, and i18n gates

**Files:**

- Create: `oxlint-plugin-avandar/rules/helpers-before-exports.js`
- Create: `oxlint-plugin-avandar/rules/helpers-before-exports.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-double-assertion.js`
- Create: `oxlint-plugin-avandar/rules/no-double-assertion.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-string-union-over-enum.js`
- Create: `oxlint-plugin-avandar/rules/prefer-string-union-over-enum.test.ts`
- Create: `oxlint-plugin-avandar/rules/prefer-named-object-types.js`
- Create: `oxlint-plugin-avandar/rules/prefer-named-object-types.test.ts`
- Create: `oxlint-plugin-avandar/rules/consistent-function-signature.js`
- Create: `oxlint-plugin-avandar/rules/consistent-function-signature.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-imperative-loop.js`
- Create: `oxlint-plugin-avandar/rules/no-imperative-loop.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-class-without-reason.js`
- Create: `oxlint-plugin-avandar/rules/no-class-without-reason.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-top-level-jsx-helper.js`
- Create: `oxlint-plugin-avandar/rules/no-top-level-jsx-helper.test.ts`
- Create: `oxlint-plugin-avandar/rules/name-use-effect-callback.js`
- Create: `oxlint-plugin-avandar/rules/name-use-effect-callback.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-tautological-test.js`
- Create: `oxlint-plugin-avandar/rules/no-tautological-test.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-bare-i18n-copy.js`
- Create: `oxlint-plugin-avandar/rules/no-bare-i18n-copy.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-translation-function-parameter.js`
- Create: `oxlint-plugin-avandar/rules/no-translation-function-parameter.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-stateless-create-module.js`
- Create: `oxlint-plugin-avandar/rules/no-stateless-create-module.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-static-inline-style.js`
- Create: `oxlint-plugin-avandar/rules/no-static-inline-style.test.ts`
- Create: `oxlint-plugin-avandar/rules/no-tailwind.js`
- Create: `oxlint-plugin-avandar/rules/no-tailwind.test.ts`
- Create one `docs/lint-rules/<rule-id>.md` page for every rule whose repair
  has branches or exceptions
- Modify: `oxlint-plugin-avandar/index.js`
- Modify: `.oxlintrc.json`

**Interfaces:**

- Every rule ID and message maps to one row in the spec inventory.
- avlint-common-009 treats a reasoned inline disable as the representation of an allowed
  async-sequencing, early-exit, hot-path, or framework exception.
- avlint-ts-035 reports only the closed display positions and translation-function
  escape shapes listed in `docs/rules/i18n.md`.
- avlint-ts-039 reports only static styles and closed Tailwind syntax. Dynamic style
  expressions remain outside the rule.

- [ ] **Step 1: Break this task into reviewable rule batches**

Use batches of at most four related rules: structure, types, React/hooks,
tests, i18n, modules, and UI styling. Each batch has its own red-green cycle,
benchmark, and commit. Do not create one giant rule module or one giant commit.

- [ ] **Step 2: Write the failing fixtures for one batch**

Each rule gets true violations, valid examples, documented exceptions,
disable-reason behavior, diagnostic contract, and unchanged `--fix` output.

- [ ] **Step 3: Implement the minimum deterministic gate**

When a fixture exposes ambiguity, narrow the detector. Do not expand the rule
to a candidate search and call every candidate an error.

- [ ] **Step 4: Enable the batch and remediate the repo**

Use the lint output and on-demand docs. Add a disable only when the code meets
a documented exception and the reason states which one.

- [ ] **Step 5: Verify and commit the batch**

```bash
pnpm test:lint-plugin
pnpm lint:benchmark -- pnpm exec oxlint --silent .
pnpm lint
git diff --check
git add oxlint-plugin-avandar docs/lint-rules .oxlintrc.json
git add -u
git commit -m "feat(lint): add <batch> convention gates"
```

Repeat Steps 2 through 5 for every batch.

### Task 7: Repository module and test layout analyzer

**Files:**

- Create: `scripts/lint-avandar/LintDiagnostic.types.ts`
- Create: `scripts/lint-avandar/formatLintDiagnostics.ts`
- Create: `scripts/lint-avandar/formatLintDiagnostics.test.ts`
- Create: `scripts/lint-avandar/findRepoFiles.ts`
- Create: `scripts/lint-avandar/findRepoFiles.test.ts`
- Create: `scripts/lint-avandar/rules/moduleLayout.ts`
- Create: `scripts/lint-avandar/rules/moduleLayout.test.ts`
- Create: `scripts/lint-avandar/rules/testLayout.ts`
- Create: `scripts/lint-avandar/rules/testLayout.test.ts`
- Create: `scripts/lint-avandar/index.ts`
- Create: `scripts/lint-avandar/vitest.config.ts`
- Create: `docs/lint-rules/module-layout.md`
- Create: `docs/lint-rules/test-layout.md`
- Modify: `package.json`
- Modify: `scripts/test-runners/run-all-tests.sh`

**Interfaces:**

- `LintDiagnostic` contains `ruleId`, repo-relative `path`, optional `line`,
  optional `column`, `message`, optional `helpPath`, and `severity: "error"`.
- `lintRepo(options: Readonly<LintRepoOptions>): Promise<LintDiagnostic[]>`
  accepts explicit roots and ignore patterns for fixture tests.
- `pnpm lint:repo` runs the analyzer across the repository.
- Root `pnpm lint` runs Oxlint, Stylelint, then `pnpm lint:repo` before the
  non-blocking React Doctor command.
- This task implements avlint-ts-042 through avlint-ts-045 and avlint-ts-048. avlint-ts-046 and avlint-ts-047 receive
  a follow-up batch after these tree primitives are stable.

- [ ] **Step 1: Write formatter and path-discovery tests**

Prove deterministic ordering by path, line, column, and rule ID. Prove ignored
generated, dependency, build, cache, migration, and compiled catalog paths are
never returned.

- [ ] **Step 2: Write temporary-tree module-layout fixtures**

Cover one main export, helper collections, same-stem companion pairs,
single-child same-name directories, casing, route `-` prefixes, and bare
`types.ts` and `constants.ts`.

- [ ] **Step 3: Implement module-layout diagnostics**

Report one root-cause diagnostic per unit. Do not attach a fixer to a move.
The diagnostic links `docs/lint-rules/module-layout.md`.

- [ ] **Step 4: Write and implement test-layout fixtures**

Cover lone tests, aspect labels, multiple tests outside `__tests__`, fixtures,
one-module-per-`__tests__`, integration placement and naming, and the documented
runner-suffix exceptions.

- [ ] **Step 5: Wire the command and all-tests suite**

Use Node 24's type stripping to run the TypeScript entry point. Give the repo
an exact Node version floor if the current package metadata does not already
guarantee it.

- [ ] **Step 6: Verify, benchmark, and commit**

```bash
pnpm exec vitest run --config scripts/lint-avandar/vitest.config.ts
pnpm lint:repo
pnpm lint
pnpm lint:benchmark -- pnpm lint
git diff --check
git add scripts/lint-avandar docs/lint-rules package.json scripts/test-runners/run-all-tests.sh
git commit -m "feat(lint): enforce module and test layout"
```

### Task 8: Deterministic CSS rules

**Files:**

- Create: `stylelint/avandar-rules.mjs`
- Create: `stylelint/avandar-rules.test.ts`
- Create: `stylelint/vitest.config.ts`
- Create: `docs/lint-rules/css-module-ownership.md`
- Modify: `stylelint.config.js`
- Modify: `package.json`
- Modify: `scripts/test-runners/run-all-tests.sh`

**Interfaces:**

- Implements avlint-css-001 and the selector half of avlint-ts-049.
- `avandar/comment-shape` safely fixes delimiter and leading-marker shape.
- `avandar/domain-class-prefix` reports a CSS Module class whose closed prefix
  does not match the component module basename. It has no fixer.
- Component ownership and cross-file colocation remain in a later repo-analyzer
  batch.

- [ ] **Step 1: Write failing Stylelint plugin fixtures**

Cover one-line and multiline comments, preservation of text, second-fix
idempotence, CSS Module basenames, BEM suffixes, third-party selector
exceptions, and non-module stylesheets.

- [ ] **Step 2: Implement and register the two rules**

Use Stylelint's PostCSS nodes and reported source ranges. Do not parse CSS with
regular expressions.

- [ ] **Step 3: Apply the safe comment fixer and resolve prefix diagnostics**

Run only the relevant CSS tests after each component module rename. Update TSX
class references explicitly; no single-file CSS fixer owns those edits.

- [ ] **Step 4: Verify, benchmark, and commit**

```bash
pnpm exec vitest run --config stylelint/vitest.config.ts
pnpm lint:css:fix
pnpm lint
pnpm lint:benchmark -- pnpm lint
git diff --check
git add stylelint stylelint.config.js docs/lint-rules package.json scripts/test-runners/run-all-tests.sh
git add -u
git commit -m "feat(lint): enforce deterministic CSS conventions"
```

### Task 9: Remove shipped detectors from `avandar-code-review`

**Required skills:** Load `writing-skills` and `writing-code-review-rules`
before editing the skill.

**Files:**

- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: shipped-rule checklists under
  `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/`
- Modify: corresponding canonical files under `docs/rules/`
- Modify: `docs/code-reviews/extra-checklist.md` and referenced rulesets only
  for shipped evidence rules
- Create or modify: skill validation fixtures required by `writing-skills`

**Interfaces:**

- Review starts by running safe formatting and `pnpm lint` before loading
  judgment checklists.
- A green lint run suppresses all shipped safe-fix, guided, and evidence detector prose and
  candidate searches.
- The skill keeps judgment rules, judgment repair guidance that is not already in a
  lint doc, and review of changed disable reasons.
- The skill does not contain a second catalog of lint rule explanations.

- [ ] **Step 1: Build the deletion matrix from the plugin and configs**

List every enabled `avandar/*`, adopted native rule, repo-analyzer rule, and
Stylelint rule. Map each to all focused packs, find lanes, Most Common Mistakes,
General Checks, phase checklists, library checklists, and repo-local references.

- [ ] **Step 2: Write failing skill-validation fixtures**

Prove that a green-lint review does not ask agents to re-find shipped rules,
that a changed disable reason is reviewed, and that mixed conventions retain
their judgment portion.

- [ ] **Step 3: Add the lint-first remediation protocol**

The protocol runs the repo's declared formatter and lint commands, resolves
diagnostics from their messages and on-demand docs, reruns lint, then loads only
the judgment phases triggered by the diff.

- [ ] **Step 4: Delete every duplicate shipped detector**

Delete focused packs that no longer contain a judgment rule. Otherwise retain the
pack and remove only deterministic searches. Update the focused-review lane
table and invocation syntax in the same change.

- [ ] **Step 5: Validate the skill and commit**

Run the validation workflow from `writing-skills`, then:

```bash
pnpm lint
git diff --check
git add agent-skills/public-skills/skills/avandar-code-review docs/rules docs/code-reviews
git commit -m "docs(review): delegate deterministic checks to lint"
```

### Task 10: Final performance and ownership audit

**Files:**

- Modify: this plan to check completed boxes and record measured results
- Modify: the spec only if implementation proved a classification wrong

**Interfaces:**

- Produces final cold and warm timings for Oxlint alone and full `pnpm lint`.
- Produces a final ownership matrix with no safe-fix, guided, or shipped evidence detector left
  in judgment review.

- [ ] **Step 1: Run all focused suites**

```bash
pnpm test:lint-plugin
pnpm exec vitest run --config scripts/lint-avandar/vitest.config.ts
pnpm exec vitest run --config stylelint/vitest.config.ts
```

Expected: all pass.

- [ ] **Step 2: Run repository validation**

```bash
pnpm format
pnpm lint
pnpm exec oxfmt --ignore-path .oxfmtignore --check .
pnpm exec prettier --check supabase/schemas
git diff --check
```

Expected: all commands exit zero and `pnpm format` leaves no new diff.

- [ ] **Step 3: Benchmark final performance**

```bash
pnpm lint:benchmark -- pnpm exec oxlint --silent .
pnpm lint:benchmark -- pnpm lint
```

Compare with Task 1. Record cold median, warm median, absolute delta, and
percentage delta. If the global performance gate fired at any batch, do not
claim phase 3 complete until the regression is removed or Pablo approves the
tradeoff.

- [ ] **Step 4: Audit ownership and stale names**

Confirm there is no `eslint-plugin-avandar` path, no old type 1/type 2 language
in active phase 3 docs, no duplicate deterministic find lane, and no rule page
without an enabled diagnostic.

- [ ] **Step 5: Commit only if the audit changed documentation**

```bash
git add docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md docs/superpowers/plans/2026-11-21-oxlint-phase-3-deterministic-review-rules.md
git commit -m "docs(lint): record phase 3 verification"
```
