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
