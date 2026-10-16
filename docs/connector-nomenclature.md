# Connector nomenclature

The glossary for how Avandar talks about an external data source: what each
layer of it is called, which word is a specific product surface and which is
a generic shape, and how a connector relates to the places a user actually
picks data from. Use these words in code, schema, comments, commits, and
design review. It applies to every connector QETL has or will have: Google
Sheets, Postgres (`feat/postgres-connector`), CKAN, and a future Socrata
connector.

Related: [`qetl-architecture.md`](qetl-architecture.md) section 2 (QETL's own
vocabulary: relation, `RelationRef`, wrapper, capability) and section 10
(adding a new connector), the
[Postgres connector design](superpowers/specs/2026-10-13-qetl-postgres-connector-design/2026-10-13-qetl-postgres-connector-design.md)
section 5.4 (where "connection" and "relation" were first fixed as the shared
vocabulary), and the
[open data APIs design](superpowers/specs/2026-08-19-qetl-open-data-apis-design.md)
(the CKAN acquisition model this file's "drive"/metacatalog layer sits above).

## The shape: three layers, not two

A connector's data lives in up to three nested layers. Not every connector
has all three - the lower two always exist, the top one only exists when the
connector's own technology has a real account/endpoint layer above the thing
a user picks.

```text
Layer 0 - drive        the account or endpoint a connector talks to
            |           (optional: absent when a connection is entered
            |            directly, with nothing to pick it from)
Layer 1 - connection   the reusable, authenticate-or-configure-once parent
            |           a user picks a relation from
Layer 2 - relation     the addressable child that becomes one Avandar
                        dataset - what QETL calls a relation everywhere else
                        (`RelationRef`, `RelationCapabilities`)
```

| Term | What it is | Examples |
| --- | --- | --- |
| **Drive** (layer 0) | The account or endpoint that owns many connections. Optional: a connector with no shared account layer has no drive. | A user's Google OAuth grant (`tokens__google`). A Socrata open-data portal's base URL (e.g. `data.cityofnewyork.us`). A CKAN deployment's base URL (e.g. `data.humdata.org`). |
| **Connection** (layer 1) | The reusable, picked-once-used-many-times parent a relation lives under. Infrastructure configuration, not a per-resource shareable item: gated by app role, not by per-resource sharing. | A Postgres server + database (`db_connections` / `db_connections__postgres`). One Google Sheets file, picked from the drive's list. One Socrata or CKAN dataset, picked from the portal. |
| **Relation** (layer 2) | The addressable child a user ultimately selects as one Avandar dataset - QETL's own word for this (`RelationRef`, `RelationCapabilities`). | A Postgres table or view. A tab within a Google Sheets file. A Socrata dataset's own rows (Socrata datasets do not subdivide further in practice, so layer 1 and layer 2 are almost always the same object for Socrata). |

**Layer 1 and layer 2 can be the same object.** When a connection has no
further substructure to pick from, the connection *is* the relation: a CSV or
XLSX upload, a Socrata dataset with no internal sheets, a CKAN resource. There
is no third, empty layer to represent in code or schema for these - the
connection row and the relation are one and the same thing.

**Layer 0 can be absent.** Today's Postgres connector has no drive: a
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

One connector can support many simultaneous drives for one user or
workspace. Google Sheets supports exactly one today (one Google account
connected at a time - tracked as a gap, not a design ceiling: see "Open
questions" below) but the drive/connection/relation split is what makes
adding a second account a new row in an existing table, not a new connector.

## Not every dataset source type is a connector

A connector exists only where there is an external system Avandar does not
own, reached through a protocol client (`qetl-architecture.md` section 2.1).
Of today's `datasets.source_type` values, that is exactly three:
`google_sheets`, `postgres_table`, and `open_data` (CKAN today, Socrata once
it exists). The rest are not connectors, and nothing above (drive,
connection, relation, metacatalog) applies to them:

| Category | Source types | Has a protocol client? | Layers above the dataset |
| --- | --- | --- | --- |
| **Connector-backed** | `google_sheets`, `postgres_table`, `open_data` | Yes | Relation always; connection and drive where the technology has one (see the table above) |
| **Uploaded** | `csv_file`, `xlsx_file`, `pdf_file` | No - the "source" is bytes the user handed over directly, already sitting in Avandar's own Storage | None. The uploaded file is simultaneously its own connection and its own relation, and there is no drive: nothing is picked *from* anything, because nothing external is ever addressed again after the upload completes |
| **Derived** | `virtual` | No - defined by a stored SQL query over relations already resident in the workspace | None. There is no external reach at all, not even once |

This is also why `shared/connectors/` (the rename this spec proposes for
`shared/open-data/`, see below) only ever holds protocol clients for the
first category - `CkanClient`, a future `SocrataClient`, and eventually a
Google Sheets client if that connector is ever retrofitted onto this model.
It is not where CSV/XLSX/PDF parsing or `virtual` dataset logic belongs; that
code already lives correctly under `src/clients/datasets/source-datasets/`
and has nothing to do with connectors at all.

## Metacatalog: a searchable directory over a connector's own universe

A **metacatalog** is a searchable index of a connector's available drives
and/or relations, so a user (or Avandar's own picker UI) can answer "does a
Chicago open-data portal exist?" or "is there a dataset named
`cdc-outbreaks`?" without a live round trip to the source for every
keystroke.

A metacatalog is not a new kind of QETL relation and does not change how a
relation is acquired once picked. It answers a different question -
"what *can* I connect to and where is it" - that is logically upstream of
acquisition, the same way CKAN's `package_show` metadata call already is: a
discovery step that ends with the user creating an ordinary `datasets` row,
after which QETL acquires that row exactly like any other dataset.

A metacatalog can be built one of three ways, and a connector may mix them:

| Shape | When to use it | Example |
| --- | --- | --- |
| **Prebuilt** | The source has too much to search live, but is small enough (or a filterable slice of it is) to index ahead of time. Built by the Avandar **pipeline** - a scheduled, out-of-band process, never app or edge-function runtime code - and the materialized index (a SQLite file, a JSON or CSV manifest) is stored in Supabase storage for every workspace to query. | Socrata: thousands of government portals, each with its own dataset listing. Prebuilding every portal's full catalog is possible for the scope Avandar actually wants (for example, US portals only, until there is a reason to index Europe too) - a **hybrid** metacatalog: serve the prebuilt slice directly, and fall back to a live portal search for anything outside it. |
| **Search-time (live)** | The source is too large or too dynamic to prebuild at all, or it is scoped to one user's own private account rather than a shared public universe. | Google Sheets: layer 1 (which files exist under a user's Drive) is searched live through the Google Picker UI at pick time, because it is specific to that user's own account and changes whenever they do. CKAN: a deployment the size of HDX is queried live (`package_search`) and any result worth re-showing is cached, never fully pre-indexed. |
| **Hybrid** | Part of the universe is worth prebuilding, the rest is not. | Socrata, scoped to one region today with room to grow: prebuilt for the indexed region, live API search for everything outside it. |

"Prebuild" always means the same thing wherever this file or a design spec
uses it: **built by the Avandar pipeline, on a schedule, never by frontend or
edge-function runtime code, with its output materialized into Supabase
storage** - the same meaning the word already carries for a
`pipeline_parquet` Open Data Catalog entry (`apps/pipeline-server/pipelines/`).
A metacatalog is a new kind of pipeline artifact, not a new way of
loading one.

## Open Data Catalog, "catalog", and "metacatalog" are three different words

These three are easy to conflate and must not be:

- **Open Data Catalog** (capitalized, a proper noun) is one specific Avandar
  product surface: the `catalog_entries__open_data` table plus its browsing
  UI, listing every freely available public dataset Avandar has vetted and
  made addable to any workspace, regardless of which connector or protocol
  serves it underneath (`pipeline_parquet` today, CKAN's `api_resource` today,
  a future Socrata `api_resource`). It is shared across every workspace, not
  workspace-scoped.
- **A metacatalog** (lower case, a generic shape, defined above) is a
  per-connector search index over that connector's own drives and relations.
  It exists independently of the Open Data Catalog and is not limited to
  public data: a user's own Google Sheets picker is a (search-time) metacatalog
  over their private drive, with nothing "open data" about it.
- **"Catalog"** used alone, with neither qualifier, is ambiguous and should be
  avoided in code, schema, and docs from here on. Say "the Open Data Catalog"
  or "the <connector>'s metacatalog" - never bare "catalog" - once both
  concepts exist side by side. (An existing exception that is not being
  renamed: `catalog_entries__open_data`, the table the Open Data Catalog is
  built on, and `OpenDataCatalogEntry`, its model. Both names predate this
  file and already carry "open_data"/"OpenData" as the qualifier.)

A single Open Data Catalog entry can be thought of as one hand-curated row
copied out of some connector's metacatalog (or, for `pipeline_parquet` rows,
out of no connector's metacatalog at all - a one-off pipeline artifact with no
live drive behind it). The Open Data Catalog does not have to expose a
connector's full metacatalog to get an entry into it.

## Do and don't

**Do**

- Say "drive" for layer 0, "connection" for layer 1, "relation" for layer 2.
  Relation is already QETL's word (`RelationRef`); do not coin a second one.
- Say "the Socrata connector" for the implementation, and name the specific
  drive ("NYC Open Data") everywhere a user sees it.
- Say "prebuilt metacatalog" or "search-time metacatalog" rather than bare
  "metacatalog" when the distinction matters to the sentence.
- Say "the Open Data Catalog" (capitalized) for the product surface, never
  bare "catalog."

**Don't**

- Don't name a connector's technology in user-facing copy ("Socrata",
  "CKAN"). Name the drive the user picked.
- Don't call layer 0 "the catalog." It is the drive; "catalog" is reserved for
  the Open Data Catalog and "metacatalog" is reserved for a connector's search
  index over its own drives and relations.
- Don't model a metacatalog as a QETL relation kind. It is a discovery step
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
