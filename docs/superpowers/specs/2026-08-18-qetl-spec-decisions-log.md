# QETL specs 2 to 4: decisions and corrections

**Author:** pablo@avandarlabs.com (recorded by Claude)
**Date:** 2026-08-18
**Applies to:** specs 2, 3 and 4. Fold each item into its spec; this log is the
record of what was decided and why, not a substitute for the specs.

---

## 1. Corrections to spec 2 (relation cache)

### 1.1 A dataset-level entity key exists. The spec was wrong.

Spec 2 section 1.6 and open question 3 claim "no dataset-level entity key exists
in the tree", and conclude that sorted materialization can fire only for
concepts. **That is incorrect** (Pablo, 2026-08-18).

The ontology already merges datasets. `DatasetColumnMapping` maps a dataset
column to a concept attribute, and one of those attributes is the concept's
**identifier attribute**.
`getDatasetColumnAssertions` (`src/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getDatasetColumnAssertions.ts`)
takes `identifierAttribute: { datasetColumn, attribute, mapping }`, reads
`identifierAttribute.datasetColumn.name` as `primaryKeyColumnName`, and emits

```sql
WITH external_ids AS (
  SELECT DISTINCT "$primaryKeyColumnName$" AS external_id FROM "$datasetId$"
)
```

So a dataset's entity key **is** derivable today, per contributing dataset, from
the existing attribute mapping to the identifier attribute. Value pickers then
fill one Individual from several datasets, which is exactly the merge this key
supports.

**Consequence.** "Materialize Parquet sorted by the entity key" is *formalizing
existing functionality and connecting it to QETL*, not a new data-model request.
Pablo has asked for the work to be **scheduled, not dropped**.

- Rewrite spec 2 section 1.6's fourth bullet and open question 3.
- Sorted materialization applies to any dataset that has a
  `DatasetColumnMapping` to a concept identifier attribute, resolved through
  `DatasetColumnMappingClient`.
- A dataset with no such mapping still has no key. That case, and only that
  case, keeps `sortedByEntityKey: false`.

### 1.2 Raw-SQL column attribution: schedule it

Spec 2 leaves needed-column attribution for raw SQL unscheduled and unowned,
falling back to `"all"`. Pablo chose to **schedule the missing work** rather than
narrow the exit criterion. It needs column-to-relation attribution in
`DuckDbSqlAnalyzer`. Give it an owner and a spec rather than leaving it in an
open-questions list.

### 1.3 Offline authorization window: 14 days, accepted

Accepted as drafted (section 8.3). **Document it explicitly** in the security
notes rather than leaving it implicit in a risk row. Revocation is still
immediate while online, and eviction makes it sticky once seen.

---

## 2. Changes to spec 3 (concept relations)

### 2.1 Array-valued attributes are IN SCOPE and must work

Spec 3 open question 1 rejects `concept_attributes.is_array` attributes with an
error. **At least one concept in the demo has an array attribute** (Pablo,
2026-08-18), so rejection is not viable.

**Resolution, and it needs no new machinery:** the spec already establishes a
*total* order for `first` in section 4.6, namely contributing dataset id then
`file_row_number` from the `ava_rows_<datasetId>` view. An array attribute
aggregates over that same order:

```sql
list(value ORDER BY dataset_id, file_row_number)
```

This is deterministic by exactly the proof section 4.6 already gives, so array
support inherits the determinism argument instead of needing its own.

Obligations that follow:

- `RelationSchema` must carry the element type, not a bare `"LIST"`. Spec 1's
  `RelationColumn.dataType` holds a single `DuckDbDataType`, so representing
  `LIST(VARCHAR)` needs either a widened `RelationColumn` or an explicit
  `LIST(<element>)` encoding. **Decide this before implementing**, because it
  touches a spec 1 type that is otherwise frozen.
- Add a determinism test for an array attribute whose inputs tie, matching the
  section 6.3 rule that every rule is tested against a tied input.
- An empty contribution set yields an empty list, not NULL. State which.

### 2.2 Concepts must work on a public share link

Spec 3 open question 4 declares concepts unsupported on public and published
snapshots. **The demo includes both a workspace-authenticated dashboard and a
public link** (Pablo, 2026-08-18), so this is required scope, not deferred.

The obstacle is real and structural: `PublicQetlClient` has no ontology access,
and a snapshot stores raw SQL that names `concept_<uuid>`, which nothing in the
public path can resolve. The likely shape is **materialize the concept's rows at
publish time** and register them for the public session as an ordinary relation,
so the public path never needs the ontology. That is the option spec 3 already
guessed at; it now needs designing rather than guessing.

**This is added scope beyond the 6 to 8 hour minimum demo path and is the most
likely item to be cut.** Flag it to Pablo before cutting it.

### 2.3 The `first` determinism fix ships silently

No release note (Pablo, 2026-08-18). Record it as a decision in the spec so the
absence of a note is visibly deliberate rather than an oversight. The behaviour
change is still real: values that previously varied between page loads become
stable, and may differ from what a user last saw.

---

## 3. Spec 4 (Google Sheets): prerequisites resolved

- **The Google Drive API is enabled** on the project behind `GOOGLE_CLIENT_ID`
  (project number `323714789211`), done by Pablo 2026-08-18. This was spec 4's
  only hard blocker.
- **No new API key is needed.** `VITE_GOOGLE_PICKER_API_KEY` is already present
  in `.env.development` and `.env.example`.
- **No scope change is needed to start.** `getAuthURL.ts:26-30` already requests
  `openid`, `email`, `auth/spreadsheets` and `auth/drive.file`, so every existing
  token in `tokens__google` already carries `drive.file` and no user re-consents.
  Removing `auth/spreadsheets` later needs no console action.
- **`VITE_GOOGLE_PICKER_APP_ID` must be added** to `.env.development` and
  `.env.example` with the value `323714789211`. This is a file edit, not console
  work.
- **`setAppId` is confirmed missing.** It exists in the type definitions at
  `src/lib/types/google-picker.ts:225` and is called nowhere in the app, which
  confirms spec 4 section 5.2's highest-likelihood failure as real rather than
  hypothetical.
- **The demo sheet is comfortably under 10 MB**, so the unbuilt paged
  `values.get` fallback stays out of scope.
- **The Picker API check is done and clean** (Pablo, 2026-08-18): the Picker API
  is enabled and the API key is not API-restricted away from Drive or Picker. So
  **every blocking console prerequisite for spec 4 is now satisfied.** What
  remains on that spec is code, not console: the missing `.setAppId()` call in
  `useGooglePicker.ts`, and adding `VITE_GOOGLE_PICKER_APP_ID=323714789211` to
  `.env.development` and `.env.example`.

---

## 4. Sequencing decision

Plan **Tasks 12 and 13 run tonight, before demo work** (Pablo, 2026-08-18),
overriding the recommendation to freeze them until after the demo and overriding
the four-precondition gate in section 5 of the coordination contract.

Neither task is on either demo path: both demo paths work against the existing
`source_type` match statement. The cost is that hours go to architecture rather
than to demo surface, and the concept demo's public-link half is at risk as a
result. Recorded so the trade is visible.

**No merge-back is required for the cutover.** `feat/qetl-registry` is branched
from `feat/qetl-impl` at `cf851570`, so plan tasks 1 to 5 are already in its
base. Both halves are present in one worktree.
