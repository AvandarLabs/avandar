# Lint benchmark

First run is cold; warm samples follow without cache eviction. Durations are
wall-clock milliseconds. A failed lint run is not a passing performance baseline.

The preflight row contains transient source lint failures and is excluded from
performance comparisons. The accepted `phase-3-before-package` row runs before
either ecosystem plugin is enabled. All six lint samples passed. Its warm median
is 7,238 ms: use this row as the preceding baseline for subsequent batches.
The preverification row overlapped package verification and is retained for
traceability, excluded from comparisons.

## Compressed package baseline

| Package | Tarball bytes |
| --- | --- |
| `@avandar/lint` | 35,839 |
| `@avandar/lint-typescript` | 10,198 |
| `@avandar/lint-css` | 10,139 |

These are `pnpm pack` archive sizes, including the repository license file and
published build artifacts. Runtime dependencies are installed separately.

## Lint samples

| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phase-3-preflight | 6342 | 5705 | 10639 | 7146 | 6832 | 10133 | 7146 | 1, 1, 0, 0, 0, 0 |
| phase-3-preverification | 10214 | 10253 | 7384 | 7361 | 10717 | 10671 | 10253 | 0, 0, 0, 0, 0, 0 |
| phase-3-before-package | 11241 | 7622 | 7238 | 7239 | 7104 | 7142 | 7238 | 0, 0, 0, 0, 0, 0 |
| phase-3-native-safe-rules | 16734 | 16772 | 16618 | 16884 | 16738 | 16784 | 16772 | 0, 0, 0, 0, 0, 0 |
| phase-3-native-safe-rules-review-fixes | 7292 | 7039 | 7479 | 7292 | 7404 | 7321 | 7321 | 0, 0, 0, 0, 0, 0 |
| phase-3-comment-fixers | 19907 | 18821 | 19127 | 18915 | 18917 | 19026 | 18917 | 0, 0, 0, 0, 0, 0 |
| phase-3-comment-fixers-final | 19266 | 19046 | 19093 | 19166 | 19218 | 19067 | 19093 | 0, 0, 0, 0, 0, 0 |
| phase-3-function-fixers | 7691 | 7672 | 7346 | 7550 | 7665 | 7509 | 7550 | 0, 0, 0, 0, 0, 0 |

## Initial native batch profile

The `phase-3-native-safe-rules` warm median is **16,772 ms**, an increase of
9,534 ms (131.72%) over the accepted 7,238 ms baseline. All six lint runs pass,
but the increase exceeds both stop thresholds. Batch expansion stopped for
sequential profiling with no concurrent builds or tests.

On the same transformed source, toggling only root `options.typeAware` while
preserving the exact config location and every override produced:

| Component | Samples ms | Median ms | Exit codes |
| --- | --- | --- | --- |
| Oxlint, type-aware on | 6,495; 6,099; 6,369 | 6,369 | 0, 0, 0 |
| Oxlint, type-aware off | 5,543; 6,075; 5,808 | 5,808 | 0, 0, 0 |
| Existing Stylelint command | 870 | 870 | 0 |
| Existing React Doctor command | 10,364 | 10,364 | 0 |

The native type-aware increment is 561 ms (9.66%), below the stop threshold.
React Doctor's existing `--scope changed --base develop` now scans 374 files,
which persists after a worktree commit and dominates the expanded root cost.
The Doctor command and its advisory exit handling are unchanged. The profiled
measurement is retained as the pre-review result. Its 16,772 ms median was the
preceding baseline for the review correction below.

At that initial measurement, root native repair enabled AF-01 through AF-04.
AF-05 remains disabled because native assertion removal breaks TypeScript 5.9 generic CRUD
contracts. The initial 33-file exclusion attempt was discarded entirely. AF-19
remains repair fallback because Oxlint 1.93.0 implements no safe extension fixer.
No assertion-removal source edits or per-file assertion exceptions are retained.

## Review correction

`phase-3-native-safe-rules-review-fixes` measures the corrected safe subset.
AF-02 is now disabled and has no production safe probe: native `prefer-template`
changes custom object coercion and exposes no operand-restriction option.
All 21 introduced template expressions were reverted. Ordinary root repair
preserves concatenation, and every original template expression is unchanged.
AF-05 and AF-19 remain fallback as recorded above. AF-01, both AF-03
capabilities, and AF-04 retain proven coverage. A canonical seeded diagnostic
must itself have error severity; another capability's error cannot make a
warning-only rule enforced.

The corrected cold sample is 7,292 ms and its warm median is **7,321 ms**, with
six zero exits. It is 9,451 ms below the preceding 16,772 ms median and 83 ms
(1.15%) above the original accepted 7,238 ms baseline. No causal attribution is
made from this timing change. No tests or builds ran alongside the six samples.
Root lint retains the existing Doctor await-in-loop performance warning; Doctor
now scans 364 files. **7,321 ms is the preceding warm median for the next batch.**

## Comment and documentation batch

The batch enables AF-06 standalone function-body prose, AF-07 short plain
JSDoc, and AF-11 unambiguous exported-object documentation relocation. Root
safe repair changed 305 existing files: nine block-to-line comment repairs and
426 short JSDoc collapses. No root AF-11 candidate met the narrow boundary.
Every one of the 435 comment-only hunks preserves prose. Independent TypeScript
syntax-tree comparisons confirm unchanged code in all 305 files. Generated
files and compiled Lingui catalogs were excluded. A subsequent whole-root
ordinary `--fix` pass made no tracked changes and exited zero.

Both comment benchmark rows have six zero exits. The initial warm median is
18,917 ms. After safety rejection for directive comments, unusual JavaScript
line terminators and Markdown hard breaks, the final cold sample is 19,266 ms
and the final warm median is **19,093 ms**. Compared with the preceding 7,321 ms
baseline, this adds 11,772 ms (160.80%), exceeding both stop thresholds. Batch
expansion stopped for sequential profiling. The final measurement ran without
concurrent package builds, tests or dependency installation.

The final profile toggles only the three custom rules in the actual root
configuration, restores the original bytes afterwards, and holds transformed
source constant. The plugin remains installed in both configurations.

| Component | Samples ms | Median ms | Exit codes |
| --- | --- | --- | --- |
| Oxlint, custom rules enabled | 6,643; 6,300; 6,221 | 6,300 | 0, 0, 0 |
| Oxlint, custom rules disabled | 6,026; 6,284; 5,934 | 6,026 | 0, 0, 0 |
| Existing Stylelint command | 1,122 | 1,122 | 0 |
| Existing React Doctor command | 9,649 | 9,649 | 0 |

The custom visitor increment is 274 ms (4.55%), below both stop thresholds.
The existing Doctor command now scans 641 files versus the preceding 364,
because its comparison is against `develop` and includes these comment edits.
It retains the existing await-in-loop advisory warning. The measurements show
that the custom visitor increment is small; they do not establish a complete
causal attribution for the root regression. The root increase remains visible,
and no Doctor configuration or process scheduler was changed.

Coverage inserts custom diagnostic seeds into the existing serialized per-file
native proof run. This adds no engine invocations per reviewed file. The known
per-file serial latency remains. Safe comment capabilities can be enforced,
but every custom AF rule also retains an explicit `unsupported-shapes`
fallback. No exact classifier proves their absence, so rule-level review
fallback IDs must remain active. Non-JS AF-06/AF-07 outcomes also stay fallback.

| Comment batch package | Tarball bytes |
| --- | --- |
| `@avandar/lint` | 45,359 |
| `@avandar/lint-typescript` | 16,944 |
| `@avandar/lint-css` | 10,139 |

All three built tarballs import successfully together in an isolated consumer.
The core catalog returns 90 rules and the TypeScript export exposes the three
comment rules. **19,093 ms is the preceding warm median for the next batch.**

## Function declarations and private helpers

The function batch enables AF-08, AF-09, and AF-10 for narrowly proved direct
call shapes. The complete root ordinary safe-fix pass found **zero eligible
existing source candidates**. No application, generated, or compiled catalog
files changed. Every changed and new file was byte-identical after the next
whole-root ordinary fix pass.

The cold sample is 7,691 ms and the five-run warm median is **7,550 ms**, with
six zero exits. This is 11,543 ms (60.46%) below the preceding 19,093 ms median,
so neither stop threshold is crossed. No tests, builds, or installation ran
alongside the samples. React Doctor reused its existing cache, reporting 647
files in 33-36 ms for these samples; its configuration and existing await-loop
warning are unchanged. These measurements do not establish causal attribution
for the timing decrease.

A subsequent safety tightening rejects escaped string/template contracts. Its
covering TypeScript and native tests pass, as do the refreshed root fix and
main TypeScript build checks. The completed timing row is retained rather than
repeating six samples for this small additional refusal check.

AF-08 and AF-09 reject hoisting, recursion, overloads, escapes, lexical bindings,
and competing repair syntax. AF-10 requires scope-proved calls inside the
immediately adjacent exported function and rejects unresolved-name capture.
These stable boundaries keep native fixes, comment fixes, and independently
disabled function rules separate in one ordinary native fix invocation. Each
new safe capability has a canonical error-seed proof on the exact reviewed
path, plus explicit `unsupported-shapes` fallback. The existing serialized
proof scheduler and cache are unchanged.

**7,550 ms is the preceding warm median for the next batch.**

## Component props, local acronym and JSX ternaries

This batch enables AF-12, AF-13 and AF-14 for their narrow proved subsets.
The complete-root ordinary application changes one source file: the private
`EditableProps` alias and its parameter reference become `Props`. It applies
no existing AF-13 or AF-14 candidates. Unknown scalar JSX conditions retain
exact values, and the supported boolean ternary uses `false` as its false arm.

The preceding warm median is **7,550 ms**. Samples below run sequentially
without concurrent tests, package builds or dependency installation. The
existing Doctor configuration is unchanged.

| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phase-3-component-fixers | 18869 | 7593 | 7604 | 7452 | 7490 | 7400 | 7490 | 0, 0, 0, 0, 0, 0 |

The warm median is **7,490 ms**, 60 ms (0.79%) below the preceding 7,550 ms.
All six exits are zero, so neither stop threshold is crossed and no separate
visitor profiling is required. The cold sample includes a fresh Doctor scan
of 653 files; warm samples reuse its existing cache. The existing await-loop
advisory remains, and Doctor configuration is unchanged. These timings do not
establish causal attribution for the small median difference.

The final ordinary root repair was byte-identical across all 10,285 selected
files. Package tests pass with 181 TypeScript cases and 222 core cases,
including the new 104-case native safety/context matrix. Both lint packages
build and type-check, and the main TypeScript build passes. Module-private
coverage seeds now precede synthetic module markers and introduce none;
TSX shares one JSX owner between its props and rendering probes. Exact
unsupported-shape fallback and the existing per-file cache/serial engine
scheduler remain intact.

**7,490 ms is the preceding warm median for the next batch.**

## Property helpers and straight-line collections

This batch enables AF-15, AF-16 and AF-17 for their documented conservative
subsets. The complete root ordinary safe-fix application finds no eligible
existing source candidates in any family. All 10,293 selected files are
byte-identical across consecutive ordinary fix passes. The 193 tracked
generated and compiled Lingui catalog files remain unchanged and excluded.

The preceding warm median is **7,490 ms**. Samples run sequentially without
concurrent tests, builds or dependency installation. Doctor configuration and
its existing await-loop advisory remain unchanged.

| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phase-3-utility-fixers | 16390 | 7468 | 7639 | 7402 | 7548 | 7370 | 7468 | 0, 0, 0, 0, 0, 0 |

The warm median is **7,468 ms**, 22 ms (0.29%) below the preceding 7,490 ms.
All six exits are zero, so neither stop threshold is crossed. Warm Doctor scans
reuse its cache and retain the existing await-loop advisory. These timings do
not establish causal attribution for the small median difference.

The completed measurement precedes the final declaration-envelope correction.
Native keyword normalization reserves the entire declaration. Both construction
rules therefore retain the initializer and construct at the final return,
keeping all custom fix spans after the declaration. AF-16 rejects annotated
bindings. AF-17 now requires typed TS/TSX primitive arrays, an existing helper,
and ordinary Array intrinsics. The same visitors and serialized proof scheduler
remain, with no additional engine invocations. The single completed benchmark
is retained for this narrow correction; root correctness gates were refreshed.

AF-15 map and equality probes have independent seed spans. Utility seeds add no
imports or module markers, and AF-17 seeds satisfy the explicit array-type
boundary only for TS/TSX. Unsupported shapes retain fallback throughout.

**7,468 ms is the preceding warm median for the next batch.**

## CSS comment markers

The CSS batch enables AF-20 for standalone ordinary prose comment nodes using
Stylelint and PostCSS source ranges. Repairs only change comment delimiters,
spacing and leading markers. Declaration documentation, legal notices,
directives, maps, hacks, inline comments, ambiguous markers and repairs beyond
80 columns remain outside this safe subset. Explicit unsupported-shape fallback
keeps rule-level review active.

The complete root CSS command selects 456 stylesheets. Its ordinary safe-fix
application changes one multiline comment in `CaseTypeHome.module.css`.
Independent parsed-node audits confirm unchanged prose and every non-comment
byte. A second complete CSS fix is byte-identical across all 456 files.
Generated stylesheets are excluded and compiled Lingui catalogs are untouched.
Both lint and repair commands select `src/**/*.css` and
`apps/ava-video-producer/**/*.css`.

The preceding warm median is **7,468 ms**. The six samples below run
sequentially without concurrent tests, builds or dependency installation.
Doctor configuration and its existing await-loop advisory remain unchanged.

| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phase-3-stylelint-fixer | 7705 | 7753 | 7914 | 8505 | 8384 | 8449 | 8384 | 0, 0, 0, 0, 0, 0 |

The cold sample is 7,705 ms and the warm median is **8,384 ms**, up 916 ms
(12.27%) from the preceding 7,468 ms. All six exits are zero. Neither stop
threshold is crossed, so no separate profile is required. Doctor scans 667
files and reuses its existing cache during these samples. These timings do
not establish causal attribution for the change.

The source export repairs CSS without a prebuild; the packed CSS export also
performs a real Stylelint repair in an isolated consumer. Its tarball is
13,689 bytes. CSS package tests pass with 38 cases and core tests pass with
325 cases. Both packages build and type-check; the main TypeScript build and
root lint pass. The actual built CLI proves the supported CSS capability
against the real root configuration without writing the reviewed file.

CSS coverage uses the real repository, original filename, full root path
selection, actual error-severity seed and nonzero child status. Overrides,
disables, missing engines/plugins, unknown commands and operational failures
remain fail-closed. Unsupported syntax retains an independent fallback
outcome. The native proof scheduler and native AF rule boundaries are unchanged;
CSS proof startup and full-selection cost remain for later scaling work.

The plugin leaves parsed source-map comment nodes intact. Stylelint/PostCSS
itself consumes source-map annotations before rules run, with this rule both
enabled and disabled under the same root configuration. The controlled test
records that existing engine behavior rather than claiming whole-command
annotation preservation.

**8,384 ms is the preceding warm median for the next batch.**

## Exact coverage proof and inclusion caching

Coverage accepts only the pinned Oxlint JSON envelope and normal lint statuses.
A proof requires the exact mirrored filename, canonical engine namespace, error
severity and a nonempty UTF-8 label contained entirely in that capability's
seed range. Unknown envelopes, truncation indicators, runtime/configuration
errors, stderr, unexpected exits and incomplete output fail closed. The engine's
nested-config output can legitimately report `number_of_rules: null`.

AF-08/09/10 additionally require the early AF-13 error diagnostic as a witness
of an original AST import/export marker. This witness precedes every synthetic
module marker. A script, textual marker, disabled/warning/suppressed AF-13 rule,
or missing witness leaves those function capabilities in fallback with context
recovery. Function fixer behavior is unchanged. Every custom rule still has its
independent `unsupported-shapes` fallback.

One factory lifetime caches the source-workspace inclusion listing by accepted
command and cwd, and proof promises by cwd and exact path. The existing serial,
rejection-safe loader still runs strictly isolated one-file mirrors. Each
selected file retains original siblings and imports. Supported strict-JSON
configs rebase relative plugin entries to original source paths and inherited
config references to their original files. Aliases, overrides and rule settings
are preserved without flattening. Root/nested string/object plugin fixtures
also review the plugin and its helper, proving that seeded copies never execute
as engine plugins. Unsupported copied JSONC/dynamic/symlink configuration and
selected symlink paths remain fallback.

| Bounded mixed-language coverage fixture | Before cache | After cache |
| --- | --- | --- |
| Six initial paths, one late path, one cached repeat | 7 unique proofs | 7 unique proofs |
| Source inclusion children | 7 | 1 |
| Isolated seed children | 7 | 7 |
| Total children | 14 | 8 |
| Maximum active native engine child | 1 | 1 |
| Measured wall time, ms | 5,093 | 3,204 |

These are bounded single-run coverage measurements against the actual engine,
including an instrumenting process wrapper. They establish a 42.9% child-count
reduction and an observed 37.1% wall-time reduction for this fixture. They are
not a root-lint benchmark or a general latency guarantee. The later full suite
also exercises the same process-count assertion. No builds, tests or benchmarks
overlap these runs, and original source bytes and temporary-mirror cleanup are
checked.

Native proofs retain a 30-second timeout and 8 MiB output bound per captured
stream, and add a 1 MiB selected-source and 16 KiB selected-path argument bound.
Mirrors are created only when their serialized proof starts and removed in
`finally`. Missing/malformed output, overflow, signal and a real timeout are
covered by focused process-failure tests. Root/subcommand help remains lazy and
JSON stdout remains machine-clean.

Shared multi-file seed batching is deliberately not enabled. Its closed
AF-03 dependency and cross-seeded config/plugin/import independence gates have
not been established. Isolated proofs avoid batch poisoning and preserve
conservative semantics, but still pay one engine startup and one mirror per
native path. CSS is unchanged: its provider starts at most one Node proof child
at a time, and each CSS path still repeats Stylelint's full root selection in
that child. Native and CSS providers can each have one active child. No second
CSS scheduler or inclusion cache is introduced here. Normal root lint behavior
is unchanged, so the preceding accepted 8,384 ms warm median remains the root
baseline and no additional six-run root benchmark was performed.
