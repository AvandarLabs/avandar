# Crosswalk materialization at 100 datasets

Measured for open decision 4 of
[data-dictionaries-design.md](data-dictionaries-design.md): how long the
first combine of a crosswalk over 100 datasets takes, and whether relation
loading should acquire a query's datasets in parallel.

## Setup

- 100 CSV-backed datasets of 2,000 rows each (200,000 rows, about 10 to 12 KB
  of Parquet each, 1.1 MB in all), in three layouts of 50, 35, and 15
  datasets, and one crosswalk mapping all three onto five columns, with two
  date parses, ZIP padding, a fixed value, and an empty column. Seeded by
  `scripts/crosswalks/seedCrosswalkMeasurement.ts` into the branch's switched
  local Supabase; removed by
  `scripts/crosswalks/cleanupCrosswalkMeasurement.ts`.
- Each dataset's Parquet is downloaded from local Supabase Storage, so the
  unthrottled cold run has almost no network cost. The throttled run uses
  DevTools' Fast 4G profile (150 ms latency, 9 Mbps down, 1.5 Mbps up),
  applied through the Chrome DevTools Protocol after the page and the
  crosswalk's first step had loaded, so it covers everything the combine step
  fetches and nothing before it.
- The timing is the `crosswalks:combined-preview` performance measure
  around the preview's two queries (`SELECT * ... LIMIT 20` and the row
  count). `readingMs` runs from the start of the preview to the last
  dataset in hand.
- Driven headless with the repo's `@playwright/test` library (the Playwright
  MCP was unavailable), against `vite` serving this worktree, signed in as the
  seeded workspace owner. Every cold run is a fresh browser context, so
  IndexedDB and DuckDB start empty.
- Machine: Apple M4 Max, 128 GB, macOS 26.3.1, Playwright 1.64.1 with Chromium
  156.0.8078.4, headless. Branch commit `f02460f56` plus this task's scripts.

## Results

Medians of three runs. Every run read all 100 datasets.

| Run | Total (s) | Reading (s) | Reading share |
| --- | --- | --- | --- |
| Cold, throttled | 67.7 | 67.6 | 100% |
| Cold, unthrottled | 2.1 | 2.1 | 99% |
| Warm, storage tier | 1.3 | 1.2 | 98% |
| Hot, DuckDB | 0.2 | 0.2 | 91% |

The individual runs, in milliseconds (total, then reading):

| Run | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Cold, throttled | 67,663 / 67,638 | 67,619 / 67,596 | 67,670 / 67,644 |
| Cold, unthrottled | 2,145 / 2,123 | 2,163 / 2,140 | 2,143 / 2,120 |
| Warm, storage tier | 1,396 / 1,373 | 1,164 / 1,141 | 1,266 / 1,242 |
| Hot, DuckDB | 216 / 196 | 226 / 205 | 207 / 186 |

The warm runs reloaded the page after the third cold run (DuckDB empties,
IndexedDB keeps the bytes). The hot runs went to **Map each dataset** and back
in the same tab. No run crashed or errored, and the first dataset's rows and
the count (200,000 rows from 100 datasets) were correct each time. The app
printed one unrelated `JWT issued at future` error from a background request
in the cold runs, which did not affect the preview.

### What the throttled time is made of

One extra throttled run, sampled every 250 ms (not part of the medians), shows
where the 67 seconds go:

| Moment | Seconds in |
| --- | --- |
| DuckDB-WASM engine requested | 4.2 |
| Parquet extension requested from `extensions.duckdb.org` | 33.6 |
| First dataset in hand ("Read 1 of 100") | 35.9 |
| 50 datasets in hand | 51.8 |
| 99 datasets in hand | 67.4 |
| Rows on screen | 68.4 |

About 36 seconds pass before the first dataset arrives: the browser downloads
the DuckDB engine and its Parquet extension over the throttled network. A
session that already ran a query has paid that. The datasets themselves then
arrive one at a time, about 0.32 seconds each, about 32 seconds for the 100.
Parallel downloads would shorten that second part, not the first.

## Decision

The rule, set before measuring: build parallel acquisition when the median
cold, throttled first preview exceeds 60 seconds and at least 70% of it is
reading datasets. Over 60 seconds with reading under 70% means the time is
in DuckDB stacking the rows, which parallel downloads would not shorten.

Cold, throttled took 67.7 s with 100% reading: parallel acquisition is
worth building, as a follow-up feature on the roadmap.

The rule's `readingMs` starts at the preview's start, so it counts the
engine download above as reading. Read strictly as dataset downloads, the
throttled cost is about 32 s, under the 60 s line, and a session whose DuckDB
is already running would not wait the other 36 s. The rule as written is
met, so this records it as met, and leaves the owner to weigh that split
when scheduling the follow-up.
