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
