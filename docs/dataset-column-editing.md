# Dataset column editing

How a dataset's column names and types can be changed, and why doing so costs
almost nothing.

## The stored data never changes

A dataset's parquet blob always holds the column names and types the **source**
had. A rename or a type change is never written into it. Both are applied as a
projection in the DuckDB view built over the parquet, in
`loadParquetIntoDuckDb`:

```sql
CREATE VIEW IF NOT EXISTS "<datasetId>" AS
SELECT * EXCLUDE ("pop", "d"),
       "pop" AS "Population",
       TRY_CAST("d" AS DATE) AS "Recorded On"
FROM read_parquet("<datasetId>")
```

The clauses come from `getParquetProjectionClauses`, fed by
`getColumnReplacements`, which reads the saved `dataset_columns` rows and keys
each replacement by `originalName`. Three consequences follow:

- Editing a column requires **no re-parse and no re-materialization**. The view
  is rebuilt on the next query; the parquet is untouched.
- Every rename stays reversible, because `originalName` still addresses the
  stored column.
- Only the DuckDB view needs dropping after an edit. Do **not** drop the
  `LocalDataset` row: for a dataset the user chose to keep offline-only, its
  parquet is the sole copy, and the read path does not check
  `isInCloudStorage` before attempting a re-download.

## Columns can be edited before the dataset is saved

`useImportedColumns` holds the columns of a pending import and lets the user
correct the `name`, `dataType`, and `description` of each one on the import
form. Inference runs on a sample, so it gets types wrong often enough to be
worth correcting at import time rather than after saving.

Edits are layered over the inferred list rather than replacing it, and they are
held against the parse that produced them. Re-parsing with a different delimiter
or sheet therefore discards them, instead of reapplying choices made about a
different set of columns.

Whether a source offers the editor at all is decided by
`DatasetSource.supportsImportTimeColumnEditing`, which matches exhaustively so a
new source type will not compile until it declares an answer. A source qualifies
when this workspace is the authority on its column metadata. `open_data` is
excluded because the shared catalog owns its columns; `virtual` is excluded
because its columns are whatever its SQL projects.

Whatever the source, and whether or not it was editable, the columns reach the
insert RPCs through one funnel: `DatasetColumn.Imported[]` built per source, then
`makeDatasetColumnInputsFromImportedColumns`.

## Why `is_data_type_user_set` exists rather than a comparison

Query time needs to know whether to project `TRY_CAST(col AS data_type)`. It
cannot work that out by comparing `data_type` against `detected_data_type`,
because those two diverge in **two** different situations:

1. the user chose a type, and
2. a re-parse revised `detected_data_type` under a column nobody touched.

Casting in case 2 discards the correction. This is not hypothetical: the XLSX
sniff phase reports every column as `VARCHAR`, so every column was saved as
`varchar`; the background transcode then reconciled `detected_data_type` to what
`read_xlsx` really produced, and the derived comparison read that as a user
override and cast the entire dataset back to text.

So the flag is stored, and:

- `getColumnReplacements` casts only when `isDataTypeUserSet` is true.
- `_reconcileColumns` (in `runBackgroundParquetTranscoding`) refreshes
  `dataType` from the corrected `detectedDataType` when the flag is false, and
  leaves it alone when it is true.
- Setting a type back to the detected one clears the flag, so no no-op
  `TRY_CAST` is emitted.

## Column names are validated, because DuckDB will not complain

Two name problems must be blocked before saving, and neither surfaces as a
DuckDB error at the point the user could act on it:

- **Empty name.** A zero-length quoted identifier is a parser error, raised when
  the view is built, long after the import form has moved on.
- **Duplicate name.** DuckDB does not error at all. It silently renames the
  second column to `name_1` in `SELECT *`, and a lookup by name returns only the
  first. Since every query the app builds addresses columns by name, a duplicate
  quietly makes one column unreadable and returns another column's values.
  Identifiers resolve case-insensitively even when quoted, so `City` and `city`
  collide too.

`getImportedColumnErrors` reports both, comparing names trimmed and case-folded,
and the import form disables saving while any remain.

## Lossy casts warn rather than block

A user-chosen type is applied with `TRY_CAST`, which never errors: a value it
cannot convert becomes null. `probeColumnCastLoss` counts how many of the
preview's sampled values a proposed type would null out and the form reports it,
so a wrong choice is visible before saving instead of showing up later as an
inexplicably empty column.

The count is put to DuckDB itself, via an inline `VALUES` list needing no file
and no dataset lease, rather than reimplemented in TypeScript. `TRY_CAST` has
enough quirks to make a reimplementation drift: `'7.9'` to `BIGINT` rounds to 8
rather than failing, and a bare date to `TIME` yields midnight.

Because the count comes from the preview sample rather than the whole file,
treat it as evidence a choice is wrong, not proof that it is right.
