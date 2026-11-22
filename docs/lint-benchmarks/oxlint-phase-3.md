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

## Native safe batch profile

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
batch is retained with this caveat; **16,772 ms is the preceding warm median
for the next batch**.

Root native safe repair retains AF-01 through AF-04 capabilities. AF-05 remains
disabled because native assertion removal breaks TypeScript 5.9 generic CRUD
contracts. The initial 33-file exclusion attempt was discarded entirely. AF-19
remains repair fallback because Oxlint 1.93.0 implements no safe extension fixer.
No assertion-removal source edits or per-file assertion exceptions are retained.
