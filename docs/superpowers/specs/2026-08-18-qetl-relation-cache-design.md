# QETL relation cache, authorization and column projection - design

**Status:** Draft for review
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-18
**Spec:** 2 of 6. Parent: `.temp/qetl/final_proposal.md` (revision 6), sections
12, 12.1, 13, 11.2, and the Phase 1 item list
**Related:** `docs/superpowers/specs/2026-08-18-qetl-relation-registry-design.md`
(spec 1, approved), `src/clients/qetl/`,
`src/clients/DuckDbClient/DatasetDuckDbCoordinator/`,
`src/db/dexie/dexieVersions/dexieVersions.ts`,
`src/clients/datasets/LocalDatasetClient/`,
`src/clients/datasets/LocalPublicDatasetRawDataClient/`,
`src/clients/storage/DatasetParquetStorageClient/startDatasetUpload.ts`,
`src/config/AvaQueryClient.ts`,
`.temp/qetl/proposal-questions.md` (Q3, Q10),
`.temp/qetl/proposal-questions-2.md` (Q37)

---

## 1. Problem

Spec 1 gave the engine a vocabulary: a `RelationRef` names a relation, a
`SourceWrapper` fetches it, and a `RelationCapabilities` record says what the
source can be asked. It deliberately changed no behaviour, and it left four
things broken on purpose, because they can only be fixed together.

### 1.1 The cache probe sits on the wrong side of source dispatch

`qetlQueryRunner.ts:33-39` runs, in order: `getMissingDice` (probe the DuckDB
tables), then `getDiceExtractors` (dispatch on `datasets.source_type`), then
`fetchDiceFacts`, and only inside that last call, at
`qetlFactLoading.ts:114`, `_getCachedFact` reads the on-disk Parquet.

So the on-disk probe is **downstream of dispatch**, and dispatch throws for
`google_sheets` (`qetlDiceExtractors.ts:130`). A workspace whose Sheet-backed
Parquet is already sitting in IndexedDB cannot query it, because the code that
would have found it is never reached. The same ordering makes every public
dashboard reload re-download bytes it already holds whenever a table has been
dropped, and it means an added source type must be taught about caching before
its cache can be used at all.

### 1.2 The only access check on the query path is incidental

The workspace session's `getDiceFromSql`
(`WorkspaceQetlClient.ts:118-125`) intersects the relations found in the SQL
with `DatasetClient...getAll(where("workspace_id", "eq", workspaceId))`, which
is RLS-filtered. `getDiceExtractors` then reads `datasets` and the per-source
table again, also RLS-filtered. Neither read was put there to authorize a
query; both are there to find out how to fetch bytes.

The proof that they are not load-bearing by design is exactly the change in
1.1: **moving the on-disk probe ahead of dispatch removes the last access check
from the cache-hit path**, through a pure performance edit with no security
intent. That is why spec 1 refused to reorder anything.

An explicit check is not redundant with RLS, and the reason is topological
rather than about policy quality. Once a relation is Parquet in IndexedDB on a
laptop, Postgres is not in the request path at all. RLS is enforced at the
database; the hit path never reaches the database. **No RLS policy can close a
gap on a path that never queries Postgres.** The two mechanisms cover disjoint
surfaces and both stay.

### 1.3 The cache has no identity, so it cannot be invalidated

`_getCachedFact` (`qetlFactLoading.ts:57-66`) is the whole probe:

```ts
const localDataset = await LocalDatasetClient.getById({
  id: extractor.dataset.id,
});
return localDataset?.parseStatus === "ready" && localDataset.parquetData ?
    ...
  : undefined;
```

A dataset id, and nothing else. Not the principal, not a source version, not
the definition that produced the bytes, not the columns they contain.
Consequences, all live today:

- **A virtual dataset's materialization is never invalidated when its SQL is
  edited.** Spec 1 line 359 declares `freshnessSignal: "none"` for `virtual`
  precisely to record this rather than hide it, and forward-references this
  spec for the fix.
- **The probe is not principal-scoped.** `getMissingDice` probes DuckDB by
  table name alone, and `_getCachedFact` probes IndexedDB by dataset id alone.
- **The public session probes the workspace store.** `_fetchExtractor` calls
  `_getCachedFact` regardless of session, so a public dashboard render can read
  a `LocalDataset` row, which is the visibility mix-up the v8-to-v9 re-key
  existed to prevent, reintroduced one layer up. It is latent rather than
  routine only because `useEnsurePublishedDashboardDatasets` preloads every
  snapshot table before any query runs, so `getMissingDice` normally reports
  nothing missing. **The reordering in 1.1 makes that probe hot, which would
  promote a latent leak to a live one.**

### 1.4 Metadata and payload share a row, so a budget scan reads every blob

`LocalDataset` carries `parquetData: Blob` in the same row as
`parseStatus`, `sourceBytes` and `lastSourceAccessedAt`. The existing
source-bytes evictor shows what that costs:
`LocalDatasetClient.ts:_evictSourceCache` starts with
`await AvaDexie.DB.LocalDataset.toArray()`, which materializes every row,
payload included, to add up sizes. A byte-budget scan over the relation cache
would do the same, once per cache write.

`LocalDataset.parquetData` is also **not only a cache**:
`startDatasetUpload.ts:226-232` reads it as the staging slot for the upload to
Supabase Storage, and upload progress lives in an in-memory store, so a tab
closed mid-upload depends on those bytes surviving. Any design that treats the
column as purely a cache and clears it will break resumable upload.

### 1.5 Cache writes are serialised inside a tab and not across tabs

`DatasetDuckDbCoordinator` is the merged tree's coordination seam. It issues a
branded `DatasetDuckDbLease` that an operation must present as proof it holds
coordination for the relations it touches, and
`_runCoordinatedDatasetDuckDbOperation` queues operations per dataset id. Its
state is module-level `Map`s and a module-level `Set`, which are per-JS-realm.
There is no `navigator.locks`, `BroadcastChannel` or `SharedWorker` anywhere in
`src/`. **Intra-tab serialisation is solved; cross-tab is not**, and two tabs
share one IndexedDB.

The same coordinator holds `invalidDatasetTableIds`, the set of tables marked
unsafe before a raw mutation runs and again after one fails
(`__tests__/DuckDbClient.mutationPoisoning.test.ts`). A poisoned table is a
half-written table. **The probe must consult that set**, or moving the probe
earlier reintroduces the torn read the guard exists to prevent.

### 1.6 Where the proposal and the merged code disagree

Recorded so a reader does not trust the older text over the tree.

| Proposal says | Merged tree | Effect on this spec |
|---|---|---|
| The incidental access check lives in `determineExtractions` | That function does not exist; the reads are in `WorkspaceQetlClient.getDiceFromSql` and `qetlDiceExtractors.getDiceExtractors` | None on the design; the census of what breaks when the probe moves is unchanged |
| Relation extraction uses `node-sql-parser`, whose `tableList` returns CTE names and DDL targets | `DuckDbSqlAnalyzer` already filters both and fails closed; spec 1 section 6 extends its return type only | Proposal section 12 item 4 is **already satisfied** by spec 1. This spec consumes `extractReferencedRelations` and adds no filtering of its own |
| "Materialize Parquet sorted by the entity key" | **No dataset-level key designation exists.** The only entity key in the tree is a concept's identifier attribute, resolved to a dataset column at `getDatasetColumnAssertions.ts:165`, plus `individuals.external_id` | The `ORDER BY` fires for relations with a resolvable key and is a documented no-op elsewhere. Section 10.3 |
| The cache is "a new Dexie version" | The current version is **9**; `CURRENT_AVA_DEXIE_VERSION = "v9"` | The new tables land in **v10**. Section 6 |
| `LocalDataset.parquetData` is a cache | It is also the resumable-upload staging slot | v10 is non-destructive. Section 6.3 |

---

## 2. Goals and non-goals

**Goals.**

1. One **relation cache** with an explicit key, in two tiers behind one port.
2. The **cache probe ahead of source-type dispatch**, so a cached relation is
   reachable whatever its source type declares.
3. **Exactly one authorization home**, enforced by the compiler rather than by
   review.
4. **Column-projected caching** with the superset reuse rule, so one column of
   ten relations costs ten narrow reads.
5. **Invalidation that works**, including a virtual dataset whose SQL changed.
6. **Cross-tab serialisation** of cache writes, on the existing lease.
7. An **LRU byte budget** whose scan does not read payloads.

**Non-goals.** Each is named so this spec stays bounded:

- Registering concept extensions in DuckDB, and what a concept's logical
  definition contains (spec 3)
- Making Google Sheets acquire anything, the Drive `File.version` freshness
  check, its debounce and its explicit-refresh menu item (spec 4)
- Executing pushdown against a real API, and paging (spec 5)
- The auto-limit fix at the `runStructuredQuery` seam, catalog caps and the
  LLM-facing surface (spec 6)
- The R2 migration (proposal section 13). This spec makes the cache cheaper to
  fill; it does not change where blobs live
- Row-level fragments, predicate containment, regions, coalescing, admission
  scoring. Still not built, and this spec adds no reuse tier above exact
  identity plus set containment

**Behaviour change budget: four changes, all listed.** A cached relation
becomes reachable for source types that cannot acquire; an unauthorized
relation returns `forbidden` where it previously returned a DuckDB error about
a missing table; a virtual dataset's edited SQL takes effect; and an acquisition
may fetch fewer columns than before. Everything else is expected to be
observably identical, and section 15 pins that.

---

## 3. Decisions (resolved)

| Decision | Resolution | Why |
|---|---|---|
| One cache or two? | **Two tiers, one port.** `QueryableRelationCache` (DuckDB tables) and `StorageRelationCache` (IndexedDB), both behind `RelationCachePort` | Spec 1 section 7 fixed the names. One port is what lets the public session keep its own store (below) without a second probe path |
| Does the public session move to the new Dexie tables? | **No.** `LocalPublicDataset` stays, behind a second `RelationCachePort` implementation | A published snapshot is immutable, so its identity is already exact (`dashboardId`, `snapshotRevision`, `datasetId`): no freshness, no definition, no projection. Moving it would be blast radius with no benefit, and the port removes the shared-probe leak of 1.3 anyway |
| How is "authorize before probe" enforced? | A **branded `AuthorizedRelations` receipt**, produced only by `authorize()` and **required by `QueryMediator.runQuery`** | The tree already uses exactly this idiom for `DatasetDuckDbLease`. It makes "probed without authorizing" fail to compile, and it makes the compiler list every caller |
| Where does the principal come from? | **From the receipt**, not from ambient state | One value carries the identity that was checked and the identity the key is built from, so they cannot disagree |
| Is the source version part of the lookup? | **No. It is recorded and compared on recheck.** Lookup matches on principal, relation and definition | A version token generally requires a network call (`readFreshness`). Putting it in the lookup would make every hit block on the network, which defeats the cache and breaks offline |
| Is the logical definition part of the lookup? | **Yes, always, synchronously** | It is read from local state (the virtual dataset's `raw_sql` is already in the warm TanStack cache), so it costs nothing and fixes the invalidation bug deterministically rather than eventually |
| How are ambiguities resolved? | **Always toward a miss.** Case-sensitive column comparison, verbatim (unnormalized) definition text, unknown freshness treated as stale on recheck | A false miss costs a refetch. A false hit serves wrong or unauthorized rows. This is the single rule behind most of the details below |
| Column reuse rule | **Hit when `cachedColumns ⊇ neededColumns`**, plus **monotone growth**: a partial miss acquires the union and replaces the narrower entry | Set containment on strings is linear and exact, unlike predicate containment (proposal section 12.1). Monotone growth means at most one live entry per relation and principal, so the probe never scans a family of projections |
| Where do needed columns come from? | **`StructuredQuery` only in Phase 1**; raw SQL uses `"all"` | A `StructuredQuery` names its dataset and its columns. Attributing a bare column reference in raw SQL to one relation needs resolution the analyzer does not do, and `"all"` is always sound. The motivating ontology path is structured |
| Pushdown result cache persistence | **In-memory, per session, bounded entry count** | Persisting third-party API responses raises retention questions nobody has answered. The key is fixed now so spec 5 can promote it to Dexie without changing it |
| Cross-tab mechanism | **`navigator.locks` behind the existing lease**, single acquisition point | Proposal section 12: do not introduce a second locking mechanism beside the branded lease |
| Dexie migration shape | **v10 adds two tables and deletes nothing** | `LocalDataset.parquetData` is also upload staging (1.4). Bytes are reclaimed lazily, and only after a download proved a remote copy exists |

---

## 4. The cache key

**This section is normative for specs 3, 4 and 5.** They cite it; they do not
redesign it. Every other section is a consequence of it.

A cache key has three kinds of component, and conflating them is what makes
cache designs wrong:

| Component | Matched by | Cost of getting it wrong |
|---|---|---|
| principal, relation, definition | **exact equality** | a false hit serves unauthorized or stale rows |
| column set | **containment** (`cached ⊇ needed`) | a false hit serves rows missing a column, which surfaces as a SQL error, not silence |
| source version | **not matched at lookup**; compared during a freshness recheck | matching it at lookup makes every hit block on the network |

### 4.1 The type

```ts
/** Which principal a cached relation belongs to. Never optional. */
export type PrincipalKey = string;

/**
 * The definition that produced a relation's bytes. Opaque text, hashed by the
 * cache and never parsed by it. Section 4.4 lists what each source supplies.
 */
export type LogicalDefinition = {
  /** Discriminates the shape of `text`, for logs and for review. */
  kind: string;
  /** Canonical, verbatim. Never normalized. See section 4.3. */
  text: string;
};

/** The parts of a cache key that must match exactly. */
export type RelationCacheIdentity = {
  principal: PrincipalKey;
  relation: RelationRef.T;
  definition: LogicalDefinition | undefined;
  /** Recorded for invalidation and audit; not part of the lookup. */
  sourceVersion: SourceVersion | undefined;
};

/** A full cache key: an exact identity plus a column set. */
export type RelationCacheKey = RelationCacheIdentity & {
  /** Sorted, deduplicated, case-preserved. `"all"` means every column. */
  columns: readonly string[] | "all";
};
```

### 4.2 The principal key

```text
workspace session:  w:<workspaceId>:<userId>
public session:     p:<bucket>:<dashboardId>:<snapshotRevision>
```

The public form carries no user, because for a published snapshot the snapshot
**is** the authorization boundary: everyone who may see the dashboard may see
its committed bytes. It is otherwise a principal like any other, so one port
and one key type serve both sessions.

`snapshotRevision` is asserted to match `[A-Za-z0-9_.-]+` when the key is
built. A component that could contain a delimiter is hashed, never embedded
raw.

### 4.3 The serialized identity

```text
identityKey = [ principalKey,
                relationTableName,      // RelationRef.toTableName(ref)
                versionToken,           // "v0", else "v1." + hash(version)
                definitionToken,        // "d0", else "d1." + hash(definition)
              ].join("|")

versionToken(v)     = v === undefined ? "v0" : "v1." + sha256Hex128(v)
definitionToken(d)  = d === undefined ? "d0"
                    : "d1." + sha256Hex128(d.kind + "\n" + d.text)
```

`sha256Hex128` is the first 32 hex characters of a SHA-256 digest via
`crypto.subtle.digest`, which is available in every secure context the app
runs in. 128 bits is far past any collision concern for a per-device cache, and
the principal is embedded verbatim rather than hashed, so a hypothetical
collision could only confuse two versions of the same relation for the same
principal.

**The definition text is hashed verbatim.** No whitespace collapsing, no SQL
normalization, no comment stripping. Normalizing would need a parser, and a
normalizer with a bug produces a **false hit**, which is the failure this whole
design refuses. Reformatting a virtual dataset's SQL therefore costs one
rematerialization. That is the correct trade.

`identityKey` is the Dexie primary key. It makes writes idempotent and makes
"which source version produced these bytes" answerable from the row itself.

### 4.4 What the logical definition is, per relation

| Relation | `kind` | `text` |
|---|---|---|
| dataset, `csv_file` / `xlsx_file` | `parquet-object` | storage object path, then the column-replacement signature |
| dataset, `open_data` blob | `parquet-url` | the resolved Parquet URL from the catalog entry, then the column-replacement signature |
| dataset, `virtual` | `virtual-sql` | `raw_sql` verbatim, then the column-replacement signature |
| dataset, `google_sheets` | `sheet-tab` | spreadsheet id, then tab name. Spec 4 fills this in; spec 2 ships the entry with the tab absent |
| concept | `concept-extension` | **Spec 3 owns this.** It must include the contributor dataset ids, the identifier attribute, and the requested attribute mappings, because any of those changing changes the rows |

The **column-replacement signature** is the sorted list of
`originalName>alias:dataType` triples that `_getColumnReplacements`
(`qetlFactLoading.ts:34-55`) derives from `DatasetColumn`. It is in the
definition rather than applied only at load time because a rename must
invalidate the queryable tier, and one key for both tiers is worth more than
avoiding a rare redundant download.

**Wrappers do not supply this.** Spec 1 froze `SourceWrapper` with no
definition method and states that a wrapper knows nothing about caching, and
this spec does not reopen that type. Instead, the cache layer takes a small,
separate injected port:

```ts
/** Supplies the definition that produced a relation's bytes. */
export type RelationDefinitionSource = {
  readDefinition(
    ref: RelationRef.T,
    ctx: WrapperContext,
  ): Promise<LogicalDefinition | undefined>;
};
```

registered per relation kind alongside the wrappers, and for `kind: "dataset"`
implemented as an entry in the same `Record<sourceType, ...>` map that spec 1's
composite dataset wrapper already carries. No new match statement, no change to
a frozen type.

### 4.5 The reuse predicate

```ts
function serves(entry: RelationCacheEntry, key: RelationCacheKey): boolean {
  return (
    entry.principalKey === key.principal &&
    entry.tableName === RelationRef.toTableName(key.relation) &&
    entry.definitionToken === definitionToken(key.definition) &&
    entry.staleAt === undefined &&
    coversColumns(entry.columns, key.columns)
  );
}

function coversColumns(
  cached: readonly string[] | "all",
  needed: readonly string[] | "all",
): boolean {
  if (cached === "all") return true;
  if (needed === "all") return false;
  const cachedSet = new Set(cached);          // case-sensitive, by decision
  return needed.every((column) => cachedSet.has(column));
}
```

Column names are compared **case-sensitively**. DuckDB matches identifiers
case-insensitively but preserves case, and a Parquet file may legally hold both
`A` and `a`, so a case-insensitive comparison could report coverage the file
does not have. Case-sensitive comparison can cause a redundant acquisition,
which is safe.

### 4.6 The pushdown result-cache key

Mode B (section 13) caches a **result**, not a relation. Its key is exact
identity with no containment at all:

```text
resultKey = [ principalKey,
              wrapperName,            // SourceWrapper.name
              relationTableName,
              versionToken,
              "q1." + sha256Hex128(pushedSql),
            ].join("|")
```

`pushedSql` is the exact string handed to `SourceWrapper.pushDown`, with no
normalization beyond trimming leading and trailing whitespace. **Specs 3 and 5
must not add normalization.** A result cache asks "have I run precisely this
query before", and every step toward semantic equivalence is a step toward
predicate containment, which section 2 of the proposal rules out.

Unlike mode A, mode B's `versionToken` **is** part of the lookup, because a
pushdown call is already a network call: there is no offline hit path to
protect, and a stale answer to a live query is worse than a second round trip.

---

## 5. Architecture

```text
  WorkspaceQuerySession.runQuery / PublicQuerySession.runQuery
            |
   extractReferencedRelations            (spec 1, section 6)
            |
      authorize(principal, relations)  ->  AuthorizedRelations | forbidden
            |                                 ^ the only authorization home
      QueryMediator.runQuery(receipt, ...)
            |
      resolveNeededColumns                  (section 10.1)
            |
      QueryableRelationCache.probe          DuckDB tables + poison set
            |
      StorageRelationCache.probe            RelationCachePort
            |
      RelationRegistry.resolve -> SourceWrapper
            |
      mode A: acquire  |  mode B: pushDown  (section 13)
            |
      RelationCachePort.put  ->  DuckDbClient.loadParquet  ->  execute
```

### 5.1 The port

```ts
export type RelationCacheProbeResult = {
  /** Keys this cache can serve, with the entry that serves each. */
  hits: ReadonlyArray<{ key: RelationCacheKey; entry: RelationCacheEntry }>;
  /**
   * Keys it cannot serve. When a narrower entry exists, `growFrom` carries its
   * columns so the acquisition fetches the union (section 10.2).
   */
  misses: ReadonlyArray<{
    key: RelationCacheKey;
    growFrom: readonly string[] | undefined;
  }>;
};

export type RelationCachePort = {
  probe(keys: readonly RelationCacheKey[]): Promise<RelationCacheProbeResult>;
  /** Reads the payload for a hit. Separate call, so a probe reads no blobs. */
  read(entry: RelationCacheEntry): Promise<Blob | undefined>;
  /** Stores one relation. Never throws into the query. Section 9.3. */
  put(write: RelationCacheWrite): Promise<void>;
  /** Forgets every entry for these relations and this principal. */
  evict(
    refs: readonly RelationRef.T[],
    principal: PrincipalKey,
  ): Promise<void>;
};
```

`probe` and `read` are separate calls on purpose: **a probe must never
deserialize a payload**, which is 1.4's lesson expressed in the interface.

Two implementations ship: `DexieRelationCache` (workspace, section 6) and
`PublicSnapshotRelationCache` (an adapter over `LocalPublicDataset`, whose
`probe` matches on `dashboardId`, `snapshotRevision` and `datasetId`, treats
every entry as `columns: "all"`, and whose `evict` is a no-op because a
snapshot is immutable). The mediator holds a port and knows which session it
serves only through that port, which is what closes 1.3's cross-visibility
probe.

`insertToStorageCache` on `IQetlClient`'s options (`QetlClient.ts:26-29`) is
replaced by `relationCache: RelationCachePort`. Both sessions already construct
their own runner options, so this is a one-line change at each construction
site.

### 5.2 The queryable tier

The queryable tier is DuckDB itself plus a per-realm map from table name to the
key it was loaded under:

```ts
type QueryableRelationCacheEntry = {
  tableName: string;
  identityKey: string;
  definitionToken: string;
  columns: readonly string[] | "all";
};
```

Its probe is `getMissingDice`'s successor, `probeRelationCache` (spec 1 section
7), and it reports a **miss** when any of these holds:

1. the table does not exist (`DuckDbClient.getTableOrViewNames`), or
2. no entry is recorded for it (a table loaded by a path that predates this
   spec, for instance the public preload hook), or
3. `serves(entry, key)` is false, or
4. `DatasetDuckDbCoordinator` reports the table invalid, which requires
   exposing the existing `invalidDatasetTableIds` membership test as
   `isDatasetTableInvalid(tableName)`; today it is only reachable through
   `assertWorkspaceDatasetTables`, which throws, and through
   `hasPublicSnapshotDatasetOwner`, which conflates poisoning with public
   ownership.

Cases 2 and 4 additionally **drop the table** before reporting the miss, under
the lease the caller already holds, so the next step reloads it cleanly.

The map is scoped per `(workspaceId, userId)` and **dropped on principal
change**, which is proposal section 12 item 3's second option: on sign-out,
user switch or workspace switch, every relation table is dropped and the map is
cleared. That is defence in depth behind `authorize`, not a substitute for it.

---

## 6. Dexie version 10

The current version is 9 (`CURRENT_AVA_DEXIE_VERSION = "v9"`). The relation
cache lands in **v10**, following the conventions documented at the top of
`dexieVersions.ts`: add `v10` to the `Schemas` type, add a
`AvaDexieVersionManager.defineVersion<10>` block listing **every** model
including the four that already exist, and bump
`CURRENT_AVA_DEXIE_VERSION`.

### 6.1 Two tables, and why

```text
RelationCacheEntry     metadata only, no Blob
  primaryKey:      "identityKey"
  columnsToIndex:  ["tableName", "principalKey", "lastQueriedAt"]

RelationCachePayload   bytes only
  primaryKey:      "identityKey"
  columnsToIndex:  []
```

Splitting them is the whole reason the byte budget is affordable: eviction
sorts `RelationCacheEntry` by the `lastQueriedAt` index and sums `byteSize`
without touching a single payload row. `_evictSourceCache`'s
`LocalDataset.toArray()` is the anti-pattern being avoided.

Indexes are single-column because `DexieDBVersionManager`'s `columnsToIndex` is
typed `Array<keyof M["DBRead"]>`, so Dexie's `[a+b]` compound-index string does
not type-check. Nothing needs one: the probe looks up by the `tableName` index
and filters the handful of candidates in JS (section 6.2 bounds "handful" to
one), eviction uses `lastQueriedAt`, and principal-wide eviction uses
`principalKey`.

### 6.2 The entry row

```ts
type RelationCacheEntryDBRead = {
  /** Section 4.3. Primary key. */
  identityKey: string;
  /** Indexed. `RelationRef.toTableName(ref)`. */
  tableName: string;
  /** Indexed. Section 4.2. */
  principalKey: string;
  relationKind: RelationRef.T["kind"];
  /** Section 4.3. Compared at lookup. */
  definitionToken: string;
  /** The definition itself, for debugging and for review. */
  definitionKind: string | undefined;
  /** Recorded, not matched at lookup. Section 4.1. */
  sourceVersion: string | undefined;
  /** Sorted, deduplicated column names, or `"all"`. */
  columns: readonly string[] | "all";
  /** Payload size in bytes, so the budget scan needs no payload read. */
  byteSize: number;
  /** Indexed. LRU ordering key, in epoch ms. */
  lastQueriedAt: number;
  writtenAt: number;
  /** When set, the entry is never served. Set by a freshness recheck. */
  staleAt: number | undefined;
  /** When the last freshness recheck ran, so section 11.2 can debounce. */
  freshnessCheckedAt: number | undefined;
};
```

**Single live entry rule.** A successful `put` deletes every other
`RelationCacheEntry` (and payload) with the same `(principalKey, tableName)`,
in the same Dexie transaction. So at most one entry exists per relation per
principal, superseded versions never accumulate, and the probe's JS filter runs
over one row. Column growth (section 10.2) is what makes this lossless.

### 6.3 What the migration does, and does not do

**v10 deletes nothing.** `LocalDataset` keeps its shape, including
`parquetData`, because that column is the resumable-upload staging slot
(1.4) and there is no persisted "uploaded" flag to distinguish a staged blob
from a cached one.

Instead:

1. The query path **stops reading `LocalDataset.parquetData`**. After this
   spec its only readers are `startDatasetUpload` and the background
   transcoder that writes it.
2. On a **successful upload**, `startDatasetUpload` clears `parquetData` and
   hands the same blob to `RelationCachePort.put` as a warm entry. So the first
   query after an import does not download anything, and one copy of the bytes
   exists on the device rather than two.
3. Pre-existing staged blobs are reclaimed **lazily and only with proof**: when
   a cache fill for dataset `D` completed by downloading from Supabase Storage,
   the remote copy is proven to exist, and only then is `D`'s
   `LocalDataset.parquetData` cleared. No proof, no clearing.
4. The cache starts **empty**, and existing `LocalDataset` rows are **not
   adopted** as cache entries. Adoption would have to stamp a current
   definition token onto bytes produced by an unknown definition, which is
   precisely the false hit this design refuses; the proposal's own cost model
   already budgets a cache refill.

Virtual materializations, which today land in `LocalDataset` through
`insertToStorageCache` and are never uploaded anywhere, move to the relation
cache and gain a definition token, which is the invalidation fix.

---

## 7. Data flow after the reordering

Spec 1 section 5 numbered the flow and left steps 3 and 4 as placeholders.
Filled in:

1. **Resolve.** `extractReferencedRelations(rawSql)` yields `RelationRef[]`, or
   `unsupported` when the analyzer fails closed. An empty list is not a
   success shortcut: an empty list plus a non-empty statement is `unsupported`.
2. **Look up.** `registry.resolveAll` maps refs to wrappers. Unresolved refs
   become `needs_clarification`.
3. **Authorize.** `authorize(principal, relations)` returns
   `AuthorizedRelations` or `forbidden`. Section 8. **Nothing before this point
   has read a cache.**
4. **Plan columns.** `resolveNeededColumns` produces a
   `Map<tableName, ColumnSet | "all">`. Section 10.1.
5. **Lease.** `DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation`,
   now also taking the cross-tab lock. Section 12.
6. **Probe the queryable tier.** Section 5.2. Hits need no further work.
7. **Probe the storage tier**, for the misses only, through
   `RelationCachePort.probe`, then `read` and `DuckDbClient.loadParquet` for
   each hit. **This is the step that moved.**
8. **Acquire or push down**, for what is still missing, per capability
   (section 13). Only here does source type matter.
9. **Write through**: `RelationCachePort.put`, then load into DuckDB.
10. **Execute**, then record telemetry including
    `cacheHit: "queryable" | "storage" | "result" | "miss"`.

The single ordering fact this spec establishes: **step 7 precedes step 8.**
Today its equivalent is nested inside it.

`_runLeasedQuery` (`qetlQueryRunner.ts:21-60`) becomes this sequence, and
`getDiceExtractors`'s work splits: the parts that decide **how to fetch** move
into spec 1's wrappers, and the parts that decide **whether we already have it**
move into the port.

---

## 8. Authorization

### 8.1 One home, enforced by a type

```ts
declare const AUTHORIZED_RELATIONS_MARKER: unique symbol;

/** Proof that these relations were authorized for this principal. */
export type AuthorizedRelations = Readonly<{
  principal: PrincipalKey;
  relations: readonly RelationRef.T[];
  [AUTHORIZED_RELATIONS_MARKER]: true;
}>;

export type AuthorizationOutcome =
  | { kind: "ok"; authorized: AuthorizedRelations }
  | { kind: "forbidden"; relations: readonly RelationRef.T[] }
  | { kind: "unsupported"; reason: string }
  | { kind: "needs_clarification"; relations: readonly RelationRef.T[] };
```

`QueryMediator.runQuery` **requires** an `AuthorizedRelations`, and only
`authorize()` can produce one. This mirrors `DatasetDuckDbLease`, which the tree
already uses for exactly this purpose, and it converts "there is exactly one
authorization home" from a review promise into a compile error. The receipt also
**carries the principal**, so the identity that was checked and the identity the
cache key is built from are the same value.

There are exactly two `authorize()` call sites, at the top of
`WorkspaceQuerySession.runQuery` and `PublicQuerySession.runQuery`. The proposal
counted **20 direct callers** of those two methods, of which
`runStructuredQueryWithMetadata` is only 4 (`DatasetQueryClient` is 10, plus
`AttributeAssertionClient` and its `getDatasetColumnAssertions`,
`dashboardPublishSnapshots`, `generateIndividuals`, `useMapLayersData`,
`useMapTimeExtent`). Every one of them keeps its access check without being
edited, which is why the session is the placement and the `runStructuredQuery`
seam is not.

### 8.2 What `authorize` actually checks

**Resource-level sharing only.** App-level RBAC (`app_type` plus permission
keys) stays at the route and the UI. `authorize` must never be given role
responsibilities, or the two axes will drift: a user with `gis__can_view_map`
still may not read an unshared dataset, and a user holding the share still
cannot open the app without the role.

- **Workspace session.** Every `kind: "dataset"` ref must appear in the
  RLS-filtered workspace dataset list, read through the same warm TanStack
  query `getDiceFromSql` already uses (`WorkspaceQetlClient.ts:50-58`): same
  query, same cache entry, no new round trip on the common path.
- **Public session.** Every ref must appear in `publishedDatasetIds` for that
  bucket, dashboard and snapshot revision, which
  `PublicQetlClient._getClient` already resolves.
- **Concept refs.** Authorization is the **conjunction over the concept's
  contributor datasets**, re-checked on every hit, per concept rather than over
  an ABox: two concepts drawing on overlapping datasets can be authorized
  differently, and a user may hold `Person` and not `Assessment`. Spec 3 owns
  the contributor list. **In this spec a concept ref returns `unsupported`**,
  which matches spec 1: no wrapper resolves a concept to rows yet.
- Anything else is `forbidden`.

`forbidden` is returned, not thrown, because it is one of the proposal's
defined outcomes and the LLM surface must be able to say so.

### 8.3 Online freshness of the authorization answer

`src/config/AvaQueryClient.ts` sets `staleTime` to `POSITIVE_INFINITY` when
offline and persists for 14 days. **Offline, the authorization answer never goes
stale**, so a revoked user retains access until they reconnect, for up to two
weeks. That is inherent to the offline requirement and is accepted policy, not a
bug this spec introduces. Freshness and authorization are two different gates.

Online, it must not be accepted:

1. When `navigator.onLine` is true and the cached dataset-list answer is older
   than `AUTHORIZATION_MAX_AGE_MS` (default 30,000), `authorize` **awaits** a
   revalidation before answering. One cheap shared request per 30 seconds per
   workspace.
2. On `forbidden`, authorization **evicts** every cache entry for the offending
   `(principal, relation)` pairs from both tiers and drops the DuckDB tables. So
   revocation is sticky: the next attempt fails offline too, without needing the
   network to re-derive the answer.

### 8.4 Exit criteria

- A user whose share for dataset `D` is revoked, with `D`'s Parquet already in
  IndexedDB and its table already loaded in DuckDB, queries `D` while online and
  receives `forbidden`. No rows are returned, and no request for `D`'s bytes is
  made.
- After that `forbidden`, `RelationCacheEntry` holds no row for `D` and this
  principal, and DuckDB holds no table for `D`.
- A statement whose relations cannot be extracted returns `unsupported`, and
  the probe never runs. Asserted by spying on the port: zero `probe` calls.
- Deleting the `authorize()` call from either session fails to compile.
- A public dashboard query for a dataset outside its snapshot's
  `publishedDatasetIds` returns `forbidden`, and does not read the workspace
  cache.

---

## 9. Byte budget and eviction

### 9.1 The budget

```text
budgetBytes = min(RELATION_CACHE_MAX_BYTES,          // default 1 GiB
                  0.4 * (navigator.storage.estimate().quota ?? Infinity))
```

The 1 GiB default matches the existing `SOURCE_CACHE_TOTAL_MAX_BYTES`, so the
two local caches are of the same order and the total stays inside a typical
origin quota. The quota-fraction term exists because a fixed byte budget on a
device with a small quota produces `QuotaExceededError` instead of eviction.

### 9.2 LRU

Eviction runs **before** a write, reserving the incoming byte size:

1. Read `RelationCacheEntry` **only**, ordered by the `lastQueriedAt` index
   ascending. No payload row is read.
2. Sum `byteSize` and delete oldest-first, entry row and payload row together
   in one transaction, until `total + incoming <= budgetBytes`.
3. **Never evict an entry the current query depends on**, identified by the
   `identityKey` set the current probe produced.

`lastQueriedAt` is stamped on every hit, in both tiers, which is why the field
is in the entry table and why the queryable tier also writes it: a relation
served from DuckDB for a week must not be evicted from disk as cold.

### 9.3 A cache failure is never a query failure

`put` catches everything. On `QuotaExceededError` it evicts the oldest 10% of
entries and retries once; if that fails it logs and returns, and the query
proceeds with rows it already has in hand. The one thing `put` may not do is
leave an entry row without its payload, which the single-transaction rule
prevents.

### 9.4 Exit criteria

- Filling the cache past `budgetBytes` leaves total stored bytes at or below
  it, and the surviving entries are the most recently queried ones.
- The eviction scan performs **zero** reads against `RelationCachePayload`
  except for the rows it deletes. Asserted by spying on the table.
- A `put` that throws `QuotaExceededError` twice still returns rows to the
  caller.

---

## 10. Column projection

### 10.1 Deciding what is needed

```ts
function resolveNeededColumns(
  query: StructuredQuery | { rawSql: string },
  relations: readonly RelationRef.T[],
): Map<string, readonly string[] | "all">;
```

- A `StructuredQuery` names its dataset and its columns, so the needed set is a
  read of the query object: selected fields, group-bys, aggregate arguments,
  filter fields, sort fields, and join keys. Miss any of those and the query
  fails loudly at execution rather than silently, because DuckDB rejects an
  unknown column.
- Raw SQL yields `"all"`. Attributing a bare column reference to one relation in
  a join needs name resolution that `DuckDbSqlAnalyzer` does not do, and
  `"all"` is always sound.

**This is the one place the spec fails open, and it is safe in that direction**:
a superset satisfies a subset. Authorization fails closed; projection fails
wide. Both fail toward correctness.

The motivating case is already structured. `getDatasetColumnAssertions.ts`
builds `FROM "<datasetId>"` selecting the identifier column plus one column per
requested attribute, which is exactly "one column from ten relations" for an
individual-centric ontology query.

### 10.2 Acquiring and growing

- A miss with no existing entry acquires `needed ∪ entityKeyColumns`
  (section 10.3).
- A miss where an entry exists but is too narrow acquires
  `needed ∪ entry.columns ∪ entityKeyColumns`, and the write supersedes the
  narrower entry under the single-live-entry rule. **Column sets only ever
  grow**, so the cache cannot thrash between two disjoint projections, and one
  entry always serves or always misses.
- When the union reaches every column the schema declares, the entry is stored
  as `"all"` rather than an enumeration, so the common case stays cheap to
  compare.
- Projection happens **at the source where the wrapper can**, through the
  `columns` field spec 1 already put on `AcquireRequest`. For Parquet that is
  `COPY (SELECT <columns> FROM read_parquet(<url>)) TO <file> (FORMAT PARQUET)`,
  and combined with remote range reads DuckDB fetches only the column chunks it
  needs. A wrapper that ignores `columns` returns every column, which is
  correct; the cache then records `"all"`, because what it holds is what it
  records, never what it asked for.

**Never deduplicate a projection.** Projecting columns away can turn distinct
rows into identical ones, and a `DISTINCT` at projection time silently changes
row multiplicity, which makes every downstream join and aggregate wrong under
bag semantics. No `DISTINCT`, no `GROUP BY`, in a projection COPY.

**Positional alignment does not arise**, and it is worth saying why, because
the proposal worried about it. Two projections of one relation are never loaded
into DuckDB at the same time: the queryable tier holds one table per table name,
the probe demands coverage for the **whole** query, and the single-live-entry
rule keeps one row per relation on disk. So no query ever needs to join two
partial projections back together, and `file_row_number` is not needed for
this. If a future spec loads two projections at once, that decision reopens this
paragraph.

### 10.3 The entity key and sorted materialization

`entityKeyColumns(ref)` resolves to:

- a **concept**: `external_id`, unique per concept by database constraint
  (`supabase/schemas/20.individuals.sql:24`);
- a **dataset** that contributes to a concept: the dataset column mapped to
  that concept's identifier attribute, which
  `getDatasetColumnAssertions.ts:165` already resolves as
  `identifierAttribute.datasetColumn.name`;
- otherwise **empty**, because the merged tree has no dataset-level key
  designation (section 1.6). A dataset with `rowIdentity: "positional"` has no
  key, by declaration.

When the set is non-empty, its columns are added to every projected acquisition
and the materialization appends `ORDER BY <entityKeyColumns>` to the COPY.
Parquet keeps per-row-group min and max statistics, so a point lookup on the key
skips row groups; without the sort, keys scatter across every row group and the
statistics prune nothing. This is one `ORDER BY` at materialization time, and it
is the difference between reading one row group and reading all of them for the
dominant case-management query shape.

Where the key set is empty the `ORDER BY` is omitted. That is a **documented
no-op**, not a silent one: the acquisition telemetry records
`sortedByEntityKey: false`, so how often it fires is measurable rather than
assumed.

### 10.4 Exit criteria

- A structured query needing 2 columns of a 10-column relation issues a COPY
  naming exactly those 2 columns plus the entity key if one exists, and the
  stored entry's `columns` has that same content.
- A later structured query needing 1 of those 2 columns is served from cache:
  `cacheHit` is `"queryable"` or `"storage"`, and the wrapper's `acquire` is not
  called.
- A later query needing an 11th column that is not held acquires the **union**,
  and afterwards exactly one entry exists for that relation and principal.
- A query whose projection would collapse duplicate rows returns the same row
  count as the unprojected query. Asserted on real rows through spec 1's
  executed harness.
- A relation with a resolvable entity key materializes sorted: the COPY text
  contains `ORDER BY`, and reading the file back yields non-decreasing keys.

---

## 11. Invalidation

Two mechanisms, deliberately different, because they have different costs.

### 11.1 Definition change: synchronous, exact, local

The definition token is computed on **every** probe from local state, so a
changed definition is a guaranteed, immediate miss. A virtual dataset's
`raw_sql` is already in the warm TanStack cache, so this costs no network call.

This is the fix spec 1 line 359 forward-references. `virtual` keeps
`freshnessSignal: "none"`, honestly, because it has no freshness token; what it
has is a definition, and that is what the key carries.

### 11.2 Source version change: asynchronous, debounced, online only

The version token is **not** part of the lookup (section 4). Instead:

1. A hit is served immediately, from whatever the entry holds.
2. If the wrapper declares a `freshnessSignal` other than `"none"`, is online,
   and `freshnessCheckedAt` is older than `FRESHNESS_RECHECK_MS` (default
   300,000), a background `readFreshness` runs after the query returns.
3. If the returned token differs from the stored `sourceVersion`, the entry is
   marked `staleAt` and evicted. The **next** query refetches.
4. An explicit refresh forces step 2 immediately and awaits it. Spec 4 wires
   that to a menu item, and owns the Drive `File.version` debounce.

So the hit path makes **zero blocking network calls**, and an upstream change is
visible on the second query rather than the first. That is the honest trade for
an offline-first cache, and the definition mechanism covers everything that can
be known locally.

### 11.3 Exit criteria

- Edit a virtual dataset's SQL, rerun a query that reads it, and the rows
  reflect the new SQL. The old entry is gone, not merely shadowed.
- Reformatting a virtual dataset's SQL without changing its meaning also
  rematerializes. This is asserted, so the false-miss trade is deliberate and
  visible rather than a surprise.
- Rename a dataset column and rerun: the query sees the new name.
- With the source unchanged, a second query performs no `readFreshness` call
  inside `FRESHNESS_RECHECK_MS`.
- A hit while offline returns rows and makes no network call.
- **A relation whose wrapper cannot acquire is still served from cache.** With
  a `google_sheets` dataset's Parquet present in `RelationCachePayload`, a query
  returns rows even though `GoogleSheetsWrapper.acquire` still throws. This is
  the single clearest observable proof that the probe moved ahead of dispatch,
  and it needs nothing from spec 4.

---

## 12. Cross-tab serialisation

**Back the existing lease. Do not add a second mechanism.**

`DatasetDuckDbCoordinator._runCoordinatedDatasetDuckDbOperation` is already the
one place a lease is minted, and every call site that needs coordination demands
a lease by type, so there is exactly one place to acquire a cross-tab lock and
the compiler lists the callers.

```ts
async function withExclusiveLocks<T>(
  names: readonly string[],
  run: () => Promise<T>,
): Promise<T>;
```

- Lock names are `ava:relation-cache:<principalKey>:<tableName>`.
- `navigator.locks.request` takes one name per call, so `withExclusiveLocks`
  nests requests **in sorted order**. The coordinator already sorts its dataset
  ids (`DatasetDuckDbCoordinator.ts:196`); the same total order is what makes
  nested acquisition deadlock-free.
- Read probes take no lock. A probe that races a write either sees the old
  entry or the new one; both are internally consistent, because entry and
  payload are written in one Dexie transaction, and `read` re-reads the entry
  inside the same transaction as the payload.
- When `navigator.locks` is undefined, the coordinator logs once and falls back
  to **last-writer-wins**, explicitly. Web Locks needs a secure context, which
  the app always has in production; the fallback exists so a non-secure
  development origin degrades loudly rather than silently.

### 12.1 Exit criteria

- Two tabs each acquiring the lock for the same relation serialise: the second
  observes the first's completed entry, and no entry exists without its payload.
- The nested acquisition order is asserted to be sorted, so a deadlock is a test
  failure rather than a hung tab.
- With `navigator.locks` stubbed out, the fallback path logs exactly once per
  realm and still completes.

The two-tab test needs two browser realms, which spec 1's `environment: "node"`
harness cannot provide, so it lands as a Playwright two-page test. Section 17
records the consequence if that harness is not available in Phase 1.

---

## 13. Two acquisition modes

Proposal section 11.2, with the cache columns filled in. **Selected by declared
capability, never by source type.**

| Condition on `capabilities` | Mode | What is cached | Key | Reuse |
|---|---|---|---|---|
| `predicatePushdown === "none"` and `wholeRelationAcquirable !== "no"` | **Relation acquisition** | the whole relation, optionally column-projected | section 4.3 plus the column set | exact identity, column containment |
| `predicatePushdown !== "none"` and `wholeRelationAcquirable === "no"` | **Pushdown** | the **result** | section 4.6 | exact query identity only |

```text
const wrapper = registry.resolve(ref);
match(wrapper.capabilities.predicatePushdown)
  .with("none", () => acquireThroughWrapper(wrapper, ref, neededColumns))
  .otherwise(() => pushDownThroughWrapper(wrapper, ref, pushedSql));
```

Spec 1 created this branch and left the second arm unreachable, because only
`concept` declares pushdown and `ConceptWrapper` still delegates to
`AttributeAssertionClient`. **This spec keeps it unreachable and defines its
cache**, so spec 3 and spec 5 add a wrapper rather than a cache design.

Two cases the table does not cover, and their rulings:

- **Both true** (`predicatePushdown !== "none"` and acquirable). A concept is
  this case. Rule: **prefer pushdown**, because the source can return fewer
  rows, and the proposal's fixed rule is to push down the maximum the source
  accepts rather than to enumerate plans. No cost model, no search.
- **Neither** (`predicatePushdown === "none"` and not acquirable). This is
  unsatisfiable: nothing can answer. Rule: `unsupported`, and a registry-level
  test asserts no registered wrapper declares that combination, so the case is
  caught at declaration time rather than at query time.

The result cache is **in-memory, per session, bounded at 64 entries, LRU**, and
holds `QueryResult` values rather than blobs. Spec 5 may promote it to Dexie by
adding a version; the key does not change when it does.

**Quota is counted per external service, not per source type**, so the counter
spec 4 needs for Sheets' project-global 300 per minute is the same counter spec
5 needs for HDX's `429`. This spec reserves `SourceWrapper.name` as the counter
key and counts nothing yet.

---

## 14. Module layout

```text
shared/models/relations/                    additive; nothing frozen changes
  RelationCacheKey/
    RelationCacheKey.types.ts               key, identity, definition, principal
    RelationCacheKey.ts                     tokens, identityKey, serves
    RelationCacheKey.test.ts
  RelationCachePort/
    RelationCachePort.types.ts              the port, probe result, write

src/clients/qetl/
  QueryMediator/
    relationLoading.ts                      section 7, steps 4 to 9
  authorize/
    authorize.ts                            only AuthorizedRelations producer
    authorize.test.ts
  RelationCache/
    DexieRelationCache/                          workspace port implementation
    PublicSnapshotRelationCache/                 LocalPublicDataset adapter
    relationCacheEviction.ts                     budget and LRU
    RelationDefinitionSource/                    section 4.4
  resolveNeededColumns/
    resolveNeededColumns.ts                      section 10.1

src/db/dexie/dexieVersions/dexieVersions.ts      v10, section 6
src/models/RelationCacheEntry/                   Dexie model and parsers
src/models/RelationCachePayload/

src/clients/DuckDbClient/DatasetDuckDbCoordinator/
  DatasetDuckDbCoordinator.ts             + isDatasetTableInvalid,
                                          + withExclusiveLocks
```

`shared/models/relations/RelationCacheKey/` holds only types and pure
functions, so the key is computable from an edge function or the future Tauri
shell. Everything that touches Dexie, DuckDB or auth stays under
`src/clients/`.

---

## 15. Testing

Characterization first, as in spec 1: the behaviours listed in section 2's
change budget are the only ones allowed to move, and the rest are pinned before
any reordering lands.

| Area | Test |
|---|---|
| `identityKey` | Deterministic for the same inputs. Changes when any of principal, relation, definition or version changes. A definition differing only in whitespace produces a different token, asserted, because that is a deliberate choice |
| `serves` | Exact match on principal, relation and definition. `cached ⊇ needed` hits; `needed ⊄ cached` misses; `"all"` covers everything; `needed === "all"` misses an enumerated entry. Case difference misses |
| Probe ordering | With a wrapper whose `acquire` throws, a query for a relation present in the storage tier returns rows. This is the reordering, tested directly |
| Poisoned table | With the table marked invalid, the queryable probe reports a miss, drops the table, and the storage tier reloads it. The mutation-poisoning suite is extended, not duplicated |
| `authorize` | Each outcome. Two call sites only, asserted by a test that greps the module graph for producers of `AuthorizedRelations`. Concept refs return `unsupported` |
| Revocation | Section 8.4, including the eviction that makes it sticky |
| Eviction | Section 9.4, including the zero-payload-read assertion |
| Projection | Section 10.4, on real rows through the executed harness |
| Invalidation | Section 11.3, including the Sheets-cache criterion |
| Cross-tab | Section 12.1 |
| Dexie v10 | Opening a v9 database yields a v10 database with both new tables, all four pre-existing stores intact, and every `LocalDataset.parquetData` still present. The migration is asserted to be non-destructive |
| Mode selection | Every registered wrapper's capability record selects exactly one mode; the unsatisfiable combination is asserted absent |

**Regression guard for the whole spec:** a bookmarked `?sql=` URL, including one
containing a CTE, returns what it returned before, for a user who is authorized.
Proposal section 16 makes this permanent.

---

## 16. Exit criteria, consolidated

The Phase 1 exits this spec owns, restated as observations:

1. A relation cached on disk is queryable even when its wrapper cannot acquire
   (11.3).
2. A structured query needing 2 of 10 columns acquires 2, and a later query
   needing 1 of those 2 hits the cache without calling the wrapper (10.4).
3. Editing a virtual dataset's SQL yields fresh results (11.3).
4. A revoked user gets `forbidden` rather than cached rows while online, and
   the cached rows are gone afterwards (8.4).
5. Two tabs writing concurrently do not corrupt the cache, and no entry exists
   without its payload (12.1).
6. The byte budget holds, and its scan reads no payloads (9.4).
7. Deleting either `authorize()` call fails to compile (8.4).

Phase 1 items **not** owned here, so a reader does not expect them: the Sheets
Picker and `drive.file` import (spec 4), HDX and executed pushdown (spec 5), the
auto-limit at the `runStructuredQuery` seam (spec 6).

---

## 17. What this spec deliberately leaves open

Recorded so the next author does not read silence as an answer.

1. **A concept's logical definition.** Section 4.4 names the fields it must
   include and stops there, because concept materialization is spec 3's. Until
   then a concept ref returns `unsupported` and is never cached.
2. **Needed columns from raw SQL.** Phase 1 uses `"all"`. Extending
   `DuckDbSqlAnalyzer` with column-to-relation attribution is **not
   scheduled**, and no spec owns it. It should be scheduled only if telemetry
   shows raw SQL dominating the individual-centric path, which the
   `selectivityBucket` and `predicateAttributeCount` fields the proposal
   already specifies will show.
3. **A dataset-level entity key.** There is none in the tree (1.6). Sorted
   materialization therefore fires for concepts and for concept-contributing
   datasets only, and `sortedByEntityKey: false` measures the rest. Designating
   a dataset key is a data-model change nobody has asked for.
4. **Persisting pushdown results.** Deliberately in-memory (section 13).
   Whether a third-party API response may be written to a user's disk, and for
   how long, is a retention question for spec 5 with spec 6's privacy surface.
5. **Public snapshots stay on `LocalPublicDataset`.** The asymmetry is
   intentional (section 3). If a later spec needs snapshot projections or
   snapshot freshness, that is when the two stores merge, and the port means the
   merge changes no caller.
6. **The two-tab test's home.** It needs two browser realms, which spec 1's
   node harness cannot host. If a Playwright pair-page test is not available in
   Phase 1, the fallback is the explicit `navigator.locks` unit test plus a
   recorded manual verification, and the automated version is owed. Do not
   silently drop the criterion.
7. **`FRESHNESS_RECHECK_MS`, `AUTHORIZATION_MAX_AGE_MS` and
   `RELATION_CACHE_MAX_BYTES` are defaults, not findings.** They are stated so
   they can be tuned against telemetry rather than argued about now.

---

## 18. Risks

| Risk | Mitigation |
|---|---|
| Moving the probe ahead of dispatch removes the incidental access check, which is the exact hole this spec exists to close | `authorize` and the reordering land in **one** change, and the `AuthorizedRelations` receipt makes the ordering a compile-time fact rather than a review outcome. The probe cannot be reached without a receipt |
| The probe becomes hot, promoting 1.3's latent cross-visibility leak to a live one | The port is chosen by the session, so the public session physically cannot read the workspace store. Tested |
| A definition token that is computed inconsistently produces false hits, which is the worst failure mode available | The definition is opaque text hashed verbatim, computed in one pure function with its own test suite, and every ambiguity in the design resolves toward a miss |
| The column set makes the cache key harder to reason about, and a superset rule invites a "close enough" reuse tier later | Containment is on a small set of strings, is exact and linear, and is bounded by the single-live-entry and monotone-growth rules so only one row is ever a candidate. Predicate containment stays out, by decision and by the absence of any predicate in the key |
| A projection silently changes row multiplicity | No `DISTINCT` in a projection COPY, stated as a rule and asserted on real rows through the executed harness |
| A Dexie migration that moves Parquet blobs can strand a resumable upload or brick the database if the upgrade transaction fails midway | v10 adds tables and deletes nothing. Bytes are reclaimed lazily, and only after a download proved a remote copy exists |
| The cache is filled by a background transcoding path and read by the query path, so the two can disagree about what "ready" means | The write-through hand-off in 6.3 means the upload path and the query path share one entry, written once, with one identity |
| `navigator.locks` is unavailable and last-writer-wins corrupts a payload | Entry and payload are written in a single Dexie transaction, so the failure mode of last-writer-wins is a superseded entry, never a torn one. The fallback logs |
| The offline authorization window is up to 14 days, and someone will read that as a security bug | Stated explicitly as accepted policy in 8.3, with the online criterion tested and the eviction making revocation sticky once seen |
| The budget interacts with the existing 1 GiB source-bytes cache and a device quota that neither knows about | The quota-fraction term in 9.1, plus 9.3's rule that a cache write failure never fails a query |
