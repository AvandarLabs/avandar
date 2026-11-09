# Catalog search performance

Where the open data catalog's search spends its time, what has been done
about it, and the optimizations held back until the UI feels too slow. The
numbers were measured on the demo database (196,271 listings, 6,443 distinct
keywords, 1,001 level-2 organizations) on 2026-11-08 and 2026-11-09.
Timings on that instance vary by up to 50% between runs, so treat them as
rough.

## What is slow

Only an **unsearched** catalog is slow. Opening the Open data tab, or
choosing filters without typing a search, makes every call read every
listing. Once a search is typed, the `search_vector` and trigram indexes
narrow the matches to a few hundred rows and every call is fast.

| Call | Nothing searched | "measles" searched |
|---|---|---|
| Filter counts (`rpc_data_catalog_listings__search_facets`) | 4.8 to 5.2s before, 3.4s after the single-pass rewrite | 0.06s |
| Dataset list, first 50 (`rpc_data_catalog_listings__search`) | 2.7s | 0.14s |
| Keyword search (`rpc_data_catalog_listings__search_tag_options`) | 3.1s | fast (not measured) |

Signed-in requests time out at 8s (`statement_timeout` on `authenticated`).

## Why

1. **The table does not fit in cache.** `data_catalog_listings` is 294 MB of
   rows plus 913 MB of TOAST, and the demo instance's `shared_buffers` is
   256 MB. A plain scan of it takes about 1.3s. Most of a row is
   `search_vector` (288 MB in total). The columns the filters read are about
   60 MB. Postgres reads whole 8 KB pages, so selecting fewer columns, or
   reading through a plain view, reads no less.
2. **The match function buffers every row.** Every call goes through
   `data_catalog_listings__search_matches`, a PL/pgSQL function whose
   `return query` writes all its rows to a tuplestore before the caller reads
   any. With nothing searched that is all 196k rows, and with `work_mem` at
   3.5 MB it spills to disk. The function alone takes 2 to 3.2s.
3. **The counts cannot use a filter to read less.** Each facet is counted
   against every other filter but its own, so after choosing one publisher,
   the Publisher facet still counts every other publisher. Together the
   facets need every listing.
4. **The dataset list could, but does not.** It filters on the match
   function's pass flags after the fact, so it reads every row even when a
   filter would narrow them, and sorts all of them to return 50.

## What has been done

- **The facet RPC returns one JSON value.** The Data API cuts a row set off
  at `max_rows` (1,000), which silently dropped whole facets with nothing
  searched. See `53.rpc_data_catalog_listings__search_facets.sql`.
- **The facet counts read the matches once.**
  `data_catalog_listings__search_facet_rows` used to re-read the matches once
  per facet (ten times). It now computes every facet in one grouping-sets
  aggregation, and groups topics and keywords by a listing's whole list
  before splitting the lists. Measured: 4.8s to 3.4s.
- **Keywords are searched on the server.** The counts carry only the 50
  keywords with the most listings, plus any chosen ones. Typing into the
  Keywords filter calls `rpc_data_catalog_listings__search_tag_options`,
  which returns the 50 best matching keywords. Only that call sends keywords
  past the top 50, and only while the user types there.

## Future optimizations

Apply these when the UI still feels too slow. They are ordered by how much
they are expected to help for their cost.

| Optimization | Helps | Extra storage | Sync work | Trade-off |
|---|---|---|---|---|
| Stop buffering in the match function | Every unsearched call, by about 1 to 2s | None | None | An SQL function is only inlined when it has no `SET` clauses, but this one sets `search_path` (a security lint) and `pg_trgm.word_similarity_threshold` (needed by the `<%` trigram operator and its index). Either keep PL/pgSQL for searched calls and add a separate unsearched path, or find another way to set the threshold. |
| Covering index on the filter columns (`create index ... include (...)`) | Every unsearched call: an index-only scan of about 60 MB instead of the 294 MB heap | About 60 MB | None: Postgres updates indexes on every write | An index-only scan only skips the heap on pages vacuum has marked all-visible. Pipelines rewrite many rows, so right after a run reads fall back to the heap until autovacuum catches up. Unbenchmarked. |
| Dataset list filters before it reads, plus an index on the last-updated date | The dataset list | One index | None | The list stops sharing the match function's pass-flag shape with the counts, so a new filter must be added to its `where` as well. The total count can come from the facet call instead of a second count. |
| Server-side search for the level-2 organization filter | Payload: it is the other facet past 1,000 values | None | None | Same shape as the keyword search: top values plus a search RPC. |
| Materialized view of the filter columns | Every unsearched call | About 60 MB | Refresh after each pipeline run | Stale between refreshes. `rpc_data_catalog_listings__mark_invalid` changes listings at runtime, so a listing marked invalid keeps its old status until the next refresh. |
| Bigger demo compute | Everything | None | None | Costs money. The table needs more than the current 256 MB of cache. |

### Rejected: estimated counts

Counting a sample (`tablesample`) when the result is large, and exact counts
when it is small, was considered and rejected. A publisher or keyword with
few listings often does not appear in a sample, so it would drop out of its
filter or show a wrong count, which reads as a bug. Deciding what is large
also needs its own estimate first.
