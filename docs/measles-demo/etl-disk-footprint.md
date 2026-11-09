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

The demo instance is not a standalone project. It is `demo-measles`
(`zwbvgtefomjjjmosnbjg`), a preview branch of Avandar Staging created on
2026-11-04, in the Avandar Labs organization, which is on the Pro plan.

Measured read-only on 2026-11-09 at 01:30 UTC, after the failed run:

| What | Size | Notes |
| --- | --- | --- |
| `data_catalog_listings` | 1,034 MB | 856 MB TOAST, 110 MB heap, 68 MB indexes. 82,016 rows, 358 dead |
| `data_catalog_listings__relation_columns` | 131 MB | 655,955 rows, none dead |
| Everything else in the database | ~15 MB | |
| Database total | 1,183 MB | |
| WAL directory | 608 MB | 39 segments. `min_wal_size` is 1 GB, so Postgres keeps up to 1 GB of WAL around for reuse, and `max_wal_size` (4 GB) lets it grow further between checkpoints under heavy writes |

There is no vacuum bloat to reclaim (358 dead rows), no replication slot
holding WAL, and WAL archiving is keeping up (0 failures, 0 segments
waiting). The disk holds real listing data plus WAL: about 1.8 GB now, and
more at the moment of failure, while WAL from the run was still being
recycled.

Counts and samples of 1,000 rows, read through the service role. Byte
figures per row are estimates: JSON size, with TOAST compression
approximated by zlib. They agree with the measured table: 12.6 KB per
listing measured, 12.5 KB estimated.

| What | Count | Notes |
| --- | --- | --- |
| HDX listings | 76,736 | All created today, by runs `5b3ee4f2` and `95f18055` |
| ...of which `format:other` | ~36,000 | 28,910 of them GeoTIFF rasters |
| ...workspace-loadable | 36,472 | |
| Socrata listings | 5,280 | ~6 KB of JSON each |

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

Estimated disk after a complete run. A listing's footprint includes its
heap row, TOAST, and index entries. "Disk" adds relation columns and
Socrata (~0.15 GB), the rest of the database (~0.05 GB), and up to 1 GB of
WAL, which `min_wal_size` keeps around.

| Scenario | HDX listings | Per listing | HDX total | Database | Disk with WAL |
| --- | --- | --- | --- | --- | --- |
| Keep today's rows, continue incrementally on the code before this change | 76.7k legacy + 114k new | 12.5 KB / 8.0 KB | 1.9 GB | ~2.1 GB | ~3.1 GB |
| Reset HDX, full run with this change | 191k | 6.5 KB | 1.24 GB | ~1.45 GB | ~2.5 GB |
| Same, without GeoTIFF | 112k | 6.5 KB | 0.73 GB | ~0.95 GB | ~2.0 GB |
| Same, CSV and Parquet only | 41k | 6.5 KB | 0.27 GB | ~0.5 GB | ~1.5 GB |

A Pro project starts with an 8 GB disk that grows by 50% when 90% full, so
1.8 GB should not have filled it. Supabase's docs do not say whether a
preview branch gets the same disk or autoscaling. The failure at about 2 GB
used suggests this branch has a smaller disk, or one that does not grow.
The branch's disk size is under its own Settings → Compute and Disk page,
and a Pro organization can raise it there (about $0.125 per GB per month,
then a cooldown of about 4 hours before the next change).

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

These steps act on the `demo-measles` branch only. Its HDX rows were all
created on 2026-11-08 and are rebuilt by the next run.

1. Check the branch's disk size: open the `demo-measles` branch in the
   dashboard (Avandar Staging → Branches → `demo-measles`), then Settings →
   Compute and Disk. If it is under 4 GB, raise it to at least 4 GB there.
   A full HDX run needs about 2.5 GB with WAL, and headroom keeps the run
   clear of the 95% read-only line.

2. Optional backup of the catalog tables, from a terminal with the branch's
   connection string (Connect, session pooler):

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
   checkpoints, in the branch's SQL editor. Add
   `set session characteristics as transaction read write;` first only if
   the branch is in read-only mode (it was not on 2026-11-09):

   ```sql
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

6. To watch the disk during the run:

   ```sql
   select
     pg_size_pretty(pg_database_size(current_database())) as database_size,
     (select pg_size_pretty(sum(size)) from pg_ls_waldir()) as wal_size;
   ```

## Deciding what fits

| Branch disk | Full HDX after reset (~2.5 GB with WAL) | Recommendation |
| --- | --- | --- |
| 4 GB or more | Fits | Reset and run everything |
| Under 4 GB, and it can be raised | Fits once raised | Raise it (step 1), reset, run everything |
| Under 4 GB, and it cannot be raised | Does not fit safely | Leave GeoTIFF out (~2.0 GB), or recreate the branch with a larger disk |

Leaving GeoTIFF out drops 78,834 raster files that no workspace can load.
CSV and every other listed format stay. It is a one-line change: add
`"GeoTIFF"` to `format:other`'s `excludedFormats` in
`apps/pipeline-server/pipelines/hdx/hdxScopes.ts`.

## Not done here

| Improvement | Saving | Why not now |
| --- | --- | --- |
| Store a package's metadata once, not on each resource listing | Most of the remaining ~4 KB per listing (`description`, `search_vector`, package fields), with 6.4 resources per HDX dataset | Needs a new table and changes to catalog search |
| Stop a run before the database passes a size limit | Ends a run cleanly instead of on a full disk | Needs an RPC reading `pg_database_size` and a configured limit |
| Count a change to `source_metadata`'s keys as a change | Lets a trim reach rows a run would not otherwise rewrite | Rewrites every legacy row, which needs free disk first. A reset is cheaper for the demo |
