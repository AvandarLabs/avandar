# global-deaths-late-quotes

Global COVID deaths dataset (columns: `Country/Region`, `Province/State`,
`Lat`, `Long`, `date`, `daily_new_deaths`) as `.csv` (~28 KB), constructed so
that quoted fields first appear **late** in the file, after DuckDB's CSV dialect
sniffer has already taken its sample from the top rows.

## What it's for

An edge-case fixture for late-appearing quotes. DuckDB sniffs quoting from a
sample at the start of the file; if the first quoted value only shows up far
below that window, a naive parse can mis-handle it. This dataset forces that
scenario so the import path proves it still detects and applies the quote
character correctly.

It is intentionally small enough to round-trip through the full upload + cloud
sync flow in an e2e test.
