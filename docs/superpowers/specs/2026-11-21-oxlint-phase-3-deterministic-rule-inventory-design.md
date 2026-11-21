# Oxlint phase 3 deterministic rule inventory

Implementation plan:
`docs/superpowers/plans/2026-11-21-oxlint-phase-3-deterministic-review-rules.md`.

## Outcome

Phase 3 moves every review convention with a deterministic violation test out
of the judgment-based detection pass. It does not require every repair to be
automatic. The enforcement system has three outcomes:

1. A safe deterministic repair runs under `oxlint --fix` or the corresponding
   specialized linter fixer.
2. A deterministic violation with a judgment-based repair is reported by lint
   with concise, actionable guidance. An agent fixes it before the judgment
   review starts.
3. A convention whose violation cannot be decided without judgment remains in
   `avandar-code-review`.

This split replaces the old type 1, type 2, and type 3 model. The old model
incorrectly delayed deterministic diagnostics until a later phase and treated
several unsafe transformations as ordinary `--fix` operations.

## Inventory basis

The 2026-11-21 sweep read the live public skill, every built-in checklist, all
four focused-review packs and find lanes, every library checklist, the
repo-local extra checklist and its referenced rulesets, and the canonical
copies under `docs/rules/`. The inventory also checks the installed Oxlint
1.93.0 configuration and current Oxlint documentation.

The same convention is often repeated in several places. Rows below describe
canonical rule families, not duplicate prose. Removing a shipped rule from the
skill must remove it from all of these surfaces:

- the focused `comments`, `files`, `naming`, and `tests` packs;
- focused-review find lanes;
- Most Common Mistakes and General Checks;
- the phase checklist and its candidate searches;
- a library checklist or repo-local referenced ruleset.

## Classification contract

| Class | Violation decision | Repair | Destination |
| --- | --- | --- | --- |
| AF | Deterministic | Behavior-preserving and unambiguous | Native or custom safe fixer |
| GD | Deterministic | Requires naming, decomposition, API, or semantic judgment | Lint diagnostic plus optional on-demand rule doc |
| RP | Deterministic | May be automatic or guided, but needs a repository graph, filesystem, diff, SQL parser, or CSS parser | Companion repo check or specialized linter |
| JR | Requires judgment | Requires judgment | `avandar-code-review` |

A rule may report only the subset it can prove. If a transformation is safe
for one syntax shape and unsafe for another, the implementation must use
separate diagnostics: an AF diagnostic with a fixer for the proven shape and a
GD diagnostic without a fixer for the rest. It must not attach a speculative
fixer to the broader rule.

Oxlint defines `--fix` as behavior-preserving. Suggestions and dangerous fixes
use separate flags. Phase 3 does not put suggestions or dangerous fixes into
the normal format path.

## Enforcement architecture

| Need | Owner | Reason |
| --- | --- | --- |
| Existing JavaScript or TypeScript rule | Native Oxlint first | Rust implementation and established semantics |
| New current-file JavaScript, TypeScript, or TSX rule | `oxlint-plugin-avandar` | ESLint-compatible JS plugins support AST traversal, scope analysis, diagnostics, and fixers |
| Type-aware rule already supplied by Oxlint | Native type-aware Oxlint | Custom JS plugins do not receive TypeScript type information |
| Avandar-specific type-aware rule | Companion TypeScript analyzer | It needs the program and type checker outside the JS plugin API |
| File layout, import graph, Git diff, or multi-file convention | Companion repo analyzer | A custom JS rule cannot rename files or safely coordinate edits across files |
| CSS convention | Stylelint or a Stylelint Avandar plugin | CSS is already parsed and linted by Stylelint in this repo |
| SQL convention | SQL-aware companion analyzer | Oxlint does not parse SQL |

The local plugin is named `oxlint-plugin-avandar`, not
`eslint-plugin-avandar`. Its API is ESLint-compatible, but ESLint is no longer
the repo's linter.

## AF inventory: deterministic safe fixes

Each rule below is eligible for the ordinary safe-fix path. A custom rule must
refuse to report as AF when its safety preconditions are not met.

| ID | Convention | Detector and safe-fix boundary | Owner |
| --- | --- | --- | --- |
| AF-01 | Braces around every `if` body | Existing `curly`; add braces | Native Oxlint |
| AF-02 | Template interpolation instead of string concatenation | Existing `prefer-template`; convert only supported equivalent expressions | Native Oxlint |
| AF-03 | `type` on type-only imports and exports | Existing `typescript/consistent-type-imports`; add type-aware `typescript/consistent-type-exports` only after the type-aware benchmark | Native Oxlint |
| AF-04 | `as const` for eligible literals | Existing `typescript/prefer-as-const`, already enabled | Native Oxlint |
| AF-05 | Remove unnecessary type assertions | Existing type-aware `typescript/no-unnecessary-type-assertion` | Native type-aware Oxlint |
| AF-06 | Line comments inside function bodies | Convert a free `/** ... */` or `/* ... */` body comment to equivalent `//` lines; never touch JSDoc attached to a nested declaration | Avandar plugin |
| AF-07 | Single-line short JSDoc | Collapse tag-free JSDoc when the complete result fits the configured width | Avandar plugin |
| AF-08 | Top-level function declarations | Convert a function-valued binding only when lexical `this`, `arguments`, `super`, `new.target`, hoisting, overloads, recursion, and name collisions cannot change behavior | Avandar plugin |
| AF-09 | Nested arrow functions | Convert only non-hoisted, non-recursive functions that do not use function-local `this`, `arguments`, `super`, or `new.target` | Avandar plugin |
| AF-10 | `_` prefix on private top-level helpers | Rename a non-exported local symbol and all same-file references when no collision or string-based reference exists | Avandar plugin |
| AF-11 | Existing JSDoc on an exported module key | Relocate an existing comment only when one local declaration maps to one exported key and no typed interface owns the documentation | Avandar plugin |
| AF-12 | Component props type named `Props` | Rename a non-exported same-file props type and its references when one component owns it and no collision exists | Avandar plugin |
| AF-13 | Local `E2E` acronym casing | Rename non-exported same-file symbols and references; exported members, files, and serialized keys use GD or RP | Avandar plugin |
| AF-14 | JSX conditional rendering uses a ternary | Replace `condition && <Node />` with `condition ? <Node /> : null` | Avandar plugin |
| AF-15 | Exact `prop` and `propEq` callbacks | Replace only syntax shapes proven equivalent to the package helper and insert or merge the import | Avandar plugin |
| AF-16 | Straight-line object construction | Fold property assignments into one object literal only when control flow, evaluation order, descriptors, aliases, and mutation semantics are unchanged | Avandar plugin |
| AF-17 | Straight-line optional array candidates | Convert independent conditional pushes to a literal plus `filter(isDefined)` only when ordering and evaluation are equivalent | Avandar plugin |
| AF-18 | Redundant `instanceof Error` guard | Remove or collapse the guard only when native type information proves the value is already `Error` and both branches remain equivalent | Native type-aware rule if available, otherwise companion analyzer |
| AF-19 | File-extension convention | Existing `import/extensions` may add or remove extensions only where module resolution proves the target | Native Oxlint |
| AF-20 | Canonical CSS block comment shape | Normalize only comment delimiters and leading `*` markers | Stylelint Avandar rule |
| AF-21 | SQL declaration and body comment markers | Convert comment markers only when a SQL parser proves whether the comment documents a declaration or sits inside a statement | SQL analyzer |

## GD inventory: deterministic detection, judgment repair

These rules should stop consuming review-detection tokens. The linter can
prove the violation, but an agent or developer must choose the repair. The
normal `--fix` path must not change them.

| ID | Convention | Deterministic gate | Why repair needs judgment | Preferred owner |
| --- | --- | --- | --- | --- |
| GD-01 | No em dashes in comments | A comment contains U+2014 | Correct punctuation may be a period, colon, comma, parentheses, or hyphen | Avandar plugin |
| GD-02 | Comment and docstring lines stay within 80 columns | Existing comment-aware `max-len` | Prose must be reflowed without damaging meaning, links, or examples | Existing JS plugin until native equivalent fits |
| GD-03 | Public and exported values have documentation | Export/public AST node lacks attached JSDoc | The documentation must explain purpose and use, not merely exist | Avandar plugin |
| GD-04 | No file-level comment when a main export exists | Detached block comment plus basename-matching export | Context must be moved or rewritten on the correct member | Avandar plugin |
| GD-05 | Exported object keys have documentation | Undocumented exported key without a documented owning interface | The agent must write useful documentation or move the contract to an interface | Avandar plugin |
| GD-06 | Functions stay at or below 45 lines | Existing `max-lines-per-function` with repo exclusions | The correct extraction boundary and names require design judgment | Native Oxlint |
| GD-07 | Source files stay at or below 400 lines, with 500 hard | Existing `max-lines` with generated and migration exclusions | The correct directory-module split requires architectural judgment | Native Oxlint |
| GD-08 | Named exports only | Existing `import/no-default-export` | A stable exported name and all import updates are not a safe local rewrite | Native Oxlint |
| GD-09 | Closed vague-identifier denylist | Existing `id-denylist` for exact names approved by the convention | The business noun cannot be inferred safely | Native Oxlint |
| GD-10 | Event handlers use `on...` | Existing `react/jsx-handler-names` for JSX-proven handlers; custom detection for other proven callback positions | A public prop or exported symbol may require coordinated API changes | Native Oxlint plus Avandar plugin |
| GD-11 | Helpers appear before the exports that use them | Same-file dependency order violates the documented exceptions | Moving initializers can alter evaluation order; the correct grouping may be a refactor | Avandar plugin |
| GD-12 | Function declaration style outside AF-safe shapes | Existing `func-style` or custom diagnostic | Unsafe cases need a manual rewrite or a justified exception | Native Oxlint plus Avandar plugin |
| GD-13 | Object types prefer `type` over `interface` | Existing `typescript/consistent-type-definitions` | Oxlint marks its conversion dangerous because declaration merging and inheritance can change semantics | Native Oxlint |
| GD-14 | No explicit `any` | Existing `typescript/no-explicit-any`, already enabled | The replacement type or guard depends on the actual contract | Native Oxlint |
| GD-15 | No double assertions | AST contains `as unknown as` or `as any as` | The real relationship, parser, or adapter must be designed | Avandar plugin |
| GD-16 | String unions instead of string enums | A string-only enum declaration | Call sites and runtime-value uses need a coordinated rewrite; numeric and bitflag cases remain exceptions | Avandar plugin |
| GD-17 | Prefer `undefined` over `null` | A project-owned API or type contains `null`, after externally exact positions are excluded | Boundary compatibility and normalization location require judgment | Type-aware companion analyzer |
| GD-18 | Large inline object shapes become named types | An eligible inline object type has four or more properties | The type name and ownership cannot be inferred reliably | Avandar plugin |
| GD-19 | Explicit module-boundary types | Existing `typescript/explicit-module-boundary-types`, already enabled | The useful public type must be written | Native Oxlint |
| GD-20 | Readonly inputs, mutable outputs, and explicit mutation APIs | Type-aware signature and mutation analysis violates the closed structural contract | Intentional mutation, globally immutable aliases, and the correct API name require judgment | Type-aware companion analyzer |
| GD-21 | Function signature shape | Multiple positional parameters, a one-property options object, a disallowed object-parameter name, or a one-use small options alias | Changing a callable API and choosing `options`, `params`, or `config` requires context | Avandar plugin plus repo analyzer |
| GD-22 | Imperative loops and classes require an explicit exception | `for`, `while`, or class syntax appears without a reasoned disable | Async sequencing, early exit, hot paths, and framework constraints decide the repair or exception | Native `no-restricted-syntax` or Avandar plugin |
| GD-23 | One component per file and no top-level JSX-only render helper | Existing `react/no-multi-comp` plus the documented helper AST shape | Extracted component boundaries, props, hooks, and filenames require judgment | Native Oxlint plus Avandar plugin |
| GD-24 | Multi-line `useEffect` callbacks are named | Anonymous effect callback exceeds the closed one-line exception | The name must describe the effect | Avandar plugin |
| GD-25 | Tests contain a meaningful assertion and no closed tautology | Existing `vitest/expect-expect` plus closed patterns such as `typeof x === "function"` and literal self-assertions | The behavioral assertion or decision to delete the test requires judgment | Native Oxlint plus Avandar plugin |
| GD-26 | Frontend display copy is translated and `t` is not passed across scopes | Literal in a closed display position, or a translation function escapes its macro scope | Choosing `Trans`, `t`, `msg`, `i18n._`, and the right component boundary requires judgment | Avandar plugin |
| GD-27 | Stateless modules do not use `createModule` | Closure and dataflow analysis proves there is no state, mixin, or mutable capture | Public typing and the clearest object shape still need review | Avandar plugin |
| GD-28 | Model construction and namespace imports | A model-shaped value bypasses `Model.make`, or an external file imports a model's `*.types.ts` entry | Mapping legacy type names and validating constructor semantics may require several edits | Type-aware companion analyzer plus Avandar plugin |
| GD-29 | Exhaustive union dispatch uses `matchLiteral` | Type information proves a switch or conditional dispatches on a closed string union | Complex branches and return typing may need a manual conversion | Type-aware companion analyzer |
| GD-30 | Static UI styles avoid inline styles and Tailwind | Static `style` or `styles`, or a Tailwind-only class token, appears in the closed UI paths | A CSS Module name, file placement, and Mantine token choice require judgment | Avandar plugin plus Stylelint |
| GD-31 | Supabase `null` is normalized at the boundary | Type-aware dataflow proves a nullable Supabase value crosses into an undefined-based domain type | The correct boundary adapter and fallback behavior require judgment | Type-aware companion analyzer |

## RP inventory: deterministic rules outside a current-file Oxlint plugin

These rules can also leave judgment-based detection, but they need a companion
engine. A standard Oxlint JS fixer edits only the current source file. It
cannot safely rename files, update an import graph, compare a Git diff, or
parse SQL and CSS.

| ID | Convention | Required evidence | Repair class | Owner |
| --- | --- | --- | --- | --- |
| RP-01 | One module per file and filename matches its one main export | File AST plus basename and export set | Guided | Repo analyzer |
| RP-02 | Same-stem companions use a directory module; single-child same-name directories collapse; casing aligns | Directory tree and import graph | Guided, with safe codemods for proven moves | Repo analyzer |
| RP-03 | No `-`-prefixed components under `src/routes/` | Path match | Guided move to the correct view | Repo analyzer |
| RP-04 | No bare `types.ts` or `constants.ts`; type-only files use `.types.ts` | Path plus export kinds | Guided, with safe rename only when all imports are updated | Repo analyzer |
| RP-05 | Barrels exist only in approved package roots and never use `export *` | Path allowlist, export AST, and module graph | Guided | Native rule where possible plus repo analyzer |
| RP-06 | Deno extensions, package public-entry imports, allowed package subpaths, and import-map coverage | Import resolver, owning package, Deno reachability, and every `deno.json` | Guided, with safe fixes for resolvable extension-only cases | Native import rules plus repo analyzer |
| RP-07 | Test filename, aspect label, `__tests__`, integration label, fixture placement, and one-test-per-directory rules | Filesystem, module ownership, and test-file set | Guided, with safe rename for exact lone-test cases | Repo analyzer |
| RP-08 | A component owns its colocated CSS Module and CSS classes use its domain prefix | TSX import graph, component ownership, and CSS selectors | Guided | Repo analyzer plus Stylelint |
| RP-09 | Copy functions satisfy mechanical Lingui and return-type tests, have the right caller-count placement, and use copy naming | Type checker, macro AST, call graph, and paths | Guided | Type-aware repo analyzer |
| RP-10 | New migrations sort last and successive new migrations consolidate | Git diff, migration timestamps, and transaction/storage exclusions | Guided | Repo analyzer |
| RP-11 | Storage migrations have `_STORAGE`, contain only storage statements, create buckets idempotently, remain seed-reachable, and mirror policies in schema | Git diff, SQL AST, config, and schema comparison | Guided | SQL-aware repo analyzer |
| RP-12 | Declarative schema indices use numeric dependency layers and no letters | SQL dependency graph and filenames | Guided, with safe rename for closed no-letter cases | SQL-aware repo analyzer |
| RP-13 | AvaPage migration versions agree and older snapshots do not import live types | Current version constant, folder version, literals, imports, and type comparison | Guided | Type-aware repo analyzer |
| RP-14 | New models live in an approved model root | Added paths and model structure | Guided move | Repo analyzer |
| RP-15 | A serialized model-shape change bumps the cache schema | Git diff plus the concrete serializer/parser surface | Guided; only report when the analyzer can prove the serialized shape changed | Type-aware repo analyzer |
| RP-16 | Closed E2E static rules | Direct third-party `process.env` access, mid-flow `page.goto`, test timeout changes, database mutations without visible cleanup paths | Guided; semantic E2E rules remain JR | Repo analyzer |
| RP-17 | SQL identifiers, trigger names, and comment forms match closed syntax rules | SQL AST and object context | Guided for renames, AF for comment formatting | SQL-aware repo analyzer |
| RP-18 | New or changed RLS policies have positive and required negative pgTAP coverage | Schema diff, policy operations, and test inventory | Guided; adequacy of assertions remains JR | SQL-aware repo analyzer |
| RP-19 | New package subpaths update every Deno import map | Package exports diff and all import maps | Safe config edit when the exact target is known | Repo analyzer |

## JR inventory: judgment stays in `avandar-code-review`

The following families cannot be removed from judgment detection without
changing their meaning. Linters may produce candidates, but candidates are not
violations.

| ID | Convention family | Why the gate needs judgment |
| --- | --- | --- |
| JR-01 | JSDoc purpose, use cases, caller lists, output, jargon, and length quality | Useful documentation depends on audience and behavior |
| JR-02 | Historical and roadmap language in comments | Present-day warnings and real code phases are valid exceptions that require meaning, not keyword matching |
| JR-03 | Inline one-use bindings and avoid unnecessary indirection | Stable identity, opacity, reuse, and readability decide whether the binding helps |
| JR-04 | Descriptive names, abbreviations, acronym discovery, and conversion source/target naming | The business noun and the semantic source and target are not syntax |
| JR-05 | Where to split a long function, file, or component | Threshold detection is deterministic; the correct seam is architectural |
| JR-06 | Positive nesting, ternary readability, IIFEs, and other control-flow style choices | Equivalent syntax can be clearer or worse depending on the branch semantics |
| JR-07 | Reuse of repo or library utilities | Equivalence and whether the abstraction improves the code require semantic comparison |
| JR-08 | Module grouping, global bridges, god objects, and one-off integration architecture | Ownership and coupling are architectural decisions |
| JR-09 | Whether a `useMemo` derivation is trivial or load-bearing | Cost, identity stability, and dependency behavior are contextual |
| JR-10 | Hook array defaults and `?? []` | Loading state, identity, memoization, and downstream semantics determine the right form |
| JR-11 | Test names, observable behavior, assertion strength, and placeholder intent | A useful behavioral claim cannot be inferred from syntax alone |
| JR-12 | E2E behavior-under-test, flake mechanism, locator ambiguity risk, dataset realism, and fresh-browser choice | The relevant user behavior and failure mechanism require investigation |
| JR-13 | SQL plural nouns, shared versus table function namespaces, enum documentation quality, and RLS security semantics | Domain language and authorization intent are not closed syntax rules |
| JR-14 | Whether related helpers should become a module | Relatedness and public API shape are design judgments |
| JR-15 | Fresh-read requirements for permission and mutation-owned lists | The linter cannot infer whether another mutation owns the rendered list without a closed hook registry |
| JR-16 | Composite type reuse and runtime union source-of-truth design | Semantic equivalence and ownership of the canonical values require judgment |
| JR-17 | Mantine token choice, accessibility beyond existing a11y rules, and dynamic style legitimacy | The appropriate UI semantics and token are contextual |

## Delta from the 2026-08-16 snapshot

The old Tasks 11 through 19 must not drive implementation. The live inventory
changes them in four material ways.

### Previously planned safe fixers that are now guided diagnostics

| Old rule | New owner | Reason |
| --- | --- | --- |
| Em dash in comments | GD-01 | The correct punctuation is not always a colon or hyphen |
| Helpers before exports | GD-11 | Moving initializers can change evaluation order and grouping |
| `handle...` to `on...` | GD-10 outside proven local cases | The binding may be a public prop or not be an event handler |
| General acronym casing | JR-04; AF-13 only for local `E2E` | Discovering an acronym and coordinating public renames is not a safe local edit |
| Model `*.types.ts` deep imports | GD-28 | Legacy symbols do not always map to a simple source-string rewrite |
| Stateless `createModule` | GD-27 | Public typing and method shape can change |
| `interface` to `type` | GD-13 | Oxlint correctly classifies the conversion as dangerous for some violations |

### Previously planned fixers that survive only with narrower proof

Top-level function declarations, nested arrows, private-helper renames,
exported-key JSDoc moves, Props renames, property-helper callbacks, and object
or array construction rewrites remain AF only for the explicit safety
boundaries in AF-08 through AF-17. Every other syntax shape receives a GD
diagnostic or remains JR.

### Native coverage added since the snapshot

Current Oxlint includes relevant native rules for function style, identifier
denylists, file and function length, one component per file, JSX handler
names, type-definition style, and unnecessary type assertions. Phase 3 must
configure and test those implementations before creating a local equivalent.

### Live skill additions absent from the snapshot

The focused `comments`, `files`, `naming`, and `tests` packs now duplicate
several full-review searches. Test-layout rules, copy qualification and
placement, Lingui macro scope, cache-schema bumps, fresh-read checks, expanded
E2E rules, storage migration rules, schema dependency numbering, and AvaPage
migration rules also expanded the deterministic surface. RP exists because
many of these rules need more than a current-file JavaScript AST.

## Token-efficient remediation contract

Deterministic diagnostics should not remain in the review skill merely because
their repairs require judgment. The cheapest accurate flow is:

1. Run safe fixers before review.
2. Run lint in agent-oriented output mode.
3. Resolve all remaining deterministic diagnostics.
4. Start `avandar-code-review` only after lint is green.
5. Load judgment checklists only for phases touched by the diff.

Each guided rule follows this message contract:

- The diagnostic identifies the violated requirement and the exact local fact.
- The diagnostic gives the immediate repair objective in one short sentence.
- It does not embed a long tutorial or every exception.
- If repair branches, it ends with one repo-relative documentation path under
  `docs/lint-rules/`.
- The rule documentation contains examples, exceptions, disable criteria, and
  links to the canonical convention. It is loaded only when needed.
- A diagnostic whose resolution is obvious from its local facts needs no
  separate documentation page.

The plugin should require a non-empty reason on every disable of an
`avandar/*` rule. The disable is the explicit representation of a valid
exception. Review checks the quality of changed disable reasons, but it does
not re-run the underlying deterministic search.

`avandar-code-review` should contain one lint-remediation protocol, not copies
of every lint rule. It should run `pnpm lint` first, fix diagnostics using the
message or linked rule page, rerun lint, and then load only JR rules. This keeps
the rule source of truth in lint and avoids paying skill tokens for rules that
have already passed.

Before adopting the contract broadly, the first guided rule must compare three
fixture outputs: a detailed repeated message, a terse message with a repeated
doc path, and a terse message whose rule metadata owns the path. The selected
format must be visible in Oxlint's `agent` formatter and produce the smallest
output that still lets an agent repair every fixture correctly.

## Scope of phase 3

Phase 3 includes:

- native AF and GD rules that can be enabled now;
- current-file AF and GD rules in `oxlint-plugin-avandar`;
- the lint-remediation message and documentation contract;
- high-value RP rules in a companion repo analyzer, beginning with module and
  test layout because those currently consume dedicated focused packs;
- Stylelint rules for deterministic CSS conventions;
- deletion of every shipped AF, GD, and RP detector from all skill lanes;
- a measured before-and-after benchmark for lint runtime and review prompt
  size.

Phase 3 does not include speculative type-aware custom JS rules. Current
Oxlint JS plugins do not expose type information. Native type-aware rules may
be enabled after a cold and warm benchmark. Avandar-specific type-aware rules
use the companion analyzer until Oxlint provides an appropriate native custom
extension mechanism.

SQL enforcement is inventoried here but starts only after the TypeScript,
React, test-layout, and CSS batches prove the architecture. It needs a SQL
parser and a separate fixture strategy, not an Oxlint rule pretending SQL is
text.

## Success criteria

- Every AF rule has positive, negative, idempotence, and safety-boundary
  fixtures.
- `pnpm lint:ts:fix-changed` applies only safe fixes.
- No normal workflow uses `--fix-suggestions` or `--fix-dangerously`.
- Every GD and RP diagnostic is actionable without loading the full review
  skill.
- A green lint run means focused review packs never search for AF, GD, or
  shipped RP violations again.
- The remaining skill checklists contain only JR detection plus disable-reason
  judgment.
- Lint runtime is benchmarked before and after each batch, with a rollback
  threshold recorded in the implementation plan.

## Current Oxlint constraints used by this design

- [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins) are
  ESLint-compatible and support AST traversal, scope analysis, diagnostics,
  fixes, and suggestions, but not type-aware custom rules.
- [Automatic fixes](https://oxc.rs/docs/guide/usage/linter/automatic-fixes)
  distinguish safe fixes, suggestions, and dangerous fixes.
- [Type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
  is available for supported native TypeScript rules.
- [Multi-file analysis](https://oxc.rs/docs/guide/usage/linter/multi-file-analysis)
  is implemented by Oxlint core for supported rules. That does not give a
  local JS plugin a general project graph or multi-file fixer.
- The [current rules list](https://oxc.rs/docs/guide/usage/linter/rules)
  includes native coverage used by this inventory, including `curly`,
  `func-style`, `id-denylist`, `max-lines`, `max-lines-per-function`,
  `react/no-multi-comp`, `react/jsx-handler-names`,
  `typescript/consistent-type-definitions`, and
  `typescript/no-unnecessary-type-assertion`.
