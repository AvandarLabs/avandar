# Oxlint phase 6 cross-language parity design

Implementation plan:
`docs/superpowers/plans/2026-11-22-oxlint-phase-6-cross-language-parity.md`.

Inventory:
`docs/superpowers/specs/2026-11-21-oxlint-phase-3-deterministic-rule-inventory-design.md`.

## Intent

Phase 6 closes every language gap created when generic deterministic
conventions move out of the normal `avandar-code-review` pass. It uses native
rules first, ecosystem extensions second, and one configurable generic
companion pack for every remaining gap. Language-specific companion packs
remain reserved for conventions that genuinely belong to one language or
ecosystem.

## Goals

- Add `packages/lint/python` with native Pylint configuration and custom
  checkers.
- Add `packages/lint/rust` with rustc/Clippy configuration and Dylint semantic
  rules.
- Add `packages/lint/generic` as `@avandar/lint-generic`, with lazily loaded
  lexical, structural, test-framework, and E2E adapters.
- Cover every generic rule-language-file-capability outcome declared in the
  canonical inventory or return an explicit fallback.
- Let repositories enable only the languages they use.
- Preserve fallback review for missing tools, disabled languages, unsupported
  frameworks, and unknown languages.
- Measure the runtime and package cost of each language integration.

## Non-goals

- Phase 6 does not apply TypeScript file, directory, module, React, Lingui,
  model, import-map, or package conventions to other languages.
- Phase 6 does not duplicate a native Pylint, rustc, Clippy, Oxlint, or
  Stylelint rule when its semantics match exactly.
- Phase 6 does not force every repository to install every ecosystem linter.
- Phase 6 does not infer support from a parser loading successfully. Coverage
  requires a rule integration fixture.
- Phase 6 does not remove the unknown-language fallback from the review skill.

## Selected architecture

### Hybrid capability registry

Each canonical file and capability outcome selects the first exact
implementation in this order:

1. native language linter;
2. stable ecosystem extension;
3. Dylint for Rust semantics that require rustc analysis;
4. generic companion lexical or syntax adapter;
5. on-demand review fallback.

The first enabled exact implementation owns the diagnostic. Later layers do
not report duplicates. The coverage command exposes the selected owner.

### Package layout

```text
packages/lint/
  README.md
  rules.schema.json
  rules.yaml
  core/
    src/companion/
  typescript/
    src/oxlint/
    src/companion/
  css/
    src/stylelint/
  sql/
    src/companion/
  generic/
    src/companion/
  python/
    pyproject.toml
    src/avandar_pylint/
  rust/
    Cargo.toml
    src/
```

The Python distribution is `pylint-avandar` and imports as
`avandar_pylint`. The Rust Dylint library package is `avandar-dylint` and its
crate identifier is `avandar_dylint`. `@avandar/lint-generic` is the npm
package for universal adapters. All three consume generated,
ecosystem-native catalog bindings checked against the umbrella `rules.yaml`.

## Repository configuration

The existing configuration selects languages independently from
language-specific packs:

```json
{
  "$schema": "./node_modules/@avandar/lint/avandar-lint.schema.json",
  "languages": ["typescript", "python", "rust", "css", "sql"],
  "packs": ["typescript", "sql"]
}
```

The generic companion loads only adapters needed by `languages` and the input
paths. Python and Rust native integrations register their results with the same
coverage report. A language present in reviewed files but absent from config
returns `fallback`.

Repositories may configure only the languages they want enforced. This does
not authorize the skill to ignore other changed languages. Those files retain
fallback review.

## Python integration

Use native Pylint rules when exact:

| Canonical ID | Python owner |
| --- | --- |
| GD-03 | Pylint missing-docstring rules with public/private exceptions for modules, classes, functions, and methods |
| GD-07 | Pylint `too-many-lines` with migration, generated, dependency, and cache exclusions |
| GD-09 | Pylint `disallowed-name` configuration |

`pylint-avandar` supplies:

| Canonical ID | Checker type |
| --- | --- |
| GD-01, GD-02 | Raw/token checker for comments and docstrings |
| GD-03 | Astroid checker for undocumented public values and constants not covered by Pylint's native missing-docstring family |
| GD-06 | Astroid function and method span checker at 45 lines |
| GD-22 | Astroid collection-loop checker with reasoned-disable support |
| GD-25 | Astroid pytest and unittest assertion checker |

AF-06 is not applicable to Python docstrings. A function's first string
literal has runtime documentation semantics and is not equivalent to a
comment. AF-07 applies to a short multi-line Python docstring only when the
generic companion can collapse it without changing value, indentation,
prefix, quoting, escapes, or runtime documentation semantics.

Pylint custom checkers diagnose but do not provide a standard safe-fix
channel. Any future Python AF edit runs through `avandar-lint check --fix`.

The distribution supports normal Pylint plugin loading, contains checker unit
tests, and ships a configuration fragment or documented `pyproject.toml`
settings without taking ownership of unrelated Pylint policy.

## Rust integration

Use native rules when exact:

| Canonical ID | Rust owner |
| --- | --- |
| GD-03 | rustc `missing_docs` |
| GD-06 | Clippy `too_many_lines` at 45 |
| GD-09 | Clippy `disallowed_names` |

Use `avandar-dylint` for semantic gaps:

| Canonical ID | Dylint responsibility |
| --- | --- |
| GD-22 | Collection loops lacking a reasoned exception |
| GD-25 | Assertion-free `#[test]` functions and closed tautological assertions |

Dylint uses unstable rustc internals, so the package pins its toolchain,
records the required version in catalog metadata, and tests an intentional
toolchain-mismatch failure with a recovery message. It does not own lexical
comments or whole-file metrics.

The generic companion owns Rust AF-06, AF-07, GD-01, GD-02, and GD-07 because
source comments and exact file metrics are cheaper and more stable outside
HIR.

## Generic companion pack

The pack has four shared layers:

| Layer | Responsibility |
| --- | --- |
| File classifier | Extension, shebang, generated-file, migration, dependency, cache, and configured-language decisions |
| Lexical adapters | Comment and docstring ranges, GD-01 punctuation, GD-02 width, and file metrics |
| Structural adapters | Declaration and function-body ownership, AF-06 and AF-07 safe edits, public declarations, function spans, identifiers, collection loops, test declarations and assertions |
| Framework registry | Test and E2E APIs, database mutation signatures, page-load boundary, cleanup paths |

Tree-sitter adapters implement structural queries where a native extension does
not own the rule. The first adapter set covers JavaScript, TypeScript, Python,
Rust, Go, Ruby, Java, Kotlin, Swift, C, C++, C#, shell, YAML, JSONC, and the
relevant SQL and CSS lexical scopes. JSON records comment rules as
`not-applicable`.

Kotlin, Swift, YAML, JSONC, and any parser not maintained in the upstream
Tree-sitter organization require a parser provenance, version, license,
source-location, malformed-input, package-size, and maintenance review before
selection. An adapter that cannot meet the gate remains fallback rather than
approximating syntax with regex.

Lexical rules may use a smaller tokenizer instead of Tree-sitter only when
fixtures prove that strings, raw strings, heredocs, nested comments, and
disabled regions cannot be mistaken for comments.

## Generic E2E rule split

RP-16A remains in the TypeScript/Playwright pack. RP-16B is generic and uses a
configured framework registry. Each framework adapter declares:

- test declaration and lifecycle APIs;
- page or application load boundaries;
- database mutation calls;
- setup-only and read-only APIs;
- cleanup constructs and visible control-flow guarantees.

A mutation is reported only when the adapter proves it occurs after the load
boundary as behavior under test, or proves that a changed mutation path lacks a
visible cleanup path. Unknown client calls and frameworks remain fallback.

## Fix and diagnostic contract

The generic pack may fix only AF-06 shapes whose comment conversion is exact,
local, and idempotent. Every other generic rule is diagnostic-only because the
correct punctuation, documentation, extraction, name, functional rewrite, or
test assertion requires judgment.

All engines emit the same catalog ID in machine output. Human engine-specific
codes may remain visible, but coverage and skill handoff use canonical IDs.

Disables require non-empty reasons:

- `avandar/*` for Node engines and companion rules;
- `avandar_pylint` message symbols or the documented Pylint disable syntax;
- `avandar_dylint` lint attributes for Rust.

## Engine result and coverage closure

Every native bridge, extension bridge, and generic adapter returns the Phase 5
`EngineRunResult` tagged union. An available result includes diagnostics,
analyzed paths, and per-file capability gaps. An unavailable result includes a
reason and optional recovery. A parser or linter failure can therefore never
masquerade as a clean run.

Phase 6 adds a matrix integration suite. For every declared file and
subpredicate capability it must prove exactly one of:

- a seeded violation is reported by the repository's configured lint command;
- the outcome is structurally not applicable;
- coverage returns `fallback` and the skill fallback fixture loads the rule.

No blank or unclassified matrix cell is allowed. Disabling an engine or
language in a fixture must change the corresponding status to `fallback`.
Mixed supported and unsupported test or E2E frameworks in the same language
must produce separate outcomes and load fallback only for the unsupported
files and capabilities.

The completion baseline is not satisfied by cataloging every cell as
fallback. Python and Rust must enforce every applicable canonical rule listed
for them above, including Python public values. Every declared remaining
language must enforce AF-06, AF-07, GD-01, GD-02, GD-03, GD-06, GD-07, GD-09,
GD-22, and GD-25 wherever its syntax supports the convention. RP-16B must be
enforced for every framework explicitly listed in the repository
configuration. `fallback` is accepted only for an enumerated parser or syntax
limitation, an unregistered framework or API, a missing or unavailable tool,
an excluded path, an operational failure, or an unknown language. Each
accepted limitation needs a fixture and recovery or fallback route.

## Performance and release gates

Record cold and five-run warm timings for Pylint, Clippy/rustc, Dylint, each
generic adapter group, and complete root lint. Record peak memory, parser load
time, Dylint build/cache behavior, wheel size, crate build artifacts, and npm
tarball delta.

Stop and profile a batch whose warm median adds both more than 25 percent and
more than 2 seconds to its preceding repository lint baseline. Adapters load
only for selected languages and encountered paths. Repeated generic rules share
one parse tree per file.

## Skill handoff

After matrix closure, the normal review path contains only JR detection,
changed-disable-reason judgment, and fallback orchestration. The deterministic
fallback checklist remains packaged with the skill for:

- repositories without Avandar lint;
- disabled or missing engines;
- unsupported frameworks;
- parser failures and operational errors;
- changed files in unknown languages.

This means Phase 6 reduces review cost without narrowing the public skill's
language reach.

## Acceptance criteria

- Python, Rust, and generic companion packages live beneath `packages/lint`.
- Native Pylint, rustc, and Clippy rules own every exact match before custom
  code is added.
- Custom Pylint and Dylint rules report canonical IDs and honor reasoned
  disables.
- The generic companion lazily loads only selected language adapters.
- The mandatory Python, Rust, declared-language, and configured-framework
  baseline is enforced. `fallback` is limited to the enumerated exceptions in
  the coverage closure contract.
- Every generic rule-language-file-capability outcome is `enforced`,
  `not-applicable`, or proven `fallback`; none is silently omitted.
- CSS coverage includes GD-01 and AF-20 but does not invent unrelated generic
  CSS rules.
- Shell, YAML, and JSONC comment rules use the generic companion; JSON is
  explicitly not applicable.
- Unknown languages and unsupported frameworks retain skill fallback.
- Cross-language integration, performance, package, and toolchain checks pass.
