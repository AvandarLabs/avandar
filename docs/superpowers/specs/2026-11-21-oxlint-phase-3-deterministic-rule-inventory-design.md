# Oxlint phases 3 through 6 deterministic rule inventory

Implementation plans:

- `docs/superpowers/plans/2026-11-22-oxlint-phase-3-safe-fixers.md`
- `docs/superpowers/plans/2026-11-22-oxlint-phase-4-guided-diagnostics.md`
- `docs/superpowers/plans/2026-11-22-oxlint-phase-5-companion-analyzer.md`
- `docs/superpowers/plans/2026-11-22-oxlint-phase-6-cross-language-parity.md`

## Outcome

The migration moves every convention with a deterministic violation test out of
the judgment-based detection pass without weakening any language that
`avandar-code-review` can review. A rule leaves the active review path only for
the exact language and repository configuration whose lint coverage is enabled
and proven.

The enforcement system has three repair outcomes:

1. A behavior-preserving, unambiguous repair runs under the owning linter's
   normal safe-fix command or `avandar-lint check --fix`.
2. A deterministic violation whose repair needs judgment is reported with a
   concise objective and optional on-demand documentation.
3. A convention whose violation itself requires judgment remains in
   `avandar-code-review`.

This replaces the old type 1, type 2, and type 3 model. That model treated
several unsafe transformations as ordinary fixes and assumed TypeScript
coverage could replace language-agnostic review.

## Inventory basis

The inventory reads the live public skill, every built-in and focused
checklist, every library checklist, the repo-local checklist and its referenced
rulesets, and the canonical rules under `docs/rules/`. It also records the
actual language gates in the skill rather than inferring language scope from a
TypeScript example.

The same convention often appears in several surfaces. Removing a covered
detector from the normal review path must address all of these surfaces:

- focused `comments`, `files`, `naming`, and `tests` packs;
- focused-review find lanes;
- Most Common Mistakes and General Checks;
- phase checklists and candidate searches;
- library or repo-local referenced rulesets;
- the deterministic fallback checklist used when lint coverage is absent.

## Classification contract

| Class | Violation decision | Repair | Destination |
| --- | --- | --- | --- |
| safe-fix | Deterministic | Behavior-preserving and unambiguous | Native or custom safe fixer |
| guided | Deterministic | Requires naming, decomposition, API, or semantic judgment | Lint diagnostic plus optional rule documentation |
| evidence | Deterministic | Needs a compiler program, repository graph, filesystem, diff, SQL parser, or cross-file evidence | Companion or specialized linter |
| judgment | Requires judgment | Requires judgment | `avandar-code-review` |

A rule may report only the subset it can prove. Safe and unsafe syntax shapes
use separate diagnostics. A speculative or semantics-changing rewrite is never
attached to a safe-fix diagnostic.

## Cross-language coverage contract

`packages/lint` is the umbrella for the complete lint system:

| Path | Responsibility |
| --- | --- |
| `packages/lint/rules.yaml` | Machine-readable rule IDs, class, applicability, repair class, phase, and documentation slug |
| `packages/lint/README.md` | Complete human-readable canonical catalog generated from `rules.yaml` |
| `packages/lint/core` | `@avandar/lint`, catalog API, CLI, diagnostics, coverage, and companion orchestration |
| `packages/lint/typescript` | `@avandar/lint-typescript`, Oxlint plugin and TypeScript/JavaScript companion pack |
| `packages/lint/css` | `@avandar/lint-css`, Stylelint plugin pack |
| `packages/lint/sql` | `@avandar/lint-sql`, SQL parser and companion pack |
| `packages/lint/generic` | `@avandar/lint-generic`, universal lexical, syntax, test, and E2E adapters |
| `packages/lint/python` | `pylint-avandar` Python distribution and custom Pylint checkers |
| `packages/lint/rust` | `avandar-dylint` Rust lint library for semantic gaps not covered by rustc or Clippy |

The umbrella is the canonical owner. No ecosystem package owns the global rule
list. A validation test regenerates the README catalog from `rules.yaml` and
fails on drift.

Coverage is resolved for each analyzed file and independently testable
subpredicate:

```text
rule ID + language ID + file path + capability ID + repository configuration + enabled engine
```

The capability ID identifies the syntax or framework proof boundary, such as
`pytest`, `unittest`, `playwright-supabase`, or `rust-test`. It is omitted only
when one implementation covers every applicable shape in the file. A
language-wide registration is never allowed to hide an unsupported framework,
parser failure, excluded file, or unsupported subpredicate.

Each outcome resolves to one of these states:

| State | Meaning | Review behavior |
| --- | --- | --- |
| `enforced` | A configured lint command proves the rule runs for the language | Skip deterministic review detection |
| `not-applicable` | The rule has no meaning for that language | Skip it |
| `fallback` | No active implementation proves coverage | Load the on-demand skill detector |

An implementation registration alone is not coverage. Integration fixtures
must prove that the repository's normal lint command reports a seeded
violation. A disabled rule, missing plugin, excluded path, unavailable linter,
or failed coverage command resolves to `fallback`.

Every engine returns analyzed paths, per-capability outcomes, coverage gaps,
and an operational status alongside diagnostics. The coverage command
aggregates conservatively: a rule-language summary is `enforced` only when
every applicable file and subpredicate is enforced. Any applicable fallback
outcome keeps the summary in `fallback` and names the uncovered paths and
capabilities. Mixed supported and unsupported frameworks in one language must
therefore load fallback only for the unsupported files and subpredicates.

`avandar-code-review` keeps only the lint-first protocol and judgment rules in its
always-loaded instructions. Deterministic fallback detectors move to a separate
checklist that loads only for uncovered rule-language-file-capability outcomes. If a repository
does not install Avandar lint, the skill behaves as it does today.

Unknown languages always use the fallback. This preserves the skill's ability
to review arbitrary repositories without requiring Phase 6 to predict every
future language.

## Declared language scope

The current skill uses both explicit extension lists and broader phrases such
as "most C-family languages." The migration makes those gates concrete.

| Language ID | Files or syntax | Current deterministic scope | Phase 6 route |
| --- | --- | --- | --- |
| `typescript` | `.ts`, `.tsx` | All TypeScript, TSX, general, and test rules | Oxlint plus TypeScript companion pack |
| `javascript` | `.js`, `.jsx`, `.mjs`, `.cjs` | JavaScript-compatible comment, function, naming, loop, size, and test rules | Oxlint plus JavaScript companion support |
| `python` | `.py` | General public API, function, naming, loop, size, comment/docstring, and test rules | Pylint native rules, `pylint-avandar`, then universal companion gaps |
| `rust` | `.rs` | General public API, function, naming, loop, size, comment/doc, and test rules | rustc, Clippy, `avandar-dylint`, then universal companion gaps |
| `go` | `.go` | General rules and the explicit file-length gate | Universal Tree-sitter adapter plus native tools where exact |
| `ruby` | `.rb` | General rules and the explicit file-length gate | Universal Tree-sitter adapter |
| `java` | `.java` | General and C-family comment rules plus the explicit file-length gate | Universal Tree-sitter adapter |
| `kotlin` | `.kt`, `.kts` | General and C-family comment rules plus the explicit file-length gate | Universal Tree-sitter adapter |
| `swift` | `.swift` | General and C-family comment rules plus the explicit file-length gate | Universal Tree-sitter adapter |
| `c`, `cpp`, `csharp` | C-family source files | General rules and C-family comment rules; no current explicit file-length gate | Universal Tree-sitter adapter |
| `sql` | `.sql` | General comment rules and SQL-specific rules | SQL pack in Phase 5; generic comment coverage declared in the same manifest |
| `css` | `.css` | General no-em-dash rule plus CSS-specific comment and styling rules | Stylelint |
| `shell` | `.sh`, `.bash` and shell shebangs | General rules where syntax applies | Universal adapter because ShellCheck has no external plugin API |
| `yaml` | `.yaml`, `.yml` | General comment rules where syntax applies | Universal lexical adapter |
| `jsonc` | `.jsonc` | General comment rules where syntax applies | Universal lexical adapter |
| `json` | `.json` | No comment rules; structural lint remains outside this inventory | Explicit `not-applicable` entries |

Markdown, PO catalogs, generated files, dependency trees, caches, build
outputs, and migration file-length checks remain excluded exactly as the live
skill specifies.

## Generic rule backfill matrix

These deterministic families are genuinely language-agnostic. Their semantics
remain one canonical rule while their syntax adapters differ.

| ID | Canonical requirement | Direct TypeScript/CSS coverage | Python coverage | Rust coverage | Remaining-language coverage |
| --- | --- | --- | --- | --- | --- |
| avlint-common-001 | Documentation-style block comments inside function bodies become ordinary comments when the rewrite is exact | Oxlint fixer | Not applicable to Python docstrings | Universal companion fixer because comments are not reliably represented in HIR | Universal companion syntax adapters |
| avlint-common-002 | A short, tag-free block docstring that fits uses the language's exact single-line docstring form | Oxlint JSDoc fixer | Universal companion fixer for value-preserving Python docstring shapes | Universal companion fixer for exact Rust doc-comment shapes | Universal companion syntax adapters, including SQL declaration docstrings |
| avlint-common-003 | Comments contain no U+2014 em dash | Oxlint; Stylelint for CSS | Custom raw/token Pylint checker | Universal lexical adapter | Universal lexical adapters, including SQL, shell, YAML, and JSONC |
| avlint-common-004 | Comment and docstring lines stay within 80 columns | Existing JS coverage | Custom raw/token Pylint checker | Universal lexical adapter | Universal lexical adapters for applicable comment syntaxes |
| avlint-common-005 | Public or exported APIs have attached documentation | Oxlint | Native Pylint missing-docstring rules for modules, classes, functions, and methods, plus `pylint-avandar` for public values and constants | Native `missing_docs` plus universal adapter coverage for public values not represented by the native lint | Universal AST adapters for languages with public/export semantics |
| avlint-common-006 | Functions and methods stay at or below 45 lines | Native Oxlint | Custom Pylint checker because `too-many-statements` is not line count | Native Clippy `too_many_lines` | Universal AST adapters |
| avlint-common-007 | Reviewed source files stay at or below the 400/500 thresholds | Native Oxlint | Native Pylint `too-many-lines` | Universal file metric because Clippy covers functions, not whole files | Universal file metric for the skill's explicit extension list |
| avlint-common-008 | Closed vague identifiers are rejected | Native Oxlint | Native Pylint `disallowed-name` configuration | Native Clippy `disallowed_names` | Universal identifier adapters |
| avlint-common-009 | Imperative collection loops require a reasoned exception | Oxlint native/custom rule | Custom AST Pylint checker | `avandar-dylint` semantic rule | Universal AST adapters |
| avlint-common-010 | Tests contain an assertion and avoid the closed tautology set | Oxlint test rules | Custom AST Pylint checker for pytest and unittest | `avandar-dylint` for `#[test]` and assertion macros | Universal framework adapters; unknown frameworks fall back |
| avlint-common-011 | E2E database mutations used as the behavior under test, or mutation paths without visible cleanup, are reported | TypeScript/Playwright companion adapter | Python E2E adapter when configured | Rust E2E adapter when configured | Universal companion framework registry; unknown APIs fall back |

avlint-common-002 has a JSDoc implementation in Phase 3, but its canonical requirement is
the broader focused-comments rule: a short, tag-free block docstring that fits
within 80 columns uses the language's single-line docstring form. Phase 6
preserves that requirement for SQL and every other applicable block-comment or
docstring language through native rules, syntax adapters, or explicit
fallback. avlint-css-001 remains CSS-specific. TypeScript module, React, Lingui, model,
import, and file/directory conventions remain TypeScript-specific even when a
similar style could be imagined elsewhere.

Pylint custom checkers provide diagnostics but no standard safe-fixer channel.
Any deterministic Python edit that later qualifies as safe-fix runs through the
universal companion. Dylint can supply semantic Rust lints, but it uses
unstable rustc internals. The Rust package pins and tests a toolchain, while
lexical and file-metric rules remain in the universal companion.

## Enforcement architecture

| Need | Owner | Reason |
| --- | --- | --- |
| Existing JavaScript or TypeScript rule | Native Oxlint first | Fast Rust implementation and established semantics |
| New current-file JavaScript, TypeScript, or TSX rule | `@avandar/lint-typescript/oxlint` | ESLint-compatible plugins provide AST, scope, diagnostics, and fixes |
| Existing Python rule | Native Pylint configuration | Avoids local duplication |
| New Python diagnostic | `pylint-avandar` | Raw, token, and Astroid checker APIs cover lexical and semantic rules |
| Existing Rust rule | rustc or Clippy configuration | Stable repository integration and native performance |
| New semantic Rust rule | `avandar-dylint` | Dylint exposes rustc lint passes for rules that need Rust semantics |
| Cross-language lexical, file, or unsupported-plugin rule | `@avandar/lint-generic` | One implementation with lazy language adapters prevents ecosystem forks |
| TypeScript compiler, module graph, or filesystem convention | `@avandar/lint-typescript/companion` | The rule is truly TypeScript-specific and needs repository evidence |
| CSS convention | Stylelint or `@avandar/lint-css/stylelint` | Stylelint parses CSS and supports fixable plugins |
| SQL convention | `@avandar/lint-sql` | SQL requires its own parser and repository context |

## Safe-fix inventory: deterministic safe fixes

Each rule is eligible for the ordinary safe-fix path only inside its proven
boundary.

| ID | Scope | Convention | Detector and safe-fix boundary | Owner phase |
| --- | --- | --- | --- | --- |
| avlint-ts-001 | TS/JS | Braces around every `if` body | Native `curly`; add braces | 3 |
| avlint-ts-002 | TS/JS | Template interpolation instead of concatenation | Native `prefer-template`; supported equivalent expressions only | 3 |
| avlint-ts-003 | TS | `type` on type-only imports and exports | Native consistent-type rules after type-aware benchmark | 3 |
| avlint-ts-004 | TS | `as const` for eligible literals | Native `typescript/prefer-as-const` | 3 |
| avlint-ts-005 | TS | Remove unnecessary type assertions | Native type-aware rule | 3 |
| avlint-common-001 | Generic C-like syntax | Ordinary comments inside function bodies | Rewrite only unattached block/doc comments with an exact ordinary-comment form | 3 for TS/JS; 6 for remaining languages |
| avlint-common-002 | Generic docstrings | Single-line short docstring | Collapse a tag-free block docstring only when the language has an exact single-line docstring form and the complete result fits | 3 for JSDoc; 6 for remaining applicable languages |
| avlint-ts-006 | TS/JS | Top-level function declarations | Reject lexical binding, hoisting, overload, recursion, and collision changes | 3 |
| avlint-ts-007 | TS/JS | Nested arrow functions | Reject function-local lexical binding and hoisting changes | 3 |
| avlint-ts-008 | TS/JS | `_` prefix on private top-level helpers | Same-file, non-exported, collision-free symbols only | 3 |
| avlint-ts-009 | TS | Existing JSDoc on an exported module key | Move only a one-to-one local declaration comment with no owning interface | 3 |
| avlint-ts-010 | TSX | Component props type named `Props` | Non-exported, one-component, collision-free type only | 3 |
| `local-e2e-casing` (removed) | TS/JS | Local `E2E` acronym casing | Non-exported same-file symbols only | 3 |
| avlint-ts-011 | JSX/TSX | JSX conditional rendering uses a ternary | Exact `condition && <Node />` form | 3 |
| avlint-ts-012 | TS/JS with `@avandar/utils` | Exact `prop` and `propEq` callbacks | Proven equivalent callbacks and exact import edit | 3 |
| avlint-ts-013 | TS/JS | Straight-line object construction | Preserve control flow, evaluation order, descriptors, aliases, and mutation | 3 |
| avlint-ts-014 | TS/JS | Straight-line optional array candidates | Preserve order and evaluation with `filter(isDefined)` | 3 |
| avlint-ts-015 | TS | Redundant `instanceof Error` guard | Type information proves the value and branches equivalent | 5 |
| avlint-ts-016 | TS/JS | File-extension convention | Resolver proves the target | 3 |
| avlint-css-001 | CSS | Canonical CSS block comment shape | Delimiters and leading markers only | 3 |
| avlint-sql-001 | SQL | SQL declaration and body comment markers | SQL parser proves declaration ownership or statement body | 5 |

## Guided inventory: deterministic detection, judgment repair

| ID | Scope | Convention | Deterministic gate | Owner phase |
| --- | --- | --- | --- | --- |
| avlint-common-003 | Generic comments | No em dashes | Comment token contains U+2014 | 4 for TS/JS/CSS; 6 otherwise |
| avlint-common-004 | Generic comments/docstrings | Lines stay within 80 columns | Comment or docstring token exceeds the configured width | 4 for TS/JS; 6 otherwise |
| avlint-common-005 | Generic public APIs | Public/exported values have documentation | Public AST node lacks attached documentation | 4 for TS/JS; 6 otherwise |
| avlint-ts-018 | TS/JS | No file-level comment when a main export exists | Detached block plus basename-matching export | 4 |
| avlint-ts-019 | TS | Exported object keys have documentation | Undocumented exported key without documented owner | 4 |
| avlint-common-006 | Generic functions | Functions stay at or below 45 lines | Function span exceeds 45 lines after exclusions | 4 for TS/JS; 6 otherwise |
| avlint-common-007 | Explicit source extension list | Files stay at or below 400 lines, with 500 hard | Reviewed source exceeds a threshold after exclusions | 4 for TS/JS; 6 otherwise |
| avlint-ts-020 | TS/JS | Named exports only | Default export AST | 4 |
| avlint-common-008 | Generic identifiers | Closed vague-identifier denylist | Identifier equals an approved denied name | 4 for TS/JS; 6 otherwise |
| avlint-ts-021 | JSX/TSX | Event handlers use `on...` | Proven handler position uses disallowed name | 4 |
| avlint-ts-022 | TS/JS | Helpers appear before exports that use them | Same-file dependency order violates exceptions | 4 |
| avlint-ts-023 | TS/JS | Function declaration style outside safe-fix shapes | Native/custom function-style diagnostic | 4 |
| avlint-ts-024 | TS | Object types prefer `type` | Native type-definition diagnostic | 4 |
| avlint-ts-025 | TS | No explicit `any` | Native AST diagnostic | 4 |
| avlint-ts-026 | TS | No double assertions | `as unknown as` or `as any as` | 4 |
| avlint-ts-027 | TS | String unions instead of string enums | String-only enum declaration | 4 |
| avlint-ts-028 | TS | Prefer `undefined` over `null` | Project-owned API contains non-boundary `null` | 5 |
| avlint-ts-029 | TS | Large inline shapes become named types | Eligible inline object type has at least four properties | 4 |
| avlint-ts-030 | TS | Explicit module-boundary types | Native rule | 4 |
| avlint-ts-031 | TS | Readonly inputs, mutable outputs, explicit mutation APIs | Type-aware structural contract violation | 5 |
| avlint-ts-032 | TS/JS | Function signature shape | Closed positional/options-object shapes | 4 plus 5 repository evidence |
| avlint-common-009 | Generic collection code | Imperative collection loops require a reason | Loop over a collection lacks a reasoned disable | 4 for TS/JS; 6 otherwise |
| avlint-ts-033 | React | One component per file and no JSX-only render helper | Native component count plus helper AST shape | 4 |
| avlint-ts-034 | React | Multi-line `useEffect` callbacks are named | Closed callback shape | 4 |
| avlint-common-010 | Generic tests | Meaningful assertion and no closed tautology | Assertion-free test or closed tautology pattern | 4 for TS/JS; 6 otherwise |
| avlint-ts-035 | TSX/JSX | Display copy is translated and `t` does not escape | Closed display positions and macro scope | 4 |
| avlint-ts-036 | TS | Stateless modules avoid `createModule` | Closure/dataflow proves no state or mutable capture | 4 |
| avlint-ts-037 | TS models | Model construction and namespace imports | Type and import evidence | 5 |
| avlint-ts-038 | TS | Exhaustive union dispatch uses `matchLiteral` | Type information proves a closed string union | 5 |
| avlint-ts-039 | TSX/JSX/CSS | Static UI styles avoid inline styles and Tailwind | Closed UI paths and static style tokens | 4 |
| avlint-ts-040 | TS/Supabase | Supabase `null` is normalized at the boundary | Type-aware dataflow crosses into undefined domain type | 5 |
| avlint-ts-041 | TS/JS | Class declarations require a real constraint and a reasoned exception | Class declaration lacks an approved reasoned disable | 4 |

## Evidence inventory: deterministic repository evidence

| ID | Scope | Convention | Required evidence | Owner phase |
| --- | --- | --- | --- | --- |
| avlint-ts-042 | TS/JS | One module per file and filename matches main export | File AST, basename, export set | 5 |
| avlint-ts-043 | TS/JS | Directory-module, same-stem, and casing conventions | Directory tree and import graph | 5 |
| avlint-ts-044 | TS routes | No `-`-prefixed components under `src/routes/` | Paths | 5 |
| avlint-ts-045 | TS | No bare `types.ts` or `constants.ts` | Path plus export kinds | 5 |
| avlint-ts-046 | TS/JS | Barrels only at approved roots and no `export *` | Path allowlist, exports, graph | 5 |
| avlint-ts-047 | TS/Deno | Extensions, public entries, allowed subpaths, import maps | Resolver, package ownership, Deno reachability | 5 |
| avlint-ts-048 | TS/JS tests | Test filename, aspect, integration label, fixture placement | Filesystem and module ownership | 5 |
| avlint-ts-049 | TSX/CSS | Component owns CSS Module and domain-prefixed classes | TSX graph and CSS selectors | 5 |
| avlint-ts-050 | TS/Lingui | Copy functions satisfy mechanical contracts | Type checker, macro AST, call graph, paths | 5 |
| avlint-sql-002 | SQL migrations | New migrations sort last and consolidate | Git diff and timestamps | 5 |
| avlint-sql-003 | SQL/storage | Storage migration shape and schema mirroring | Git diff, SQL AST, config, schema | 5 |
| avlint-sql-004 | SQL/schema | Numeric declarative-schema dependency layers | SQL dependency graph and paths | 5 |
| avlint-ts-051 | TS/AvaPage | Migration versions agree and snapshots avoid live types | Constants, paths, imports, types | 5 |
| avlint-ts-052 | TS models | New models live in approved roots | Added paths and model structure | 5 |
| avlint-ts-053 | TS models | Serialized shape changes bump cache schema | Git diff, types, serializer/parser | 5 |
| avlint-ts-054 | TS/Playwright | Closed Playwright static rules | Playwright AST, paths, fixture APIs | 5 |
| avlint-common-011 | Generic E2E | Behavior-under-test DB writes and missing cleanup paths | Framework adapter, mutation registry, control flow | 6 |
| avlint-sql-005 | SQL | Closed SQL identifiers, trigger names, comment forms | SQL AST and object context | 5 |
| avlint-sql-006 | SQL/RLS | Changed policies have required pgTAP coverage | Schema diff, policy operations, tests | 5 |
| avlint-ts-055 | TS/Deno | New package subpaths update every import map | Package exports diff and import maps | 5 |

## Judgment inventory: judgment stays in `avandar-code-review`

| ID | Convention family | Why the gate needs judgment |
| --- | --- | --- |
| avlint-common-012 | Documentation purpose, use cases, caller lists, output, jargon, and length quality | Useful documentation depends on audience and behavior |
| avlint-common-013 | Historical and roadmap language in comments | Present-day warnings and real code phases are valid exceptions |
| avlint-common-014 | Inline one-use bindings and avoid unnecessary indirection | Identity, opacity, reuse, and readability decide whether it helps |
| avlint-common-015 | Descriptive names, abbreviations, acronym discovery, conversion naming | The business noun and semantic source and target are not syntax |
| avlint-common-016 | Where to split a long function, file, or component | Threshold detection is deterministic; the seam is architectural |
| avlint-common-017 | Positive nesting, ternary readability, IIFEs, control-flow style | Equivalent syntax can be clearer or worse in context |
| avlint-common-018 | Reuse of repo or library utilities | Equivalence and abstraction value require semantic comparison |
| avlint-common-019 | Module grouping, global bridges, god objects, integration architecture | Ownership and coupling are architectural decisions |
| avlint-ts-056 | Whether a `useMemo` derivation is trivial or load-bearing | Cost and identity stability are contextual |
| avlint-ts-057 | Hook array defaults and `?? []` | Loading state, identity, and downstream behavior decide the form |
| avlint-common-020 | Test names, observable behavior, assertion strength, placeholder intent | A useful behavioral claim cannot be inferred from syntax alone |
| avlint-common-021 | E2E behavior, flake mechanism, locator risk, dataset realism, browser isolation | Relevant behavior and failure mechanism require investigation |
| avlint-sql-007 | SQL domain nouns, namespaces, enum docs, and RLS security semantics | Domain language and authorization intent are not closed syntax |
| avlint-common-022 | Whether related helpers should become a module | Relatedness and public API shape are design judgments |
| avlint-common-023 | Fresh-read requirements for permission and mutation-owned lists | Mutation ownership needs a closed hook registry or judgment |
| avlint-common-024 | Composite type reuse and runtime union source of truth | Semantic equivalence and ownership require judgment |
| avlint-ts-058 | Mantine token choice, a11y beyond existing rules, dynamic-style legitimacy | UI semantics and the correct token are contextual |

## Token-efficient remediation and fallback

The normal flow is:

1. Run safe fixes.
2. Run every configured linter and `avandar-lint check` in agent format.
3. Resolve deterministic diagnostics until lint is green.
4. Run `avandar-lint coverage` for the reviewed paths.
5. Load deterministic fallback rules only for returned `fallback` outcomes.
6. Run judgment review for the diff's gated phases.

Every guided diagnostic identifies the requirement, exact local fact, and
immediate objective. Branching repairs link one repo-relative page under
`packages/lint/docs/rules/`. Diagnostics do not repeat tutorials.

Disables of `avandar/*`, `avandar_pylint`, or `avandar_dylint` rules require a
non-empty reason. Review judges changed reasons but does not rerun a covered
detector.

## Phase allocation

| Phase | Owns | Inventory |
| --- | --- | --- |
| 3: safe fixers | Umbrella catalog, core package, TypeScript package, CSS package, coverage registry and command, native TypeScript safe rules, current-file Oxlint fixers, Stylelint fixers, coverage-gated skill fallback | avlint-ts-001 through avlint-ts-014, avlint-ts-016, avlint-css-001 for TS/JS/CSS; avlint-common-001 and avlint-common-002 remain fallback elsewhere |
| 4: guided diagnostics | Deterministic TypeScript/JavaScript and CSS current-file diagnostics, on-demand rule docs, disable reasons, coverage-gated fallback | avlint-common-003 through avlint-ts-027, avlint-ts-029, avlint-ts-030, current-file avlint-ts-032, avlint-common-009 through avlint-ts-036, avlint-ts-039, and avlint-ts-041 for their TS/JS/CSS scope |
| 5: language-specific companions | Companion host, TypeScript/JavaScript repository and type pack, SQL pack, Git-diff evidence | avlint-ts-015, avlint-sql-001, repository-aware avlint-ts-032, avlint-ts-028, avlint-ts-031, avlint-ts-037, avlint-ts-038, avlint-ts-040, avlint-ts-042 through avlint-ts-053, avlint-ts-054, avlint-sql-005 through avlint-ts-055 |
| 6: cross-language parity | Pylint package, rustc/Clippy config, Dylint package, universal generic companion adapters, cross-language coverage closure | Remaining avlint-common-001, avlint-common-002, avlint-common-003, avlint-common-004, avlint-common-005, avlint-common-006, avlint-common-007, avlint-common-008, avlint-common-009, avlint-common-010, and avlint-common-011 outcomes |

avlint-common-012 through avlint-ts-058 remain in `avandar-code-review`. No phase may remove a
fallback detector for an uncovered rule-language-file-capability outcome.

## Success criteria

- `packages/lint/README.md` contains the complete catalog and cannot drift from
  `packages/lint/rules.yaml`.
- Every safe-fix rule has positive, negative, idempotence, and safety-boundary
  fixtures for each implemented language.
- Coverage claims are proven by repository-level integration fixtures, not
  registration metadata alone.
- Coverage fixtures include mixed supported and unsupported frameworks in one
  language and prove file- and capability-level fallback.
- Missing tools, disabled rules, excluded paths, unsupported frameworks, and
  unknown languages fall back to the review skill.
- Every guided and companion diagnostic is actionable without loading the full
  review skill.
- Phase benchmarks record cold and warm runtime, package size, and relevant
  compiler or parser cost.
- A repository cannot become less protected when a deterministic detector is
  moved out of the always-loaded skill.

## Tool constraints used by this design

- [Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins) support
  AST traversal, scope analysis, diagnostics, and fixes, but custom rules do
  not receive TypeScript type information.
- [Oxlint automatic fixes](https://oxc.rs/docs/guide/usage/linter/automatic-fixes)
  distinguish safe fixes, suggestions, and dangerous fixes.
- [Pylint custom checkers](https://pylint.readthedocs.io/en/latest/how_tos/custom_checkers.html)
  support raw, token, and Astroid analysis.
- [Clippy configuration](https://doc.rust-lang.org/stable/clippy/lint_configuration.html)
  supplies native function-length and disallowed-name rules.
- [Dylint](https://github.com/trailofbits/dylint) runs custom Rust lint libraries,
  but the [rustc lint API](https://doc.rust-lang.org/nightly/nightly-rustc/rustc_lint/index.html)
  is completely unstable.
- [Stylelint plugins](https://stylelint.io/developer-guide/plugins/) support
  custom rules and safe fixes.
- [Tree-sitter parsers](https://tree-sitter.github.io/tree-sitter/using-parsers/)
  provide a common syntax-tree interface for universal adapters.
- [ShellCheck](https://github.com/koalaman/shellcheck/blob/master/shellcheck.1.md)
  exposes built-in and optional checks but no external custom-rule plugin API.
