# Catalog field mapping: design

Status: approved design, not yet built. Covers the pipeline and schema side
only. Showing this metadata in the catalog, filtering by it, and catalog
search are a separate design that follows this one.

## 1. Problem

Every drive-index pipeline translates a source's dataset record into a
catalog listing in TypeScript, and today that translation keeps almost
nothing. On the demo instance, all 2,431 NYC listings have a name, one
organization ("City of New York", hardcoded per drive), a last-updated date,
and columns. `description`, `license`, `update_frequency` and `notes` are
empty on every row, even though Socrata's Discovery API returns a
description, the publishing agency, a category, tags and an update frequency
for each dataset.

Three things are missing:

1. A **common metadata schema** rich enough to search and categorize by:
   several levels of organization, domains and tags.
2. A **declarative mapping** from each source's fields onto that schema, so a
   new portal or a corrected field is a config edit, not a code change.
3. A **raw copy of the source record**, so metadata that does not fit the
   common schema is still queryable, and so a new common field can be filled
   later by a data migration instead of a re-crawl.

## 2. What already exists, and stays

`bdba34bb7` added `apps/pipeline-server/pipelines/etl.config.yaml` and its
parser in `packages/node/etl/src/EtlConfig/`. It decides which formats a
workspace can load. This design keeps that file for config every pipeline
shares and adds a second, per-pipeline file next to each pipeline.

These listing fields stay computed in TypeScript, because pipeline
correctness or acquisition depends on them, and they come from logic rather
than from a single source field:

- `externalDatasetId`, `apiResourceId`, `apiResourceFormat`, `columns`
- `sourceUpdatedAt`, which incremental runs resume from
- `sourceUrl`, `sourceDownloadUrl`, `sourceAssetType`, `isWorkspaceLoadable`
  (from the loadability work in `184db8124` and `706b0c2dc`)

HDX's crawl scopes (`hdxScopes.ts`) also stay in code: they are how the
pipeline pages through HDX, not a description of a drive.

## 3. The common metadata schema

### 3.1 `data_catalog_listings` changes

| Column | Change | Meaning |
|---|---|---|
| `organization1_name` | Renamed from `external_organization_name` | The top organization level, such as "City of New York". Still `not null`. |
| `organization2_name` … `organization4_name` | New, `text` | Deeper organization levels, such as an agency, then an office. Null when the source has no such level. |
| `domains` | New, `text[]` | Subject areas the source files the dataset under, such as "Transportation". |
| `tags` | New, `text[]` | The source's free-form keywords. |
| `source_metadata` | New, `jsonb` | The full, untouched source record the listing was built from. |
| `drive_id` | New, `uuid`, references `data_catalog_drives(id)` | The drive that produced the listing. Null on a listing no drive-index pipeline wrote, such as World Bank WDI. |

The `external_` prefix is dropped from the organization column only. No doc
records a reason for it, and Avandar has no organization concept of its own
for "organization" to be confused with. `external_dataset_id` keeps its
prefix, because it does disambiguate: the table has its own `id`.
`external_service_name` is not touched by this design.

Organization levels work like administrative boundary levels (admin1,
admin2, admin3): level 1 is the broadest, each deeper level sits inside the
one above, and how many levels exist and what each is called depends on the
source. Four levels covers the deepest hierarchy seen so far: data.gov's CKAN
publisher hierarchy ("U.S. Government" > "Department of Commerce" > "NOAA" >
"NESDIS").

The level number is attached to the word (`organization1_name`), never
separated by its own underscore (`organization_1_name`). The app converts
column names to camelCase on read and back to snake_case on write, through
`toCamelCase` / `toSnakeCase` in `@avandar/utils` and type-fest's
`CamelCase` / `SnakeCase` types. `organization1_name` round-trips through
`organization1Name` at runtime and in the types. `organization_1_name` reads
as `organization1Name` but writes back as `organization1_name`, a column that
does not exist.

`source_metadata` is a new column rather than a use of the existing
`metadata` column, because the engine already writes its own bookkeeping
into `metadata` (`relation_columns_sha256`). Mixing the two would let a
source field collide with an engine key.

### 3.2 New `data_catalog_drives` table

One row per drive a pipeline crawls.

| Column | Type | Meaning |
|---|---|---|
| `id` | `uuid` primary key | |
| `created_at`, `updated_at` | `timestamptz` | |
| `pipeline_name` | `text not null` | Such as `socrata`. |
| `drive_key` | `text not null` | The drive's key, which is its base URL, such as `https://data.cityofnewyork.us`. |
| `organization1_label` … `organization4_label` | `text` | What each organization level is called on this drive, such as "City" and "Agency". Null for a level the drive does not use. |

Unique on `(pipeline_name, drive_key)`. The catalog is public metadata, so
the table gets the same read policy `data_catalog_listings` has, and only the
pipeline's service role writes it.

Labels live on the drive, not on each listing, because they describe the
drive's hierarchy, not one dataset. A drive can override its pipeline's
default labels, which is what lets two Socrata portals label level 1 "City"
and "State".

## 4. The pipeline config file

Each drive-index pipeline gets one YAML file beside it:
`apps/pipeline-server/pipelines/<pipeline>/<pipeline>.pipeline.yaml`. It
replaces `socrata/configuredDrives/configuredDrives.ts` and
`hdx/hdxDrive.ts`.

The per-pipeline `pipelines:` override section of `etl.config.yaml` moves
into this file as `workspaceLoadability`, so everything specific to one
pipeline lives in one place. It is empty today, so nothing is lost.

### 4.1 Shape

```yaml
# apps/pipeline-server/pipelines/socrata/socrata.pipeline.yaml
organizationLabels:
  1: City
  2: Agency

fields:
  display_name: { from: resource.name }
  description: { from: resource.description }
  organization2_name: { from: resource.attribution }
  domains: { script: ./mappers/socrataDomains.ts }
  tags: { from: classification.domain_tags }
  update_frequency: { script: ./mappers/socrataUpdateFrequency.ts }

drives:
  - baseUrl: https://data.cityofnewyork.us
    fields:
      organization1_name: { value: City of New York }

  - baseUrl: https://data.ny.gov
    organizationLabels: { 1: State, 2: Agency }
    fields:
      organization1_name: { value: State of New York }

  - baseUrl: https://health.data.ny.gov
    organizationLabels: { 1: State, 2: Department, 3: Office }
    fields:
      organization1_name: { value: State of New York }
      organization2_name: { value: Department of Health }
      organization3_name: { from: resource.attribution }
```

Top-level keys:

| Key | Required | Meaning |
|---|---|---|
| `organizationLabels` | No | Default labels by level number (1-4). |
| `fields` | No | Field mappings every drive uses. |
| `drives` | Yes | The drives to crawl, in order. An empty list switches the pipeline off. |
| `workspaceLoadability` | No | This pipeline's `loadableFormats` / `unloadableFormats`, moved from `etl.config.yaml`. |

Each drive:

| Key | Required | Meaning |
|---|---|---|
| `baseUrl` | Yes | `https://`, no trailing slash. Also the drive's `drive_key`. |
| `organizationLabels` | No | Replaces the default labels for this drive. Levels it omits are null, not inherited, so a drive never shows a label for a level it does not fill. |
| `fields` | No | Merged over the pipeline's `fields`, key by key. |
| `scopes` | No | Socrata only: the category and tag scopes `configuredDrives.ts` supports today. Each pipeline validates its own drive extras. |

### 4.2 A field mapping

Each entry under `fields` maps one catalog field to exactly one of:

| Kind | Example | Result |
|---|---|---|
| `from` | `{ from: classification.domain_tags }` | The value at that dotted path in the source record. A missing path is `undefined`. Numeric segments index arrays (`groups.0.title`). There is no wildcard: plucking a field from every array item (`tags[].name`) is a script. |
| `value` | `{ value: City of New York }` | That constant. |
| `script` | `{ script: ./mappers/socrataDomains.ts }` | What the script's default export returns for the record. The path is resolved relative to the YAML file. |

A script's module default-exports one function:

```ts
export default function socrataDomains(
  record: unknown,
  context: CatalogFieldMapperContext,
): unknown;
```

`context` carries the drive's `baseUrl` and the target field's name. The
return value goes through the same coercion as a `from` value (section 4.4).
A script that throws fails that field for that record only: the field is
null and the run logs a warning naming the script and the dataset.

### 4.3 Mappable fields

The keys `fields` accepts are a fixed list. Any other key fails the config
when it loads:

`display_name`, `description`, `notes`, `license`, `update_frequency`,
`canonical_urls`, `coverage_start_date`, `coverage_end_date`,
`organization1_name`, `organization2_name`, `organization3_name`,
`organization4_name`, `domains`, `tags`.

`display_name` and `organization1_name` are required: every drive must map
them, through its own `fields` or the pipeline's.

### 4.4 Coercion

| Field kind | Accepts | Otherwise |
|---|---|---|
| Text | A string. Blank strings become null. | Null, with a warning. |
| Text array (`domains`, `tags`, `canonical_urls`) | A string (wrapped into a one-item array) or an array of strings. Blanks and duplicates are dropped. An empty result is null. | Null, with a warning. |
| Date (`coverage_*`) | An ISO 8601 string. | Null, with a warning. |

When `display_name` or `organization1_name` comes out null for a record,
the pipeline skips that dataset with a `console.warn`, the way Socrata
results that fail validation are skipped today. It does not fail the drive.

## 5. Loading the config, once per run

A new module in `packages/node/etl/src/EtlConfig/` (beside `parseEtlConfig`)
owns this:

1. `readPipelineConfigFile(path)` reads the YAML and validates it with a
   strict zod schema: unknown keys, a field with zero or two kinds, or an
   unknown field name all fail with the file path and the offending key.
2. `loadCatalogFieldMapper(config, configDir)` then compiles it, `async`,
   once at the start of a run:
   - Each `from` path is split into its segments once, into a lookup
     function.
   - Each distinct script path is resolved to an absolute path and imported
     with one `await import(...)`, cached in a `Map` keyed by that path. Two
     fields pointing at the same script share one import. A script that is
     missing, fails to load, or has no function default export fails the
     run here, before any network call.
   - Each drive's merged field set is computed once.
3. The result is a `CatalogFieldMapper` with
   `mapFields(record, driveKey)`, a synchronous function the pipeline calls
   per dataset. It touches no file and imports nothing.

Pipelines run under Bun on the pipeline server and under `vite-node`
through `ava pipeline run` (`scripts/runPipelineOnce.ts`). Both transform a
dynamically imported `.ts` file, so a script needs no build step. The loader
imports by `pathToFileURL(absolutePath).href` so both runtimes resolve it the
same way, and a test runs the loader under each.

Each pipeline's `run.ts` loads its config and mapper once in
`_createEngine` and passes them into its engine factory, the way
`getPipelineWorkspaceLoadability` is passed today. The drive list the engine
crawls comes from the same config, which keeps the drive list and its
mappings from drifting apart.

## 6. Data flow

1. The run loads `<pipeline>.pipeline.yaml` and builds the mapper.
2. Before crawling a drive, the engine upserts its `data_catalog_drives` row
   (pipeline name, drive key, merged labels) and keeps the row's id.
3. The source client returns each dataset's **raw record** alongside the
   fields it already parses. `SocrataDiscoveryClient` and the CKAN client
   both gain a `raw` value per result: the validated object, before it is
   narrowed to the typed shape.
4. The pipeline's `transform` builds the code-computed fields (section 2) as
   it does now, and spreads in `mapper.mapFields(raw, driveKey)` plus
   `sourceMetadata: raw`.
5. `buildListingRowFromRelation` writes the new columns and the drive id.
   `isListingRowUnchanged` and `listingContractColumns` include the new
   columns, so a mapping change rewrites the affected rows on the next full
   run.

## 7. Initial mappings

| Field | Socrata | HDX (CKAN) |
|---|---|---|
| Labels | NYC: City, Agency. NY State: State, Agency. NYS Health: State, Department, Office. | Organization |
| `display_name` | `resource.name` | Kept in code: the resource name, as today |
| `organization1_name` | `value` per drive | `organization.title`, such as "World Health Organization" |
| `organization2_name` | `resource.attribution` (NYC, NY State); `value` "Department of Health" (NYS Health) | None |
| `organization3_name` | `resource.attribution` (NYS Health only) | None |
| `description` | `resource.description` | `notes` |
| `domains` | Script: `classification.domain_category` plus `classification.categories` (the latter is empty on NYC today) | Script: `groups[].title` (countries on HDX) |
| `tags` | `classification.domain_tags` | Script: `tags[].name` |
| `update_frequency` | Script: the `Update-Frequency` entry in `classification.domain_metadata` | Script: `data_update_frequency` is a code (`"1"` is every day), translated to words |
| `license` | `metadata.license`, when present (rare on NYC) | `license_title` |

HDX lists one listing per resource, so its record is the CKAN package with
the resource attached. Its `from` paths therefore read package fields, and
HDX's `display_name` stays in code because it comes from the resource. The
CKAN package schema widens to keep `organization`, `groups`, `tags`,
`notes`, `license_title` and `data_update_frequency`.

These rows are the starting config. Verify each path against a recorded
response while building, and fix the YAML rather than this table when they
differ.

## 8. Migration and backfill

- The rename must be a hand-edited `alter table ... rename column`.
  `supabase db diff` sees a rename as a dropped column plus a new one, which
  would delete `external_organization_name` on production's World Bank rows.
  Verify the generated migration contains no `drop column` before keeping
  it.
- `rpc_data_catalog_listings__upsert_with_relation_columns` writes the new
  columns.
- Every reader of `external_organization_name` moves to
  `organization1_name`: the app model and parsers, the catalog view, the
  ETL stores, the desktop SQLite migration generator, and the tests.
- The demo instance is backfilled by one full (non-incremental) run of each
  pipeline. Incremental runs only touch datasets that changed, so they would
  leave the new columns empty on every unchanged listing.

## 9. Testing

Red/green TDD, in this order:

| Behavior | Test |
|---|---|
| Config validation: unknown key, unknown field, zero or two kinds, missing required field | `readPipelineConfigFile` unit tests |
| `from` paths, including array indexes and missing paths | `loadCatalogFieldMapper` unit tests |
| `value` constants, and drive `fields` overriding pipeline `fields` | Same |
| A script used by two fields across 1,000 records is imported once | Same, with a fixture script that counts its own module evaluations |
| A script that throws nulls only its field and warns | Same |
| Coercion for text, arrays and dates | Same |
| Labels: drive override replaces the default, omitted levels are null | Same |
| Socrata and HDX transforms produce the section 7 fields | Each pipeline's transform tests, against recorded raw records |
| Row building writes the new columns and `drive_id` | `buildListingRowFromRelation` tests |
| The drive row upsert and listing link | Supabase store tests |
| The rename keeps existing values, and the new columns and policies exist | Database test (`pnpm test:db`) |

## 10. Out of scope

- Showing organizations, domains and tags in the catalog, filtering by them,
  and the search rework. That is the next design.
- Mapping `pipeline_parquet` pipelines such as World Bank WDI. They write
  one hand-built listing, not a source catalog.
- Indexes on `domains` and `tags`. The catalog search design decides what
  to index.
