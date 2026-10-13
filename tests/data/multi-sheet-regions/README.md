# multi-sheet-regions

A synthetic workbook for `tests/e2e/excel-multi-sheet-import.spec.ts`.
All three sheets have `city` and `cases` columns. Distinct values and row
counts make a wrong-sheet import or an accidental combination detectable.

| Sheet position | Sheet | Rows (city, cases)                           |
| -------------- | ----- | -------------------------------------------- |
| 1              | North | Northport, 101                               |
| 2              | South | Southbank, 202; Southfield, 203              |
| 3              | West  | Westhaven, 301; Westlake, 302; Westwood, 303 |

The test uploads the workbook, switches from North to South, processes the
selected sheet, saves it, and queries the saved dataset in Data Explorer.
It asserts the exact South rows, including their numeric values.
The test gives its dataset a unique name and removes the dataset, shares,
and cloud Parquet file in `finally`, including after a failed assertion.

Regenerate from the repository root:

```sh
node tests/data/multi-sheet-regions/makeTestXlsxData.ts
```
