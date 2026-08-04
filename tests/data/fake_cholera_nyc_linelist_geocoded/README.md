# fake_cholera_nyc_linelist_geocoded

A synthetic (fake) NYC cholera case line-list with geocoded coordinates,
provided as `.xlsx` (~480 KB). Parses to 17,367 data rows.

## What it's for

The primary real-scale XLSX import fixture. Use it to exercise the `.xlsx`
parse path on a workbook with many rows and a wide, mixed column set (dates,
strings, lat/long numerics) rather than the tiny synthetic sheets. Tests assert
the parsed row count (17,367) and the expected column names, so it doubles as a
regression guard on XLSX column/row extraction.

No data is real; it is randomly generated line-list-shaped data. For a fast
variant, use `small-fake_cholera_nyc_linelist_geocoded`.
