# ETL adaptive write throttle

How a pipeline run keeps from overloading the catalog database, and how it
finishes a run instead of stopping at the first slow or failed request.

## Why

On 2026-11-08 two HDX runs against the demo instance (Supabase Micro
compute) stopped partway:

| Run | What failed | Why |
| --- | --- | --- |
| First | A 99.7 MB write (Cloudflare 520) and a 22 MB write (statement timeout, `57014`) | Each HDX listing stored its whole package with every resource, so one batch of WHO country packages sent 100 MB. The database ran out of memory and restarted. Fixed by storing only the listing's own resource and capping a write at 4 MiB |
| Second | A 4 MB write that stalled for 43.7 s (520), then a 4 MB write that hit the 8 s statement timeout | No single write was too large. Under sustained writing the database slowed from about 0.3 s to 1-2.5 s per MB, with stalls unrelated to request size |

A fixed request rate would not have helped: writes were already sent one at
a time. What changed was how fast the database could absorb them, and the
only signal a pipeline sees without adding load is how long each request
takes and whether it fails.

## The three guarantees

1. **The database is not overloaded.** Each write carries at most a byte
   budget that shrinks when writes slow down, and the pipeline pauses after
   a slow write so the database can catch up. A write never exceeds 4 MiB.
2. **No data is lost.** A batch is retried only after a transient failure,
   and each batch is one transaction (one call of
   `rpc_data_catalog_listings__upsert_with_relation_columns`), so a failed
   batch wrote nothing and a retried one writes the same rows again. A
   batch the gateway reported failed but the database committed (a 520)
   is written again unchanged. The checkpoint moves only after a whole page
   is written, as before.
3. **A run finishes.** Reads, write batches, checkpoint reads and writes,
   the drive row a crawl writes before it starts, and the run's own history
   (`pipeline_executions`) all retry transient failures with growing waits. Only a request that
   fails `MAX_TRANSIENT_FAILURES` times in a row stops its scope, and that
   scope's checkpoint still holds every page it finished, so
   `ava pipeline run <name> --incremental` continues from there.

## Transient failures

A Supabase store throws `EtlTransientStoreError` for a failure that a later
attempt can succeed at, and a plain `Error` for one it cannot:

| Transient | Not transient |
| --- | --- |
| No HTTP response (network error, status 0), 408, 429, any 5xx (520 included) | Any other 4xx: a bad request, a constraint or permission error, an exception the function raised |
| Postgres `57014` (statement timeout), `55P03` (lock timeout), `40001`, `40P01`, `53300`, `57P01`-`57P03`, `08xxx`, and PostgREST's `PGRST000`-`PGRST002` | |

## The throttle

One throttle per crawl (`createWriteThrottle`), owned by `crawlScope`:

| Event | Byte budget | Wait before the next request |
| --- | --- | --- |
| Crawl starts | 2 MiB | None |
| A write took under 1 s | Grows by 512 KiB, up to 4 MiB | None |
| A write took 1-2 s | Unchanged | None |
| A write took over 2 s | Halves, down to 64 KiB | As long as the write took, up to 30 s |
| A transient failure | Quarters, down to 64 KiB | 2 s, doubling per consecutive failure up to 60 s, each with ±25% jitter |
| The 8th consecutive transient failure | | The request's scope fails, its checkpoint intact |
| Any request succeeds | | The consecutive failure count resets |

A batch still holds at most 200 listings and 5,000 columns, and a single
listing larger than the budget is written alone. After a failed write the
same listings are split again under the smaller budget, in the same order,
so a page is still written oldest connection first.

## What a person sees

Each throttle event becomes an `EtlRunProgress` event with stage
`write_throttled` and the event's details. `ava pipeline run` prints every
transient failure, and at most one slow-write line per 15 seconds:

```text
[1/3] https://data.humdata.org [format:csv] · writes slowed: 1 MiB batches, pausing 4.2 s
[1/3] https://data.humdata.org [format:csv] · write failed (2 of 8 in a row), retrying in 4.0 s with 256 KiB batches: canceling statement due to statement timeout
```

Each crawl also records, in `pipeline_execution_scopes.pipeline_metrics`,
`etl.write_slowdowns`, `etl.transient_failures`, and
`etl.throttle_pause_ms`. The printer lives in `ava-cli`, so run
`pnpm build:ava-cli` after pulling this change: `ava` refuses to run from a
stale build.

## How it was verified

On the local stack (`ava supabase switch`), with the role PostgREST connects
as given a deliberately short statement timeout:

| Timeout | Run | Transient failures retried | Result | Re-run with 8 s |
| --- | --- | --- | --- | --- |
| 150 ms | 300 HDX CSV datasets | 1 | `ok`, 614 listings | 0 written, 614 unchanged |
| 60 ms | 400 HDX CSV datasets | 90, settling at about 340 KiB batches | `ok`, 8,132 listings | 0 written, 8,188 unchanged |
| 60 ms | 150 HDX CSV datasets | 1, recorded with its metrics | `ok`, 164 listings | 0 written, 164 unchanged |

A re-run that writes nothing and finds every listing unchanged shows that
every listing the stressed run wrote landed whole. Killing PostgREST's
database connections every 1.5 s during a run did not fail it either.

A statement timeout far below `SLOW_WRITE_MS` is a harsher test than a
hosted database: there every write fails before it can count as slow, so
the budget saws between failing and recovering. With the hosted 8 s
timeout, a slowing database crosses the 2 s slow-write line first, and the
throttle eases off before writes start to fail.

## Writing less

The throttle decides how fast to write. HDX also writes less: a listing's
`source_metadata` leaves out the package's `license_other` (the full text of
a custom license, repeated on every resource of a package) and each
resource's `fs_check_info` (HDX's file check report, whose headers the CKAN
client already reads into `fileHeaders`). On demo those two fields were 55%
of HDX's raw JSON. The license's name stays in `license`, and both remain on
HDX at the listing's `source_url`.
