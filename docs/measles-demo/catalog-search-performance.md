# Catalog search performance

Where the open data catalog's search spends its time, how it was made to
stay fast as the catalog grows, and the work held back for later. The
numbers were measured on the demo database (196,271 listings, 6,443 distinct
keywords, 1,001 level-2 organizations) on 2026-11-08 and 2026-11-09.
Timings on that instance vary by up to 50% between runs, so treat them as
rough.

## What was slow

These were measured before the changes below. Only an **unsearched**
catalog was slow. Opening the Open data tab, or
choosing filters without typing a search, makes every call read every
listing. Once a search is typed, the `search_vector` and trigram indexes
narrow the matches to a few hundred rows and every call is fast.

| Call | Nothing searched | "measles" searched |
|---|---|---|
| Filter counts (`rpc_data_catalog_listings__search_facets`) | 4.8 to 5.2s before, 3.4s after the single-pass rewrite | 0.06s |
| Dataset list, first 50 (`rpc_data_catalog_listings__search`) | 2.7s | 0.14s |
| Keyword search (`rpc_data_catalog_listings__search_tag_options`) | 3.1s | fast (not measured) |

Signed-in requests time out at 8s (`statement_timeout` on `authenticated`).

## Why it was slow

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
4. **The dataset list could, but did not.** It filtered on the match
   function's pass flags after the fact, so it read every row even when a
   filter would narrow them, and sorted all of them to return 50.

## What has been done

- **The facet RPC returns one JSON value.** The Data API cuts a row set off
  at `max_rows` (1,000), which silently dropped whole facets with nothing
  searched. See `56.rpc_data_catalog_listings__search_facets.sql`.
- **Keywords are searched on the server.** The counts carry only the 50
  keywords with the most listings, plus any chosen ones. Typing into the
  Keywords filter calls `rpc_data_catalog_listings__search_tag_options`.
- **No call reads the whole catalog.** The catalog is expected to grow 10 to
  100 times (2 to 20 million listings), and agents will search it, so the
  work a call does is bounded by what it returns rather than by the catalog's
  size. Exact counts are not required.

### How each call stays bounded

| Call | How |
|---|---|
| Matching (`data_catalog_listings__search_matches`) | Every filter is a condition on the listings, not a pass flag computed for every row, and the function takes an optional sort, limit, and offset. `plan_cache_mode = force_custom_plan` plans each call for its own arguments, so Postgres can use the listings' indexes. |
| Dataset list (`rpc_data_catalog_listings__search`) | Browsing walks `data_catalog_listings__last_updated_at` or `data_catalog_listings__display_name` and stops at the page. A filter uses its own index (`tags`, `domains`, publisher, `organization2_name`, the format expression). The total is counted only up to 10,000; past that the list says "10,000+" and keeps paging while pages come back full. With nothing narrowed, the total is the summary's. |
| Typed search sorted by date | The sort adds `interval '0 seconds'` to the date when a query is typed, which hides the date index from that sort. Otherwise Postgres may walk the whole date index looking for a search's few matches. |
| Facet counts (`data_catalog_listings__search_facet_rows`) | With nothing narrowing a facet, its counts are read from `data_catalog_facet_counts`. With at most 10,000 matches, they are counted exactly (`data_catalog_listings__count_facet`). Otherwise the options are the catalog's values from the summary, with no count. |
| Keyword search | The same rules, over the summary's keyword list. |
| `data_catalog_facet_counts__refresh` | Reads the whole catalog once, at the end of each pipeline run (`rpc_pipeline_executions__finish`). |

### Measured on demo

Benchmarked on 2026-11-09 against the demo database (196,271 listings),
with the indexes built and the functions created for one session only. Cold
is the first run, warm the second.

| Call | Before | Cold | Warm |
|---|---|---|---|
| List, nothing searched, by date | 2,700ms | 81ms | 1ms |
| List, nothing searched, by name | | 192ms | 1ms |
| List, nothing searched, page 21 | | 27ms | 3ms |
| List, publisher with 7.5k listings | | 3,054ms | 97ms |
| List, publisher with 2.4k listings | | 22ms | 13ms |
| List, keyword on 130k listings | | 682ms | 639ms |
| List, "measles", best match | 140ms | 725ms | 22ms |
| List, "measles", by date | | 23ms | 23ms |
| Facet counts, nothing searched | 4,800 to 5,200ms | 23ms | 21ms |
| Facet counts, "measles" | 60ms | 126ms | 102ms |
| Facet counts, publisher with 2.4k listings | | 131ms | 130ms |
| Facet counts, publisher with 7.5k listings | | 403ms | 402ms |
| Facet counts, format on most listings | | 265ms | 249ms |
| Facet counts, keyword on 130k listings | | 1,229ms | 1,126ms |
| Keyword search, nothing searched | 3,100ms | 17ms | 16ms |
| Keyword search, publisher chosen | | 24ms | 23ms |
| Summary refresh | | 2,352ms | 2,055ms |

The refresh first measured 20 to 24s, because it checked each listing's
update window with `data_catalog_listings__is_updated_within`: six function
calls per listing. It now reads each window's dates once.

The slowest cold calls read rows Postgres has not cached: a filter that
keeps a few thousand listings is counted up to the cap from the table
itself.

**Accepted trade-off:** when too many listings match to count, an option has
no count and may keep no listings. Showing only options that are known to
match would mean counting, which is the work being avoided. A search engine
removes this trade-off; see "Rejected for now" below.

## Rejected

| Option | Why |
|---|---|
| Covering index of the filter columns | A btree index entry holds at most about 2.7 KB. 62 demo listings already exceed that across the filter columns, and the largest keyword list alone is 2,718 bytes, so building the index fails, or worse, a later pipeline write of a listing with many keywords is refused. Leaving the keyword and topic lists out leaves the counts reading the table anyway. |
| Inlining the match function | Postgres only inlines an SQL function with no `SET` clauses. Dropping `search_path` fails the security lint, and the trigram threshold must be set for `<%` to use its index. A second, unsearched code path would duplicate the filters. The bounded calls make the buffering it would remove small anyway. |
| Estimated counts (`tablesample`) | A value with few listings often does not appear in a sample, so it would drop out of its filter or show a wrong count, which reads as a bug. |
| A plain view of the filter columns | A view is a stored query: reading it reads the same wide table pages. |
| A search engine (Typesense, Meilisearch, OpenSearch) | Rejected for now, to avoid adding a service to the demo. It is the standard way to get exact counts with filters at millions of listings, and the path if those become a requirement. ParadeDB's `pg_search` would need checking for Supabase support. |

## Future work

| Item | When | Trade-off |
|---|---|---|
| Refresh the summary outside `rpc_pipeline_executions__finish` (pg_cron, which demo has available but not installed, or a queued job) | Before the catalog reaches about 500k listings | The refresh reads the whole catalog: about 2.1s at 196k listings. It grows with the catalog and runs inside the finish call, which the Data API stops at 8s, so somewhere near 750k listings pipeline runs would fail at their last step. |
| Build new catalog indexes with `create index concurrently` in their own migration | Before the catalog reaches a few million listings | A plain `create index` blocks writes to the listings while it builds. That is seconds on demo today and minutes at 20 million rows. Concurrent builds cannot run inside a transaction, so they need a migration of their own. |
| Keyset paging (`after` the last row's sort key) instead of `offset` | If people or agents page deep into results | An offset still walks every skipped row. |
| Server-side search for the publisher and level-2 organization filters | When either passes about 1,000 values | Same shape as the keyword search. The level-2 facet already sends only the top 50 when no publisher is chosen. |
| A materialized view or bigger compute | Only if the bounded calls are still too slow | See the earlier measurements: the table is wider than the demo instance's 256 MB cache. |
