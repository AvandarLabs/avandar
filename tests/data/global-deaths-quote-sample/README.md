# global-deaths-quote-sample

A compact (~4 KB) sample of the global COVID deaths CSV shape (same columns as
`global-deaths-late-quotes`) containing quoted fields.

## What it's for

A small, human-readable reference of the quoted-CSV pattern the
`global-deaths-*` edge-case fixtures are built around. It is handy for eyeballing
the quoting shape or for quick manual import checks.

Note: no automated test currently references this file (its larger siblings
`global-deaths-late-quotes` and `global-deaths-sniff-misses-quotes` drive the
actual quote-handling tests). Keep it as a minimal sample, or wire it into a
targeted parser test if a smaller quoted fixture is needed.
