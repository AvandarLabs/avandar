# ETL disk footprint

Why the HDX pipeline filled the demo database's disk, where the space goes,
what changed, and what it takes for a full HDX run to fit.

## What failed

On 2026-11-08 run `95f18055` (`ava pipeline run hdx --local --env demo
--incremental`) finished `format:csv` and `format:parquet`, then failed
partway through `format:other`:

```text
Supabase failed upserting listings with rpc_data_catalog_listings__upsert_with_relation_columns:
could not extend file "base/5/20930": No space left on device (code 53100)
```

`53100` is Postgres running out of disk, not a slow or overloaded database.
The write throttle (see `etl-adaptive-write-throttle.md`) correctly treats
it as not transient: retrying cannot free space.

## Where the space goes

Measured on the demo instance through the service role (row counts and
samples of 1,000 rows). Byte figures are estimates: JSON size per row, with
TOAST compression approximated by zlib.

| What | Count | Notes |
| --- | --- | --- |
| HDX listings | 76,736 | All created today, by runs `5b3ee4f2` and `95f18055` |
| ...of which `format:other` | ~36,000 | 28,910 of them GeoTIFF rasters |
| ...workspace-loadable | 36,472 | |
| Socrata listings | 5,280 | ~6 KB of JSON each |
| Relation columns | 655,955 | ~150 MB with indexes |

An HDX listing averaged 21 KB of JSON in `source_metadata` alone, 80% of
the row:

| Field inside `source_metadata` | Avg bytes per listing | Why it is waste |
| --- | --- | --- |
| `license_other` | ~10,000 (18,700 on WorldPop) | A package's full license text, repeated on every resource listing |
| `resources[].fs_check_info` | ~4,000 | HDX's file check report |
| `notes` | 1,658 | Already stored in the listing's `description` |
| `organization` | 853 | The organization's description and logo, per resource |
| `tags` | 697 | Tag ids and display copies, per resource |
| `groups` | 194 | Group descriptions and images, per resource |

The rows written today predate commit `c75d19331` (which dropped
`license_other` and `fs_check_info`), because run `95f18055` started at
22:28 UTC and that commit landed at 22:33 UTC.

The root cause is duplication, not volume of real data. HDX lists 30,038
datasets with 190,991 resources, and every resource becomes a listing that
repeats its package's metadata. WorldPop and Copernicus packages hold
dozens of GeoTIFFs each, so one 20 KB license was stored dozens of times
per package.

## How big a full HDX run is

HDX resources by format, from `package_search` on 2026-11-08:

| Format | Resources | Loadable |
| --- | --- | --- |
| GeoTIFF | 78,834 | No (raster) |
| CSV | 40,749 | Yes |
| KML, GeoJSON, SHP, Geopackage, PMTiles, GeoParquet, Geodatabase | ~41,000 | No |
| XLSX, XLS, JSON, XML | ~13,300 | No |
| PNG, PDF, HTML, ZIP, other | ~17,100 | No |
| Parquet | 7 | Yes |

`format:other` still has about 117,600 resources to write.

Estimated database size after a complete run. A listing's footprint
includes its heap row, TOAST, and index entries. The "Other" column covers
relation columns, Socrata, and roughly 0.4 GB of Postgres, Supabase
schemas, and WAL (an assumption: the actual figure needs the diagnostic
query below).

| Scenario | HDX listings | Per listing | HDX total | Database total |
| --- | --- | --- | --- | --- |
| Keep today's rows, continue incrementally on the code before this change | 76.7k legacy + 114k new | 12.5 KB / 8.0 KB | 1.9 GB | ~2.5 GB |
| Reset HDX, full run with this change | 191k | 6.5 KB | 1.24 GB | ~1.9 GB |
| Same, without GeoTIFF | 112k | 6.5 KB | 0.73 GB | ~1.4 GB |
| Same, CSV and Parquet only | 41k | 6.5 KB | 0.27 GB | ~0.9 GB |

Supabase disk limits:

| Plan | Disk | Behavior when full |
| --- | --- | --- |
| Free | 2 GB, fixed | Read-only at 95% (1.9 GB). A full disk shuts Postgres down until the project is upgraded |
| Pro | 8 GB, grows 50% at 90% used, up to 4 times per 24 h | Read-only at 95% only when growth is exhausted |

A database of roughly 1.5 to 2 GB running out of disk matches the Free
plan's fixed 2 GB, not Pro's 8 GB. The diagnostic query below confirms it.

## What changed

`makeApiResourceRelationsFromCkanPackage` now also leaves out of
`source_metadata`:

- `notes` and `caveats`, which `hdx.pipeline.yaml` copies whole into
  `description` and `notes`.
- Every key of `organization` except `id`, `name`, `title`.
- Every key of each tag except `name`, `vocabulary_id`.
- Every key of each group except `name`, `title`.

The kept keys are the ones the HDX mappers read, so a later column can
still be filled from `source_metadata` without re-crawling. Together with
`c75d19331`, an HDX listing's `source_metadata` goes from about 8.3 KB to
2.3 KB compressed, and the whole listing from about 12.5 KB to 6.5 KB.

The change check (`isListingRowUnchanged`) still ignores `source_metadata`,
so these trims reach only rows a run writes for another reason. A row
written before them keeps its old `source_metadata` until it is reset.

## Recovering the demo instance

Run these in the demo project's SQL editor (Dashboard → SQL Editor). They
delete only HDX rows, all of which were created today and are rebuilt by
the next run.

1. Check the disk and what fills it:

   ```sql
   select pg_size_pretty(pg_database_size(current_database())) as database_size;

   select
     c.relname,
     pg_size_pretty(pg_total_relation_size(c.oid)) as total,
     pg_size_pretty(pg_relation_size(c.oid)) as heap,
     pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) as toast,
     s.n_live_tup,
     s.n_dead_tup,
     s.last_autovacuum
   from pg_class c
   join pg_stat_user_tables s on s.relid = c.oid
   order by pg_total_relation_size(c.oid) desc
   limit 10;

   select
     slot_name,
     active,
     pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as retained_wal
   from pg_replication_slots;
   ```

   The plan and disk size are under Project Settings → Billing and
   Database → Settings → Disk.

2. Optional backup of the catalog tables, from a terminal with the
   connection string from Dashboard → Connect (session pooler):

   ```bash
   pg_dump "$DEMO_DATABASE_URL" --data-only --format=custom \
     --table=public.data_catalog_listings \
     --table=public.data_catalog_listings__relation_columns \
     --table=public.pipeline_scope_checkpoints \
     --file=demo-catalog-backup.dump
   ```

   To restore it, delete the HDX rows again (step 3), then:

   ```bash
   pg_restore --data-only --disable-triggers \
     --dbname="$DEMO_DATABASE_URL" demo-catalog-backup.dump
   ```

3. Delete the HDX listings (their relation columns cascade) and
   checkpoints. The first line is only needed while the project is in
   read-only mode:

   ```sql
   set session characteristics as transaction read write;
   delete from public.data_catalog_listings where pipeline_name = 'hdx';
   delete from public.pipeline_scope_checkpoints where pipeline_name = 'hdx';
   ```

4. Return the space to the disk, as its own query (`vacuum` cannot run
   inside a transaction):

   ```sql
   vacuum full public.data_catalog_listings, public.data_catalog_listings__relation_columns;
   ```

5. Rerun the pipeline with this change:

   ```bash
   ava pipeline run hdx --local --env demo
   ```

   If it stops partway, `--incremental` continues from the checkpoint.

## Deciding what fits

| Disk | Full HDX after reset (~1.9 GB) | Recommendation |
| --- | --- | --- |
| Pro, 8 GB or more | Fits | Reset and run everything |
| Free, 2 GB | At the read-only threshold, and a full disk stops Postgres | Upgrade, or leave GeoTIFF out (~1.4 GB) |

Leaving GeoTIFF out drops 78,834 raster files that no workspace can load.
CSV and every other listed format stay. It is a one-line change: add
`"GeoTIFF"` to `format:other`'s `excludedFormats` in
`apps/pipeline-server/pipelines/hdx/hdxScopes.ts`.

## Not done here

| Improvement | Saving | Why not now |
| --- | --- | --- |
| Store a package's metadata once, not on each resource listing | Most of the remaining ~4 KB per listing (`description`, `search_vector`, package fields), with 6.4 resources per HDX dataset | Needs a new table and changes to catalog search |
| Stop a run before the database passes a size limit | Avoids a Free project's Postgres shutdown | Needs an RPC reading `pg_database_size` and a configured limit |
| Count a change to `source_metadata`'s keys as a change | Lets a trim reach rows a run would not otherwise rewrite | Rewrites every legacy row, which needs free disk first. A reset is cheaper for the demo |
