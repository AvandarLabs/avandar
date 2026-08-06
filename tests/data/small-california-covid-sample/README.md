# small-california-covid-sample

A 100-row slice of `california-covid-sample`, in both `.csv` (~8 KB) and
`.xlsx` (~40 KB). Same columns and shape as the full dataset.

## What it's for

The fast, size-agnostic variant. Use it whenever a test needs a valid dataset
but does not care about volume, so the import → parquet → cloud-sync round trip
stays as quick as possible (e.g. e2e flows that assert UI behavior, not parse
performance). Parsing yields exactly 100 data rows, which tests assert against.

Reach for the full `california-covid-sample` only when size actually matters.
