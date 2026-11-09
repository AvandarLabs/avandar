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

The branch's `/data` volume, which holds the data directory, WAL, and temp
files, is 8.4 GB with 6.3 GB free (the branch's metrics endpoint,
2026-11-09 01:39 UTC). Every scenario above fits it.

What filled it at 22:41:54 UTC is not explained by anything Postgres
records:

| Evidence | What it rules out |
| --- | --- |
| The failing file, `base/5/20930`, is the listings TOAST table, still 845 MB and never rewritten | Data that was later deleted or compacted |
| Checkpoints at 22:39:48 and 22:44:48 recycled 17 to 22 WAL segments and added none, and no replication slot exists | WAL growth |
| `pg_stat_database` counts 6.36 GB of temp files since the restart, and completed upsert calls account for 6.07 GB of it at about 10 MB each, freed after each call | A failed query spilling gigabytes |
| The VM has run since 21:20 UTC | A restart that cleared something |

The first two errors were temp-file writes inside two concurrent upsert
calls (`RETURN NEXT`, which buffers the full rows the function returns).
They are where a full disk was noticed, not what filled it. The likeliest
reading is that the volume was smaller at 22:41 and has been grown since.
The branch's Reports → Database → Disk chart around 22:40 UTC shows whether
its size changed.

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

With 6.3 GB free, the run can continue as is
(`ava pipeline run hdx --local --env demo --incremental`). The steps below
are only for reclaiming the ~0.5 GB that rows written before the
`source_metadata` trims still hold.

1. Check the branch's disk size: open the `demo-measles` branch in the
   dashboard (Avandar Staging → Branches → `demo-measles`), then Settings →
   Compute and Disk. A full HDX run needs about 2.5 GB with WAL.

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

| Branch disk | Full HDX (~2.5 GB after a reset, ~3.1 GB without) | Recommendation |
| --- | --- | --- |
| 4 GB or more (8.4 GB on 2026-11-09) | Fits | Continue incrementally, and watch the disk (step 6) |
| Under 4 GB | Does not fit safely | Raise it, or leave GeoTIFF out (~2.0 GB) |

Leaving GeoTIFF out drops 78,834 raster files that no workspace can load.
CSV and every other listed format stay. It is a one-line change: add
`"GeoTIFF"` to `format:other`'s `excludedFormats` in
`apps/pipeline-server/pipelines/hdx/hdxScopes.ts`.

## Space savings on 2026-11-09

Stored (compressed) bytes per column for the 76,736 HDX listings, measured
before the reset:

| Column | MB | Distinct values |
| --- | --- | --- |
| `source_metadata` | 592 | |
| `search_vector` | 115 | |
| `description` | 75 | 17,319 datasets |
| `source_url`, `source_download_url` | 18 | |
| `tags`, `domains` | 13 | |
| Every other short text column | 12 | |
| `organization1_name`, `organization2_name` | 3 | 334 organizations |
| `license` | 1 | 15 |

What changed:

| Change | Why |
| --- | --- |
| `source_metadata` is now `additional_source_metadata`, holding only what no listing column holds | Each mapped field was stored twice, and a CKAN package's metadata once per resource. `CatalogFieldMapper.omitMappedPaths` leaves out every `from` path and each script's `reads`, the pipelines leave out what they map in code, and `hdx.pipeline.yaml` omits license text, the organization's repeated keys, and `solr_additions` |
| The listings upsert returns ids, not rows, and reads its input by index | Returning rows buffered every call in a temp file: 6 GB of temp writes on demo, which spends the disk IO budget, and the whole batch was sent back over the wire |
| A stored row with no `additional_source_metadata` counts as changed | A full run fills the column for listings written before it existed, such as Socrata's |

What was measured and left alone:

| Idea | Saving | Decision |
| --- | --- | --- |
| A `data_catalog_licenses` table with integer keys | Under 1 MB: `license` holds 15 short names | Not worth a join. The license bloat was `license_other`, a license's full text inside `source_metadata`, now omitted |
| Lookup tables for other repeated short text (organizations, formats, URLs' hosts) | Under 20 MB in all | Not worth the joins, the search changes, and the writes that resolve keys |
| An integer key on `data_catalog_listings__relation_columns` | About 16 MB (its uuid key index is 25 MB) | Small, and the table is mirrored to the desktop's SQLite, whose sync and generated migrations assume its uuid key |
| An integer key on `data_catalog_listings` | Under 5 MB | Its uuid is referenced by datasets, gadgets, routes, and the Parquet cache |
| Dead rows from rewrites | 358 dead rows on demo | Autovacuum kept up. The waste was duplication, not rows kept too long |

## Not done here

| Improvement | Saving | Why not now |
| --- | --- | --- |
| Store a package's metadata once, not on each resource listing | The biggest remaining saving: `description` and `search_vector` are 190 MB for 76,736 listings of 17,319 datasets, about 75% of it repeated. Roughly 350 MB at HDX's full 191k listings | Needs a datasets table, a search vector split across two tables, and changes to every catalog search function |
| Stop a run before the database passes a size limit | Ends a run cleanly instead of on a full disk | Needs an RPC reading `pg_database_size` and a configured limit |
| Set `temp_file_limit` for the API roles | A runaway query fails instead of filling the disk | A database setting change on the branch |
| Count a change to `source_metadata`'s keys as a change | Lets a trim reach rows a run would not otherwise rewrite | Rewrites every legacy row, which needs free disk first. A reset is cheaper for the demo |
