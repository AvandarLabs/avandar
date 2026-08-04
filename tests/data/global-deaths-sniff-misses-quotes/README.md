# global-deaths-sniff-misses-quotes

Global COVID deaths dataset (same columns as `global-deaths-late-quotes`) as
`.csv` (~44 KB), shaped so DuckDB's CSV dialect sniffer **misses the quote
character entirely** on its initial sample.

## What it's for

Exercises the quote-probe fallback. When the sniffer reports no quoting but the
data actually contains quoted fields further in, the parser re-infers the quote
character from later chunks and re-parses. This dataset is the fixture behind
both the `csvQuoteProbe` unit test (quote inference from probe chunks) and the
e2e CSV import test that proves quoted cells survive the full import.

Because it deliberately stresses dialect detection, a parse may legitimately
reject 1-2 rows; tests account for that.
