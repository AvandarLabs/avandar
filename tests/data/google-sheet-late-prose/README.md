# google-sheet-late-prose

A two-tab workbook that stands in for a Google Sheet exported from Drive, used
by `tests/e2e/google-sheets-import.spec.ts`.

Its point is the `indicator_value` column on the `Series` tab: 700 rows of plain
numbers, then one row holding a long sentence. That is the shape of a World Bank
Gender Statistics export, and it is the shape that broke the Sheets import.
DuckDB's `read_xlsx` types a column from a sample of its leading rows, so it
called this one a `DOUBLE` and then failed the entire read on the sentence:

```
Invalid Input Error: read_xlsx: Failed to parse cell 'B702':
Could not convert string 'Female share of graduates ...' to DOUBLE
```

The failure was invisible until late because the import's preview step is
SheetJS rather than DuckDB, and SheetJS reads the same workbook happily. The
user was told the preview parsed, then the background transcode died.
`makeReadXlsxArgs` now passes `all_varchar = true`, which is also the type both
xlsx callers record for every column.

The second tab (`Country`) exists so the tab selector has more than one option,
which keeps a first-tab default from passing by accident.

The spec imports `TOTAL_ROW_COUNT`, the tab titles and the workbook path from
`makeTestXlsxData.ts`, so what the tests assert and what the workbook contains
cannot drift apart.

Regenerate with:

```bash
node tests/data/google-sheet-late-prose/makeTestXlsxData.ts
```
