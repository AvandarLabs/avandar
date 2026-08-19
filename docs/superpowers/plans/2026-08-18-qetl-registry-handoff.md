# QETL registry track: session handoff

**Written:** 2026-08-18, late evening, by the registry session.
**Read this first, then `.temp/qetl-impl/COORDINATION.md` (path below).**
**Purpose:** resume this work in a fresh session with no other context.

---

## 1. Where the work is

| | |
|---|---|
| **Worktree** | `/Users/pablo/src/worktrees/avandar/feat/qetl-registry` |
| **Branch** | `feat/qetl-registry` |
| **Base commit** | `cf851570` (branched from `feat/qetl-impl`) |
| **Committed?** | **No. Nothing is committed.** Pablo asked for the work to stay dirty for review. |
| **Backups** | `/private/tmp/claude-501/-Users-pablo-src-worktrees-avandar-feat-qetl-impl/907e04be-0fb8-4c3a-ab84-713d4952d676/scratchpad/backup-*/` (7 snapshots, each `untracked.tar` + `modified.diff`) |

**Do not commit without asking Pablo.** His standing rule is no commits, pushes,
merges or PRs by default.

### The other session

A second Claude session works `feat/qetl-impl` in
`/Users/pablo/src/worktrees/avandar/feat/qetl-impl`. **Contract:**

```
/Users/pablo/src/worktrees/avandar/feat/qetl-impl/.temp/qetl-impl/COORDINATION.md
                                                  .../PHASE1_STATUS.md   (theirs)
                                                  .../REGISTRY_STATUS.md (ours)
```

`.temp/` is gitignored and per-worktree, so read those by absolute path.

Message that session with
`SendMessage({to: "uds:/tmp/cc-socks/21074.sock", ...})`. Messages may be held
for their user's approval, so never block on a reply.

**We are currently independent of them.** Pablo confirmed this and had the
`PHASE1_STATUS.md` poll killed to stop burning tokens. **He will tell you when
phase 1 lands.** Do not re-arm a poll.

### CRITICAL: this tree holds their uncommitted work too

To keep their callers in my compile set I ran `git cherry-pick -n <sha>` then
`git reset` for these, so they are **uncommitted in this worktree** and will look
like our changes in `git status`:

```
b5a7b5ce  docs(qetl): move the executed structuredQueryToSql suite out of shared/
a4a7e210  fix(gis): surface didAutoLimit instead of silently truncating a layer
5d58f935  feat(qetl): let a relation column describe an array-valued attribute
96070803  Add relation cache storage layer: Dexie v10 and DexieRelationCache
7a28ddb9  Parallelize independent token hashes; add evict() test coverage
```

**So these paths are THEIRS, not ours.** Do not review them as our work and do
not edit them:

```
src/clients/qetl/RelationCache/            src/models/RelationCacheEntry/
shared/models/relations/RelationCacheKey/  src/models/RelationCachePayload/
shared/models/relations/RelationCachePort/ src/db/dexie/dexieVersions/
shared/models/relations/RelationSchema/    src/views/GisApp/**
shared/analytics/**                        src/clients/dashboards/**
src/clients/queries/runStructuredQuery/runStructuredQuery.{types,test}.ts
src/views/DataExplorerApp/useDataQueryAnalytics/**
src/clients/storage/PublicDatasetParquetStorageClient/**
supabase/functions/chat/**                 tests/e2e/**
```

**Not yet picked up:** `24654dd5`, `4ad96d43`, `207622fe`, `25a79377` (their two
Criticals, the UUID dedupe, and the `probe()` port reshape). **Nothing on the
demo path needs them.** Take them with
`git cherry-pick -n 25a79377 && git reset` when spec 2 consumption starts.

---

## 2. Verify the tree before changing anything

```bash
cd /Users/pablo/src/worktrees/avandar/feat/qetl-registry
pnpm test:frontend      # expect 2570 passed | 2 todo   (432 files)
pnpm test:executed      # expect 22 passed              (4 files)
pnpm type-check         # expect exit 0 (runs tsc -b AND deno check)
npx eslint src/         # expect no output
```

If any of those is red before you edit, stop and find out why; they were all
green at handoff.

**`pnpm type-check` runs `deno check shared` too.** A file under `shared/`
importing `@/…` fails it. That is why the executed suites live in
`src/lib/sql/__tests__/` and not beside their modules.

---

## 3. What is DONE

### Plan tasks (`docs/superpowers/plans/2026-08-18-qetl-relation-registry.md`)

Tasks 1-5 are the other session's, already committed in our base. **Ours:**

| Task | Deliverable |
|---|---|
| 6 | `DuckDbSqlAnalyzer` read analysis returns `relations: RelationRef.T[]` |
| 7 | `RelationRegistry` with construction-time validation |
| 8 | `extractReferencedRelations` adapter |
| 9 | `DatasetParquetWrapper` (`csv_file`, `xlsx_file`, `open_data`) |
| 10 | `VirtualDatasetWrapper`, `GoogleSheetsWrapper` (still throws, by design) |
| 11 | `ConceptWrapper` + `buildConceptQueryResult` moved out of `runStructuredQueryWithMetadata` |
| 14 | executed row-level suite for `structuredQueryToSql` |
| **12** | **Cutover done.** Both `source_type` match statements are gone. |
| **13** | **Renames done.** |

**Task 12 detail.** `relationLoading.ts`'s `_fetchRelationSource` resolves through
the registry to `wrapper.acquire`; `getRelationSources.ts` replaced its `match`
with an exhaustive `Record<Dataset.T["sourceType"], reader>`. The local cache
probe (`_getCachedRelationBytes`) deliberately stays **ahead** of resolution, so
spec 2's reordering still has an untouched seam.

**Task 13 detail.** `QetlClient/`→`QueryMediator/`, `WorkspaceQetlClient/`→
`WorkspaceQuerySession/`, `PublicQetlClient/`→`PublicQuerySession/`,
`qetlDiceExtractors.ts`→`getRelationSources.ts`, `qetlFactLoading.ts`→
`relationLoading.ts`, `qetlQueryRunner.ts`→`queryRunner.ts`. Symbols:
`getDiceExtractors`→`getRelationSources`, `getMissingDice`→`probeRelationCache`,
`getDiceFromSql`→`getQueryDependencies`, `DiceExtractor`→`RelationSource`,
`ExtractedFact`→`AcquiredRelationBytes`. All `dice`/`cube` vocabulary is gone.

### Specs drafted (in `docs/superpowers/specs/`)

- `2026-08-18-qetl-relation-cache-design.md` (spec 2, 1168 lines)
- `2026-08-18-qetl-concept-relations-design.md` (spec 3, 853 lines)
- `2026-08-18-qetl-google-sheets-design.md` (spec 4, 817 lines)
- `2026-08-18-qetl-spec-decisions-log.md` — **read this**, it holds Pablo's
  decisions and the corrections to specs 2 and 3.

**Drafts, not approved.** Pablo reviewed them verbally; nobody has signed them off.

### Spec 3 (concepts, THE DEMO ITEM): steps 1-3 done, step 4 half done

The nine-step minimum demo path is spec 3 §14.

- **Step 1 done.** Verified the throw at `structuredQueryToSql.ts:48-50` and the
  aggregation gate at `:84` exist exactly as specced.
- **Step 2 done.** `ava_rows_<datasetId>` row-numbered view created beside the
  dataset's public view in `duckDbParquetLoad.ts`. Name helper is
  `getRowNumberedViewName` in `duckDbSqlText.ts`.
- **Step 3 done.** `first` determinism fixed in **both** copies of the value
  pickers: `getSQLSelectOfMapping.ts` and `AttributeAssertionClient.ts`.
- **Step 4 half done.** Two new pure modules under
  `src/clients/qetl/QueryMediator/conceptRelation/`:
  - `toCsvColumn.ts` — RFC 4180 writer for the spine. 6 executed tests.
  - `buildConceptViewSql.ts` — builds the `CREATE OR REPLACE VIEW`. 8 executed
    tests proving grain, NULL-not-lost-row, `first` determinism over ten runs,
    `most_frequent` tie-break, array collection, typed NULL, stable SQL.

---

## 4. RESUME HERE: finish step 4

Both halves of step 4 that remain need **real data**, not SQL generation.

### 4a. The spine loader

Write `src/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine.ts`:

```ts
// 1. Authoritative rows from Postgres.
const individuals = await IndividualClient.getAll(
  where("concept_id", "eq", conceptId),
);
// 2. One column as CSV text; no user data enters a SQL string.
const fileText = toCsvColumn("external_id", individuals.map(prop("externalId")));
// 3. Existing tested loader.
await DuckDbClient.loadCsv({
  tableName: `${RelationRef.toTableName(ref)}__individuals`,
  fileText,
  datasetDuckDbLease,
});
```

**Obligation carried over from `toCsvColumn`:** reject an empty `external_id`
here, loudly. DuckDB maps a quoted empty CSV field to **NULL**, so an empty id
cannot round-trip; the row survives but its key becomes NULL and matches no
contributing dataset row. `toCsvColumn`'s tests assert that limitation. The CSV
writer cannot fix it because it does not know what the column means; the spine
builder can.

### 4b. The column resolver

Write the function that turns concept metadata into
`ConceptAttributeColumn[]` for `buildConceptViewSql`. Mirror
`getDatasetColumnAssertions.ts` lines ~100-160, which already does the joins:

1. `ConceptAttributeClient.getAll({ where: { concept_id: { eq: conceptId } } })`
2. `ConceptAttributeClient.getAllAttributeMappings({ attributes })`
3. `DatasetColumnClient.getAll(where("id", "in", mappedColumnIds))`
4. Identifier attribute **per contributing dataset** gives
   `primaryKeyColumnName` — see `_getIdentifierAttributeMappings`.
5. `mappingType === "manual_entry"` → `{ kind: "unmapped", duckDbDataType }` via
   `DuckDbDataTypeUtils.fromDatasetColumnType(attribute.dataType)`.
6. `attribute.isArray` → set `isArray: true`; the builder emits
   `list(... ORDER BY file_row_number)`.

Then `DuckDbClient.runRawQuery(buildConceptViewSql({...}))` under the lease.

**Write an executed test with a fake concept before wiring the UI.** The pure
builder is covered; the resolver is where a wrong identifier-attribute lookup
would silently produce all-NULL columns.

---

## 5. Steps 5-9, not started

| Step | Work |
|---|---|
| **5** | Expand a concept ref to its contributing dataset ids (`expandRelationRefs`), extend the **workspace allowlist** to accept concept refs, and load datasets → spine → view in that order. Spec 3 §5.3 calls the allowlist the highest-risk line: without it a concept from another workspace could load. |
| **6** | `structuredQueryToSql`: delete the throw at `:48-50`, name the table via `RelationRef.toTableName`, **and open the aggregation gate at `:84`**. |
| **7** | Delete `_runConceptQuery` and its `Concept` arm from `runStructuredQueryWithMetadata`, plus `ConceptWrapper`'s delegating `buildConceptQueryResult`; collapse the one-arm match. |
| **8** | `generateIndividuals` creates a DuckDB table named with the concept's **bare UUID**, violating the "bare UUID is always a dataset" invariant `RelationRef.fromTableName` encodes. Rename and drop it. |
| **9** | Rehearsal: two concepts each selected and charted, joined to each other, and one joined to a dataset with filter, group-by and sort. |

### Step 6 is the top risk in the whole spec

`structuredQueryToSql.ts:84` computes group-by and aggregation only inside
`if (Model.isOfModelType(column?.baseColumn, "DatasetColumn"))`. A
`ConceptAttribute` base column falls straight through. **Delete the throw without
opening that gate and concepts return plausible-looking rows with every group-by
and aggregate silently dropped.** Both sessions independently confirmed it.

### Also on step 6: a pre-existing bug, ours to fix

`structuredQueryToSql` takes the SELECT alias from `query.aggregations[columnId]`
but the ORDER BY name from `QueryColumn.getDerivedColumnName(column)`, which
reads `column.aggregation`. A map-only aggregation emits
`group by "district" ... order by "cnt"` and DuckDB raises a Binder Error.
Group-by plus sort is on the demo path.

`src/lib/sql/__tests__/structuredQueryToSql.executed.test.ts` **pins the buggy
output and says so in its own comment**, so the fix and that test must change in
the same commit. Unify on one source of truth (either pass the aggregation map to
`getDerivedColumnName`, or normalise `column.aggregation` from the map before
emitting), and keep a case proving a map-only aggregation now emits valid SQL.

---

## 6. Pablo's decisions (also in the decisions log)

| Decision | |
|---|---|
| Demo surface | **Both** a workspace dashboard **and** a public share link. |
| Array attributes | At least one demo concept has one. **In scope**, implemented. |
| `first` determinism fix | Ships **silently**, no release note. |
| 14-day offline authorization | **Accepted**; document explicitly. |
| Raw-SQL column attribution | **Schedule the work**, do not narrow the exit criterion. |
| Dataset entity key | It **exists** (mapping to the concept identifier attribute). Spec 2 was wrong; correction recorded. |
| Tasks 12/13 | Do tonight before demo work. **Done.** |
| Google Drive API | **Enabled.** Picker API checked and clean. Spec 4 has no console blockers left. |
| Demo Sheet size | Comfortably under 10 MB. |

### Concepts on a public link is unsolved and is the thing to cut first

`PublicQuerySession` has **no ontology access** and a snapshot stores raw SQL
naming `concept_<uuid>`, which nothing on the public path can resolve. Likely fix
is materialising the concept's rows at publish time. **Not designed, not
estimated, beyond the 6-8 hour path.** Tell Pablo before cutting it.

---

## 7. Landmines, all discovered the hard way

1. **The plan's code samples do not compile.** Wrong in at least tasks 5, 7, 11,
   14, and Task 11's sample contradicts the plan's own registry invariant. There
   is a banner saying the repo is the authority. Trust the repo.
2. **`ConceptWrapper` declares `wholeRelationAcquirable: "no"` on purpose.** It
   implements only `pushDown`; the registry throws at construction for a
   capability without its method. Spec 3 flips it the day it adds `acquire`.
3. **`SourceWrapper` is contravariant in its ref.** `SourceWrapper<DatasetRef>`
   is not assignable to `SourceWrapper<RelationRef.T>`. The registry takes
   `AnySourceWrapper`, a distributive union; narrow with `getWrapperForRef`.
4. **Never re-read what the caller already has.** The first cutover had wrappers
   re-reading the dataset record and a virtual dataset's `rawSql`, adding queries
   the old dispatch never made. `createDefaultRegistry` takes `getDataset` and
   `getRawSql` for exactly this reason. `QueryMediator.coordination.test.ts`
   catches regressions here; fix the cause, never the mock.
5. **`WrapperContext.workspaceId` comes from the dataset record**, not session
   state. That is what lets the workspace and public sessions share one path even
   though `PublicQuerySession` has no workspace.
6. **The `ava_rows_` view is dropped only by the parquet load path.** Adding the
   drop to `dropTableViewAndFile` was tried and reverted: it broke four leasing
   tests by changing the drop sequence every dataset drop goes through. Residual
   orphan case is documented in the code. Spec 3 §4.6 asserts a drop site that
   does not survive contact with those tests.
7. **Pure functions must not live among client singletons.** Importing
   `getSQLSelectOfMapping` from `getDatasetColumnAssertions.ts` dragged in
   `@lingui/core/macro` and broke the Node executed suite. It now has its own
   module. Expect the same trap elsewhere.
8. **The other session's 14 characterization tests are the cutover's safety
   net.** Three pins are fragile: `getRelationSources([])` does **not**
   short-circuit; a `google_sheets` dataset rejects an **entire mixed batch**;
   grouping order is **emergent** from `makeBucketRecord` insertion order. If one
   fails, that is the finding. Message them; do not edit the test to match.
9. **Test against the real reader, not your own formatter.** `toCsvColumn`'s
   round-trip through DuckDB caught two bugs a string assertion would have
   passed.

---

## 8. Owed, not done

- **No adversarial review of our seven tasks.** The other session ran
  implementer + spec-compliance + code-quality review on each of its tasks and
  the quality stage found a real defect in **every one**. Ours have passing tests
  and no equivalent review. This is a real gap, recorded in the contract as a
  precondition that was never met.
- **A weak test to replace.** `createDefaultRegistry.test.ts`'s
  `expect(dataset?.acquire).toBeInstanceOf(Function)` restates the type system,
  which `docs/rules/testing.md` bans. Replace with a behavioural assertion that
  the mediator **chooses** pushdown for a concept and acquisition for a dataset,
  once there is a decision to observe.
- **`getWrapperForRef`'s cast** is justified by a comment, not a proof.
- **Spec 3 amendments** from reality: §4.6's drop site (landmine 6), and the
  duckdb-wasm caveat (the `file_row_number` verification used the **Node**
  driver; wasm is a separate binary and §4.6's fallback is still live).
- **Spec 4 code work**, none started: `.setAppId()` in `useGooglePicker.ts`, and
  `VITE_GOOGLE_PICKER_APP_ID=323714789211` in `.env.development` and
  `.env.example`.
- **The GIS truncation decision.** Pablo answered the other session; we never
  learned the answer. A plain lat/lng layer with a default overlay over a dataset
  above 50,000 rows renders 100 arbitrary non-deterministic rows. Not on the
  concept demo path.

---

## 9. First five minutes of the next session

```bash
cd /Users/pablo/src/worktrees/avandar/feat/qetl-registry
pnpm test:frontend && pnpm test:executed && pnpm type-check   # confirm green
cat docs/superpowers/specs/2026-08-18-qetl-spec-decisions-log.md
sed -n '/^## 14\. Minimum demo path/,$p' \
  docs/superpowers/specs/2026-08-18-qetl-concept-relations-design.md
cat /Users/pablo/src/worktrees/avandar/feat/qetl-impl/.temp/qetl-impl/COORDINATION.md
```

Then start at **section 4 of this document**: the spine loader and the column
resolver. Do not re-arm any polling of `PHASE1_STATUS.md`.
