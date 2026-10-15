# QETL Postgres connector - design

**Status:** Draft, ready to split into backend/frontend implementation work.
**Date:** 2026-10-13
**Author:** pablo@avandarlabs.com (brainstormed with Claude).
**Related:**
[`docs/qetl-architecture.md`](../../../qetl-architecture.md) section 10 (the
general "adding a new connector" checklist, written against a hypothetical
`postgres_table` source type - this spec fills that hypothetical in for real),
[`docs/superpowers/specs/2026-08-18-qetl-google-sheets-design.md`](../2026-08-18-qetl-google-sheets-design.md)
(the first external connector, the one this spec deliberately does not copy
for credential storage),
[`src/views/DataManagerApp/DataImportView/CLAUDE.md`](../../../../src/views/DataManagerApp/DataImportView/CLAUDE.md)
(the "sniffed import view" shape every connector's frontend must follow),
[`docs/permissions-architecture.md`](../../../permissions-architecture.md) (app
roles, used below instead of a new per-resource share type),
[`postgres-connector-option-a-prototype.html`](postgres-connector-option-a-prototype.html)
(the confirmed frontend shape, Option A of three explored - open it directly
in a browser; see section 7.4a).

---

## 0. Why this spec exists, and what it is not

This is the second external connector QETL gets (the first is Google
Sheets). The goal of this document is to fix the **contract** between
backend and frontend before either side writes code, so two agents (or two
people) can implement both halves in parallel without a design conversation
in the middle. Section 5 is that contract. Sections 6 and 7 are ordered task
checklists, one per side, that both point back into section 5 instead of
restating it.

This spec does **not** invent a new way to query data. Every rule in
`docs/qetl-architecture.md` holds unchanged: a Postgres table or view is
modeled as a new `datasets.source_type` value, not a new relation kind
(section 11 of that doc explains why that path is reserved for things that
genuinely cannot be a dataset row - a Postgres table is not one of those
things). The mediator still never decomposes or plans a query, the registry
is still rebuilt per fetch, and the wrapper is still the only place that
knows anything about Postgres. Where this spec proposes new structure -
specifically, a reusable "connection" entity - it proposes it as a sibling
to the existing `datasets` / `datasets__<type>` pattern, applied one layer
up, not as a parallel system.

### 0.1 Review of `feat/incremental-gen`

Read as requested. That branch's current tip
(`2026-10-12-incremental-individual-sync-design.md`) is about
`generateIndividuals` and ontology sync (narrowing the upsert columns a
concept's "Sync records" writes, plus a renamed action and a progress UI). It
does not touch `datasets`, any `datasets__<type>` table, `DatasetSource`,
`SourceWrapper`, the registry, or any file this spec changes. **No merge
conflict and no design conflict**; the two branches are free to land in
either order.

One part of it is worth reusing once it merges, not duplicating now: section
6 of that spec adds a generalized, multi-task progress store
(`startTask`/`updateTask`/`finishTask`/`failTask`, built on
`createExternalStore`, rendered as one floating panel in `AppShell.tsx`)
specifically so more than one thing can report progress on screen at once.
The Postgres connector's "testing your connection and listing tables" step
and "fetching a preview" step are exactly the kind of multi-second,
can-fail operation that store was built for. **Do not build a second
one-off loading/error-store for this connector.** If `feat/incremental-gen`
has merged by the time the frontend work starts, use that store directly (the
existing `ConnectorRow`'s own inline `Loader`/error affordances, described in
section 7.4 below, stay as-is for the fast, in-form states; the floating
indicator is for the connect-and-list-tables round trip specifically). If it
has not merged yet, **copy the files directly into this branch rather than
building a placeholder:** `src/lib/utils/state/TaskProgressStore/TaskProgressStore.ts`,
`src/lib/utils/state/createExternalStore.ts`, and
`src/components/TaskProgressIndicator/TaskPanel.tsx`, wired into this
branch's own `src/components/AppShell/AppShell.tsx` the same way
`feat/incremental-gen` wires it. `feat/incremental-gen` will merge to
`develop` before this branch does, so the copy is temporary: once this
branch rebases onto a `develop` that already has the real files, the copies
collide and resolve as duplicates (trivial to delete, since they are
byte-identical or near-identical), not as a design conflict. This is better
than a local `isConnecting` boolean plus a TODO, because it lets the
connecting/listing-tables states actually be built and tested against the
real floating-indicator UI from day one, instead of against a throwaway
stand-in that would need its own follow-up migration later.

---

## 1. Problem

`datasets.source_type` can be a file (`csv_file`, `xlsx_file`, `pdf_file`), a
derived relation (`virtual`), a public-data catalog entry (`open_data`), or
one spreadsheet tab (`google_sheets`). It cannot be one table or view living
in a database the workspace does not own and QETL cannot reach from the
browser. Users who have outgrown spreadsheets and already run a Postgres
database (the exact "missing middle" segment `PRODUCT.md` names) have no way
to bring that data in without exporting a CSV by hand and re-uploading it
every time it changes.

## 2. Scope

**In**

1. A workspace editor can supply Postgres connection details (host, port,
   database, username, password, SSL mode, a label) and pick **one table or
   view** from that database to become one Avandar dataset - the same rule
   Google Sheets already established: one Avandar dataset is one addressable
   relation at the source, never a whole database or a whole workbook.
2. That connection's non-secret details and encrypted credential are stored
   so a **second** table from the **same** server can be imported without
   re-entering the password (confirmed with the user as the intended shape;
   see section 5.1).
3. The credential is encrypted at rest using Postgres-native facilities
   already available in Supabase (pgsodium / Vault), decryptable only from
   server-side code holding the service-role key, never by a client holding
   the publishable key, regardless of workspace role or RLS policy state.
   See section 5.2.
4. A Postgres `SourceWrapper` that can `describe` and `acquire` a picked
   table or view through a new server-side proxy, wired into
   `createDefaultRegistry` exactly like every other dataset source type.
5. The frontend "Connectors" tab gets a second `ConnectorRow`, built to the
   same "sniffed import view" shape as `GoogleSheetsImportView`.

**Out (tracked as future work in section 9, with Linear issues to be filed
per the user's request)**

- A third-party secrets manager (Infisical, Doppler, AWS/GCP/Azure Secrets
  Manager, HashiCorp Vault) in front of or instead of Supabase Vault.
- Editing or rotating a saved connection's credentials, or deleting one, from
  the UI (v1 only creates; deletion/rotation needs its own permission and
  blast-radius story, same caveat `datasets__google_sheets` already carries
  for `google_account_id`).
- SSH tunneling, client-certificate (`verify-full` with a custom CA) auth, or
  any connection mode beyond `disable`/`require` SSL.
- Predicate or aggregate pushdown. Postgres is the first source type where
  pushdown would be straightforward to implement, which is exactly why it
  must not be implemented yet: `docs/qetl-architecture.md` section 9 is
  explicit that the capability record is "declarative only today" and names
  it "the vocabulary for a planner that does not exist yet." Shipping real
  pushdown for one source type ahead of that planner would make the
  mediator's behavior depend on which source type a query happens to touch.
  Tracked as future work, section 9.
- Freshness detection (same known gap every non-Sheets source has today;
  `sourceVersion` stays `undefined`, per architecture doc section 13). It is
  at least partially feasible for Postgres specifically - unlike a flat file,
  a live server can be asked cheaply (`pg_stat_user_tables` counters, an
  `xmin`-based watermark, or a dedicated `updated_at`/trigger column, none of
  which exist generically across arbitrary customer tables so none can be
  the *default* `freshnessSignal` v1 declares) - but building a planner that
  actually consumes a freshness signal is the bigger, shared gap named above,
  not a Postgres-specific one. Tracked as future work, section 9.
- Paging very large tables across multiple acquisition calls. v1 fetches the
  whole relation in one call, capped by `maxRowsPerCall`/`maxBytesPerCall`
  (section 5.3); exceeding the cap now fails the acquisition outright
  (section 5.4) rather than silently returning a partial table. This is
  intentionally distinct from pushdown above: pushdown is about sending a
  *query* (a filter, an aggregate) to the source; paging is about splitting
  *one relation's full acquisition* across several `acquire` calls
  (`AcquisitionUnit`'s `"paged"` kind, `RelationCapabilities.types.ts`) - a
  capability declared in the type system today but implemented by zero
  wrappers and zero mediator code, so adding it for Postgres would mean
  building the mediator's paging consumer for the first time, not flipping a
  flag on an existing one. Tracked as future work, section 9.

## 3. Review: where this fits `docs/qetl-architecture.md`

Section 10 of the architecture doc already walks through "adding a new
connector" using **a hypothetical `postgres_table` reached through a
server-side proxy" as its worked example** - this feature was anticipated,
not improvised. That checklist's 36 rows are the right shape; sections 6 and
7 below are that checklist filled in with this spec's real names, not a
different checklist. Two things that checklist does not cover, because its
hypothetical connector had one dataset's worth of credentials and this one
has a reusable, multi-dataset credential:

1. A new entity (`db_connections` / `db_connections__postgres`)
   that no existing row in that checklist creates or touches. Section 5.1.
2. A credential storage mechanism stronger than any existing `datasets__*`
   table uses. Section 5.2.

Everything else - the enum value, the per-type dataset table, the RPC, the
model namespace, the CRUD client, the wrapper, the registry wiring, the
import view - follows the checklist's existing shape exactly.

## 4. What Google Sheets already answered, reused instead of re-decided

Three hypothetical/named values from existing interfaces, carried over
unchanged because the same reasoning applies:

| Decision | Sheets' answer | Applies to Postgres because |
| --- | --- | --- |
| `RelationCapabilities.relations` | `"single"` - a workbook has many tabs, but the tab lives on the source record, not on `RelationRef`, so `"single"` is correct even though the *server* holds many | A Postgres database has many tables, but the picked table lives on `datasets__postgres_table`, not on `RelationRef`. Same reasoning, same value - **not** `"tables"` (that enum member exists in `RelationCapabilities.types.ts` but has no caller yet; it would be the right value only if a `RelationRef` could itself enumerate more than one table of one connection, which ours cannot) |
| `acquisitionUnit` | `{ kind: "whole-relation" }` | v1 fetches one `SELECT *` in one call. No paging, same as Sheets |
| One download path for import, refresh, and query acquisition | `getStoredGoogleSheetTabCsv` is the one reader all three callers share | The Postgres wrapper's `acquire` must be the same function the import view's loader hook calls for its preview, never two implementations of "read this table" |

## 5. The contract

Everything in this section is shared vocabulary both sides build against.
Changing anything here after work starts means telling the other side.

### 5.1 Entity model: connections are to datasets what accounts are to Sheets, made explicit

Google Sheets' reusable credential is implicit: it is just "the user's
Google OAuth grant," which already exists as its own entity
(`tokens__google`) because Google invented it, not because this codebase
designed a reusable-credential pattern on purpose. Postgres has no such
outside entity handing us one, so this spec adds one, shaped like the
pattern this codebase already uses for datasets themselves: one generic
table carrying the common shape, plus one `__<type>`-suffixed satellite
table per connection type, so a second database connector (MySQL, MSSQL,
Snowflake...) only ever adds a new satellite table and a new enum value,
never a new "connections" concept.

```
db_connections                     (generic, one row per saved connection)
  id                uuid primary key
  workspace_id      uuid references workspaces(id)
  connection_type   db_connections__connection_type enum, 'postgres' for now
  name              text          -- user-chosen label, e.g. "Prod reporting replica"
  created_by        uuid references auth.users(id)
  created_at, updated_at

db_connections__postgres            (satellite, one row per postgres connection)
  connection_id     uuid primary key references db_connections(id) on delete cascade
  workspace_id      uuid references workspaces(id)   -- denormalized, same reasoning as datasets__google_sheets.workspace_id
  host              text
  port              integer
  database_name     text
  username          text
  ssl_mode          db_connections__postgres_ssl_mode enum ('disable' | 'require'); v1 offers only these two, see section 9
  vault_secret_id   uuid           -- points at the encrypted password, see 5.2; NOT the password itself
  last_verified_at  timestamptz    -- set on every successful test-and-save or table listing; drives "last connected" UI copy
  created_at, updated_at

datasets__postgres_table                  (satellite, one row per imported dataset - same shape as datasets__google_sheets)
  id                uuid primary key
  dataset_id        uuid unique references datasets(id) on delete cascade
  workspace_id      uuid references workspaces(id)
  connection_id     uuid references db_connections(id) on delete restrict  -- restrict, not cascade: deleting a connection with live datasets must be an explicit, informed action (out of scope for v1 UI, but the FK must not silently orphan a queryable dataset)
  schema_name       text
  table_name        text
  relation_kind     datasets__postgres_table_relation_kind enum ('table' | 'view')
  created_at, updated_at
```

RLS: `datasets__postgres_table` follows `datasets__google_sheets` exactly -
`util__auth_user_can_access_resource('dataset', dataset_id, <role>)` for
select/insert/update/delete, because it hangs off a `dataset_id` that
already has a granular, shareable permission entity.

`db_connections` and `db_connections__postgres` are **not**
per-resource shareable items in v1 (a connection is infrastructure
configuration, not a document someone shares with one teammate). Gate them
by **app role** instead, using the existing helper rather than inventing a
new resource kind:
`util__auth_user_meets_min_app_role(workspace_id, 'data_sources', 'editor')`
for select/insert/update, `'admin'` for delete. This is an explicit
recommendation, not yet confirmed against every scenario in
`docs/permissions-architecture.md` section 9 - the backend implementer
should read that section before writing the policies, in case a scenario
there argues for a narrower rule.

### 5.2 Credential storage: what this spec deliberately does not copy, and what it does instead

**The precedent, read and rejected on purpose.** `tokens__google.access_token`
and `.refresh_token` are plain `text` columns (verified by reading
`supabase/schemas/10.tokens__google.sql`). Any RLS policy bug, any
service-role-key leak, or any future "just this one read-only helper view"
on that table exposes the live token unencrypted. The user explicitly asked
that this connector **not** repeat that pattern, and that if a third-party
secrets manager would be the better long-term answer, this spec should say
so and a Linear issue should exist to track it rather than silently matching
the weaker precedent. Both are true: see section 9.

**What we build instead, using only the Supabase/Postgres stack already in
this project** (`db.vault` is present but commented out in
`supabase/config.toml` today; enabling it is in scope for this feature):

1. Enable Supabase Vault (`pgsodium`-backed; `vault.create_secret`,
   `vault.update_secret`, and the `vault.decrypted_secrets` view). Vault
   grants `SELECT` on `vault.decrypted_secrets` only to `service_role` and
   `postgres` by default - **`anon` and `authenticated` have no grant on it
   at all**, by default, with nothing to misconfigure. This is the
   structural improvement over the Google token precedent: there is no RLS
   policy on the secret itself to get wrong, because the client-reachable
   tables never contain the plaintext, only a `uuid` pointing at it.

   This is the first time Vault enters this repo's declarative schema at
   all. The `supabase-declarative-schema` skill today documents the
   migration-vs-declarative split only for Storage (`storage.objects`/
   `storage.buckets`); it has no equivalent section for Vault. Vault's
   split mirrors Storage's closely enough to use the same precedent, but
   it is not yet written down anywhere an implementer can follow -
   section 6, row 0 below makes adding that section an explicit backend
   task, not an assumption.
2. `db_connections__postgres.vault_secret_id` stores the id Vault
   returns from `vault.create_secret(password, name, description)`. The
   secret payload is the password alone - host/port/database/username are
   operational metadata visible to any workspace editor (same sensitivity
   tier as `googleDocumentId`/`google_email`, which are already plain
   columns), and keeping them out of the encrypted blob is what lets the
   connection picker (section 5.4) show "Prod reporting replica -
   `db.example.org:5432/reporting`" without a decrypt round trip.
3. The only code path that may call `vault.decrypted_secrets` is a
   `security definer` SQL function restricted to `service_role`, invoked
   from the Postgres edge function using `SupabaseAdmin`
   (`supabase/functions/_shared/supabase.ts` - already the service-role
   client every edge function has available; no new credential to manage).
   The edge function itself still authenticates the caller with the
   user's own JWT first (`authMiddleware`, the same pattern
   `google-sheets`'s route uses) and checks
   `util__auth_user_meets_min_app_role` **before** touching the service-role
   client, exactly mirroring how `google-sheets/GoogleSheetsRoutes.ts` reads
   the caller's own tokens under their own session - the difference is that
   here, decryption itself additionally requires service role, so even a bug
   that skipped the role check could not leak the secret to the browser; it
   could only make an authenticated-but-unauthorized user trigger a
   connection the server makes, not read the password.
4. **SSRF is a required mitigation, not future work.** The edge function
   opens a real TCP connection to a user-supplied `host:port`. Before
   connecting: resolve the hostname, and refuse to connect if the resolved
   address is loopback, link-local, or a private range (`10.0.0.0/8`,
   `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`),
   unless the deployment is explicitly configured for an on-prem/VPC-peered
   use case (not a v1 requirement - just do not build the kind of
   SSRF-shaped endpoint that would need one). This defends Supabase's own
   edge runtime and any peered infrastructure from being probed or reached
   through a workspace member's connection form. Validate the resolved IP,
   not just the hostname string, to close the DNS-rebinding gap.
5. The picked `schema_name`/`table_name` come from a dropdown populated by
   a catalog query (`information_schema.tables`/`pg_catalog`), but they
   still arrive at the edge function as a client-supplied string. Re-check
   the pair against the live catalog at acquire time - i.e. every time
   `acquire`/the `rows` or `preview` route runs (section 5.4a), not only once
   at pick time in the picker UI - the table may have been dropped or
   renamed since it was picked - and build the `SELECT` with a proper
   identifier-quoting helper (the Postgres driver's own `sql` tagged-template
   / identifier-escaping function - never string concatenation), so a
   crafted schema or table name cannot inject SQL. This is not optional
   hardening to defer: section 8 requires explicit SQL-injection test
   coverage for this helper and for every connection-form field before the
   feature ships, not just a correctness review.
6. Document, in the connection form's copy, that the database user supplied
   should ideally have read-only access to the one table or view being
   imported. We cannot enforce this from outside the user's database, but
   the UI should say it plainly (least-privilege is the user's
   responsibility to grant, ours to ask for). This copy, like every other
   user-facing string in this feature, follows the general copy rule now
   documented in `AGENTS.md`'s "Copy and nomenclature" section and in
   `DESIGN.md`'s Do's and Don'ts: write for the user's mental model, not the
   schema's, even where the two words genuinely differ (see section 7's
   "database," not "connection," rule below for the concrete instance that
   prompted writing the general rule down).

### 5.3 The `SourceWrapper` capability contract

```ts
const POSTGRES_TABLE_CAPABILITIES = {
  relations: "single",                 // 5.4 above - the table lives on the source record
  acquisitionUnit: { kind: "whole-relation" },
  predicatePushdown: "none",           // out of scope, see section 2
  aggregatePushdown: false,            // out of scope, see section 2
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: POSTGRES_MAX_ROWS_PER_ACQUIRE,   // a configured ceiling, not "unbounded" - an arbitrary customer table can be far larger than a Sheets export; the edge function and the browser both have to hold the result
  maxBytesPerCall: POSTGRES_MAX_BYTES_PER_ACQUIRE, // same reasoning
  freshnessSignal: "none",             // no cheap universal change signal across arbitrary Postgres tables; same known gap as every non-Sheets source (architecture doc section 13)
  rowIdentity: "none",                 // v1 never stitches two partial fetches together, so there is nothing for a stronger value to buy yet
  multiCallAtomicity: false,
  quotaScope: { kind: "per-host", host: /* the connection's configured host */ },
  grantedScope: [],                    // no OAuth scopes; nothing to report
} satisfies RelationCapabilities;
```

`PostgresTableWrapper` (`src/clients/qetl/wrappers/PostgresTableWrapper/`),
shaped exactly like `GoogleSheetsWrapper`:

```ts
export type PostgresTableWrapperOptions = {
  /** The stored source row for one dataset: which connection, which table. */
  getPostgresTableSource: (id: Dataset.Id) => Promise<{
    connectionId: DatabaseConnection.Id;
    schemaName: string;
    tableName: string;
  }>;

  /**
   * Calls the server proxy (section 5.4) with the caller's DuckDb lease
   * already held, same role `readCsv` plays in GoogleSheetsWrapperOptions:
   * acquisition must go through the one path the import preview also uses.
   */
  fetchRelation: (params: {
    datasetId: Dataset.Id;
    connectionId: DatabaseConnection.Id;
    schemaName: string;
    tableName: string;
  }) => Promise<{ parquetBlob: Blob }>;
};
```

`describe` reuses `readDatasetRelationSchema` exactly like Sheets does -
schema comes from the already-loaded dataset's recorded columns, never from
a live catalog read, so describing a relation never opens a connection.
`readFreshness` is omitted entirely for v1 (capability says `"none"`;
`SourceWrapper.readFreshness` is optional for exactly this case).

### 5.4 The server proxy: one unified endpoint, not a Postgres-only edge function

**Do not add a single-purpose `supabase/functions/postgres-connections/`
edge function.** Every future database connector (MySQL, MSSQL, Snowflake...)
would otherwise repeat this exact route shape in its own edge function - the
same "parallel, one-off architecture" section 0 already rules out for the
mediator, just recreated one layer down at the HTTP boundary. Build one
connector-agnostic entry point instead, so adding a connector after this one
is a new implementation registered into an existing function, never a new
edge function:

`supabase/functions/external-datasets/`, Deno + the existing `MiniServer`
routing (`defineRoutes`, same as every other function). Needs a real
Postgres wire-protocol client, which nothing in this repo has today (every
existing edge function talks to Postgres only through PostgREST, via
`@supabase/postgrest-js`) - add one (`jsr:@db/postgres` is the common choice
for Deno; `postgres` (porsager) also runs under Deno - either is acceptable,
the implementer picks one and every caller goes through this one module).
**Neither `knex` nor `kysely` belongs here**: `knex` already lives in this
repo (`shared/models/queries/StructuredQuery/structuredQueryToSql/sqlBuilder.ts`),
but only as a dialect-aware SQL-*string* assembler for DuckDB/SQLite, never
as a live connection to an external database - a different job from this
proxy's. The entire SQL surface this connector ever runs is two fixed shapes
(a catalog listing query and a capped, identifier-quoted `SELECT *`), which
is exactly what the Deno-native driver's own `sql` tagged template already
handles safely (section 5.2 item 5). A query builder would add a
dependency, a dialect-translation step, and a second identifier-quoting
mechanism to keep in sync with the driver's own, for zero queries that
actually need a builder's expressiveness (no filters, no joins, no dynamic
predicates).

Every route takes a `connectorType` path segment (`'postgres'` for this
spec) and dispatches to one of a small set of registered connector
implementations - the same registry shape `createDefaultRegistry.ts` already
uses for `SourceWrapper`s (section 6, row 24), applied one layer down:

```ts
// supabase/functions/external-datasets/connectors/ExternalDatasetConnector.ts
export type ExternalDatasetConnectorType = "postgres"; // widens per future connector

/** One pickable child object under a connection - a table/view, a sheet tab. */
export type ExternalDatasetRelation = {
  relationId: string; // opaque to callers; postgres encodes "schema.table"
  label: string;       // what the picker shows, e.g. "public.customers"
  kind: string;         // connector-specific, e.g. "table" | "view"
};

export type ExternalDatasetConnector = {
  testAndSaveConnection: (input: UnknownObject) => Promise<{
    connectionId: string;
    relations: ExternalDatasetRelation[];
  }>;
  listRelations: (connectionId: string) => Promise<ExternalDatasetRelation[]>;
  previewRelation: (
    connectionId: string,
    relationId: string,
  ) => Promise<{ columns: DuckDbColumnSchema[]; previewRows: UnknownObject[] }>;
  getRelationRows: (connectionId: string, relationId: string) => Promise<string>; // CSV text
};

// connectorRegistry.ts
const CONNECTORS: Record<ExternalDatasetConnectorType, ExternalDatasetConnector> = {
  postgres: createPostgresConnector(/* ... */),
};
```

**The unified layer vocabulary, reused rather than invented.** Every
external connector this codebase has or will have has the same two layers:
Google Sheets has a file (the spreadsheet) and, under it, many sheets/tabs;
Postgres has a database (the connection) and, under it, many tables and
views. Rather than coin a fresh pair of words (or ship a placeholder like
"layer2"), this spec reuses vocabulary this codebase already has for exactly
this shape (`docs/qetl-architecture.md` section 2): the child object a user
ultimately picks as one dataset is already called a **relation** everywhere
else here (`RelationRef`, `RelationCapabilities`, `acquisitionUnit`), and the
reusable, authenticate-once parent above it is a **connection** - already
this spec's own name for the Postgres entity (section 5.1), and the natural
generic word for "the thing set up once, then picked from repeatedly." So
the path reads `.../connections/:connectionId/relations[/:relationId/...]`,
never `.../tables` and never a bespoke "layer2."

| Route | In | Out (success) | Out (failure) |
| --- | --- | --- | --- |
| `POST /external-datasets/:connectorType/connections/test-and-save` | `{ workspaceId, connectionId?, ...connectorFields }` - for `postgres`: `{ name, host, port, databaseName, username, password, sslMode }`. `connectionId` present means "rotate this connection's credential," absent means "create a new one." | `{ connectionId, relations: ExternalDatasetRelation[] }` | `{ error: { code: "auth_failed" \| "unreachable" \| "ssl_required" \| "timeout" \| "unknown", message } }` |
| `GET /external-datasets/:connectorType/connections/:connectionId/relations` | - | `{ relations: ExternalDatasetRelation[] }` | same error shape |
| `GET /external-datasets/:connectorType/connections/:connectionId/relations/:relationId/preview` | - | `{ columns: DuckDbColumnSchema[], previewRows: UnknownObject[] }`, row count bounded by the existing `GlobalAppConfig.dataManagerApp.maxPreviewRows` | same error shape |
| `GET /external-datasets/:connectorType/connections/:connectionId/relations/:relationId/rows` | - | the full relation as CSV text, capped per section 5.3's `maxRowsPerCall`/`maxBytesPerCall` - **exceeding the cap fails the request with a distinct `too_large` error rather than silently truncating rows** (a silently truncated analytics table is a correctness bug wearing a success response), read the same way `GoogleSheetsRoutes.ts` returns sheet rows today, so the wrapper transcodes it client-side exactly like Sheets does - **not** a second transcoding path | same error shape, plus `too_large` |

For `postgres`, `relationId` is `` `${schemaName}.${tableName}` ``; the
postgres connector implementation parses it back into the pair for every
catalog re-check and `SELECT` (section 5.2 item 5 still governs how that
pair gets quoted - encoding it into one path segment does not change what
gets escaped or how):

```ts
// Internal to the postgres connector implementation only; never a
// cross-connector type.
type PostgresRelationRef = {
  schemaName: string;
  tableName: string;
  kind: "table" | "view";
};
```

`test-and-save` is the one route that persists anything - section 5.2's
design means the connection row and its encrypted secret are written **as
soon as the test succeeds**, independent of whether the user ever picks or
saves a dataset from it (mirrors Google: the OAuth token is saved the
moment authorization completes, before any sheet is picked). `relations`
(list) and `preview` never write. `rows` never writes either; it is what
`acquire` calls (section 5.4a names exactly where), is called again by
"refresh" later, and must therefore stay the one read path, per section 4's
table.

**Google Sheets does not move onto this endpoint as part of this change -**
but that is a scoping decision for *this* spec, not a permanent architectural
split, and it is tracked as future work (section 9, item 7) precisely because
leaving `supabase/functions/google-sheets/` as a second, parallel proxy
indefinitely defeats the point of unifying on one endpoint. Its access model
differs from Postgres in kind, not just in route shape: a sheet is read with
the *user's own* Google OAuth grant, fetched directly, where a Postgres
connection is a *shared workspace secret* a server must broker on the
caller's behalf. `external-datasets` is built connector-agnostic from day one
specifically so a reworked Sheets implementation can register into it
without a second redesign - `ExternalDatasetConnector`'s methods are already
generic enough (`testAndSaveConnection` takes an arbitrary
`connectorFields` object; nothing assumes a password-shaped secret), so
migrating Sheets is expected to mean writing a `createGoogleSheetsConnector`
implementation and retiring the old edge function, not changing the
interface itself. Only `postgres` ships an implementation now.

### 5.4a How this plugs into the mediator (nothing new, by design)

Asked directly: **no mediator code changes for this feature, and that is the
point, not a gap.** `QueryMediator`/`queryRunner.ts` never learns Postgres
exists. The one call site that matters is
`_fetchRelationSource` in `src/clients/qetl/QueryMediator/relationLoading.ts`,
which already calls `await wrapper.acquire(...)` for every relation kind
today, Postgres included once row 22 (section 6) exists - that line of code
does not change. What resolves `wrapper` to the Postgres implementation is
`_createDatasetWrapper`'s `delegateFor` in
`src/clients/qetl/wrappers/createDefaultRegistry.ts`: it reads the dataset's
stored `source_type` and runs `match(dataset.sourceType).with(...).exhaustive()`
- section 6 row 24 is the one new arm this feature adds to that match.
Because the match is `.exhaustive()`, widening `datasets__source_type` with
`postgres_table` (row 7) and *not* adding that arm is a **compiler error**,
not a silent gap - this is the enforcement mechanism, not a convention
someone has to remember.

So the full call chain, start to finish: the mediator calls
`wrapper.acquire` exactly as it always has -> the composite wrapper's
`delegateFor` reads `dataset.sourceType === "postgres_table"` and resolves to
`PostgresTableWrapper` (compiler-forced wiring, row 24) -> its `acquire`
calls `GET /external-datasets/postgres/connections/:connectionId/relations/:relationId/rows`
(section 5.4) -> the edge function returns CSV -> the wrapper transcodes
CSV to Parquet exactly like `GoogleSheetsWrapper.acquire` does today -> the
mediator caches the resulting bytes same as any other source. Every step in
that chain already exists as a pattern; this spec's rows 22-26 in section 6
are what builds the one new link (the Postgres-specific half), not a new
kind of link.

### 5.5 Frontend-facing shared types

New members on the existing unions, same pattern as the `google_sheets`
case in each:

```ts
// DatasetSource.types.ts (shared/models/datasets/DatasetSource/)
// DatasetSourceRegistry gets: postgres_table: PostgresTableDatasetModel[K]

// DatasetImportForm.types.ts
export type PostgresTableDataSourceMetadata = {
  sourceType: "postgres_table";
  connectionId: DatabaseConnection.Id;
  schemaName: string;
  tableName: string;
  datasetLoadResult: BaseLoadResult & DuckDbLoadCsvResult & {
    previewRows: UnknownObject[];
  };
  parseOptions: PostgresTableParseOptions; // see useSaveDataset.ts's FileParseOptions union
};
// DataSourceMetadata gains `| PostgresTableDataSourceMetadata`

// useSaveDataset.ts
export type PostgresTableParseOptions = {
  type: "postgres_table";
  // no row-skip / delimiter controls - a catalog table has no preamble to skip
};
// FileParseOptions gains `| PostgresTableParseOptions`
```

`DatasetClient.insertPostgresTableDataset(...)` follows
`insertGoogleSheetsDataset`'s shape: dataset metadata plus
`{ connectionId, schemaName, tableName }`, backed by a new
`rpc_datasets__add_postgres_table_dataset` RPC (row 3 of the checklist in
section 6).

---

## 6. Backend task list

Ordered the same way `docs/qetl-architecture.md` section 10 orders its
checklist (schema -> generated -> models -> clients -> proxy -> wrapper ->
mediator wiring), with this feature's real names and the two new-entity rows
this spec adds (marked **new**).

| # | File | Change |
| --- | --- | --- |
| 0 | `.claude/skills/supabase-declarative-schema/SKILL.md` **(new section)** | Add a "Vault" section mirroring the existing "Storage" section: enabling Vault is a `supabase/config.toml` `[db.vault]` config toggle (not schema or migration); individual secrets are created at runtime via `vault.create_secret()` from application code, same as a bucket row is DML `db diff` never tracks; but any `security definer` function/grant/revoke wrapping `vault.decrypted_secrets` (row 5 below) is DDL and must be mirrored into `supabase/schemas/`, exactly like Storage's policies, or `db diff` will propose dropping it. Do this before writing rows 4-6. |
| 1 | `supabase/schemas/00.enum.db_connections__connection_type.sql` **(new)** | enum `'postgres'` |
| 2 | `supabase/schemas/00.enum.db_connections__postgres_ssl_mode.sql` **(new)** | enum `'disable' \| 'require'` |
| 3 | `supabase/schemas/00.enum.datasets__postgres_table_relation_kind.sql` **(new)** | enum `'table' \| 'view'` |
| 4 | `supabase/schemas/20.db_connections.sql` **(new)** | generic table, RLS per section 5.1 |
| 5 | `supabase/schemas/21.db_connections__postgres.sql` **(new)** | satellite table, RLS per section 5.1; enable Vault (`db.vault` in `supabase/config.toml`, per section 5.2) |
| 6 | `supabase/schemas/50.rpc_db_connections__test_and_save.sql` or equivalent **(new, or this may live entirely in the edge function with direct table writes via `SupabaseAdmin` - implementer's call, see note below)** | persists connection + Vault secret |
| 7 | `supabase/schemas/10.datasets.sql` | add `postgres_table` to `datasets__source_type` |
| 8 | new `supabase/schemas/22.datasets__postgres_table.sql` | per-type table, RLS per section 5.1 |
| 9 | new `supabase/schemas/70.rpc_datasets__add_postgres_table_dataset.sql` | RPC calling `rpc_datasets__add_dataset`, same shape as the Sheets RPC |
| 10 | `supabase/migrations/` | `pnpm db:new-migration` - **read `docs/qetl-architecture.md`'s migration note and this repo's `CLAUDE.md` Supabase section first**: `ava supabase switch` before anything, `pnpm db:reset` immediately before `db:new-migration` |
| 11 | `shared/types/database.types.ts` | `pnpm db:gen-types` |
| 12 | `apps/desktop/migrations/<stem>.gen.sql` + `apps/desktop/sync/syncable-tables.ts` | `pnpm desktop:sqlite:gen-migrations`; decide whether `db_connections`/`db_connections__postgres` belong in `ACTIVE_TABLES` - probably **not** synced to the offline desktop SQLite copy, since the secret pointer is meaningless offline and the desktop shell cannot proxy a live Postgres connection either; `datasets__postgres_table` likely should sync so the dataset's own metadata is visible offline even though acquisition will fail there (same situation Sheets is already in offline) |
| 13 | new `shared/models/datasets/PostgresTableDataset/` | model, parsers, namespace, same files as `GoogleSheetsDataset/` |
| 14 | new `shared/models/DatabaseConnection/` (or `shared/models/connections/DatabaseConnection/`) **(new)** | generic connection model, following the `Dataset`/`DatasetSource` split: a `DatabaseConnection` base model plus a `DatabaseConnectionSource` registry for `db_connections__postgres`, mirroring `DatasetSourceRegistry` |
| 15 | `shared/models/datasets/DatasetSource/DatasetSource.types.ts` | registry entry, `ImportableDatasetSourceType` stays inclusive of it |
| 16 | `shared/models/datasets/DatasetSource/DatasetSourceModule.ts` | exhaustive match arm |
| 17 | `shared/models/datasets/DatasetSource/requiresOriginalFileRetention/requiresOriginalFileRetention.ts` | `postgres_table` does not retain an original file (no file was ever uploaded) |
| 18 | new `src/clients/datasets/source-datasets/PostgresTableDatasetClient.ts` | CRUD client, same shape as `GoogleSheetsDatasetClient.ts` |
| 19 | new `src/clients/connections/DatabaseConnectionClient.ts` **(new)** | CRUD client for the generic connection row (read/list only from the client; writes happen through the edge function, section 5.4, not through a direct insert, because only the edge function can create the Vault secret) |
| 20 | `src/clients/datasets/SourceDatasetClient.ts`, `DatasetClient/createDatasetQueries.ts`, `createDatasetMutations.ts` | registry entry, `getSourceDataset` arm, insert mutation |
| 21 | new `supabase/functions/external-datasets/`, with a `postgres` connector implementation registered into it (section 5.4) | the unified proxy and its one `postgres` implementation - **not** a Postgres-only edge function. Needs the Postgres driver dependency (section 5.4), the SSRF host-validation helper (section 5.2 item 4), and the identifier-quoting helper (section 5.2 item 5) - put the latter two in `supabase/functions/_shared/` since any future DB connector (MySQL, MSSQL) will need the same SSRF check and a similar identifier-quoting rule |
| 22 | new `src/clients/qetl/wrappers/PostgresTableWrapper/` | `SourceWrapper`, section 5.3, plus `GoogleSheetsWrapper.test.ts`-shaped unit tests |
| 23 | `src/clients/qetl/QueryMediator/QueryMediator.types.ts`, `getRelationSources.ts` | `RelationSource` arm, reader function |
| 24 | `src/clients/qetl/wrappers/createDefaultRegistry.ts` | options field, delegate, `match` arm |
| 25 | `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.ts` | add `postgres_table` to the refusing arm |
| 26 | `src/clients/qetl/QueryMediator/relationLoading.ts` | type guard, lookup, lease-bound CSV transcoder (the wrapper returns CSV per section 5.4's `rows` route, same as Sheets) |
| 27 | `src/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardPublishSnapshots.ts` | branch in `_getSnapshotDatasetBlob` - **note this is the exact spot Google Sheets' own known gap lives** (architecture doc section 13: "Snapshot publishing of an `all_columns` slice fails over Google Sheets, no Storage object exists"). Postgres will have the same gap unless this is addressed; at minimum, do not regress it silently - either fix both or document both as a known limitation in the same place |
| 28 | `getRelationSources.characterization.test.ts` | reader-per-source-type pin, add the `postgres_table` arm |
| 29 | an executed-DuckDb test for the CSV-to-Parquet transcode, mirroring `acquireGoogleSheetRelation.executed.test.ts` | |

Not needed, same as the architecture doc's own list: `DatasetParsers.ts`
(derives from `SourceTypes`), chat schema code, `assertWorkspaceRelations`,
both cache ports.

**Open implementation note for row 6:** whether "test and save" writes
through a `security definer` RPC or through direct table operations in the
edge function using `SupabaseAdmin` is an implementation choice, not a
contract detail the frontend needs to know about - the frontend only ever
calls the HTTP route in section 5.4. Prefer whichever the
`supabase-declarative-schema` skill's guidance recommends for writing a
Vault secret from server-side code once row 0 has added that guidance;
follow the skill, don't improvise here. As of this revision that guidance
does not exist yet - the skill documents the Storage migration/declarative
split only - so row 0 is a precondition for rows 4-6, not just a
documentation nice-to-have.

## 7. Frontend task list

Ordered the way `DataImportView/CLAUDE.md`'s own "Adding a new import view"
section orders it, because that file's rules are the authority here, not a
restatement of them.

1. **Loader hook**, `useLoadPostgresTable/useLoadPostgresTable.ts`, beside a
   new `PostgresConnectorImportView/`. Owns: the connection-picker/form
   state, the picked table, the fetched preview, and returns the same five
   fields every loader hook returns (`previewRows`, `dataSourceMetadata`,
   `setDataSourceMetadata`, `isLoadingPostgresTable`,
   `onRequestDataReparse` - the last one is closer to a no-op here than for
   CSV/Sheets, since there are no parse options to vary, but it must still
   exist for `DatasetImportForm`'s shared contract).
2. **The view**, `PostgresConnectorImportView.tsx`. Shape, from the
   confirmed `/impeccable shape` brief in section 7.4 below:
   - A `ConnectorRow` (icon: `IconDatabase` or similar from
     `@tabler/icons-react` - there is no Postgres brand icon in that set and
     none should be invented/imported as a one-off asset) under the existing
     Google Sheets row in the same `Stack`.
   - If the workspace has zero saved Postgres connections: the row's action
     opens an inline connection form (host, port, database, username,
     `PasswordInput` for the password, SSL mode `Select` defaulting to
     `require`, label). Submitting it calls `test-and-save`.
   - If the workspace has one or more saved connections: the row's action is
     a `Select` of `"<name> - <host>:<port>/<database>"` options plus a
     trailing `"+ New database"` sentinel, defaulting to the
     most-recently-verified connection (`last_verified_at`). Picking an
     existing one calls `GET .../relations` directly, skipping the form.
     Picking "New database" opens the same form as the
     zero-connections case.
   - **Copy uses the connector's own noun, never the generic word
     "connection."** `db_connections` is the right name for the
     backend entity (section 5.1) - a connection is genuinely what
     `MySQL`/`MSSQL`/`Snowflake` connectors will all persist as, too - but a
     user never sees that word. Postgres's saved items read "database"
     ("Use this database", "New database", "2 saved databases
     available"); the next connector picks its own noun the same way Sheets
     already does ("sheet"/"spreadsheet", never "connection" either). This
     is the exact wording confirmed in the chosen prototype, section 7.4a,
     and it is now the general rule, not a one-off: write for the user's
     mental model of what they are doing ("adding a database"), not for the
     internal nomenclature ("creating a connection record"), per the "Copy
     and nomenclature" section added to `AGENTS.md` and the matching
     Do/Don't pair added to `DESIGN.md`.
   - Both paths converge on the same next state once tables come back: a
     schema-qualified, searchable table/view picker (Mantine `Select` with
     `searchable`, grouped by schema via `group` - real databases run to
     hundreds of tables across many schemas, unlike a spreadsheet's handful
     of tabs, so this cannot be the same small, ungrouped `Select` the Sheets
     tab picker uses).
   - Picking a table calls `.../preview`, and the gate
     (`previewRows && dataSourceMetadata`) opens exactly as it does for
     Sheets, rendering `DatasetImportForm` inline - no private wrapper
     component around it, per the CLAUDE.md rule.
   - **No separate "Test connection" button.** Submitting the connection
     form *is* the test; a successful response (which includes the table
     list) is the proof it works, and a failure surfaces inline under the
     form with the entered values retained (never clear the form on error -
     the user should be able to fix one field, e.g. the port, and resubmit).
   - Connection-level failures (`auth_failed`, `unreachable`, `ssl_required`,
     `timeout`) each get distinct, specific copy, all through Lingui's `t`
     macro/`<Trans>`, not a single generic "Could not connect" string -
     `getGoogleSheetImportErrorCopy.ts` is the precedent to copy the shape
     of, not reuse directly.
3. **Add the union members**: `PostgresTableDataSourceMetadata` to
   `DatasetImportForm.types.ts`, `PostgresTableParseOptions` to
   `useSaveDataset.ts`'s `FileParseOptions`, and a `_savePostgresTableDataset`
   branch plus a `match` arm in `_saveDatasetFromValues`
   (`useSaveDataset.ts`) that calls
   `DatasetClient.insertPostgresTableDataset`.
4. **Register the view** in `DataImportTabs.tsx`'s `"connectors-view"` panel,
   alongside (not replacing) `GoogleSheetsImportView` - both render in the
   same tab, one `ConnectorRow` each, per the existing "available services
   read as a list of rows" shape that file's own docstring already commits
   to.
5. **Badges/icons/labels** (checklist rows 28-33 in the architecture doc):
   `SourceBadge.tsx`, `DatasetSourceIcon.tsx`, `QueryDataSourceSelect.tsx`,
   `SavedDatasetsView.tsx`, `DatasetNavbar.tsx`, `DatasetMetaView.tsx` each
   get a `postgres_table` arm, same icon choice as item 2 above.
6. **`ResyncDatasetCard.tsx`**: situational, same note the architecture doc
   gives row 34 - only needs an arm if this type is ever restored from a
   local file, which a Postgres-backed dataset is not (same as Sheets, which
   has no arm there either).
7. **i18n**: `pnpm i18n:extract` once every new string lands.
8. **Tests**: a unit test driving the loader hook and view against a stubbed
   proxy response (never a mocked DuckDB read - follow
   `GoogleSheetsImportView.test.tsx`'s "do not mock the seam you are
   testing" rule), plus an e2e spec. Tag it `@third-party` only if it reaches
   a real external service; a local Supabase-stack Postgres reachable over
   the loopback address the test harness controls does not count as
   third-party, but note that the SSRF guard in section 5.2 item 4 will
   refuse a literal loopback host by default - the e2e test's backend will
   need either a narrow allowance for the test environment specifically, or
   a non-loopback-but-still-local target (a container on a test-only
   Docker network), decided by whoever writes that test against however the
   SSRF guard actually gets implemented.

### 7.4 Confirmed `/impeccable shape` brief

Produced via the `impeccable` skill's `shape` command, inside the
established visual world (Operate mode - this is a task surface, not a
marketing surface - no new world, no `new-work` pass needed). One material
open question was raised and confirmed with the user before writing this
brief: **saved connections are reusable across datasets** (section 5.1),
not re-entered per table.

- **Job and audience:** a workspace editor in Data Sources, already familiar
  with "Connectors" from Google Sheets, bringing in a table or view from a
  database their organization runs.
- **Outcome:** one new Avandar dataset backed by one Postgres table or
  view, through the same `DatasetImportForm` every other source ends at.
- **Selected direction:** no new composition. Reuse `ConnectorRow` verbatim;
  reuse the "sniffed import view" shape verbatim. The only genuinely new
  composition is the table/view picker, because it is the one place this
  source's shape (many relations, organized by schema, in one server)
  differs from Sheets' shape (a few tabs, flat, in one document).
- **Scope and boundaries:** this is a design brief for a spec, not a built
  screen. Untouched: `ConnectorRow`, `DatasetImportForm`,
  `docs/design/app-view-layout.md`'s rules (no `Paper`/`Card`/`Container`
  between the slate and the content, no informational `Callout`). Anti-goal:
  a bespoke "vault"/credential-management screen - the user should never see
  anything about Vault, secrets, or encryption; they see a connection form,
  a password field that masks itself, and afterwards a named connection they
  can pick again.
- **States:** no connections (bare connect action) -> connecting (inline
  loader, retains entered values) -> connected, picking a table (searchable,
  schema-grouped picker) -> previewing (`DatasetImportForm`) -> saved. A
  returning user with saved connections gets an extra first state: pick an
  existing connection or start a new one, defaulting to most-recently-used.
  Errors are field-adjacent, never a page-level banner, and are specific
  per failure kind (section 7, item 2).
- **Interaction and layout:** everything stays inside the existing
  "Connectors" tab, as a second row under Google Sheets'. No new tab, no new
  page, no new app-level navigation entry.
- **Constraints:** Lingui for every string, keyboard-reachable form and
  picker, `PasswordInput`'s native masking (never a bespoke masked text
  field), and the picker must support typeahead given realistic table counts
  in the hundreds.

### 7.4a Prototype: the confirmed shape, as a file

Three interaction shapes for the connection step were prototyped and
compared with the user before writing 7.4 above: (A) the connection form and
the saved-item choice expand inline under one `ConnectorRow`, same as the
Sheets tab picker; (B) every saved connection gets its own row; (C) the
row's action becomes a compact `Select`, with a new connection opening in an
anchored popover instead of inline. **Option A was chosen** - it is the
direct extension of the shape this file already mandates ("a new service is
a new row rather than a new layout," copy `GoogleSheetsImportView`), and it
keeps the Connectors tab's one-row-per-service invariant that B breaks and
that C has no reason to abandon yet either.

[`postgres-connector-option-a-prototype.html`](postgres-connector-option-a-prototype.html)
is that chosen shape, colocated with this spec so it can be opened directly
(no Claude account needed) when frontend implementation starts. It is a
static, self-contained HTML/CSS/vanilla-JS mock, not real app code - a
reference for layout, states and copy, not something to adapt or import.
Open it in a browser; the control bar across the top (clearly set off from
the simulated app below it) steps through every state and error case:

- No connection -> choosing a saved database or starting a new one ->
  connection form open -> connecting (loading) -> connection-level error
  (`auth_failed` / `unreachable` / `ssl_required`, one inline, field-adjacent
  message each, per section 7 item 2) -> connected, picking a table or view
  (searchable, grouped by schema) -> previewing (`DatasetImportForm`).
- A "Saved connections exist" toggle shows both the first-time (bare
  connect action) and returning-user (pick-or-add) cases from section 7.4's
  "States" bullet.

The prototype also fixes the exact copy convention from section 7 item 2:
the saved-item affordances read **"Use this database"** and **"New
database"** (not "...connection"), and the saved-database chooser heading
reads "Use a saved database." Treat these three strings, plus the
per-schema/table picker copy, as the literal strings to ship, not
placeholders to rephrase.

---

## 8. Testing references to add

Following `docs/qetl-architecture.md` section 12's own table shape:

| Behaviour | Pinned by |
| --- | --- |
| Source-row reads include the `postgres_table` arm | `getRelationSources.characterization.test.ts` (extend existing file) |
| Postgres CSV-to-Parquet transcode through a real DuckDB reader | new `acquirePostgresTableRelation.executed.test.ts`, mirroring `acquireGoogleSheetRelation.executed.test.ts` |
| Capability record matches section 5.3 exactly | new `PostgresTableWrapper.test.ts`, mirroring `GoogleSheetsWrapper.test.ts` |
| RLS: workspace isolation on all three new/changed tables, including the negative cases `docs/rules/sql.md` requires (outside-workspace select/insert/update/delete all denied, viewer cannot write) | new pgTAP files under `supabase/tests/database/permissions/` |
| Vault secret is never selectable by `anon`/`authenticated` | a pgTAP test asserting `has_column_privilege` is false for those roles on `vault.decrypted_secrets`, plus a test that the edge function's own un-authenticated/under-privileged request is refused before any decrypt is attempted |
| SSRF guard refuses loopback/private/link-local targets | unit test on the shared host-validation helper (section 6, row 21), covering at minimum `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, a DNS name that resolves to one of those |
| **SQL injection: identifier-quoting helper refuses/escapes a crafted schema or table name** (section 5.2 item 5) | unit test covering, at minimum: a name containing a double quote (`"`), a name containing a statement-terminating `;` (`users"; drop table db_connections; --`), a name containing a line comment (`--`) or block comment (`/*`), a name that is itself a reserved keyword, and a name containing a Unicode or null-byte lookalike for a quote character |
| **SQL injection: connection-form value fields never reach a raw query or connection string unparameterized** (host, port, `databaseName`, username, password, `name`) | unit test on `test-and-save`'s input handling, asserting each field is passed to the driver only as a bound parameter/value, never concatenated into SQL or into a shell-style connection string, using injection-shaped payloads in each field (`'; select pg_sleep(5); --`, etc.) |

---

## 9. Future work and the Linear issues tracking it

Per the user's explicit instruction: Supabase Vault is the right answer for
*this* change, because it uses only what the project already runs, it is a
real structural improvement over the plaintext-token precedent (section
5.2), and reaching for a third-party secrets manager to ship the first
database connector would be exactly the kind of parallel, one-off
architecture this spec is supposed to avoid. But Vault is not the ceiling:
a dedicated secrets manager (HashiCorp Vault, AWS/GCP/Azure Secrets Manager,
Infisical, Doppler) would add credential rotation, audit logs of every
decrypt, and a security boundary independent of the application database
itself (a compromised Postgres superuser can still call
`vault.decrypted_secrets`; a compromised Postgres superuser cannot reach a
separate secrets service unless the app's own code is also compromised).
That is real, worth doing, and explicitly not this change.

Seven items to track, filed in Linear as of this revision. Four are new
issues; the other three were already tracked under existing, broader issues,
so each got a linking comment instead of a duplicate.

1. **Evaluate and, if justified, adopt a dedicated secrets manager for
   connector credentials.** Scope: compare the options above against
   Supabase Vault specifically for the gap Vault does not close (rotation,
   independent audit trail, blast radius if the Postgres instance itself is
   compromised); if adopted, `db_connections__postgres.vault_secret_id`
   becomes an external secret reference instead of a Vault id, with a
   migration path for any secrets already created under this spec.
   [AVA-371](https://linear.app/avandar/issue/AVA-371) (new).
2. **Connection management UI: edit, rotate, and delete a saved Postgres
   connection.** v1 only creates connections (section 2, "Out"). Rotating a
   compromised password or decommissioning a server currently requires a
   new connection row and leaves the old one orphaned.
   [AVA-372](https://linear.app/avandar/issue/AVA-372) (new).
3. **Predicate and aggregate pushdown, starting from Postgres.** Postgres is
   the first source type where pushdown is straightforward to implement
   (section 2); scope this as part of designing the capability-driven
   planner `docs/qetl-architecture.md` section 9 already names as
   not-yet-built, not as a Postgres-only special case.
   [AVA-210](https://linear.app/avandar/issue/AVA-210) (existing; linked via
   comment).
4. **Freshness detection across non-Sheets sources, including Postgres.**
   Same known gap named in architecture doc section 13. For Postgres
   specifically, evaluate `pg_stat_user_tables` counters, an `xmin`-based
   watermark, or requiring a `updated_at` column/trigger as an opt-in
   `freshnessSignal` - but this is blocked on the same planner gap as
   pushdown above, since a signal nothing consumes buys nothing.
   [AVA-213](https://linear.app/avandar/issue/AVA-213) (existing; linked via
   comment).
5. **Paging large Postgres tables past the configured
   `maxRowsPerCall`/`maxBytesPerCall` ceiling**, instead of failing the
   acquisition outright (section 2, section 5.4). Requires building the
   mediator's `"paged"` `AcquisitionUnit` consumer for the first time
   (`RelationCapabilities.types.ts` declares the kind; no wrapper or mediator
   code implements it today), so scope this as a shared mediator capability,
   not a Postgres-only fetch loop.
   [AVA-373](https://linear.app/avandar/issue/AVA-373) (new).
6. **Retrofit `tokens__google` onto Supabase Vault.** Once this spec enables
   Vault (section 5.2) for Postgres credentials, `tokens__google.access_token`
   /`.refresh_token` can move off plain-text columns onto the same
   infrastructure at comparatively low cost, closing the exact precedent gap
   section 5.2 declines to repeat for this feature. Explicitly out of scope
   for *this* change (different table, already in production use, its own
   migration and rollout risk), but newly cheap to do once Vault exists.
   [AVA-173](https://linear.app/avandar/issue/AVA-173) (existing; linked via
   comment).
7. **Migrate Google Sheets onto the unified `external-datasets` proxy**
   (section 5.4), retiring `supabase/functions/google-sheets/` as a separate
   edge function. Not done as part of this spec because Sheets' access model
   (the user's own Google OAuth grant, fetched directly) differs in kind from
   Postgres's shared workspace secret, but `ExternalDatasetConnector` is
   already generic enough that this is expected to mean writing a
   `createGoogleSheetsConnector` implementation, not redesigning the
   interface. Leaving two parallel proxy endpoints indefinitely defeats the
   point of unifying on one.
   [AVA-374](https://linear.app/avandar/issue/AVA-374) (new).
