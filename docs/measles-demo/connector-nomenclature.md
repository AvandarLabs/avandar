# Connector nomenclature

The glossary for how Avandar talks about an external data source: what each
layer of it is called, which word is a specific product surface and which is
a generic shape, and how a connector relates to the places a user actually
picks data from. Use these words in code, schema, comments, commits, and
design review. It applies to every connector QETL has or will have: Google
Sheets, Postgres (`feat/postgres-connector`), CKAN, a future Socrata
connector, and `AvandarSupabaseStorage` - the connector Avandar reads its own
pipeline-built and cached Parquet through, every bit as much a connector as
the others even though Avandar operates the drive behind it.

Related: [`qetl-architecture.md`](../qetl-architecture.md) section 2 (QETL's
own vocabulary: relation, `RelationRef`, wrapper, capability) and section 10
(adding a new connector), the
[Postgres connector design](../superpowers/specs/2026-10-13-qetl-postgres-connector-design/2026-10-13-qetl-postgres-connector-design.md)
section 5.4 (where "connection" and "relation" were first fixed as the shared
vocabulary), and the
[open data APIs design](../superpowers/specs/2026-08-19-qetl-open-data-apis-design.md)
(the CKAN acquisition model this file's "drive"/drive-index layer sits above).

## The shape: four layers, not two

A connector's data lives in up to four nested layers. Not every connector
has all four - the bottom two always exist, the middle one only exists when
the connector's own technology has a real account/endpoint layer above the
thing a user picks, and the top one collapses to "the connector itself" for a
connector with only one deployment Avandar will ever talk to.

```text
Layer 0 - service       the protocol/implementation a connector speaks -
            |            CKAN, Socrata, Postgres, Google Sheets,
            |            AvandarSupabaseStorage. One Avandar connector per
            |            service; matches the `api_service` column/type
            |            already in the Open Data Catalog's schema
            |            (`"ckan" | "socrata"`).
Layer 1 - drive         the account or endpoint a connector talks to
            |            (optional: absent when a connection is entered
            |             directly, with nothing to pick it from)
Layer 2 - connection    the reusable, authenticate-or-configure-once parent
            |            a user picks a relation from
Layer 3 - relation      the addressable child that becomes one Avandar
                         dataset - what QETL calls a relation everywhere else
                         (`RelationRef`, `RelationCapabilities`)
```

| Term | What it is | Examples |
| --- | --- | --- |
| **Service** (layer 0) | The protocol or implementation a connector speaks - the thing the rest of this file calls "the connector" when talking about code (see "Connector vs. the drives it talks to" below). One Avandar connector implements exactly one service; a service has many drives. | `ckan`, `socrata`, `postgres`, `google_sheets`, and `avandar_supabase_storage` (the connector reading Avandar's own pipeline-built and cached Parquet). `ckan`/`socrata` are already literal values of the `api_service` column and the `DataCatalogListing.ApiService` type - this layer is not a new concept, just this file's name for a value that already exists in the schema. |
| **Drive** (layer 1) | The account or endpoint that owns many connections. Optional: a connector with no shared account layer has no drive. | A user's Google OAuth grant (`tokens__google`). A Socrata open-data portal's base URL (e.g. `data.cityofnewyork.us`). A CKAN deployment's base URL (e.g. `data.humdata.org`). One specific bucket (or bucket plus path prefix) in Avandar's own Supabase Storage project, for the `AvandarSupabaseStorage` connector (see below) - the one connector whose drives are all Avandar-operated, never a third party's. |
| **Connection** (layer 2) | The reusable, picked-once-used-many-times parent a relation lives under. Infrastructure configuration, not a per-resource shareable item: gated by app role, not by per-resource sharing. | A Postgres server + database (`db_connections` / `db_connections__postgres`). One Google Sheets file, picked from the drive's list. One Socrata or CKAN dataset, picked from the portal. One Open Data Catalog listing, for `AvandarSupabaseStorage`. |
| **Relation** (layer 3) | The addressable child a user ultimately selects - QETL's own word for this (`RelationRef`, `RelationCapabilities`). Becomes one Avandar dataset once a workspace adopts it (see "Relation vs. dataset" below) - it is not one before that. | A Postgres table or view. A tab within a Google Sheets file. A Socrata dataset's own rows (Socrata datasets do not subdivide further in practice, so layer 2 and layer 3 are almost always the same object for Socrata). The one Parquet object a catalog listing names. |

### Relation vs. dataset: related, not interchangeable

A **relation** is the layer-3 granularity itself, regardless of who (if
anyone) owns it. A **dataset** is a relation that a specific workspace has
adopted: an actual `public.datasets` row, whose `owner_id` and
`workspace_id` columns are both `not null` in the schema. There is no such
thing as an unowned dataset - ownership is not optional metadata bolted onto
a dataset, it is what makes something a dataset at all.

This is why an Open Data Catalog listing is a relation, never a dataset, for
as long as it stays an unpicked catalog listing: `data_catalog_listings`
has no `owner_id` or `workspace_id` column, by design - it is shared across
every workspace, owned by none of them. The same CKAN resource becomes a
dataset only at the moment some workspace imports it, which creates its own
`public.datasets` row with that workspace's `owner_id`/`workspace_id`,
entirely separate from the catalog listing it was copied from. This is also
why `DataCatalogListing`/`data_catalog_listings` were named with
"entry," not "dataset," in the first place: calling an unowned, shared row a
"dataset" would misstate the one thing that word is supposed to guarantee.

### Relation column vs. dataset column: the same split, one level down

The relation-vs-dataset ownership distinction above applies again at column
granularity, between a `data_catalog_listings__relation_columns` row and a
`dataset_columns` row:

- A **relation column** is a column of an unowned relation (a Data Catalog
  listing's column). It is **not editable by any user** - it is an inherent,
  fixed property of the source data, discovered by a pipeline, exactly as
  immutable as the listing it belongs to.
- A **dataset column** is a column of an owned `datasets` row. A workspace
  can rename it, redescribe it, or change its data type - it is mutable,
  user-owned metadata, same ownership shape as a dataset itself.

This mirrors exactly why "entry" became "listing" earlier in this file: the
old name (`CatalogListingColumn`) borrowed a word already used for something
with different ownership semantics (`dataset_columns`'s own "column"), which
invited the same confusion this ownership rule exists to prevent. The model
is `DataCatalogRelationColumn` (`data_catalog_listings__relation_columns`)
for exactly this reason, not `DataCatalogListingColumn`.

**Layer 0 never collapses the way layers 1-3 can.** A service always has
exactly one connector implementation; there is nothing above it to merge
into and nothing below it is ever optional in the way a drive or a
connection can be. It is listed as its own layer so the hierarchy is
unambiguous ("which drives does this service have," never "which services
does this drive have"), not because any connector-specific logic keys off it
beyond the `api_service` column that already carries it.

**Layer 2 and layer 3 can be the same object.** When a connection has no
further substructure to pick from, the connection *is* the relation: a
Socrata dataset with no internal sheets, a CKAN resource, an Open Data
Catalog listing read through `AvandarSupabaseStorage`. There is no fourth,
empty layer to represent in code or schema for these - the connection row
and the relation are one and the same thing.

**Layer 1 can exist with nothing discoverable above it.** An uploaded
CSV/XLSX/PDF file, once synced online (see "Not every dataset source type is
a connector" below), is still read back through `AvandarSupabaseStorage` - it
has a drive (the bucket it lives in) and a relation (its own Parquet object),
with connection collapsed into relation exactly as above. What it does *not*
have is anything a user could browse or pick a *different* relation from: the
bucket is not a catalog, nothing is listed, and the one object there exists
only because one specific upload created it. A drive with no searchable index
above it and nothing reusable to pick from is still a drive; it is just not a
connector *in the discovery sense* the rest of this file describes. See
"Not every dataset source type is a connector" for the precise line.

**Layer 1 can be absent.** Today's Postgres connector has no drive: a
`db_connections__postgres` row stores host, port, *and* database together, so
there is no shared "this server, pick a database" entity above it, because v1
intentionally scoped one connection to one already-chosen database (see the
Postgres spec section 5.1). A future multi-database Postgres server picker
would introduce a drive (`host` + credential only) with connections (one per
database) listed under it - but that is new scope, not something today's
schema already has a slot for.

## Connector vs. the drives it talks to

**A connector is one implementation per protocol, not per deployment.**
`PostgresTableWrapper`/`createPostgresConnector` is one connector that can
open a connection to *any* reachable Postgres server; there is no
`AcmeCorpPostgresConnector`. The same is true of a CKAN client (one client,
many CKAN deployments: HDX, a future second instance) and of a Socrata client
(one client, every Socrata-hosted government portal).

**A drive is one specific instance a connector is pointed at.** The user
never chooses a connector by name; they choose a drive. In the Open Data
Catalog this means **the picker lists "NYC Open Data", "Seattle Open Data",
"DC Open Data" - never "Socrata"** - each one a distinct drive (a distinct
portal base URL) that the one Socrata connector code knows how to talk to.
Naming the connector in a user-facing list is the same mistake
`PostgresConnectorImportView`'s own copy rule already warns against for a
different layer (section 7 of the Postgres spec): write for the user's
mental model (the account, the portal, the database they are adding), not
for the internal implementation name.

**A connector's drive does not have to be a third party, and one connector
can have several drives of its own.** `AvandarSupabaseStorage` is a connector
too - the protocol client that reads (and, for uploads, writes) a Parquet
object out of Avandar's own Supabase Storage by bucket and path. Its drives
are buckets (or a bucket plus a path prefix acting as one), and there are
several, each serving a different purpose:

| Drive (bucket / prefix) | Serves | Existing client |
| --- | --- | --- |
| `workspaces` bucket, `{workspaceId}/datasets/{datasetId}.parquet` | An uploaded `csv_file`/`xlsx_file`/`pdf_file` dataset's transcoded Parquet, once synced online | `DatasetParquetStorageClient` |
| A retained-original prefix in the same storage project | The original file bytes for a non-reconstructable source (`pdf_file`) | `DatasetOriginalFileStorageClient` |
| The Open Data Catalog's public bucket | A `pipeline_parquet` catalog listing's Parquet object today; the `api_resource` write-back cache once it exists | `OpenDatasetParquetStorageClient` |
| A public-snapshot bucket | A published dashboard's dataset Parquet, read by anonymous viewers | `PublicDatasetParquetStorageClient` |

Every one of these is a connector-shaped read (an addressable object, fetched
by a client, from a location Avandar itself operates) even though none of
them reaches a third party. There is no second Avandar-operated instance of
this connector a user could ever point it at - unlike every other connector
in this file, which is multi-tenant by nature (many organizations each run
their own Postgres server, Google account, or Socrata portal). That asymmetry
is exactly why its name keeps "Avandar" in it rather than reading just
"Supabase Storage": every other connector name would be misleading if it
named a specific operator, but this is the one connector where the operator
*is* part of what distinguishes it. (Today these four clients are separate,
independently-implemented modules, not one connector with four drives in
code; unifying them is part of what this spec proposes, not something
already built.)

One connector can support many simultaneous drives for one user or
workspace. Google Sheets supports exactly one today (one Google account
connected at a time - tracked as a gap, not a design ceiling: see "Open
questions" below) but the drive/connection/relation split is what makes
adding a second account a new row in an existing table, not a new connector.

## Not every dataset source type is a connector

"Reads through a protocol client" and "is connector-shaped" turn out to be
different questions, answered differently below.

**Ownership is not the test.** `pipeline_parquet` Open Data Catalog listings
are Avandar-owned - the bytes sit in Avandar's own Supabase Storage, written
there by Avandar's own pipeline - and they are still connector-backed,
through `AvandarSupabaseStorage`. So "is this reached through a connector"
cannot be "is this a third party's system," or that case would wrongly fall
on the "not a connector" side.

**Nor is "does acquiring this relation's bytes go through a protocol
client," on its own, the test either - verified, this turns out to be true
of almost every source type, including uploads.** A `csv_file`/`xlsx_file`/
`pdf_file` dataset is, by default, synced online: saving it uploads its
Parquet to the `workspaces` bucket
(`DatasetParquetStorageClient.startDatasetUpload`), and every later query -
including a different team member's, on a different device, who never
touched the upload - reads it back the same way, through
`DatasetParquetWrapper._downloadStoredParquet` calling
`DatasetParquetStorageClient.downloadDataset`. That is a real, addressable,
Avandar-operated location, read through a client, exactly the shape every
other connector-backed read has. A workspace member can reverse this: the
`ToggleOfflineOnlyButton` in `DatasetMetaView` flips a dataset to
`isInCloudStorage: false`, which **deletes** the cloud Parquet (and any
retained original) outright, after which the dataset is queryable only on
the one device still holding it in local IndexedDB (`LocalDataset`) - there
is no connector involved at all in that state, because there is nothing left
anywhere for one to read.

**The actual test is about discovery, not about the read path: is there a
reusable, named, addressable parent that a relation is *picked from*, with a
drive index or a picker UI in front of it?** `pipeline_parquet` passes: the
parent is the Open Data Catalog, a browsable, shared list a user picks a
listing out of. An uploaded file fails, in both its states: online-synced, it
is read through the exact same `AvandarSupabaseStorage` connector as a
catalog listing, but there was never anything to browse or pick from - the
object exists solely because one specific upload created it, nothing else is
listed beside it, and no second relation could ever be chosen from the same
parent. Offline-only, there is not even a connector-shaped read left to
speak of.

So a dataset source type can be connector-backed in the read-path sense
without being connector-backed in the full drive/connection/relation/
drive-index sense this file otherwise describes. Of today's values, split
where one value uses more than one protocol client or state:

| Source type (state) | Protocol client at acquire time | Has drive/connection/relation layering with real discovery above it? |
| --- | --- | --- |
| `open_data` (`pipeline_parquet`) | `AvandarSupabaseStorage` | Yes - the Open Data Catalog is the discoverable parent |
| `open_data` (`api_resource`) | `CkanClient` today, a future `SocrataClient`; falls through to `AvandarSupabaseStorage` on a cache hit once the write-back cache exists | Yes - the CKAN/Socrata portal is the discoverable parent |
| `google_sheets` | the Google Sheets client (`src/clients/google/GoogleDriveClient/`) | Yes - the user's Google Drive is the discoverable parent |
| `postgres_table` | the Postgres driver (`supabase/functions/external-datasets/connectors/postgres/`) | Yes - the connected server's table/view catalog is the discoverable parent |
| `csv_file`, `xlsx_file`, `pdf_file` (`isInCloudStorage: true`, the default) | `AvandarSupabaseStorage` | No - a drive (the bucket) exists, but nothing is listed there to pick a *different* relation from; see "Layer 1 can exist with nothing discoverable above it" above |
| `csv_file`, `xlsx_file`, `pdf_file` (`isInCloudStorage: false`, offline-only) | none | No - and no read-time connector at all; the cloud object was deleted, so only the device holding the local `LocalDataset` cache can query it |
| `virtual` | none | No. Defined by a stored SQL query over relations already resident in the workspace; no storage fetch of any kind, in either state |

This is also why `shared/connectors/` (the rename this spec proposes for
`shared/open-data/`, see below) holds protocol clients only for source types
with real discovery above them - `CkanClient`, a future `SocrataClient`, and
eventually a Google Sheets client if that connector is ever retrofitted onto
this model. A unified `AvandarSupabaseStorageClient` is also proposed there
(see the drive table above) so every `open_data` access kind, and the
upload read/write paths, dispatch to one named client instead of four
separately-implemented ones; that unification does not make uploads
discoverable, it only names the client correctly. CSV/XLSX/PDF parsing and
`virtual` dataset logic stay exactly where they already live, under
`src/clients/datasets/source-datasets/` - connector-ness is about discovery,
not about which runtime module happens to read Supabase Storage.

## Drive index: a searchable directory over one drive's relations

A **drive index** is a searchable index of the relations inside *one* drive,
so a user (or Avandar's own picker UI) can answer "is there a dataset named
`cdc-outbreaks` on NYC Open Data?" without a live round trip to the source
for every keystroke. It is scoped to a single drive, not to "does a Chicago
open-data portal exist at all" - that is a different question, about which
*drives* exist for a service, not which relations exist inside one. Socrata's
own federated catalog (`api.us.socrata.com/api/catalog/v1`) answers that
different question today; this file does not propose a name for it, because
nothing in this spec's build scope indexes it.

A drive index is not a new kind of QETL relation and does not change how a
relation is acquired once picked. It answers a different question -
"what *can* I connect to and where is it" - that is logically upstream of
acquisition, the same way CKAN's `package_show` metadata call already is: a
discovery step that ends with the user creating an ordinary `datasets` row,
after which QETL acquires that row exactly like any other dataset.

A drive index can be built one of three ways, and a connector may mix them:

| Shape | When to use it | Example |
| --- | --- | --- |
| **Prebuilt** | The drive has too much to search live, but is small enough (or a filterable slice of it is) to index ahead of time. Built by the Avandar **pipeline** - a scheduled, out-of-band process, never app or edge-function runtime code - and the materialized index (a SQLite file, a JSON or CSV manifest) is stored in Supabase storage for every workspace to query. | The `hdx` and `socrata` pipelines (section 6 of `open-data-catalog-architecture.md`): each enumerates its own service's configured drives and writes one `data_catalog_listings` row per readable relation it finds. |
| **Search-time (live)** | The drive is too large or too dynamic to prebuild at all, or it is scoped to one user's own private account rather than a shared public universe. | Google Sheets: layer 2 (which files exist under a user's Drive) is searched live through the Google Picker UI at pick time, because it is specific to that user's own account and changes whenever they do. HDX itself is prebuilt despite its size: the `hdx` pipeline pages `package_search` 100 datasets at a time, oldest-modified first, and resumes incrementally. |
| **Hybrid** | Part of one drive's relations are worth prebuilding, the rest are not. | Not built for any drive today. A CKAN deployment too large to enumerate in full could prebuild one organization's relations (via `package_search`'s `organization` filter) and leave the rest unindexed. |

"Prebuild" always means the same thing wherever this file or a design spec
uses it: **built by the Avandar pipeline, on a schedule, never by frontend or
edge-function runtime code, with its output materialized into Supabase
storage** - the same meaning the word already carries for a
`pipeline_parquet` Open Data Catalog listing (`apps/pipeline-server/pipelines/`).
A drive index is a new kind of pipeline artifact, not a new way of
loading one.

## One pipeline per service, named after the service, not the protocol

A drive-index pipeline (above) is named and scoped per **service** (layer
0), never per protocol, and never shared across unrelated services:

- **A pipeline's output always includes a drive index, and optionally
  prebuilt relations.**
- A pipeline is named after the service it talks to, not the protocol: the
  `hdx` pipeline, not a `ckan` pipeline. CKAN is an openly-installable
  protocol - anyone can stand up their own deployment - so "CKAN" names
  *how* a service talks, not *which* service Avandar is pointed at. HDX
  (the Humanitarian Data Exchange, `data.humdata.org`) is the actual
  service, which happens to run CKAN as its software.
- Socrata gets one pipeline, `socrata`, because Socrata genuinely is one
  federated service with many portals (drives) underneath it - there is a
  real cross-drive Discovery API above any one portal (see "Connector vs.
  the drives it talks to" above). CKAN has no such federated layer: each
  deployment is its own island, so a second CKAN deployment, if Avandar
  ever adds one, gets its **own** separate pipeline rather than joining
  `hdx`'s drive list, even though both speak the same protocol.
- This is why `hdx`'s own drive config (`hdxDrive.ts`) is a single
  optional value, not a `ConfiguredDrive[]` registry: a list implies a
  second drive this pipeline will never have. `socrata`'s registry
  (`configuredDrives.ts`) stays an array, because Socrata genuinely has
  many independent drives.

## Open Data Catalog, "catalog", and "drive index" are three different words

These three are easy to conflate and must not be:

- **Open Data Catalog** (capitalized, a proper noun) is one specific Avandar
  product surface: the `data_catalog_listings` table plus its browsing
  UI, listing every freely available public dataset Avandar has vetted and
  made addable to any workspace, regardless of which connector or protocol
  serves it underneath (`pipeline_parquet` today, CKAN's `api_resource` today,
  a future Socrata `api_resource`). It is shared across every workspace, not
  workspace-scoped. Its rows are **listings** (`DataCatalogListing`) -
  see "Relation vs. dataset" above for why a listing is a relation, not a
  dataset, until some workspace adopts it.
- **A drive index** (lower case, a generic shape, defined above) is a
  per-drive search index over one drive's own relations. It exists
  independently of the Open Data Catalog and is not limited to public data: a
  user's own Google Sheets picker is a (search-time) drive index over their
  private drive, with nothing "open data" about it.
- **"Catalog"** used alone, with neither qualifier, is ambiguous and should be
  avoided in code, schema, and docs from here on. Say "the Open Data Catalog"
  or "the <drive>'s drive index" - never bare "catalog" - once both concepts
  exist side by side. `data_catalog_listings` and
  `DataCatalogListing` keep "catalog" in their own names because they
  name the Open Data Catalog specifically, not because "catalog" alone is
  ambiguous there - the `open_data`/`OpenData` qualifier is what resolves it.

A single Open Data Catalog listing can be thought of as one hand-curated row
copied out of some drive's drive index (or, for `pipeline_parquet` rows, out
of no drive index at all - a one-off pipeline artifact with no live drive
behind it). The Open Data Catalog does not have to expose a drive's full
index to get a listing into it.

## Do and don't

**Do**

- Say "service" for layer 0, "drive" for layer 1, "connection" for layer 2,
  "relation" for layer 3. Relation is already QETL's word (`RelationRef`); do
  not coin a second one.
- Say "the Socrata connector" for the implementation, and name the specific
  drive ("NYC Open Data") everywhere a user sees it.
- Say "prebuilt drive index" or "search-time drive index" rather than bare
  "drive index" when the distinction matters to the sentence.
- Say "the Open Data Catalog" (capitalized) for the product surface, never
  bare "catalog."
- Call `AvandarSupabaseStorage` a connector, same as any other. Ownership
  does not disqualify it.
- Keep "reads through a protocol client" and "is connector-shaped, with real
  discovery above it" as two separate questions. An online-synced upload is
  true on the first and false on the second; say which one you mean.
- Say "relation" for the layer-3 granularity itself (QETL's internal word:
  `RelationRef`, `RelationCapabilities`) regardless of whether it is owned by
  a workspace yet. Say "dataset" only once that relation has been adopted
  into a specific workspace as an actual `public.datasets` row - that table's
  `owner_id` and `workspace_id` are both `not null`, so "dataset" always
  carries ownership that bare "relation" does not. They describe the same
  granularity, not the same object: a relation becomes a dataset the moment a
  workspace adopts it, and is not one before that. Don't treat a mention of
  "dataset" as layer-2/connection-adjacent, and don't call an unowned
  relation a "dataset" just because it is the same granularity as one.

**Don't**

- Don't decide whether something is a connector by asking who owns the
  system behind it, or by asking whether acquiring it touches a protocol
  client at all. Ask whether a relation is *discoverable* - picked from a
  reusable, listed parent, not just read from an addressable one ("Not every
  dataset source type is a connector" above). An online-synced upload reads
  through `AvandarSupabaseStorage` exactly like a catalog listing does, and
  still is not connector-shaped, because nothing was ever listed to pick it
  from.

- Don't name a connector's technology in user-facing copy ("Socrata",
  "CKAN"). Name the drive the user picked.
- Don't call layer 1 "the catalog." It is the drive; "catalog" is reserved for
  the Open Data Catalog and "drive index" is reserved for one drive's own
  search index over its relations.
- Don't model a drive index as a QETL relation kind. It is a discovery step
  that produces a `datasets` row for QETL to acquire afterward, not something
  QETL itself queries.

## Open questions

Tracked here rather than silently resolved, pending
[`open-data-catalog-architecture.md`](open-data-catalog-architecture.md):

1. Avandar supports exactly one connected Google account per user today, so
   Google Sheets has no drive-picker UI yet - only one implicit drive. Adding
   a second connected account is the first real test of whether "drive" needs
   its own table (a `google_drives` or `tokens__google` becoming
   one-to-many) or stays implicit until that lands.
2. Whether a connector (a Postgres server, specifically) should ever grow a
   drive layer (host + credential only, many databases listed under it), or
   whether one-database-per-connection stays the permanent shape for that
   connector.
