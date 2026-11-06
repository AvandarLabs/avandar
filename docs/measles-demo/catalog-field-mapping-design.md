# Catalog field mapping: design

Status: approved design, not yet built. Covers the pipelines, the schema,
catalog search's use of the new metadata, and how the catalog shows and
filters by it. Builds on
[catalog-search-design.md](catalog-search-design.md), which moved search into
Postgres and deferred filtering to this document.

## 1. Problem

Every drive-index pipeline translates a source's dataset record into a
catalog listing in TypeScript, and today that translation keeps almost
nothing. On the demo instance, all 2,431 NYC listings have a name, one
organization ("City of New York", hardcoded per drive), a last-updated date,
and columns. `description`, `license`, `update_frequency` and `notes` are
empty on every row, even though Socrata's Discovery API returns a
description, the publishing agency, a category, tags and an update frequency
for each dataset.

Five things are missing:

1. A **common metadata schema** rich enough to search and categorize by:
   several levels of organization, domains and tags.
2. A **declarative mapping** from each source's fields onto that schema, so a
   new portal or a corrected field is a config edit, not a code change.
3. A **raw copy of the source record**, so metadata that does not fit the
   common schema is still queryable, and so a new common field can be filled
   later by a data migration instead of a re-crawl.
4. **Search and filters over that metadata.** Search ranks what it can see;
   today it sees one organization per listing and nothing else.
5. **A catalog that shows it.** The list says "City of New York · socrata" on
   every row, and the detail pane shows a pipeline run id but no publisher,
   topic or keyword.

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

Catalog search (`465b72ddb`, `e36e0ae9b`) stays as designed: the
`search_vector` generated column, the trigram index on `display_name`,
`rpc_data_catalog_listings__search`, `useDataCatalogSearch`, the virtualized
list, and the detail pane reading its listing by id. Section 6 extends each
of them.

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
pipeline's service role writes it. The app reads it through a
`DataCatalogDrive` model to label a listing's organization levels.

Labels live on the drive, not on each listing, because they describe the
drive's hierarchy, not one dataset. A drive can override its pipeline's
default labels, which is what lets two Socrata portals label level 1 "City"
and "State".

### 3.3 Search and filter support

**`search_vector`** gains the new columns at weight B, beside the
organization it already weighs there:

| Weight | Fields |
|---|---|
| A | `display_name` |
| B | `organization1_name` … `organization4_name`, `domains`, `tags`, `external_service_name`, `pipeline_name` |
| C | `description`, `notes` |

A generated column may only call immutable functions, and `array_to_string`
is `stable`. A new `public.util__text_array_to_text(text[])`, declared
`immutable`, joins an array with spaces for the two array columns. Joining a
`text[]` depends on nothing but its input, so the declaration is honest.

The local stack runs Postgres 15 (`supabase/config.toml`), which cannot
change a generated column's expression in place. The migration drops
`search_vector` and its index and adds them back, which rewrites the table:
well under a second at this size.

**Indexes for the filters:**

| Index | Serves |
|---|---|
| `btree (organization1_name, organization2_name)` | Filtering by publisher, then by its second level |
| `gin (domains)` | Filtering by topic (`domains && array[...]`) |
| `gin (tags)` | Filtering by keyword |

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
  description: { script: ./mappers/socrataDescription/socrataDescription.ts }
  organization2_name: { from: resource.attribution }
  domains: { script: ./mappers/socrataDomains/socrataDomains.ts }
  tags: { from: classification.domain_tags }
  update_frequency: { script: ./mappers/socrataUpdateFrequency/socrataUpdateFrequency.ts }

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
      organization3_name: { script: ./mappers/socrataOfficeDivision/socrataOfficeDivision.ts }
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
| `script` | `{ script: ./mappers/socrataDomains/socrataDomains.ts }` | What the script's default export returns for the record. The path is resolved relative to the YAML file. |

A script's module default-exports one function:

```ts
export default function socrataDomains(
  record: unknown,
  context: CatalogFieldScriptContext,
): unknown;
```

`context` carries the drive's `baseUrl` and the target field's name. The
return value goes through the same coercion as a `from` value (section 4.4).
A script that throws fails that field for that record only: the field is
null and the run logs a warning naming the script and the dataset.

### 4.3 Mappable fields

The keys `fields` accepts are a fixed list. Any other key fails the config
when it loads:

`description`, `notes`, `license`, `update_frequency`, `canonical_urls`,
`coverage_start_date`, `coverage_end_date`, `organization1_name`,
`organization2_name`, `organization3_name`, `organization4_name`,
`domains`, `tags`.

`display_name` is not mappable. Both pipelines keep it in code: HDX names
a listing after its resource, not its dataset, and Socrata's `resource.name`
is already validated by the Discovery client's schema.

`organization1_name` is required: every drive must map it, through its own
`fields` or the pipeline's. A drive that does not fails the config when it
loads.

### 4.4 Coercion

| Field kind | Accepts | Otherwise |
|---|---|---|
| Text | A string. Blank strings become null. | Null, with a warning. |
| Text array (`domains`, `tags`, `canonical_urls`) | A string (wrapped into a one-item array) or an array of strings. Blanks and duplicates are dropped. An empty result is null. | Null, with a warning. |
| Date (`coverage_*`) | An ISO 8601 string. | Null, with a warning. |

When `organization1_name` comes out null for a record, the pipeline skips
that dataset with a `console.warn`, the way Socrata results that fail
validation are skipped today. It does not fail the drive.

Coercion does not clean markup. A source whose text carries HTML maps it
through a script: Socrata's descriptions do (80 of 300 sampled NYC datasets
contain tags), so `socrataDescription` turns them into plain text, keeping a
link's URL after its text. The catalog renders every value as plain text and
never as HTML.

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

## 6. Search and filtering

### 6.1 `rpc_data_catalog_listings__search`

The RPC gains four filter parameters and returns the organization levels in
place of `external_organization_name` and `pipeline_name`:

```sql
rpc_data_catalog_listings__search(
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_organization1_names text[] default null,
  p_organization2_names text[] default null,
  p_domains text[] default null,
  p_tags text[] default null
) returns table (
  id uuid,
  display_name text,
  organization1_name text,
  organization2_name text,
  organization3_name text,
  organization4_name text,
  is_workspace_loadable boolean,
  is_invalid boolean,
  total_count bigint
)
```

- A null or empty array is no filter. Values within one filter are ORed and
  filters are ANDed: `organization1_name = any(p_organization1_names)`,
  `domains && p_domains`, `tags && p_tags`.
- Filters apply to blank queries too, so choosing a publisher with an empty
  search box lists that publisher's catalog by name.
- Matching, ranking, paging, and privileges are unchanged from
  `catalog-search-design.md` section 4.
- The argument list and the return type both change, so the migration drops
  the old function before creating the new one. `pipeline_name` leaves the
  list row: it is an internal name ("socrata"), not the user's noun.

### 6.2 `rpc_data_catalog_listings__search_facets`

The values a user can filter by, with how many listings each would leave,
for the current query and filters:

```sql
rpc_data_catalog_listings__search_facets(
  p_query text,
  p_organization1_names text[] default null,
  p_organization2_names text[] default null,
  p_domains text[] default null,
  p_tags text[] default null
) returns table (facet text, value text, listing_count bigint)
```

| `facet` | `value` | Counted over |
|---|---|---|
| `organization1` | A level-1 organization | The query and every filter except `p_organization1_names` |
| `organization2` | A level-2 organization | The query and every filter except `p_organization2_names` |
| `organization2_label` | A level-2 label from `data_catalog_drives` | The same listings as `organization2` |
| `domain` | One element of `domains` | The query and every filter except `p_domains` |

Each facet counts over every filter but its own, so an option is never a dead
end and a chosen value's siblings stay visible to switch to. Each facet
returns at most its 100 most common values, by count descending then value.
Tags are not a facet: there are thousands, and a user reaches a tag by
clicking it on a listing (section 7.3). Same privileges as the search RPC.

The query matching repeats the search RPC's two-line condition rather than
calling a shared function: a function with `set search_path` (which every
function here has) is never inlined, so the planner could not use the
`search_vector` or trigram indexes through it. A pgTAP test runs the same
queries and filters through both RPCs and checks that the facet counts sum to
the search's `total_count`, so the two cannot drift unnoticed.

## 7. The catalog

The catalog keeps its shape: a search field over a two-pane browser, a
virtualized list on the left, the selected listing on the right
(`DataCatalogView`). Everything below fits inside that frame and follows
`DESIGN.md` and `docs/design/app-view-layout.md`.

### 7.1 The list row

```text
Active For-Hire Vehicles (FHV)
Taxi and Limousine Commission (TLC) · City of New York
```

- The second line is the listing's two deepest organization levels, deepest
  first, joined by a middot. The deepest level is the one that tells two
  rows from the same portal apart: on NYC every row is "City of New York",
  and the agency is the information. A listing with one level shows one.
- The pipeline name leaves the row.
- The status line ("Not supported yet", "Can't be loaded") is unchanged.

### 7.2 Filters

A filter row sits between the search field and the browser.

```text
⌕ Search by name, publisher, topic, or keyword…
[Publisher ▾] [Agency ▾] [Topic ▾]  Keyword: taxi ×   Clear filters
```

- **Publisher** filters by `organization1_name`. "Publisher" is the user's
  noun for level 1 everywhere in the filters, because level-1 labels differ
  by portal ("City", "State", "Organization") and one filter spans them.
- **The second-level filter** appears only once a publisher is chosen. Its
  label is that publisher's level-2 label from the `organization2_label`
  facet ("Agency"). When the matching drives disagree ("Agency" on
  data.ny.gov, "Department" on health.data.ny.gov), the labels are joined
  with " or ".
- **Topic** filters by `domains`.
- **Keyword** filters by `tags`. It has no dropdown. Clicking a keyword on a
  listing (section 7.3) adds it, and each chosen keyword shows as a
  removable chip in the row.
- Each dropdown is a searchable Mantine `Select`, `size="xs"`, clearable,
  with each option's listing count beside it. Single choice per filter for
  now; the RPC already accepts several.
- **Chrome is withheld until it earns its line.** A dropdown shows only when
  its facet has at least two values, or when it has a value chosen (so it can
  be cleared). With no dropdown and no keyword to show, the row is not
  rendered. "Clear filters" shows only while a filter is set.
- The header count ("Catalog (N)") counts what the filters leave.
- When the filters and query match nothing, the frame's empty message says
  so and offers the action that undoes the cause: "Clear filters" when a
  filter is set, "Clear search" otherwise.
- Filters live in component state alongside the query and reset nothing else
  when they change. A selected listing stays selected while it is still in
  the results.

### 7.3 The detail pane

Placement follows `app-view-layout.md`: values a user scans go in the line
under the title, anything that needs a label goes in a labelled fact group,
and reference material that only an expert reads goes behind a disclosure.

```text
Active For-Hire Vehicles (FHV)                        [+ Add to workspace]
Taxi and Limousine Commission (TLC) · City of New York · Updated Nov 6, 2026

TLC authorized For-Hire vehicles that are active. This list is accurate to
the date and time represented in the Last Date Updated and…   Show more

PUBLISHED BY
City            City of New York
Agency          Taxi and Limousine Commission (TLC)

ABOUT
Topics          [Transportation]
Keywords        [fhv] [for hire] [taxi] [drivers] [active]  +3 more
Updates         Daily
License         …

SOURCE
Original        data.cityofnewyork.us ↗
Download        CSV ↗

COLUMNS …

▸ Technical details
```

- **The facts line** under the title: the organization path (the same rule
  as the list row) and "Updated {date_of_last_update}". Omitted parts leave
  no stray separators.
- **Description**: plain text in a Mantine `Spoiler` capped at about six
  lines, with "Show more" and "Show less". A long description no longer
  pushes the columns off screen.
- **Published by**: one fact per organization level the listing has, each
  labelled with its drive's label for that level. Without a drive (World
  Bank WDI) or without a label, level 1 is "Organization" and a deeper level
  is "Level {n}".
- **About**: Topics and Keywords as chips, then Updates, License, Coverage
  (start to end, when either is set), and Notes. Chips use the small-fill
  step (`neutral.1`) at `radius="sm"`, never blue, per the One Blue Rule.
  Each chip is a button: a topic sets the Topic filter, a keyword adds a
  Keyword filter. That is view-scoped navigation, which the rail allows; it
  is not an action on the record. Keywords show the first eight with
  "+{n} more" to expand.
- **Source**: the source page as a link whose text is its host
  ("data.cityofnewyork.us"), not the full URL, and the download link labelled
  with the listing's format when there is one. Canonical URLs, when set,
  follow.
- **Technical details**, collapsed by default, replaces "Raw metadata": the
  pipeline that indexed the listing, its last run id, when it was last
  indexed, and the source record (`source_metadata`) as formatted JSON.
  The pipeline and run id leave the main fact list, where they were
  internal names in the user's way.
- A fact with no value is omitted, never shown empty, and a group with no
  facts is omitted with its title.

The detail pane reads the drive with `DataCatalogDriveClient.useGetById`
when the listing has a `drive_id`.

### 7.4 Copy

| Where | Text |
|---|---|
| Search placeholder | "Search by name, publisher, topic, or keyword…" |
| Filters | "Publisher", the drive's level-2 label, "Topic", "Keyword: {tag}", "Clear filters" |
| Detail groups | "Published by", "About", "Source", "Technical details" |
| Detail facts | "Topics", "Keywords", "Updates", "License", "Coverage", "Notes", "Original", "Download", "Indexed by", "Last indexed", "Source record" |

Every string goes through Lingui. Organization labels and values come from
the data and are not translated.

## 8. Data flow

1. The run loads `<pipeline>.pipeline.yaml` and builds the mapper.
2. Before crawling a drive, the engine upserts its `data_catalog_drives` row
   (pipeline name, drive key, merged labels) and keeps the row's id.
3. The source client returns each dataset's **raw record** alongside the
   fields it already parses. `SocrataDiscoveryClient` and the CKAN client
   both gain a `sourceRecord` value per result: the object as the API
   returned it, before it is narrowed to the typed shape.
4. The pipeline's `transform` builds the code-computed fields (section 2) as
   it does now, and spreads in `mapper.mapFields(sourceRecord, driveKey)`
   plus `sourceMetadata: sourceRecord`.
5. `buildListingRowFromRelation` writes the new columns and the drive id.
   `listingContractColumns` includes the new columns, so
   `isListingRowUnchanged` compares them and a mapping change rewrites the
   affected rows on the next full run. `source_metadata` is the one new
   column the change check ignores: Socrata's record carries `page_views`
   and `download_count`, which change daily, so counting them would rewrite
   every listing on every full run. A listing's `source_metadata` is
   therefore as of the last write that changed anything else.
6. `search_vector` regenerates from the written row, so search sees the new
   metadata as soon as a listing is written.
7. The catalog searches with the query and filters, reads facets for the
   same, and reads the selected listing and its drive by id.

## 9. Initial mappings

| Field | Socrata | HDX (CKAN) |
|---|---|---|
| Labels | NYC: City, Agency. NY State: State, Agency. NYS Health: State, Department, Office. | Organization |
| `organization1_name` | `value` per drive | `organization.title`, such as "World Health Organization" |
| `organization2_name` | `resource.attribution` (NYC, NY State); `value` "Department of Health" (NYS Health) | None |
| `organization3_name` | Script: the `Dataset-Summary_Office/Division` entry in `classification.domain_metadata` (NYS Health only, where `resource.attribution` is the department itself) | None |
| `description` | Script: `resource.description` as plain text | `notes` |
| `domains` | Script: `classification.domain_category` plus `classification.categories` (the latter is empty on NYC today) | Script: `groups[].title` (countries on HDX) |
| `tags` | `classification.domain_tags` | Script: `tags[].name` |
| `update_frequency` | Script: the first of `Update_Update-Frequency` (NYC) or `Dataset-Summary_Posting-Frequency` (NY State portals) in `classification.domain_metadata` | Script: `data_update_frequency` is a code (`"1"` is every day), translated to words |
| `license` | `metadata.license`, when present (rare on NYC) | `license_title` |

HDX lists one listing per resource, but every mapped field describes the
dataset, so its record is the raw CKAN package (`package_search`'s result),
and each of a package's resource listings stores that same package as its
`source_metadata`. HDX's `display_name` stays in code because it comes from
the resource. The CKAN package schema does not need to widen: the mapper
reads the raw package, not the narrowed `CkanPackage`. HDX's `notes` are
Markdown; they show as plain text for now.

These rows are the starting config. Verify each path against a recorded
response while building, and fix the YAML rather than this table when they
differ.

## 10. Migration and backfill

- The rename must be a hand-edited `alter table ... rename column`.
  `supabase db diff` sees a rename as a dropped column plus a new one, which
  would delete `external_organization_name` on production's World Bank rows.
  Verify the generated migration contains no `drop column` of a data column
  before keeping it. Dropping `search_vector` is expected: it is generated
  and rebuilt in the same migration.
- `rpc_data_catalog_listings__upsert_with_relation_columns` writes the new
  columns.
- Every reader of `external_organization_name` moves to
  `organization1_name`: the app model and parsers, the search result type
  and page builder, the catalog view, the ETL stores, and the tests.
  Historical migrations and the desktop generator's manual migration bodies
  stay as they are.
- The demo instance is backfilled by one full (non-incremental) run of each
  pipeline. Incremental runs only touch datasets that changed, so they would
  leave the new columns empty on every unchanged listing.

## 11. Testing

Red/green TDD, in this order:

| Behavior | Test |
|---|---|
| Config validation: unknown key, unknown field, zero or two kinds, missing required field | `parsePipelineConfig` unit tests |
| `from` paths, including array indexes and missing paths | `buildCatalogFieldPathReader` unit tests |
| `value` constants, and drive `fields` overriding pipeline `fields` | `loadCatalogFieldMapper` unit tests |
| A script used by two fields across 1,000 records is imported once | Same, with a spy on the import |
| A script that throws nulls only its field and warns | Same |
| Coercion for text, arrays and dates | `coerceCatalogFieldValue` unit tests |
| Labels: drive override replaces the default, omitted levels are null | `resolveDriveOrganizationLabels` unit tests |
| Socrata and HDX transforms produce the section 9 fields, and descriptions lose their markup | Each pipeline's transform and mapper tests, against recorded raw records |
| Row building writes the new columns and `drive_id` | `buildListingRowFromRelation` tests |
| The drive row upsert and listing link | Engine and Supabase store tests |
| The rename keeps existing values, and the new columns and policies exist | Database tests (`pnpm test:db`), including a migration upgrade test |
| A tag, a domain, and a level-2 organization make a listing searchable | pgTAP, `rpc_data_catalog_listings__search.test.sql` |
| Each filter narrows results, filters AND together, and apply to a blank query | Same |
| Facets count over every filter but their own, return drive labels, and agree with the search's matches | pgTAP, `rpc_data_catalog_listings__search_facets.test.sql` |
| The list row's organization line, the filter row's withheld chrome, and the detail pane's groups | Vitest and Testing Library, beside each component |
| Choosing a publisher, then its agency, then clicking a keyword narrows the list, and clearing restores it | Playwright, `tests/e2e/data-catalog-filters.spec.ts` |

## 12. Out of scope

- Mapping `pipeline_parquet` pipelines such as World Bank WDI. They write
  one hand-built listing, not a source catalog.
- Multi-select filters and filters in the URL. The RPCs already take arrays,
  so either is a UI change later.
- Rendering HDX's Markdown notes as Markdown.
- A tag facet with counts. Tags are reached from a listing.
