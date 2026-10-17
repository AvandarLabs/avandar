# Data catalog: next-steps handoff

**For a fresh session with no context on this conversation.** This is a
planning brief, not an implementation plan - load the `writing-plans` skill
(or equivalent) and write a proper task-by-task plan from this before
touching code. Read `docs/measles-demo/connector-nomenclature.md` and
`docs/measles-demo/open-data-catalog-architecture.md` first; both already
define the vocabulary this brief uses (service, drive, connection, relation,
drive index, dataset vs. relation ownership) and were updated immediately
before this handoff was written.

Five pieces of work, independent enough to sequence in any order but touching
overlapping files, so do them one at a time with full verification
(`pnpm type-check`, `pnpm lint`, the relevant test suites, `pnpm test:db`)
between each:

1. Split the monolithic open-data pipeline into one pipeline per service.
2. Rename the catalog's "dataset column" child table/model to "relation
   column", and document why.
3. Replace every bare "catalog"/"Catalog" with "data_catalog"/"DataCatalog".
4. Drop the `__open_data` suffix from the main catalog table - it reads as a
   satellite of a `catalog_listings` parent that does not exist.
5. Update `connector-nomenclature.md` for the relation-column concept.

Items 2-4 all touch the same table and model, so do them together as one
pass rather than three separate schema migrations.

---

## 1. One pipeline per service, not one pipeline for every service

### The problem

`apps/pipeline-server/pipelines/open-data-catalog-listings/` is one
monolithic pipeline that enumerates every configured drive across two
different services (CKAN and Socrata) in a single `run()`. That is the wrong
shape going forward: **the new convention is one pipeline per service.**

### Why "HDX pipeline", not "CKAN pipeline"

CKAN is an openly-installable open-source API - anyone can stand up their own
CKAN deployment. "CKAN" is a **protocol**, not a service Avandar is pointed
at. The actual service is **HDX** (the Humanitarian Data Exchange, a specific
organization's specific deployment at `data.humdata.org`), which *happens to
run* CKAN as its software. Compare: Socrata is both the protocol and a real
multi-tenant vendor whose one hosted service fronts thousands of portals
(drives) - there is a genuine federated "Socrata" service layer above any one
portal. CKAN has no such federated layer; each deployment is its own
island. So:

- A pipeline is named after the **service** it talks to, not the protocol.
- HDX gets its own pipeline because it is a specific service.
- A second CKAN deployment, if Avandar ever adds one, gets **its own**
  separate pipeline (e.g. `some-other-org`) - it does **not** join the HDX
  pipeline's drive list, because it is a different service that merely
  happens to speak the same protocol.
- Socrata gets one pipeline because Socrata genuinely is one service with
  many drives (portals) underneath it - the existing multi-drive
  `CONFIGURED_DRIVES` registry shape is correct *for Socrata specifically*,
  just not as a shared registry across unrelated services.

### The new convention

> **A pipeline's output always includes a drive index, and optionally
> prebuilt relations.**

- **Drive index**: the lightweight, searchable listing of what exists in a
  drive. Concretely, today this means writing `api_resource`-kind
  `catalog_listings__open_data` rows (table name changing - see section 4) -
  metadata only, no bytes. The resource itself is still fetched live on
  first query via the existing cache-aside path
  (`acquireOpenDataResourceWithCache`), completely unchanged by this work.
- **Prebuilt relations** (optional): the pipeline additionally extracts,
  transforms, and loads actual data into Parquet ahead of time -
  `pipeline_parquet`-kind rows. Only `world-bank__wdi` does this today.

Target shape:

| Pipeline | Service | Drives | Output |
| --- | --- | --- | --- |
| `hdx` (rename of today's monolith, HDX-only) | HDX | One hardcoded drive (`data.humdata.org`) | One drive index. No prebuilt relations. |
| `socrata` (new, split out) | Socrata | A hardcoded list of portals, each independently enabled | One drive index per enabled drive. No prebuilt relations. |
| `world-bank__wdi` (already exists, unchanged in shape) | World Bank WDI | One implicit drive (the WDI API has no portal/picker layer) | One drive index **and** prebuilt relations (`pipeline_parquet`, already built). |

### What this means concretely for today's code

Everything under `apps/pipeline-server/pipelines/open-data-catalog-listings/`
needs to split in two:

- **`hdx` pipeline**: owns `CkanDiscoveryClient`/`CkanClient` usage, a
  single hardcoded drive (no need for a `ConfiguredDrive[]` registry if
  there is only ever one HDX drive - confirm with the reasoning above
  before deciding whether a registry is still the right shape for exactly
  one entry, or whether a single hardcoded constant is more honest).
  `makeCkanListingRowsFromPackage` moves here.
- **`socrata` pipeline**: owns `SocrataDiscoveryClient` usage and the
  existing multi-drive `ConfiguredDrive[]`/`CONFIGURED_DRIVES` registry
  shape (this part of today's `configuredDrives.ts` is the right model for
  Socrata specifically). `makeListingRowFromSocrataResult` moves here.
- **`upsertCatalogListingRows`**: logic is identical for both (same target
  table, same upsert shape) - this is a legitimate shared helper. Decide
  where it lives: a `pipelines/shared/` module (there is already
  `pipelines/shared/createSupabaseAdminClient.ts` from this session) is the
  natural home, not duplicated into each pipeline.
- **`CONFIGURED_DRIVES` today ships empty** (not a placeholder - HDX was
  tried as a seed drive and removed: its real catalog is 42,000+ datasets,
  and this pipeline's current no-retry/no-backoff design hits HDX's rate
  limiter after ~150 sequential requests; see
  `open-data-catalog-architecture.md` section 7, deferred item 6). **This
  constraint is not fixed by splitting the pipeline.** Splitting doesn't
  make HDX enumerable - the retry/backoff gap is still open. Don't
  re-seed HDX as part of this work unless retry/backoff is built too; that
  is explicitly out of scope here, same as it was last time.
- `run.ts`'s known `Promise.all` fail-fast gap (one drive's failure discards
  every other drive's rows) is Socrata's problem specifically once split
  out (HDX has only one drive, so the gap is moot there). Worth fixing
  while touching this file, or at minimum re-documenting against the
  Socrata pipeline specifically.
- `@pipelines/open-data-catalog-listings` import alias references need to
  move to whatever the new pipeline directory names turn out to be
  (`@pipelines/hdx`, `@pipelines/socrata`, or similar - pick names
  consistent with `@pipelines/world-bank__wdi`'s existing convention).

---

## 2. Dataset column vs. relation column

### The renaming

`catalog_listings__dataset_column` (table), `CatalogListingColumn` (model,
`shared/models/catalog-listings/CatalogListingColumn/`),
`CatalogListingColumnClient` (`src/clients/catalog-listings/`) all rename to
**relation column**, not "dataset column". Proposed:

- Table: `catalog_listings__dataset_column` -> something like
  `data_catalog_listings__relation_columns` (apply section 4's table-name
  flattening first, then this rename, so the final suffix is
  `__relation_columns` hanging off whatever the flattened parent table ends
  up being named).
- Model: `CatalogListingColumn` -> `DataCatalogRelationColumn` (apply
  section 3's bare-"Catalog" sweep to get the `DataCatalog` prefix).
- Client: `CatalogListingColumnClient` -> `DataCatalogRelationColumnClient`.
- Column `catalog_listing_id` on this table -> rename to match whatever the
  parent table's own primary-key-referencing convention ends up being after
  section 4 (likely stays `catalog_listing_id` or becomes
  `data_catalog_listing_id` - decide for consistency with the FK column
  already renamed on `datasets__open_data` this session).

### Why: a dataset column is owned; a relation column is not

This is a new instance of the ownership distinction
`connector-nomenclature.md` already documents for "relation vs. dataset"
(added this session - read that section first). Extend it:

- A **dataset column** (the existing, unrelated `dataset_columns` table used
  by `datasets`) is tied to a workspace's adopted dataset. A user can
  rename it, redescribe it, or change its data type - it is mutable,
  user-owned metadata, same ownership shape as a dataset itself.
- A **relation column** is a property of an unowned catalog listing. It is
  **not editable by any user** - it is an inherent, fixed property of the
  source data, discovered by a pipeline, exactly as immutable as the
  listing it belongs to. Today's schema file's own comments already imply
  this ("This value should never be changed, it is an inherent property of
  the column") - the rename makes that explicit in the name instead of only
  in a comment.

This mirrors exactly why "entry" became "listing" this session: the old
name borrowed a word already used for something with different ownership
semantics, which invited exactly the kind of confusion
`connector-nomenclature.md`'s new ownership rule now exists to prevent.

---

## 3. Replace bare "catalog"/"Catalog" with "data_catalog"/"DataCatalog"

### The problem

"Catalog" used alone is reserved as ambiguous in
`connector-nomenclature.md` already ("Say 'the Open Data Catalog' ... never
bare 'catalog'"), but that rule was written with prose in mind, not
identifiers. Several identifiers still say bare "Catalog" with no
qualifier, which will become genuinely ambiguous once Avandar has more than
one kind of catalog (a dashboard catalog, a map catalog, etc. - anticipated,
not built yet). Qualify now, while there is only one rename to do instead of
an archaeology project later.

### Known offenders (grep for more - this list is a starting point, not
exhaustive)

- `CatalogListingColumn` / `CatalogListingColumnClient` - renaming anyway
  per section 2, fold the `DataCatalog` qualifier into that rename
  (`DataCatalogRelationColumn`).
- `shared/models/catalog-listings/` directory (kebab-case, bare "catalog")
  -> `shared/models/data-catalog-listings/`.
- `src/clients/catalog-listings/` -> `src/clients/data-catalog-listings/`.
- `OpenDataCatalogListing` model, `OpenDataCatalogListingClient`,
  `OpenDataCatalogListingDetail`, `OpenDataCatalogListingList` - decide
  whether "OpenData" survives as a prefix or is replaced by "DataCatalog"
  per section 4's reasoning (most likely: `OpenDataCatalogListing` becomes
  `DataCatalogListing`, dropping "OpenData" - see section 4, this is really
  one combined rename with that section, not two).
- SQL comments/docstrings anywhere they say bare "catalog" (e.g. "Links a
  catalog listing...", "the column catalog is populated by the backend").

### Explicitly NOT in scope

"Open Data Catalog" (capitalized, the product surface / proper noun) already
carries a qualifier and is not "bare catalog" in the sense this task means.
Don't rename the product-facing surface name unless a separate, explicit
decision says to - this task is about identifiers and prose that have *no*
qualifier at all, not about revisiting an already-qualified name.

---

## 4. Drop the `__open_data` suffix - there is no `catalog_listings` parent

### The problem, in the user's own words

> Why do we have `catalog_listings__open_data.sql` but we have no
> `catalog_listings`? That feels unnecessary to add the `__open_data`
> satellite table without a parent table. So really the `__open_data` *is*
> the parent table. We have no satellite table.

The `tablename__subtype` naming convention elsewhere in this schema (e.g.
`datasets__csv_file`, `db_connections__postgres`) means "a satellite table
extending a real parent table of the base name." `catalog_listings__open_data`
was never that - there is no bare `catalog_listings` table it extends, and
(per section 3) there is currently only one kind of data catalog anyway. The
`__open_data` suffix is pure noise implying a parent/child split that was
never built and isn't needed yet.

### The fix

Combine with section 3's bare-catalog qualifier: the table becomes
**`data_catalog_listings`** (no suffix at all), and the model becomes
**`DataCatalogListing`** (dropping "OpenData" as a prefix entirely, per the
user's explicit naming: *"Let's explicitly say 'data_catalog_listings' (and
`DataCatalogListing` types)."*).

If a second kind of data catalog is ever built, that is the point to decide
how to disambiguate (a new qualifying suffix, a discriminator column, a
genuinely separate table) - don't speculatively build that now.

### Everything this touches

This is the same table renamed twice in one session already
(`catalog_entries__open_data` -> `catalog_listings__open_data` this
session), so the blast radius is well understood - repeat the same process:

- `supabase/schemas/10.catalog_listings__open_data.sql` -> rename file and
  table to `supabase/schemas/10.data_catalog_listings.sql` /
  `data_catalog_listings`.
- Both enum types (`catalog_listings__open_data__access_kind`,
  `catalog_listings__open_data__api_service`) rename their prefix to match.
- `supabase/schemas/20.catalog_listings__dataset_column.sql` (also renaming
  per section 2) - its FK target table name changes too.
- `supabase/schemas/20.datasets__open_data.sql`'s `catalog_listing_id`
  column - FK target changes, decide whether the column name itself should
  change too (maybe not, if it already reads fine as "the data catalog
  listing this came from" without literally saying "data_catalog").
- `supabase/schemas/70.rpc_datasets__add_open_data_dataset.sql` - touches
  this table, will need its own migration again (same as this session's
  `rename_add_open_data_dataset_catalog_entry_param` migration).
- `shared/models/catalog-listings/OpenDataCatalogListing/` -> rename
  directory and every file inside it.
- `src/clients/catalog-listings/OpenDataCatalogListingClient.ts`.
- `src/views/DataManagerApp/DataImportView/OpenDataCatalogView/` and its
  `OpenDataCatalogListingDetail`/`OpenDataCatalogListingList`
  subdirectories - decide whether `OpenDataCatalogView` itself renames too
  (it's the view folder name, arguably also "bare-ish" once the model
  underneath it is `DataCatalogListing` - but see the "explicitly not in
  scope" note in section 3 about the product-facing "Open Data Catalog"
  surface name; the *view folder* is an implementation detail, not the
  product name, so renaming it doesn't touch the product surface).
- `shared/types/database.types.ts` - regenerate, don't hand-edit.
- `apps/desktop/sync/syncable-tables.ts` - add
  `catalog_listings__open_data` and `catalog_listings__dataset_column` (this
  session's names) to `DEPRECATED_TABLES` for the same reason this session
  added `catalog_entries__open_data`/`catalog_entries__dataset_column` -
  the Postgres migration history still contains those names, and the
  SQLite migration generator needs to recognize them as
  syncable-at-the-time.
- pgTAP tests: `supabase/tests/database/catalog_listings_open_data_access.test.sql`
  (rename again), `supabase/tests/database/permissions/exact_data_api_grants.test.sql`.
- Any TypeScript referencing `catalog_listings__open_data`,
  `OpenDataCatalogListing`, or the `catalog-listings` directory path.

### Critical lesson from this session - read before writing the migration

**`supabase db diff` cannot detect a rename.** Generating the migration the
normal way (`pnpm db:reset && pnpm db:new-migration <name>`) will produce a
migration that **drops and recreates both tables**, destroying every
existing row, and may also emit a broken `NOT NULL` column add with no
default on dependent tables. This session hit exactly this and had to
hand-write the migration instead, using `alter table ... rename to ...`,
`alter type ... rename to ...`, `alter table ... rename column ...`, and
`alter table ... rename constraint ...` (which also renames the constraint's
backing index automatically) to preserve data and privileges. Do the same
here: generate the migration first to see what gets proposed, confirm it is
destructive, then replace its contents with a hand-written rename sequence.
Verify with `supabase db reset` followed by `PGSSLMODE=disable supabase db
diff` - it should show zero drift for anything you touched (ignore
pre-existing, unrelated `analytics.*` view drop/recreate noise - that is a
known, unrelated artifact of `db diff` on this repo, not something this work
introduces).

One exception this session also hit: `alter index ... rename to ...` is not
recognized by the desktop SQLite migration generator's statement classifier,
and SQLite has no `ALTER INDEX` at all. Use `drop index` + `create unique
index` instead wherever an index needs renaming - harmless for an index
specifically, since it holds no data of its own, unlike a table.

After the Postgres migration is correct, run
`pnpm desktop:sqlite:gen-migrations` (fails loudly and tells you exactly
which table names are missing from `syncable-tables.ts` if you forget the
`DEPRECATED_TABLES` entries) and `pnpm desktop:sqlite:check-migrations`
(should report "clean: no drift" when done).

---

## 5. `connector-nomenclature.md` updates

Add a short, explicit subsection (near "Relation vs. dataset: related, not
interchangeable", added this session) covering:

- **Relation column vs. dataset column**: a relation column is a column of
  an unowned relation/listing - fixed, not editable by any user, discovered
  by a pipeline. A dataset column is a column of an owned `datasets` row -
  editable by whoever owns the dataset (rename, redescribe, retype). Same
  ownership split as relation-vs-dataset itself, just one level down (at
  the column granularity instead of the whole-row granularity).
- Update any example or cross-reference in that file that still says
  `catalog_listings__open_data`, `OpenDataCatalogListing`, or
  `catalog-listings` once sections 3-4 land, so the doc doesn't go stale
  the moment this work ships (this file has now been kept in sync with the
  schema twice in one session - keep that pattern going).
- If the per-service pipeline convention from section 1 is itself worth
  codifying as nomenclature (not just an implementation detail), consider
  whether this file or `open-data-catalog-architecture.md` is the better
  home for "one pipeline per service, drive index always, prebuilt
  relations optional" as a named rule future pipelines should follow.

---

## Suggested sequencing

1. Sections 2-4 together as one schema/model/client rename pass (they share
   a migration and a model directory - doing them separately means writing
   the same migration twice).
2. Section 5 (nomenclature doc) immediately after, while the rename is
   fresh - same pattern as this session.
3. Section 1 (pipeline split) last, since it's purely a TypeScript/pipeline
   reorganization with no schema dependency, and it needs to import the
   final renamed model/types from steps 1-2 either way.

Verify after each step with: `pnpm type-check`, `pnpm lint`,
`pnpm vitest run` on the touched areas, and `pnpm test:db` for anything
schema-related. Commit each concern separately, same granularity as this
session's four commits (schema, TypeScript, i18n if any UI copy changes,
docs) - don't bundle unrelated pre-existing dirty files from other features
into these commits (check `git status` against what was dirty *before* this
work started, same diligence this session applied).
