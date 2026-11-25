# Data dictionaries and crosswalks - design

> **WARNING: KNOWN PRIVACY GAP, DEMO ONLY. FIX BEFORE THIS REACHES `develop`.**
>
> Crosswalk layouts and mappings are readable by every Data Sources viewer,
> even when the member dataset is restricted to other people. A viewer who
> cannot open a restricted dataset can still read its **column names, source
> columns, and fill rules** when that dataset is alone in its layout. The
> membership rows themselves stay hidden. We accepted this for the
> `demo/measles` demo only. Hiding layouts from viewers is not a fix: the save
> payload would lose them and `rpc_crosswalks__save` would delete them.
> A real fix needs a different mechanism (for example, per-layout read
> filtering plus a save that preserves layouts the caller cannot see).
> Details: [design doc section 11](data-dictionaries-design.md#11-permissions-and-rls)


- **Status:** Approved in brainstorming and prototype review, awaiting
  written-spec review
- **Date:** 2026-11-11
- **Author:** pablo@avandarlabs.com
- **Branch:** `feat/data-dictionaries`, from `demo/measles`
- **Prototype:** `.impeccable/mocks/prototype/data-dictionaries.html` in the
  `feat/data-dictionaries` worktree (gitignored). Every surface below has a
  clickable counterpart there. Where this spec and the prototype disagree,
  this spec wins.
- **Related:** [qetl-architecture.md](../qetl-architecture.md) (relation
  loading), [permissions-architecture.md](../permissions-architecture.md),
  [ai-agent/roadmap.md](../ai-agent/roadmap.md),
  [app-view-layout.md](../design/app-view-layout.md), and the key-matching
  crosswalk in
  [joined-cases-7-key-matching-design.md](../superpowers/specs/2026-11-06-joined-cases-7-key-matching-design.md)

## Contents

1. Summary
2. Goals and non-goals
3. Decisions already made
4. Vocabulary
5. Data model
6. How a dictionary reaches the data
7. Surfaces
8. Smart guesses
9. Crosswalk compilation
10. Ask Avandar context
11. Permissions and RLS
12. Offline and desktop
13. User-facing copy
14. Edge cases
15. Testing
16. Delivery slices
17. Roadmap
18. Open decisions

## 1. Summary

Teams in the social sector hold many datasets that share the same codes:
`1, 2` for sex in twenty county files, `1-4` for socioeconomic status in
every survey wave. Today, every time they want readable values they type a
prompt like "convert gender where 1 = Male and 2 = Female" into the Data
Explorer, once per dataset, then save each result as a new dataset.

This spec adds two things to the Data Sources app:

- **Data dictionaries.** A dictionary is a reusable, workspace-level record of
  what columns mean. Each **entry** describes one kind of column (its name,
  the other column names it goes by, a kind, a description) and may carry
  **code lists**: ordered pairs such as `1 ↔ Male` that work in both
  directions. A dictionary can be built by hand or learned from one or more
  datasets, and it is applied to any dataset, partially, alongside other
  dictionaries.
- **Data crosswalks.** A crosswalk maps many datasets with different layouts
  (`zip_code`, `zip`, `postal_code`) onto one reference layout and produces a
  **combined dataset** that stacks them, with codes reconciled through
  dictionaries.

Applying a dictionary to a column does one of two things, chosen per column:

- **Attach as reference only.** The data is untouched. The target values and
  descriptions travel with the column: a code-list icon on the dataset page
  and in the Data Explorer, and the code list in Ask Avandar's context, so
  "how many female cases" becomes `WHERE "GENDER" = 2`.
- **Apply conversions.** The values change, either in a new **linked
  dataset** that stays in step with the dictionary, or in the dataset itself
  (uploads only), pinned to the dictionary version applied.

## 2. Goals and non-goals

### Goals

- Define codes once and apply them to any number of datasets in a few clicks,
  without typing prompts or re-exporting files.
- Mix dictionaries and apply them partially: columns A and B from one
  dictionary, X and Z from another.
- Support both attaching labels as documentation and converting values, per
  column.
- Learn as much as possible automatically: which columns are coded or
  ordered, which columns across datasets mean the same thing, and suggested
  labels, descriptions, and matches.
- Make code lists bidirectional: one list decodes `1 → Male` and encodes
  `Male → 1`, with accepted spellings (`M`, `man`) and missing-value codes.
- Give Ask Avandar every attached code list, online and offline.
- Combine up to about 100 datasets with different layouts into one dataset
  through a crosswalk.

### Non-goals

- Writing back to live sources (Google Sheets, Postgres). Applying to a live
  connection attaches labels or creates a linked dataset. See section 17.
- Per-dictionary sharing and the restricted flag. Dictionaries and crosswalks
  are visible to everyone with Data Sources access in v1 (section 11).
- Side-by-side joins in a crosswalk. A crosswalk stacks rows; key-based joins
  stay with joined cases (G7).
- Importing dictionaries from external formats (REDCap data dictionary CSV,
  CDISC, SPSS `.sav` value labels). Listed in section 17.
- A display-only "show labels" toggle on converted or raw grids. Listed in
  section 17.

## 3. Decisions already made

| Topic | Decision |
|---|---|
| Crosswalk output | A combined virtual dataset that stacks every mapped dataset, plus a documentation mapping that exports as CSV. The combined dataset carries reference bindings for its coded columns, owned by the crosswalk, so the code-list tag, Ask Avandar, and Used by work with no new agent code. |
| Where codes live | In dictionaries only. A crosswalk reads its code translations from dictionary code lists. |
| Code list reuse | Code lists are reusable within a dictionary and shared by entries. An entry can also own a one-off list. |
| Direction | Pairs are bidirectional. Apply detects whether a column holds codes or labels and picks decode or encode; the user can flip it. |
| Apply modes | Per column: **Attach as reference only** (no data change) or **Apply conversions**. Conversions keep the list attached too. |
| Where conversions go | Uploads: a new linked dataset, or this dataset. Live connections: a linked dataset only. |
| Edits after applying | Linked datasets follow the dictionary. A dataset converted in place keeps the version it was given and offers **Re-apply**. Reference-only columns always show the current list. |
| Unmatched values | Shown with row counts. Default keeps the value as is; the user can map it, add it to the list, or empty it. |
| Smart guesses | Deterministic profiling and matching always run, on the device. An AI pass suggests labels, descriptions, and meaning-based matches as accept-or-reject suggestions, sending only column names and the distinct values of short coded columns. |
| Placement | Dictionaries and Crosswalks are groups in the Data Sources list, each opening its own view in the slate. |
| Apply layout | Pairing table (one column per dictionary, up to 3; beyond that, one **Apply** column with a Select), a side pane for the selected column, a horizontal step bar, and a data preview that slides up from the bottom. |
| Crosswalk layout | Reference layout first, then one dataset (or layout family) at a time, with a stub column stamping every layout Reference, Mapped, Review, To do, or Skipped. |
| Create layout | Pick datasets, Review columns, Map values, Save. Starting from a dataset's menu skips Pick. |
| Defaults | Uploaded and offline datasets default to **Apply conversions**; live connections default to **Attach as reference only**. |

## 4. Vocabulary

Internal names are for code, schema, and docs. User-facing words are what the
UI says (see the copy rule in `AGENTS.md`).

| Internal | User-facing | Meaning |
|---|---|---|
| `DataDictionary` | dictionary | A named set of entries and code lists. |
| `DataDictionaryEntry` | entry | One kind of column: name, other column names, kind, unit, valid range, description, codings. |
| `columnNames` | also matches columns named | The other names an entry recognizes (`GENDER`, `sex_at_birth`). |
| `DataDictionaryCodeList` | code list | An ordered list of pairs, optionally ordered as a scale. |
| `CodePair` | source value, target value | `{ code, label, acceptedSpellings, isMissing }`. `code` is the source value and `label` is the target value, whether or not the target is a human-readable label. |
| `acceptedSpellings` | also accept as this target value | Extra target values that convert back to the pair's source value (`M`, `man`). |
| entry coding | code list (on an entry) | The link between an entry and a code list. An entry can have several codings of the same meaning (`1/2/9` and `M/F/U`); one is primary. |
| `DictionaryBinding` | applied, attached | One dataset column bound to one entry, with a mode. |
| `mode: "reference"` | attached as reference | Target values and description only. Values unchanged. |
| `mode: "convert"` | converted | Values change when the dataset loads. |
| `direction: "decode" \| "encode"` | Source → Target, Target → Source | Which side of the pair the data holds. |
| `pinnedPairs` | (version shown in the rail) | The pairs a dataset converted in place was given. |
| linked dataset | linked dataset | A virtual dataset reading from the source with conversions applied, following the dictionary. |
| `Crosswalk` | crosswalk | A set of datasets mapped onto a reference layout. |
| `CrosswalkLayout` | layout | Datasets that share the same column names, mapped once together. |
| `CrosswalkColumn` | column of the combined dataset | One output column, optionally governed by a dictionary entry. |
| `CrosswalkMapping` | how a column is filled | For one layout and one output column: a source column with a conversion, a fixed value, an expression, or empty. |
| `holdsLabels` | The column holds | On a fill that translates values: whether the source column holds the list's target values (`true`) or its source values (`false`). Replaces the earlier `alreadyLabels`. |
| mapping `reason` | Name and type, Same values, Similar layout, Meaning | Why a fill was prefilled: `name_and_type`, `same_values`, `similar_layout` (carried over from the most similar layout already mapped), or `meaning` (an AI suggestion). |
| combined dataset | combined dataset | The crosswalk's output virtual dataset. |

## 5. Data model

All tables follow the conventions in `supabase/schemas` (see the
`supabase-declarative-schema` skill): `uuid` ids, `workspace_id` with cascade,
`created_at`/`updated_at` with `util__set_updated_at`, a trigger that stops
`workspace_id` changing, GRANT only on tables and revoke-then-grant on
functions, `/** */` docstrings. New enums get their own `00.enum.*.sql` file.

### 5.1 Dictionaries

`10.data_dictionaries.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `workspace_id` | `uuid` | |
| `owner_id`, `owner_profile_id` | `uuid` | Same shape as `maps`, so the table can become a shareable resource type later without a migration. |
| `name` | `text not null` | |
| `description` | `text` | |
| `version` | `integer not null default 1` | Bumped by a trigger whenever an entry, code list, or coding in the dictionary changes. |
| `created_from_dataset_ids` | `uuid[] not null default '{}'` | Provenance for the rail ("Made from"). Not a foreign key: a deleted dataset leaves a stale id, which the rail skips. |

`20.data_dictionaries__code_lists.sql`

| Column | Type | Notes |
|---|---|---|
| `id`, `workspace_id`, `dictionary_id` | `uuid` | `dictionary_id` cascades. |
| `name` | `text not null` | "Sex (1/2/9)". |
| `is_ordered` | `boolean not null default false` | Ordered lists keep their order in charts (section 6.4). |
| `pairs` | `jsonb not null` | Array, in display order, of `{ code, label, acceptedSpellings, isMissing }`. Validated by a versioned Zod schema (the `AvaMapConfigSchema` pattern). A label may be blank: the value is saved and marked as needing a label. Decoding skips a pair with a blank label, so its code passes through and is listed in Unmatched values; encoding ignores the blank label but still matches the pair's accepted spellings; an ordered list's `ENUM` skips blank labels. |

A one-off list is a code list used by one entry. Nothing marks it; the UI
says "Only this entry uses it".

`20.data_dictionaries__entries.sql`

| Column | Type | Notes |
|---|---|---|
| `id`, `workspace_id`, `dictionary_id` | `uuid` | |
| `name` | `text not null` | Unique per dictionary. |
| `column_names` | `text[] not null default '{}'` | The other column names it matches. |
| `kind` | `data_dictionaries__entry_kind` | `categorical`, `ordered`, `number`, `date`, `text`, `identifier`. |
| `unit` | `text` | Number entries. |
| `valid_min`, `valid_max` | `numeric` | Number entries. |
| `description` | `text` | |
| `position` | `integer not null` | Display order. |

`30.data_dictionaries__entry_codings.sql`

| Column | Type | Notes |
|---|---|---|
| `entry_id` | `uuid` | Cascades. |
| `code_list_id` | `uuid` | Cascades. |
| `is_primary` | `boolean not null` | Exactly one primary per entry (partial unique index). The primary list's labels are the entry's canonical labels. |

Several codings let one `sex` entry recognize both `1/2/9` and `M/F/U`. Apply
and crosswalks pick the coding whose codes fit the data (section 8.2), so the
"values don't fit" case in the prototype only appears when no coding fits.

### 5.2 Bindings

`30.dataset_columns__dictionary_bindings.sql`: one row per bound column.

| Column | Type | Notes |
|---|---|---|
| `id`, `workspace_id`, `dataset_id` | `uuid` | `dataset_id` uses the composite `(id, workspace_id)` foreign key. |
| `dataset_column_id` | `uuid unique` | Cascades when the column is removed. |
| `dictionary_id` | `uuid` | `on delete set null`. |
| `entry_id` | `uuid` | `on delete set null`. |
| `code_list_id` | `uuid` | The coding chosen for this column. `on delete set null`. |
| `mode` | `dataset_columns__binding_mode` | `reference` or `convert`. |
| `direction` | `dataset_columns__binding_direction` | `decode` or `encode`. |
| `keeps_original` | `boolean not null default false` | Convert only. Adds `<column>_original`. |
| `value_overrides` | `jsonb not null default '[]'` | Unmatched-value resolutions: `{ value, action: "keep" \| "empty" \| "map", code? }`. |
| `pinned_pairs` | `jsonb` | Null means "follow the live code list". Set for a dataset converted in place, and when a live binding's dictionary, entry, or code list is deleted. |
| `pinned_is_ordered` | `boolean` | The pinned list's `is_ordered`. Null exactly when `pinned_pairs` is null. |
| `replaced_data_type` | `datasets__ava_data_type` | The column's `data_type` before a convert binding set it, restored when the binding stops converting. Null for a reference binding. |
| `applied_dictionary_version` | `integer not null` | |

A check constraint keeps a reference binding plain: no `keeps_original`,
`value_overrides`, `pinned_pairs`, or `replaced_data_type`.

A binding with no `entry_id` and no `pinned_pairs` is inert: the UI shows it
as "This dictionary entry was deleted" and nothing converts.

Slice 3 creates the table without `keeps_original`, `value_overrides`, and
`pinned_pairs`, which only a convert binding uses. Slice 4 adds them with
conversions: each is nullable or has a default, so adding them needs no
destructive migration. Bindings are select-only for signed-in users and are
written whole, per dataset, by `rpc_dataset_columns__apply_dictionaries`
(section 11).

`dataset_columns` gains `dictionary_binding_id uuid null` (`on delete
cascade`): set on the `<column>_original` copy that a convert binding adds, so
removing the binding removes the copy. The copy shares the converted column's
`original_name` (its Parquet header), is named `<name>_original` (then
`_original_2`, `_3` when taken), and keeps the column's type from before the
conversion. Only the apply RPCs set `dictionary_binding_id`; a trigger refuses
a signed-in user setting or changing it.

### 5.3 Linked datasets

A linked dataset is an ordinary virtual dataset (`datasets__virtual`) whose
`raw_sql` is `SELECT * FROM "<source dataset id>"` (plus nothing else), with
convert bindings on its own columns that have `pinned_pairs = null`.
`datasets__virtual` gains `linked_source_dataset_id uuid null references
datasets on delete set null`, so the source's rail and the dictionary's Used
by tab can name it. The source dataset gets reference bindings for the same
columns, because conversions keep the list attached (section 3).

`rpc_dataset_columns__apply_dictionaries_as_linked_dataset` creates the linked
dataset, its columns (copied from the source's on the server), its convert
bindings, and the source's reference bindings in one transaction. Creating a
dataset needs workspace admin, as every import does
(`rpc_datasets__add_dataset`), so only admins can create a linked dataset.
Applying dictionaries to a linked dataset itself updates its live conversions
in place, with no Save as choice. A dataset converted in place cannot also be
the source of a linked dataset (section 7.5).

### 5.4 Crosswalks

Four enums, one file each: `crosswalks__codes_output` (`labels`, `codes`),
`crosswalks__layout_status` (`to_do`, `review`, `mapped`, `skipped`),
`crosswalks__mapping_status` (`suggested`, `confirmed`), and
`crosswalks__mapping_reason` (`name_and_type`, `same_values`,
`similar_layout`, `meaning`). `reason` is an enum key the UI translates, not
free text.

`11.crosswalks.sql`: `id`, `workspace_id`, owner columns, `name`,
`description`, `output_dataset_id uuid null references datasets on delete set
null`, `codes_output_as` (`labels` or `codes`, default `labels`),
`adds_source_column boolean not null default true`, `compiled_at
timestamptz`, and `compiled_code_lists jsonb`. `compiled_code_lists` is an
array, `[{ "code_list_id": uuid, "fingerprint": text }]`, one element per
code list the combined dataset embedded, where `fingerprint` hashes that
list's pairs when it was compiled. It replaces the earlier
`compiled_code_list_versions` (code list id to `updated_at`): a dictionary
save upserts every code list and moves every `updated_at`, so that design
would raise the stale banner after any edit, and an object keyed by uuid
would not survive the parsers' key transform. `output_dataset_id`,
`compiled_at`, and `compiled_code_lists` are managed: a signed-in user cannot
set them, and the combine RPC writes them.

The four child tables carry `workspace_id`, `crosswalk_id` (with a composite
foreign key to `crosswalks (id, workspace_id)` that cascades), and
`created_at`. Signed-in users can only `select` them. They are written only
by `rpc_crosswalks__save`, as whole sets, so a crosswalk is never half-saved
(a column deleted while its mappings remain, two reference layouts).

`20.crosswalks__layouts.sql`: `id`, `signature text` (a hash of the sorted,
normalized column names, section 8.3), `column_names text[]`, `is_reference
boolean`, `status` (`to_do`, `review`, `mapped`, `skipped`). Unique on
`(crosswalk_id, signature)` and `(id, crosswalk_id)`. A unique index allows
one reference layout per crosswalk, a reference layout must be `mapped`, and
`column_names` is never empty.

`21.crosswalks__datasets.sql`: `id` (it has its own key because
`createRdbCrudClient` needs a single-column one), `dataset_id` (cascades),
`layout_id`, and `unique (crosswalk_id, dataset_id)`. A dataset joins the
layout whose signature it matches; a new signature creates a new layout,
prefilled from the closest existing one (section 8.3). A membership row is
readable only by someone who can view its dataset.

`21.crosswalks__columns.sql`: `id`, `name`, `position`, `data_type`
(`datasets__ava_data_type`), `entry_id uuid null` (the governing dictionary
entry, `on delete set null`). Names are trimmed and unique ignoring case.

`22.crosswalks__mappings.sql`: `id`, `layout_id`, `column_id`, `fill jsonb
not null` (an object), `status` (`suggested`, `confirmed`), `confidence
numeric` (0 to 1), `reason` (the enum above). Unique on `(layout_id,
column_id)`.

`fill` is a versioned Zod schema, stored as snake_case JSON with
`version: 1` and parsed back to this shape:

```ts
type CrosswalkFill =
  | {
      kind: "column";
      sourceColumn: string;
      convert: CrosswalkConvert | undefined;
      codeListId: string | undefined;
      holdsLabels: boolean;
    }
  | { kind: "constant"; value: string }
  | { kind: "expression"; sql: string } // names columns as {column name}
  | { kind: "empty" };

type CrosswalkConvert =
  | { kind: "parse_date"; format: string }      // e.g. "%m/%d/%Y"
  | { kind: "pad_text"; length: number }         // ZIP 10451 -> "10451", 501 -> "00501"
  | { kind: "multiply"; factor: number }         // months -> years: 1/12
  | { kind: "trim_and_fix_case"; letterCase: "keep" | "lower" | "upper" };
```

A `column` fill either converts (`convert`) or translates codes through a
code list (`codeListId`), never both. `multiply` keeps only the `factor`; the
UI names the presets. A Combine expression names the layout's columns as
`{column name}` placeholders, checked against the layout's columns and then
by `assertSingleSqlExpression`.

### 5.5 Models and clients

- `shared/models/dataDictionaries/`: `DataDictionary`, `DataDictionaryEntry`,
  `DataDictionaryCodeList` (with `CodePairsSchema`), `DictionaryBinding`.
  `shared/models/crosswalks/`: `Crosswalk`, `CrosswalkLayout`,
  `CrosswalkColumn`, `CrosswalkMapping` (with `CrosswalkFillSchema`). Each is
  a `SupabaseCrudModelSpec` with a parser registry, following
  `shared/models/datasets/Dataset/`.
- Clients use `createRdbCrudClient` under `src/clients/dataDictionaries/` and
  `src/clients/crosswalks/` (the `ava-model-creation` skill still names
  `createSupabaseCRUDClient`, which nothing uses; follow `AvaMapClient`).
- Saving a dictionary's entries, codings, and code lists in one action goes
  through one RPC, `rpc_data_dictionaries__save`, so the version bump and the
  child writes are atomic. Creating a dictionary from datasets uses the same
  RPC.
- Applying goes through `rpc_dataset_columns__apply_dictionaries`, which
  writes every binding for one dataset in one transaction, after appending
  any values the user added to code lists. A linked dataset goes through
  `rpc_dataset_columns__apply_dictionaries_as_linked_dataset` (section 5.3),
  and **Re-apply** through `rpc_dataset_columns__reapply_dictionary`.
- A crosswalk is saved through `rpc_crosswalks__save`, which replaces one
  crosswalk's settings, columns, layouts, memberships, and mappings in one
  transaction. It checks the caller is a Data Sources editor, locks the
  crosswalk row, refuses a dataset the caller cannot view, and never deletes
  a membership whose dataset the caller cannot view: one editor's save never
  drops another's restricted dataset, and a save that would drop a layout
  still holding one is refused. A membership keeps its id when its dataset
  moves to another layout. A missing or null payload set is refused.
- The combined dataset goes through
  `rpc_crosswalks__save_combined_dataset`, which creates it (through
  `rpc_datasets__add_virtual_dataset`) or updates it: its name, `raw_sql`,
  columns reconciled by name (keeping ids, so descriptions and bindings
  survive), and the reference bindings of its coded columns, replaced whole.
  It records `compiled_at` and `compiled_code_lists`. The browser builds the
  SQL, the columns, and the bindings; the RPC stores them. Both RPCs are
  `SECURITY DEFINER` with `search_path = ''`, raise one error for a missing
  and a forbidden crosswalk, and return stable error hints the client maps to
  copy.

## 6. How a dictionary reaches the data

### 6.1 Change from the brainstorm

The brainstorm approved "approach A": keep an application record and compile
it into a virtual dataset's `raw_sql`, recompiling every linked dataset when a
dictionary changes. Research for this spec found two problems with
recompiling: a virtual dataset's cached materialization is never invalidated
when its SQL changes (`VirtualDatasetWrapper.ts`, `freshnessSignal:
"none"`), and the person editing a dictionary may not be allowed to edit every
dataset that uses it.

QETL already changes columns at load time instead of in stored data: renames
and type changes become a `SELECT * EXCLUDE (...) REPLACE` view when a
relation loads (`getColumnReplacementsFromColumns`,
`getParquetProjectionClauses`). Conversions use the same hook. The binding
record is still the source of truth (the spirit of approach A), but it is
read at load time instead of being compiled into SQL. This means:

- Linked datasets follow dictionary edits with no recompile and no stale
  cache, because the cached Parquet holds raw values and the view is rebuilt
  on load.
- Converting a dataset in place never rewrites the stored file. The original
  values stay recoverable, which makes an undo possible later.
- It works the same for synced uploads, offline-only uploads, live
  connections, virtual datasets, and published dashboard snapshots
  (`dashboardPublishSnapshots.ts` already uses the hook).

### 6.2 The column projection

`ColumnReplacement` (in `QueryMediator.types.ts`) gains an optional
`valueMapping`:

```ts
type ColumnValueMapping = {
  /** Pairs to translate through, already resolved: live list or pinned pairs. */
  pairs: readonly CodePair[];
  direction: "decode" | "encode";
  overrides: readonly ValueOverride[];
  /** Emit the untouched column as `<name>_original` beside the converted one. */
  keepsOriginalAs?: string;
  outputType: "VARCHAR" | "INTEGER" | { enumLabels: readonly string[] };
};
```

`getColumnReplacementsFromColumns` takes the dataset's bindings as a second
argument and builds a `valueMapping` for every convert binding: live pairs
from the code list when `pinned_pairs` is null, the pinned pairs otherwise.
`getParquetProjectionClauses` renders it as a `CASE` over a normalized key:

```sql
CASE lower(trim(CAST("GENDER" AS VARCHAR)))
  WHEN '1' THEN 'Male'
  WHEN '2' THEN 'Female'
  WHEN '9' THEN 'Unknown'
  ELSE CAST("GENDER" AS VARCHAR)      -- override "keep" (the default)
END AS "GENDER"
```

- Encoding matches the label and every accepted spelling, case- and
  space-insensitively, and returns the code.
- Both sides of a match are normalized by DuckDB: each `WHEN` literal is
  written `lower(trim('<literal>'))`, so the key and the data always follow
  the same case rules.
- Overrides render after the pairs and before the `ELSE` (a value a pair
  matches is never overridden): `empty` as `THEN NULL`, `map` as the mapped
  pair's output.
- The output type is `BIGINT` when encoding and every code in the list is an
  integer of at most 18 digits (regression-ready, and the same as Ava's
  `bigint`), `VARCHAR` otherwise, and an `ENUM` for an ordered list's labels
  (section 6.4). The view reads the type from the column's stored
  `data_type`, which the apply RPC sets by this rule (section 6.3), so the
  view and the schema never disagree.
- Literals go through `quoteSqlLiteral`. A label is data, never SQL. The
  view's SQL template substitutes its parameters once, literally, so `$&`
  or `` $` `` in a label stays text.
- In code, `valueMapping` is a `ColumnConversion` (in
  `shared/models/dataDictionaries/ColumnConversion/`): the rules above, and
  the SQL they render, shared by the view, the apply flow's preview and
  unmatched-value queries, and the tests.
- The bindings and code lists are read with `fetchQuery` (fresh after an
  invalidation or past the online stale time, cached offline). Each loaded
  relation records a projection key, and a query that finds a different key
  rebuilds the view from the cached bytes, so a binding or code-list change
  reaches a view loaded earlier in the tab. Published dashboard snapshots
  read a dataset with a convert binding through the workspace query, so they
  publish converted values.
- Every loaded relation also gets an `ava_raw_<datasetId>` view with renames
  and casts but no conversions. Profiling, matching, unmatched values, and
  the preview read it, since a converted dataset's own view holds labels.

### 6.3 Data types

A converted column's `dataset_columns.data_type` is set by the apply RPC to
the type the projection outputs (`varchar` for decoded labels, `bigint` for
integer codes), so schema views and the agent see the converted type. The
binding records the type it replaced in `replaced_data_type`, and the RPC
restores it when the binding is removed or switched to reference. A
dictionary save re-derives the type for every live convert binding of a list
it changed. The dataset page shows a converted column's type as read-only,
"Set by <dictionary>".

### 6.4 Ordered lists

An ordered list's decoded output is cast to a DuckDB `ENUM` of its labels in
list order, so `ORDER BY` and chart axes follow Low, Lower-middle,
Upper-middle, High instead of the alphabet. The `ENUM` is built when the
relation loads: the list's non-blank labels in list order (the first
occurrence of a label wins), then every other value the conversion keeps,
read with one `SELECT DISTINCT` and sorted. A cast to the labels alone fails
every query once one value is not a label, and `TRY_CAST` would silently
empty that value (section 18, decision 1). A result's `ENUM` column arrives
as an Arrow dictionary and reads as text.

### 6.5 Reference mode

A reference binding never touches the projection. It feeds the code-list
popover, the rail, the Used by tab, and Ask Avandar's context.

### 6.6 Converting in place

"Change this dataset" writes convert bindings with `pinned_pairs` set to the
pairs as they are now and `applied_dictionary_version` recorded. Later edits
to the dictionary do not reach it. The Used by tab and the dataset's rail
show "Applied version 2, now version 3" with **Re-apply**, which re-pins
through `rpc_dataset_columns__reapply_dictionary` and asks for a confirmation
on a synced dataset. Re-apply is the one action in the rail. Switching a
converted column back to Reference only in Apply restores its original
values, since the stored data was never rewritten.

Allowed for uploads (`csv_file`, `xlsx_file`, `pdf_file`), synced or offline
only. For a synced dataset, the user must tick "I understand this changes
<dataset> for the whole workspace" before the button enables.

## 7. Surfaces

Layout rules come from [app-view-layout.md](../design/app-view-layout.md)
and `DESIGN.md`. Each surface reuses `AppView`, `AppViewHeader`,
`AppViewBody`, `AppViewSection`, and `AppViewRail`.

### 7.1 Data Sources list

`DataManagerApp.tsx` renders one `AppListPane` titled "All data" with three
groups: **Datasets** (the current `DatasetNavbar` rows), **Dictionaries**,
and **Crosswalks**. The "withhold chrome" rules still apply: an empty group
is hidden, and the filter appears once the combined list passes eight rows.
The toolbar has no Add menu: **New dictionary** and **New crosswalk** are
buttons beside "Import data", **New crosswalk** after **New dictionary**. The
Crosswalks group, **New crosswalk**, and the crosswalk view are for Data
Sources editors (`data_sources__can_edit_crosswalks`). Viewers still see a
combined dataset as an ordinary dataset.

Task views (create, apply, and crosswalk mapping) collapse the list pane by
default to free width for dictionary columns, with a **Show list** / **Hide
list** toggle in the slate toolbar. The choice resets when the route changes.

New routes under `src/routes/_auth/$workspaceSlug/data-manager/`, each with
an `AppLinks` entry:

| Route | View |
|---|---|
| `dictionaries/$dictionaryId` | Dictionary view |
| `dictionaries/new` | Create a dictionary (search params `fromDatasetId`, `step`) |
| `$datasetId/apply-dictionaries` | Apply dictionaries (search param `step`) |
| `crosswalks/$crosswalkId` | Crosswalk (search params `step`, `layoutId`) |
| `crosswalks/new` | Crosswalk, step 1 |

### 7.2 Dictionary view

Header: name (editable), facts `Dictionary · 15 entries · 5 code lists · Used
by 14 datasets · Version 3`, actions **Share** (disabled with a tooltip in
v1, see section 11) and **Apply to a dataset** (primary). Overflow: Delete
(danger, behind a confirm that names how many datasets use it).

Tabs:

- **Entries.** A filter that matches entry names and their other column
  names. Table: Entry, Also matches columns named, Kind and values,
  Description. Selecting a row opens the entry pane: name, other column
  names (chips), Kind (Select with a one-line hint per kind), Code list
  (Select, plus "One-off list for this entry"), a read-only preview of the
  pairs with an **Edit <list>** link, unit and valid range for numbers, and
  Description. **Add from datasets** opens the create flow with this
  dictionary as the target; **Add entry** appends one.
- **Code lists.** Master-detail. Each list: name, **Unordered / Ordered**,
  "Used by sex, ..." and a table of pairs: drag handle (ordered only), Code,
  a two-way arrow, Label, Also accept as this label, Missing value, remove.
  **Add value** and **Paste a list** (one pair per line, `1 = Male` or `1,
  Male`). A note explains that pairs work both ways.
- **Used by.** Dataset, How it was applied (**Reference**: data unchanged,
  always current; **Linked**: updates when this dictionary changes;
  **Changed the data**; **Crosswalk**, which lists a combined dataset as
  "Through <crosswalk>"), Entries, Status ("Up to date" or "Applied version
  2, now version 3"; a Crosswalk row reads "A code list changed since it was
  combined" when a code list its combined dataset embedded has changed),
  and **Re-apply** where pinned. A behind Crosswalk row offers **Open
  crosswalk** to Data Sources editors, which opens the crosswalk on its
  Create combined dataset step.

**Apply to a dataset** lists only the workspace's datasets the user can
edit, read in one call to `rpc_datasets__get_editable_ids`, and says "You
can't edit any dataset in this workspace" when there are none. The apply view
still refuses a dataset the user cannot edit (section 14).

Rail: Made from (datasets), Owner, Updated, Version, and "How codes work".

### 7.3 Create a dictionary

Task view with a horizontal step bar. Entry points: Add menu → New dictionary,
the Dictionary view's **Add from datasets**, and a dataset's overflow menu
(section 7.4), which skips Pick and starts at Review with that dataset.

1. **Pick datasets.** Checkbox table of datasets (name, source, rows,
   columns). Footer note: "Only column names and the distinct values of short
   columns are read. Rows never leave this device for suggestions."
2. **Review columns.** A notice states what happened ("61 columns became 13
   entries"). Three sections: **Coded columns** (you'll label their values
   next), **Ordered scales**, **Descriptions only**. Each row: include
   checkbox, entry name with a **Suggested** tag when matched by meaning, the
   columns it came from, Kind (Select), values seen, and notes such as "Four
   columns share the same values. They get one code list." or "Same meaning,
   different codes." (which becomes a second coding on the same entry, per
   section 5.1). From a single dataset the notice offers **Learn from more
   datasets**, which returns to Pick.
3. **Map values.** Master-detail of code lists to map, each tagged
   Mapped, Suggested, or To do. Detail: Source value (the value found in the
   data), Rows, Target value (input, AI suggestions prefilled with a
   marker), Missing value. Source value and Target value carry info icons. Ordered lists
   arrive in scale order and are reordered on the dictionary, so there are
   no drag handles here. **Suggest target values** asks the AI pass for the
   selected list.
   **Accept and next list** moves on.
4. **Save.** Name, description, a summary (entries, code lists, values
   labeled, learned from), a warning for unlabeled values ("You can save now
   and finish them on the dictionary"), and a checkbox to apply next. From a
   single dataset it reads "Apply it to <dataset> next" and opens Apply with
   the new dictionary preselected; from several it opens Apply for the first
   and names the rest in a toast, as text, to apply from each dataset's menu.
   A toast closes on its own, so it holds no links.

A dictionary created from a dataset is not tied to it. The save step says so:
"Saved to Dictionaries like any other dictionary. <dataset> is only where it
started."

### 7.4 Dataset page

`DatasetActionsMenu` gains, above Refresh and Delete:

- **Apply a dictionary** ("Turn codes into labels and add column
  descriptions"). Always shown to users who can edit the dataset.
- **Create a dictionary from this dataset** ("Saved to Dictionaries, so other
  datasets can use it too"). Shown only while the dataset has no binding of
  any mode.

Slice 3 shipped **Apply a dictionary** with the sub-line "Show what codes
mean and add column descriptions", since attaching as reference cannot turn
codes into labels. Slice 4 restores the copy above with conversions.

Columns (Metadata tab's column list and each Data Summary column section):
a column with a code list shows a tag icon after its values. Hover or focus
opens a popover: list name, every pair (`1  Male`, `9  Unknown (missing
value)`), and "From <dictionary> › <entry>. Attached as reference. The values
in the data are unchanged." or "The values were converted to these labels."
The section meta reads "7 with a code list: hover the tag to read it". A
column with a bound entry and no description of its own shows the entry's
description in its Description column, captioned "From <dictionary>". A
column's own description always wins.

A combined dataset's rail adds a line, "Combined by <crosswalk>", a link for
Data Sources editors and plain text for everyone else. **Apply a dictionary**
is hidden on a combined dataset, since the crosswalk owns its reference
bindings and replaces them on every update. Refreshing a source dataset also
clears the cached rows of the combined datasets that read it, as it does for
linked datasets.

Rail (`DatasetSourceRail`): a **Dictionaries** group listing each dictionary
with how it was applied ("Attached as reference · data unchanged", "Linked
dataset: <name>", "Converted this dataset · version 2"). The one action in
the rail is **Re-apply**, beside "Applied version 2, now version 3" on a
dataset converted in place, for its editors (section 6.6). A linked dataset's
own rail says "Reads <source>", or "The dataset it reads was deleted." A
converted column's Type cell is read-only, "Set by <dictionary>", and its
popover adds the pinned version, the keep-original copy's name, and, read
when the popover opens, how many values in the data have no label.

The Data Explorer result grid shows the same tag and popover in a column
header when the column comes straight from a bound dataset column. That
includes the grouped column of a grouped result, from the query builder or
from SQL such as `SELECT "GENDER", count(*) ... GROUP BY 1`. An aggregated or
computed column gets no tag.

### 7.5 Apply dictionaries

Task view at `$datasetId/apply-dictionaries`. Header: breadcrumb to the
dataset, title, facts (`6 converted · 1 attached as reference · 3 described ·
of 22 columns · from 2 of 2 dictionaries`), **Preview data**, **Cancel**.
Step bar: **Match columns · Unmatched values (n) · Save as**. The last step
is named **Attach** when no column converts.

**Match columns.**

- A row of dictionary chips ("Using ...", removable, **Add dictionary**). On
  the right: "For every column" with **Convert all** · **Attach dictionaries
  only as references**.
- The pairing table: one row per dataset column that has a match in any
  chosen dictionary (a link reveals the rest). With three or fewer
  dictionaries there is one column per dictionary, each cell a radio-style
  pick showing the entry, its coding, and how many rows its values cover
  (`100%`), or "No match", or "values don't fit". Clicking the selected
  pick clears it. With four or more, one **Apply** column holds a Select
  (`sex · Sex (1/2/9) · from Demographics (CDC)`), and an **Other matches**
  column counts the alternatives. A narrow **Values** column holds a chip,
  **Convert** or **Reference only**, that toggles the row.
- Dictionaries in use at first: a dataset with bindings opens with them and
  the dictionaries they use. Otherwise, opened from the dataset menu, every
  dictionary that matches at least one column, ranked by how many columns it
  covers; opened from a dictionary (Save, or **Apply to a dataset**), only
  that dictionary. Each chip is removable with one click.
- Defaults: each column picks the dictionary whose coding covers the most of
  its values, then any description-only match. Mode defaults per section 3.
- The side pane for the selected column: Applying (dictionary › entry, code
  list), **How to apply the dictionary** with **Apply conversions** ·
  **Attach as reference only** and its explanatory sentence. Only
  under Apply conversions: the direction switch (**Source → Target** ·
  **Target → Source**, with an info icon defining both sides and "Chosen
  from the data" when automatic), the Value in data · Rows · Becomes table (accepted spellings marked), and "Also keep
  the original values in a new column, <name>_original". Then "Also matches
  ..." for other dictionaries. A description-only entry shows the
  description that will be added.
- Tooltips on all four mode buttons and on the row chip (copy in section 13).

**Preview data** slides a drawer up from the bottom, behind the footer bar,
at about 46% of the view's height, open at any step. It shows the first rows
of the dataset with changed cells as `~~1~~ Male`, unmatched values tinted,
and reference-only columns unchanged with a tag in their header. "Only
columns this touches" filters it. Escape closes it.

**Unmatched values.** Two sections:

- **Values being converted:** Column, Value, Rows, and **Keep as is** (default)
  · **Use an existing label** (Select) · **Add to list** (label input; adds
  the pair to the dictionary, so it needs edit rights there, otherwise
  disabled with a tooltip) · **Leave empty**.
- **Values without a label** (reference-only columns): **Leave unlabeled** ·
  **Add to list**.

If nothing is unmatched, an empty state says so with a Next button.

**Save as.**

- No conversions: **Attach to <dataset>** with "Nothing in your data changes.
  ... Edits to the dictionaries show up here right away." and the summary.
- With conversions: radio cards **Create a new linked dataset** (with a Name
  field, default `<dataset> (labeled)` when every converted column decodes,
  `(coded)` when every one encodes, `(converted)` otherwise; disabled with
  "Only workspace admins can add datasets." for anyone else) and **Change
  <dataset>**, whose copy depends on storage. The linked card is selected
  first, unless the dataset is already converted in place. **Change
  <dataset>** is disabled while a linked dataset reads the dataset, since
  converting it would convert twice. Applying to a linked dataset itself has
  no cards: its conversions stay live and the button reads **Update
  <dataset>**. The card copy by storage:
  - synced upload: "Rewrites the uploaded data in place. It is synced to the
    workspace, so this changes it for everyone who uses it." plus the
    confirmation checkbox;
  - offline upload: "It is offline only, so nobody else is affected.";
  - live connection: disabled, "<source> data can't be changed from Avandar
    yet, so a linked dataset is the only option for now."
  Under both cards: "Either way, the code lists and descriptions are attached
  to <dataset> for reference." Then a summary table: Column, From, What
  happens. A column that was converted and is now reference-only (or whose
  dataset becomes the source of a linked dataset) reads "Back to the
  original values".
- The primary button reads **Attach to <dataset>**, **Create linked
  dataset**, or **Change n columns**. Success returns to the dataset page (or
  the new linked dataset) with a toast.

### 7.6 Crosswalk

Task-style view with header facts `Crosswalk · 100 datasets · 10 columns ·
Reference: <layout>` and **Export mapping** (CSV: layout, dataset, output
column, fill kind, source column, conversion, code list, status). Step bar:
**Choose datasets · Map each dataset · Create combined dataset**.

1. **Choose datasets.** Layouts table (layout, datasets, columns, reference
   tag) and **Add datasets**. A **Reference layout** Select, defaulting to
   the layout whose columns best cover the others, as a percentage of the
   other datasets' columns weighted by dataset count ("Matches 86% of the
   columns in the other datasets."). The reference layout's columns seed the
   combined dataset's columns. The reference changes only while no other
   layout is confirmed ("You confirmed mappings against this layout, so the
   reference can't change."), and changing it reseeds the columns.
2. **Map each dataset.** Stub column (about 260px) with a progress bar
   (`36 of 100 mapped`, counting datasets) and one row per layout: name, "+23
   with the same layout", and a stamp: Reference, Mapped, Review, To do,
   Skipped. Skipped stays in the list. The center table: Reference column
   (name, type, "governed" when bound to an entry), a connector line (solid
   for a match, dashed for a suggestion, none for empty), Filled from this
   dataset (source column and its conversion, a fixed value, or Leave empty),
   and Match (`Name and type · 91%` or a Suggested tag). A match scoring 0.9
   or more is filled and confirmed at once (a solid line); 0.6 to 0.9 is
   filled as a suggestion (dashed) that waits for **Accept**. The connector
   lines are decorative: the Match cell says the same thing in text. The
   side pane edits the selected row: **A column** · **A fixed value** · **Combine** · **Leave
   empty**; Column Select with an example value; Convert Select (section
   5.4); Decode codes with (governed columns); a before/after example; and
   **Accept** / **Reject** for suggestions. **Add a column to the combined
   dataset** sits under the table. Footer: **Skip this dataset**, **Accept
   all suggestions**, **Confirm and next**, which stamps the layout and
   jumps to the next layout that is To do or Review. A layout is Mapped only
   after **Confirm and next**, which also confirms its suggestions and gives
   every unfilled column an explicit empty fill. The crosswalk saves on
   actions, not on a timer: **Next**, every footer action, choosing another
   layout, changing steps, renaming, and creating or updating the combined
   dataset. Two editors saving one crosswalk at once: the last save wins.
3. **Create combined dataset.** Name, "Add a source_dataset column",
   coded columns come out as **Labels** · **Codes**, a preview of the
   stacked rows with a row count ("{rowCount} rows from {datasetCount}
   datasets"), and **Create combined dataset**. The problems it lists count
   datasets, not rows ("3 datasets have mappings you haven't confirmed."),
   since counting rows would read every unconfirmed dataset before the user
   asked to. A dataset whose columns or column types changed since it was
   mapped is left out, named here, until it is removed and added again (which
   maps its new layout). Only workspace admins can add datasets, so the
   button is disabled for other editors. After creation the step is titled
   **Update combined dataset**. Deleting a crosswalk keeps its combined
   dataset, which stops updating (the confirmation names it). Deleting the
   combined dataset leaves the crosswalk, whose step 3 offers **Create
   combined dataset** again.

When a code list the crosswalk decodes with has changed since it was
compiled, a banner above the stepper (not in the header band) says "A
dictionary this crosswalk uses has changed." with **Update combined
dataset**. On step 3 the banner has no button, since the footer already
offers the update. A code list the viewer cannot read counts as changed.

## 8. Smart guesses

Profiling and matching run in the browser on DuckDB, so they work offline and
never send rows anywhere. The modules live in `shared/` where they are pure
(scoring, normalization) and in `src/lib/dataDictionaries/` where they need
DuckDB.

### 8.1 Column profiling

`profileDatasetColumns(datasetId)` returns, per column: type, row count,
null count, approximate distinct count, and the full distinct value list with
row counts when there are 50 or fewer. It reuses the queries in
`profileOfflineDatasets.ts` where it can. Classification:

| Kind | Rule (first match wins) |
|---|---|
| identifier | distinct / non-null > 0.95, or name tokens `id`, `no`, `num`, `key` with distinct / non-null > 0.8 |
| date | DuckDB type is a date or timestamp, or 90% of a text sample parses with a known format |
| ordered | categorical by the next rule, and either the values are consecutive integers `1..k` with `k ≤ 10` and the name has a scale token (`level`, `grade`, `ses`, `score`, `quartile`, `stage`, `cat`), or the text values match a known ordered vocabulary (low/medium/high, none/partial/full, never/sometimes/always, and their siblings) |
| categorical | distinct ≤ 20, and distinct / non-null ≤ 0.2 or rows < 100 |
| number | numeric type |
| text | everything else |

These rules seed the Kind Select; the user corrects them in Review.

### 8.2 Matching

`scoreColumnMatch(a, b)` returns 0..1 from three parts:

- **Name (0.45):** normalize (lowercase, split snake and camel case, strip
  punctuation, expand a small abbreviation table: `dt` date, `cd` code, `yn`
  yes no, `num` number, `hosp` hospitalized, `vax` vaccination, `dob` date of
  birth), then the best Jaro-Winkler or token-overlap score across the
  column's name and every name in the entry's `column_names`.
- **Values (0.35):** for coded columns, the share of the column's rows whose
  value is a code, label, or accepted spelling in the coding (the `100%` shown
  in Apply). For numbers and dates, range overlap.
- **Type (0.2):** compatible types score 1, castable 0.5, otherwise 0.

Bands: 0.9 and up is a match, 0.6 to 0.9 is a suggestion, below 0.6 is no
match. For an entry with several codings, the coding with the best value
score is the one offered. A coding that matches by name but covers under half
the rows is shown as "values don't fit".

The same scorer clusters columns across datasets in Create (one entry per
cluster, every other name kept in `column_names`) and maps layouts onto the
reference in crosswalks.

### 8.3 Crosswalk layouts

A layout's signature is an FNV-1a 64 hash of its sorted, normalized column
names (lowercased, trimmed, de-duplicated; names are never otherwise
altered). It is computed synchronously in shared TypeScript, so the reducer
and the stale check need no async hashing. It only groups and compares:
nothing relies on it being cryptographic. A dataset added to a crosswalk
joins a layout with the same signature and is mapped already. A new
signature becomes a new layout prefilled from the most similar existing
layout (by column name overlap), with every carried-over fill marked
suggested and given the reason `similar_layout`.

### 8.4 AI suggestions

One call per request, through the agent infrastructure's model access (the
online model, or the in-browser model offline, per the offline-parity rule).
Inputs: column names, kinds, and the distinct values of columns classified
categorical or ordered. Never identifiers, free text, dates, or numbers.
Outputs, as structured JSON validated with Zod: label suggestions per value,
an entry description, and meaning-based matches the scorer missed (`dob` ↔
`birth_date`, `vax_status` ↔ `mmr_status`). Every AI result is shown as a
suggestion with a marker and needs acceptance.

If no model is available, the button explains why ("Suggestions need a
connection or the offline model. Labeling still works.") and nothing else
changes.

## 9. Crosswalk compilation

`compileCrosswalkSql(crosswalk, layouts, columns, mappings, codeLists)` in
`shared/` returns:

```sql
SELECT 'Kings line list 2026-03' AS "source_dataset",
       CAST("CaseNo" AS VARCHAR) AS "case_id",
       TRY_STRPTIME("onset_dt", '%m/%d/%Y')::DATE AS "rash_onset_date",
       CASE lower(trim(CAST("GENDER" AS VARCHAR))) WHEN '1' THEN 'Male' ... END AS "sex",
       "age_mo" / 12.0 AS "age_years",
       'Bronx' AS "county",
       NULL AS "outbreak_associated"
FROM "<dataset uuid>"
UNION ALL BY NAME
SELECT ...
```

- Each layout's branch stacks that layout's datasets with `SELECT *`
  (`SELECT <fills> FROM (SELECT '<name>' AS "__ava_source_dataset", * FROM
  "<id>" UNION ALL BY NAME ...)`): datasets of one layout share their column
  names ignoring case, so conversions are written once per layout. Every
  output expression is aliased, since `UNION ALL BY NAME` makes a new column
  for an unaliased one.
- One bad value never breaks the combined dataset. Every fill is cast with
  `TRY_CAST`, dates parse with `TRY_STRPTIME`, and `pad_text` pads only a
  digit string shorter than the length (DuckDB's `lpad` truncates longer
  ones). A value that cannot convert becomes empty, and the pane's example
  and the preview show which.
- Codes mode reconciles to the entry's primary list: every coded column
  outputs the primary list's codes, and a layout using another coding
  translates through matching labels. A pair with no counterpart in the
  primary list becomes empty. A value that matches no pair of its list at all
  passes through as text, as conversions keep unmatched values.
- Skipped layouts are left out. A layout still To do or Review is included
  with whatever is confirmed or suggested, and step 3 says how many rows come
  from unconfirmed mappings.
- Expressions are checked with `assertSingleSqlExpression` from
  `src/lib/plugins/derivedColumns/` and may reference only the layout's own
  columns.
- Decoding embeds the code lists' current pairs, so the combined dataset is
  a snapshot of the lists at compile time. `compiled_code_lists` stores a
  fingerprint of each embedded list's pairs, and the browser compares them
  to drive the stale banner (section 7.6). Re-compiling is always the
  crosswalk editor's own action, so no recompile fans out to datasets they
  cannot edit.
- The browser compiles and the RPC stores (section 5.5). The output is saved
  as `datasets__virtual.raw_sql` of `output_dataset_id`, and the RPC
  reconciles the dataset's columns by name. After an update the browser
  clears the dataset's cached rows and the virtual dataset query cache, since
  the loaded view is not keyed by the SQL. A source's Refresh clears the
  combined datasets that read it, because a virtual dataset's definition
  token does not follow its sources' rows.
- `VirtualDatasetWrapper` gets a real freshness signal, built in slice 4: the
  storage key's definition token is the virtual dataset's defining SQL, so
  an updated combined dataset never serves its old materialization from
  `DexieRelationCache`, and a virtual dataset's rows go stale when a
  dependency's do. This also fixes the same limitation for every virtual
  dataset.

Scale: QETL acquires a virtual dataset's dependencies one at a time
(`createRegistryForFetch.ts`). With 100 datasets, the first materialization
of a combined dataset is slow. Step 3 shows progress per dataset, and the
result is cached like any virtual dataset. Section 18 lists parallel
acquisition as a follow-up if it is too slow in practice.

## 10. Ask Avandar context

Every path that describes datasets to a model gains code lists for bound
columns. Reference and convert bindings both count; for a converted column
the list explains the labels the model sees. A converted column is described
by the side it holds once converted (`  - GENDER: values Male, Female`), which
prompt `data-agent-v5` already reads as stored labels, so converting needs no
new prompt version. The `chat` edge function is redeployed with it, because
the shared formatter and the binding columns it reads changed.

| Path | File | Change |
|---|---|---|
| Legacy online `PostChatMessages` and the offline multi-pass pipeline | `shared/models/chat/SqlTableAlias/SqlTableAliasModule.ts` (`_formatAliasLine`) | Bound columns render `GENDER [1=Male, 2=Female, 9=Unknown]`, the same pattern as `_buildStatusFields`. `fetchWorkspaceSchema.ts` and `fetchOfflineChatSchema.ts` load bindings and code lists. |
| Pi data agent, online and in browser | `shared/agent/dataAgent/buildDataAgentSystemPrompt.ts` (`_formatDatasetLine`), `loadDataAgentDatasets.ts` | The dataset's column line is unchanged, and each bound column gets a line of its own under it: `  - GENDER: codes 1=Male, 2=Female, 9=Unknown (missing). Sex recorded on the case report.` A column of labels reads `values Male, Female`, and a code with no label reads `9=(no label)`. A separate line keeps the codes' commas apart from the commas between columns. A new prompt version, `data-agent-v4`, since shipped versions are frozen. |
| Offline data agent | `profileOfflineDatasets.ts`, `buildOfflineDataAgentSystemPrompt.ts`, `findQuestionValues.ts` | A bound integer column lists its code list instead of nothing. `findQuestionValues` also searches labels and accepted spellings, so "female" adds `GENDER = 2` to `VALUES IN THE QUESTION`. |
| `lookup_values` tool | `lookupValuesTool.ts` | Searches code list labels as well as stored text values, returning the code to filter on. A code-list answer runs no query and asks no approval, since a code list is metadata, not rows. A match in the data asks as before. |

Limits: up to 30 pairs per column, then "and 12 more". Up to 120 characters of
entry description per column, Pi data agent only. `truncateSchemaForOffline`
keeps a bound column's list whole, as it does for statuses.

Code lists are metadata, not rows, so decision D05 (the model never sees
rows) holds. Following the agent roadmap's bar, the eval gets cases before
this ships: questions phrased in labels against coded columns ("how many
female cases were hospitalized"), for online and offline, with no accuracy
loss on the existing suite.

## 11. Permissions and RLS

v1 reuses the `data_sources` app and does not add a `resource_type`. Adding
one touches six SQL files (`15.resource_shares.sql`,
`16.utils.resource-permissions.sql`, and four RPCs), which is worth doing
only when per-dictionary sharing is needed. The owner columns are in place
so that change needs no data migration.

| Table | Select | Insert, update | Delete |
|---|---|---|---|
| `data_dictionaries` and its children | `util__auth_user_meets_min_app_role(workspace_id, 'data_sources', 'viewer')` | `... 'editor'` | owner, or `'admin'` |
| `crosswalks` and its children | same | same | same |
| `dataset_columns__dictionary_bindings` | `util__auth_user_can_access_resource('dataset', dataset_id, 'viewer')` | None for signed-in users: `rpc_dataset_columns__apply_dictionaries` writes a dataset's bindings whole after checking `... 'editor'` on the dataset and Data Sources viewer | Same as insert |

- A linked dataset and a combined dataset are ordinary `datasets` rows owned
  by their creator, with the usual dataset permissions. Creating one needs
  the dataset insert permission and the subscription's dataset limit check
  (`SubscriptionPermissionsClient.useCanAddDataset`), like any import.
- Applying needs edit rights on the dataset. Adding an unmatched value to a
  code list also needs edit rights on the dictionary.
- Dictionary contents are visible to every Data Sources viewer. A reader who
  cannot see a dataset never sees its bindings, because bindings follow the
  dataset.
- Permission keys in `PermissionRegistry.ts`:
  `data_sources__can_view_dictionaries`,
  `data_sources__can_edit_dictionaries`,
  `data_sources__can_edit_crosswalks`. The one crosswalk key gates the
  Crosswalks group, **New crosswalk**, and the view. Viewers still read
  crosswalk rows under RLS, so Used by and the rail can name them.
- The four crosswalk child tables are select-only for signed-in users and
  written only through `rpc_crosswalks__save` (section 5.4). A
  `crosswalks__datasets` row is readable only by someone who can view its
  dataset, so a reader never learns about a dataset they cannot open, and a
  save never removes a membership its caller cannot see.
- Accepted trade-off: Data Sources viewers can read a crosswalk's layouts and
  mappings, so the column names, source columns, and fills of a restricted
  dataset that is alone in its layout are readable. The membership rows
  themselves stay hidden. Hiding the layouts would hide them from the save
  payload, and the save would then delete them, so they stay readable.
- pgTAP: a file per table group under `supabase/tests/database/permissions/`,
  following `rls_maps.test.sql`, with the negative cases from
  `docs/rules/sql.md`.

## 12. Offline and desktop

- Dictionaries, code lists, crosswalks, and bindings are read through
  TanStack Query, whose persisted cache keeps them readable offline. Writes
  need Supabase, so creating, editing, or applying while disconnected fails
  with "You're offline. Reconnect to save this." and keeps the user's work in
  the form.
- Conversions are applied when data loads, so an offline-only dataset that
  was converted keeps converting offline.
- Profiling and matching run on the device. AI suggestions use the offline
  model when there is no connection.
- Nothing here depends on browser chrome, so the desktop app gets it for
  free.

## 13. User-facing copy

All strings go through Lingui. Tooltips are rendered by a positioned
tooltip, not `title`, and also open on keyboard focus.

| Where | Copy |
|---|---|
| Global switch | **Convert all** · **Attach dictionaries only as references** |
| Convert all tooltip | Changes the values in every column that matches a dictionary, replacing each source value with its target value. Charts, filters, and downloads show the target values from then on. |
| Attach dictionaries only as references tooltip | Leaves every column exactly as it is. Your dictionaries are attached alongside the data, so anyone can hover a column to see what its values mean, and Ask Avandar can use them to answer questions. |
| Side pane label | How to apply the dictionary |
| Side pane switch | **Apply conversions** · **Attach as reference only** |
| Apply conversions tooltip | Replaces each source value in this column with its target value. For example, every 1 becomes Male, and charts, filters, and downloads show Male from then on. |
| Attach as reference only tooltip | Leaves this column exactly as it is. The dictionary is attached alongside it, so anyone can hover the column to see what each value means, and Ask Avandar can use it to answer questions. |
| Explanation, converting | Your data will change. The dictionary stays attached too, so the column is still explained. |
| Explanation, reference | Your data stays the same, which is what you want for models and exports that need the original values. Hover the column to see the target values. |
| Row chip | **Convert** · **Reference only** (tooltip: the matching side-pane tooltip plus "Click to attach as reference only instead." or "Click to convert instead.") |
| Dataset menu | **Apply a dictionary** / Convert values and add column descriptions (slice 3 shipped "Show what codes mean and add column descriptions" until conversions, section 7.4). **Create a dictionary from this dataset** / Saved to Dictionaries, so other datasets can use it too. |
| Popover footer | From <dictionary> › <entry>. Attached as reference. The values in the data are unchanged. / The values were converted to these target values (or these source values, when the column was converted the other way). |
| Rail | Attached as reference · data unchanged / Linked dataset: <name> / Converted this dataset · version <n> |
| Save step, reference only | Nothing in your data changes. <n> columns keep their values, with the dictionaries attached as reference. Edits to the dictionaries show up here right away. |
| Source value / Target value | Used for the two sides of every pair, in place of "code" and "label": the column headings of the map-values table, the code list editor, and the entry's value table, the direction switch (**Source → Target** · **Target → Source**), and field names. Each first prominent heading carries an info icon, focusable by keyboard, with a tooltip. |
| Source value tooltip | A value as it appears in the data, such as 1 or "M". |
| Target value tooltip | What the source value is converted to when the dictionary is applied. It can be a readable label, such as "Male", or a value in another coding system. |
| New-dictionary step | **Map values** (was "Label values"), **Next: map values**, a row badge **Needs mapping**, **Suggest target values**. |
| Values with no target value | "Values with no target value" (apply flow), "# value in the data has no target value." with **Add them in <dictionary>** (popover), **Leave unmapped** (reference mode), **Use an existing target value**. |

"Reference" was chosen over "documentation" because people already say "for
reference" to mean "look it up, don't change it".

## 14. Edge cases

| Case | Behavior |
|---|---|
| A bound column disappears after a refresh or re-import | The binding cascades away with the `dataset_columns` row. `_reconcileColumns` keeps column ids when names match, so bindings survive ordinary refreshes. |
| New values appear after a refresh | Converted: unmatched values pass through (override default "keep"). The popover adds "3 values in the data have no label" with a link to the dictionary. |
| A pair is removed from a live code list | Linked datasets show the raw value for it from the next load. Pinned datasets are unaffected. |
| A dictionary is deleted | A trigger copies the current pairs into `pinned_pairs` for every live convert binding first, so no linked dataset changes silently. Reference bindings are removed. The delete confirm names the number of datasets affected. |
| An entry is deleted | Same as above, scoped to the entry. |
| A code list a binding uses is deleted | A live convert binding is pinned to the list's pairs first, so no linked dataset stops converting silently, and Used by offers **Re-apply**. A reference binding keeps its entry and description; the same save re-points it to the entry's code list when the entry is left exactly one, and otherwise it shows no code list until a dictionary is applied again. A pinned binding is never re-pointed. |
| The source of a linked dataset is deleted | Existing behavior for virtual datasets with a missing dependency: its queries fail. `linked_source_dataset_id` becomes null, the linked dataset keeps its bindings, and its rail says "The dataset it reads was deleted." The source's delete confirmation names its linked datasets first. |
| A pipeline reads a converted dataset | Pipelines read the stored files with Node DuckDB, so they see raw values, as they already see names and types from before a rename or cast. |
| A user converts a dataset in another tab | The next query in this tab rebuilds the view once its cached bindings or code lists are refetched: at once after an edit in this tab, within the 6-minute online stale time otherwise. |
| Two bindings for one column | Prevented by the unique `dataset_column_id`. Applying again replaces the binding. |
| A column renamed after binding | Bindings use `dataset_column_id`, so they follow the rename. |
| Applying with no edit rights on the dataset | The menu items are hidden; the route redirects to the dataset with a toast. |
| Code list with codes that differ only in case (`m`, `M`) | Matching is case-insensitive, so the save is refused with "Two values in this list only differ in capitalization: m and M." |
| 200 datasets in a crosswalk | Allowed; the stub list virtualizes past 100 layouts. |
| A mapped dataset's columns change | The dataset is left out of the combined dataset and named in step 3, rather than failing the combined dataset on a missing column. Removing it and adding it again maps its new layout. |
| The combined dataset is deleted | The crosswalk stays; its step 3 offers **Create combined dataset** again. |
| A crosswalk is deleted | The combined dataset stays and stops updating. The confirmation names it. |
| A code list a fill translates with is deleted | Step 3 names the fill, and its values pass through unchanged. |
| Two editors save one crosswalk at once | The last save wins. |

## 15. Testing

Red/green TDD per `docs/rules/testing.md`.

- **Unit (Vitest):** the projection renderer (decode, encode with accepted
  spellings, overrides, keep-original, integer output, quoting of hostile
  labels), the scorer and its bands, profiling classification against real
  fixtures, layout signatures, `CrosswalkFillSchema` and `CodePairsSchema`
  parsing and migration.
- **Executed (`*.executed.test.ts`, real DuckDB):** a converted column
  returns labels through QETL; an ordered list sorts by list order; a linked
  dataset follows a code list edit without a cache clear; the crosswalk SQL
  stacks three layouts with conversions and a source column.
- **pgTAP:** RLS for every new table (section 11); the version-bump trigger;
  the pin-on-delete trigger; `rpc_dataset_columns__apply_dictionaries`
  writing a linked dataset and its bindings atomically.
- **Agent evals:** the cases in section 10, online and offline. The online
  runs gate the release. The offline score is recorded, not a gate, because
  the offline model's scores move between runs.
- **E2E (one spec per flow, run one at a time):**
  `dictionary-create-from-dataset.spec.ts`,
  `dictionary-apply-reference.spec.ts`,
  `dictionary-apply-linked.spec.ts`,
  `dictionary-apply-in-place.spec.ts`,
  `crosswalk-map-and-combine.spec.ts`. Seed datasets with the service-role
  helpers, drive everything else through the UI, restore state in
  `afterEach`.

## 16. Delivery slices

Each slice is one PR into `demo/measles`, recorded in
[pr-feature-log.md](pr-feature-log.md).

1. **Dictionaries.** Schema, models, clients, RLS and pgTAP for dictionaries,
   entries, code lists, and codings; the list group; the Dictionary view with
   all three tabs (Used by empty until slice 3); manual create and edit.
2. **Learn from datasets.** Profiling, scoring, the create flow from the Add
   menu and from a dataset's menu, AI label and match suggestions online and
   offline.
3. **Attach as reference.** Bindings schema and RPC, Apply with reference
   mode only, the code-list popover (dataset page and Data Explorer header),
   the rail group, Used by, and Ask Avandar context with evals.
   - **Add from datasets into an existing dictionary** follows slice 3 as a
     separate small piece. It learns from more datasets into a saved
     dictionary and adds them to its "Made from".
   - **Follow-ups from slice 3,** built together after it: the entry
     description in the Description column (`ObjectDescriptionList` passing
     the row to `renderValue`, section 7.4); **Apply to a dataset** listing
     only datasets the user can edit, through
     `rpc_datasets__get_editable_ids` (section 7.2); tags on grouped SQL
     results in the Data Explorer, from the SQL projection reader reading
     `count(*)` and `GROUP BY` positions (section 7.4).
4. **Conversions.** The `valueMapping` projection, ordered `ENUM` output,
   linked datasets, converting in place with pinning and Re-apply, unmatched
   values, the preview drawer, keep-original columns, the virtual dataset
   freshness signal. It also restores the dataset menu's "Turn codes into
   labels" sub-line (section 7.4) and settles open decision 5. Planned in
   [data-dictionaries-4-conversions-plan.md](data-dictionaries-4-conversions-plan.md)
   as two PRs: the engine, schema, linked datasets, and every surface first;
   then converting in place, its warning, and **Re-apply**, frontend only.
5. **Crosswalks.** Schema, layouts, the three steps, mapping fills and
   conversions, compilation, export, the stale banner. Planned in
   [data-dictionaries-5-crosswalks-plan.md](data-dictionaries-5-crosswalks-plan.md)
   as two PRs, with the owner decisions approved on 2026-11-14:
   - **Part A (F136), built on `feat/crosswalks`.** The schema, the engine,
     every crosswalk surface, **Export mapping**, the stale banner, and Used
     by.
   - **Part B (F137), built on `feat/crosswalks`.** Meaning suggestions, long
     layout lists, combining progress, and the 100-dataset measurement,
     frontend only.

## 17. Roadmap

- **Write-back to live sources.** When a connector supports writing (Google
  Sheets first, then Postgres), **Change <dataset>** becomes available for
  live connections, with the same pinned semantics. Until then it stays
  disabled with the copy in section 7.5.
- **Undo a conversion in place.** Stored data is never rewritten (section
  6.1), so removing a convert binding restores the original values. Expose it
  as "Restore original values" in the rail's overflow and the Used by tab.
- **Per-dictionary sharing.** Promote dictionaries and crosswalks to a
  `resource_type` when teams need private or restricted dictionaries.
- **Import dictionaries** from REDCap data dictionary CSVs, SPSS value
  labels, and CDISC codelists; publish starter dictionaries (CDC race and
  ethnicity, NNDSS case report codes).
- **Display-only target values.** Today a dictionary's target value is also what charts show for a column attached as reference. Separate "value" from "display value" so a dictionary can add a display value without converting data, while a conversion dictionary changes the stored value. Raised in QA when "Source/Target" replaced "code/label" in the UI.
- **Show labels on raw grids** as a display toggle, without converting.
- **Crosswalk joins** (side by side), building on the joined-cases key
  matching.
- **Parallel acquisition** for virtual datasets with many dependencies.
  Measured in slice 5: a cold combine over 100 datasets on a throttled network
  spends about 32 s reading them one at a time
  ([crosswalks-materialization.md](crosswalks-materialization.md)).

## 18. Open decisions

1. **Anonymous `ENUM` casts in a view.** Settled by running the browser's
   DuckDB-WASM build (DuckDB v1.4.4). A cast to the labels alone fails every
   query once one value is not a label, `TRY_CAST` empties it, and duplicate
   labels refuse the type. The `ENUM` is built at load from the labels and
   the kept values (section 6.4), and the `VARCHAR` fallback is not needed.
2. **Bindings in the relation cache key.** Settled: every browser entry point
   (Data Explorer, dashboard blocks, maps, the agent's `run_query` online and
   offline, concepts, virtual datasets) loads through `RelationLoading`,
   which passes the conversions to `getColumnReplacementsFromColumns`. A
   loaded view records a projection key and is rebuilt when it changes
   (section 6.2). Published snapshots read a converted dataset through the
   workspace query. Pipelines read stored files raw (section 14).
3. **AI suggestion endpoint.** Whether label suggestions reuse the Pi data
   agent's proxy (`PostAgentStream`) with a dedicated prompt, or get their own
   small route. Depends on where the agent work stands when slice 2 starts.
4. **Crosswalk materialization time at 100 datasets.** Settled by
   measurement in slice 5 ([crosswalks-materialization.md](crosswalks-materialization.md)).
   The rule was set before measuring: build parallel acquisition when the
   median cold first preview of 100 datasets, on a throttled network, exceeds
   60 seconds and at least 70% of it is spent reading datasets. Cold,
   throttled took 67.7 s with 100% reading: parallel acquisition is worth
   building, as a follow-up feature on the roadmap. About 36 s of that is the
   browser fetching the DuckDB engine and its Parquet extension before the
   first dataset arrives, and about 32 s is the datasets themselves, so the
   follow-up shortens only the second part. Unthrottled, the same preview
   takes 2.1 s cold, 1.3 s warm, and 0.2 s hot.
5. **A reference binding whose code list is deleted.** Settled with the
   slice 4 plan (owner decision 4): the save that deletes the list re-points
   the binding when its entry is left exactly one code list; otherwise it
   keeps its entry and shows no list until the next apply. A convert binding
   is pinned instead and never re-pointed (section 14).
