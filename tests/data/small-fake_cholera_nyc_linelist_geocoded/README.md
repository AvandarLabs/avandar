# small-fake_cholera_nyc_linelist_geocoded

A 100-row slice of `fake_cholera_nyc_linelist_geocoded`, as `.xlsx` (~48 KB).
Same synthetic columns and shape as the full workbook.

## What it's for

The fast variant of the geocoded cholera XLSX. Use it when a test needs a valid
multi-column `.xlsx` but should not pay the parse cost of the full 17k-row
workbook (e.g. UI-focused e2e import flows). All data is synthetic.
