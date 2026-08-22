# Lane E: adversarial review of the registry track (tasks 6 to 14)

**Written:** 2026-08-19, against the merged tree at `7d28c17f`.
**Why this exists.** Both handoffs record the same owed obligation: the phase-1
session's tasks each went through implementer, spec-compliance and code-quality
review, and the quality stage found a real defect in **every one**. The registry
session's tasks 6 to 14 have passing tests and no equivalent review. Green and
reviewed are different bars.

## Coverage, stated honestly

Reviewed: `RelationRegistry.ts`, `createDefaultRegistry.ts` and its test,
`getRelationSources.ts`, `relationLoading.ts`, `queryRunner.ts`, and a
tree-wide sweep for rename damage and banned naming.

**Not reviewed:** the internals of `DatasetParquetWrapper`,
`VirtualDatasetWrapper`, `GoogleSheetsWrapper`, `ConceptWrapper`,
`extractReferencedRelations`, the `DuckDbSqlAnalyzer` changes, and the
`conceptRelation/` modules. Those remain unreviewed and should not be described
as having passed a review.

---

## Findings

### 1. HIGH: the security-critical docstring now points at symbols that do not exist

`src/clients/qetl/assertWorkspaceMembership/assertWorkspaceMembership.ts:16,20`

The comment cites **`WorkspaceQetlClient`'s `getDiceFromSql`**. Task 13 renamed
both: the class is `WorkspaceQuerySession` and the function is
`getQueryDependencies`. Neither name exists anywhere in the tree now.

This is the highest-consequence rot in the set, because of what that docstring
carries. It is the module comment holding the rule that `authorize()` is a
**principal-level** check only, and that the per-relation check lives in
`getDiceFromSql`, so a cache probe wired ahead of source dispatch must carry its
own per-relation workspace check. The phase-1 handoff says explicitly: _"This
rule is also in the `assertWorkspaceMembership` module doc comment. If you
change one, change both."_

The rename changed one and not the other. A future session following that
pointer finds nothing, on the single seam whose documented failure mode is that
it **looks guarded when it is not**.

**Fix:** update both names, and re-point the reference at
`getQueryDependencies`.

### 2. HIGH: `RelationRegistry` exports `resolve` and `resolveAll`, which are banned

`src/clients/qetl/RelationRegistry/RelationRegistry.ts:41,44,178,180`

`docs/rules/typescript.md:272`: _"Never name a conversion `resolve...`. It names
neither side, so the reader learns nothing about what went in or what comes
out."_ and _"This rule covers exported functions that convert, derive, or look up
a value."_ A registry lookup is exactly that.

This is not a newly discovered rule. `COORDINATION.md` section 6 already recorded
it as owed: _"The registry session's shipped `RelationRegistry` still exports
`resolve` / `resolveAll` and must be renamed to match; that is Task 13 work and
is not done yet."_ The registry handoff nonetheless states **"Task 13 detail.
Renames done."** That claim is false on this point.

Also carrying the word: the types `ResolvedRelation` and `ResolvedRelations`, and
the `resolved` field of the partition result.

Note the rule's own exception applies elsewhere and those are **not** findings:
`Promise.resolve` and deferred `.resolve()` are the promise sense, which the rule
explicitly excludes.

**Fix:** `getWrapperForRef` already exists as the free function and names both
sides. The members want the same treatment, for example `getWrapper(ref)` and
`getWrappersForRefs(refs)`.

### 3. MEDIUM: `probeRelationCache` takes a word reserved for a different concept

`src/clients/qetl/QueryMediator/getRelationSources.ts:33`, used at
`queryRunner.ts:33`.

Both handoffs, and the reconciled rename tables in both the registry design spec
and its plan, say the same thing: **`probe` is reserved for `RelationCachePort`;
nothing else may be a probe**, and this function is to be called
`getRelationsNotInMemory`.

The subsystem now has three unrelated "probe" concepts:

| Name                                                                           | What it actually is                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `RelationCachePort.probe`                                                      | storage tier; returns hits and misses, a miss may carry `growFrom` |
| `probeRelationCache`                                                           | in-memory DuckDB tier; returns ids not currently loaded            |
| `_PROBE_ID` / `_PROBE_REF_BY_KIND` / `probeRef` (`RelationRegistry.ts:76-117`) | a sentinel ref used to interrogate which kinds a wrapper claims    |

The third is a use of the word nobody had noticed. The collision matters most
because the cache probe wiring is the next task on this path, and it is the task
whose documented failure mode is a reviewer assuming the seam is already
handled.

`src/clients/DuckDbClient/csvParse/csvQuoteProbe.ts` also uses the word but is
pre-existing and unrelated to QETL, so it is out of scope here.

### 4. MEDIUM: "All `dice`/`cube` vocabulary is gone" is not accurate

Task 13's claim does not hold, and the leftovers now disagree with the types they
describe:

| Location                       | Leftover                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `queryRunner.ts:33,34`         | `const missingDice = await probeRelationCache(...)`                                                                                                                                                                            |
| `relationLoading.ts:213,217`   | `storedFacts`                                                                                                                                                                                                                  |
| `relationLoading.ts:216`       | `factsToCache`                                                                                                                                                                                                                 |
| `relationLoading.ts:96`        | comment cites `_downloadStoredDatasetFact`                                                                                                                                                                                     |
| `getRelationSources.ts:49-154` | the whole `Extractor` family: `_getCsvExtractors`, `_getXlsxExtractors`, `_getVirtualExtractors`, `_getOpenDataExtractors`, `_refuseGoogleSheetsExtractors`, `_EXTRACTOR_READER_BY_SOURCE_TYPE`, `_getExtractorsForSourceType` |

The `Extractor` family is the notable one: every one of those functions returns
`RelationSource[]`, so the names contradict the type. `DiceExtractor` was renamed
to `RelationSource` but its readers were not.

### 5. MEDIUM: the rename was an over-broad find/replace, and prose was collateral

Caught during the merge, recorded here because it is a property of the task 13
work rather than of the merge. The replacement hit English words, not just
symbols:

- `emitChatTurnAnalytics.ts` — "the facts only the server knows" became "the
  **relations** only the server knows", which pushed the line past `max-len` and
  **failed `pnpm lint`**.
- `AnalyticsEvents.types.ts` — "group them after the fact" became "after the
  **relation**".
- `AnalyticsEvents.constants.ts` — "describe facts only the server knows",
  "these are row facts".
- `dashboardSnapshotTransitions.ts` — "whose write in fact landed" became "in
  **relation** landed".
- `PublicDatasetParquetStorageClient.ts` — "data cubes and dice", plus a mangled
  reflow leaving a dangling comment line.

All five are restored. **I swept the qetl, `DuckDbSqlAnalyzer` and
`runStructuredQuery` trees for the same damage and found none**, so the
corruption appears confined to the analytics and dashboards prose that the merge
already repaired. That sweep is worth repeating if any further bulk rename runs.

The lint failure is the point worth keeping: it is the second time this project
has shipped a `max-len` failure that the first three verification commands do not
catch. `pnpm lint` is not optional.

### 6. LOW-MEDIUM: the weak registry test is still weak

`src/clients/qetl/wrappers/createDefaultRegistry.test.ts:63-66`

```ts
expect(dataset?.acquire).toBeInstanceOf(Function);
expect(dataset?.pushDown).toBeUndefined();
```

The registry's own handoff flagged this and it is unaddressed. One correction to
that flag, in fairness: it is **not purely** a restatement of the type system,
because `acquire` and `pushDown` are both optional, so their presence and absence
are real runtime facts. The genuine weakness is different: it asserts the
**wrapper's declaration** rather than the **mediator's choice**. The comment
above it claims "the mediator can never choose an acquisition path a concept does
not implement", and the test does not exercise the mediator at all.

Replace with an assertion that the mediator chooses pushdown for a concept and
acquisition for a dataset, once there is a decision to observe.

### 7. LOW: `probeRelationCache` states its filter as a double negative

`getRelationSources.ts:41-46` computes
`difference(deps, deps.filter(id => inMemory.has(id)))`, which is
`deps` minus `deps` intersected with in-memory. `deps.filter(id => !inMemory.has(id))`
says the same thing directly. The current form also silently collapses duplicate
ids in `queryDependencies`, which the direct form would preserve.

### 8. LOW: `getRelationSources(relation: readonly Dataset.Id[])`

The parameter is a list of dataset ids but is named singular, and named for a
relation while typed as a dataset id.

---

## Checked and found clean, so nobody re-checks

These were live suspicions. Each was investigated and is **not** a defect.

1. **The local cache probe survived the cutover.**
   `relationLoading.ts:104` runs `_getCachedRelationBytes` before wrapper
   resolution. The documented landmine ("if Task 12 drops it, offline reads
   regress") did not happen.
2. **Parallel `loadParquet` in `loadRelationBytes` is pre-existing, not a
   regression.** `promiseMap` is `Promise.all`, so the loads race under a single
   lease while `fetchRelationBytes` directly above is deliberately sequential.
   That inconsistency reads oddly, but the old `qetlFactLoading.ts:185` did the
   same thing before the cutover, so it is not registry work. Worth its own
   look someday, since the coordinator's pre-leased branch does no queueing.
3. **`_getCachedRelationBytes` cannot serve resumable-upload staging bytes.**
   `LocalDataset.parquetData` doubles as upload staging, but both that path
   (`startDatasetUpload.ts:226`) and the cache probe gate on
   `parseStatus === "ready"`, so the probe cannot pick up a partial upload.
4. **The four non-null assertions in the source readers are sound.**
   `options.datasetsById[sourceDataset.datasetId]!` is safe by construction:
   the ids passed to each reader are derived from the datasets that populated
   `datasetsById`. Sound but undocumented; a one-line comment would stop the
   next reviewer re-deriving it.

---

## Also outstanding, inherited from the merge report

- `PublicQuerySession.ts:182` docstring still cites `WorkspaceQetlClient`.
- `WorkspaceQuerySession.ts` keeps the internal names `IWorkspaceQetlClient`,
  `WorkspaceQetlClientOptions`, `_createWorkspaceQetlClient`,
  `_createGetWorkspaceQetlClient`.
- `QueryMediator.types.ts` — "Get the necessary **relation** to answer the given
  SQL query" should be plural.
- `getWrapperForRef`'s cast is justified by a comment rather than a proof. The
  comment is a good one and the argument holds, but it is still an assertion the
  compiler does not check.

## Suggested order

Finding 1 first and on its own, because it guards the next task on this path.
Then 2, 3 and 4 together as one naming pass, since they are the same unfinished
Task 13 and touch overlapping files. 6 when the mediator has an observable
choice. 5's sweep only if another bulk rename runs.
