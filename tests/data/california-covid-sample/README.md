# california-covid-sample

Clean, well-formed COVID case dataset (columns: `Province_State`, `Admin2`,
`Lat`, `Long_`, `date`, `daily_new_cases`), provided as both `.csv` (~900 KB)
and `.xlsx` (~3 MB) exports of the same data.

## What it's for

The default happy-path import fixture: a normal, non-malformed dataset that
should parse, preview, save, and query without any special handling. Use it
when you need a realistic mid-sized dataset and the test is about ordinary
behavior (import → parquet, previews, Data Explorer queries, visualizations)
rather than a parsing edge case.

The `.csv` and `.xlsx` are the same rows, so tests can assert that both import
paths yield equivalent results.

For a fast, size-agnostic variant, use `small-california-covid-sample`.
