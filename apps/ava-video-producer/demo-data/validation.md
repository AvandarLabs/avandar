# Fixture validation

Validated 14 October 2026 with Python 3.9.6 and DuckDB CLI 1.3.2 (`0b83e5d2f6`). This report covers local generated files and in-memory queries. Live Avandar import and render verification belongs to the browser session report.

| Check | Result |
| --- | --- |
| `python3 demo-data/generate.py --check` | All five CSVs and the manifest match deterministic regeneration byte for byte |
| `python3 demo-data/validate.py` | Passed primary/foreign keys, date chronology, weekly grains, missingness, summaries, narrative counts, geometry, hashes, schema and formula-input checks |
| Artifact workbook authoring/inspection | All five CSV outputs matched the portable generator; representative rows rendered and visually reviewed |
| DuckDB CSV inference | `report_date` and `week_start` infer as DATE, latitude/longitude as DOUBLE, household size as BIGINT, identifiers as VARCHAR |
| SQL 1: weekly report rows | 36 rows, including two missing reports |
| SQL 2: awaiting contact | 19 rows |
| SQL 3: distinct-case/contact join | 6 district rows; totals 240 cases and 221 cases with contact; Eastbank 56/37 |
| SQL 4: Eastbank mapped case rows | 56 rows |
| SQL 5: district geometry summary | 6 rows |
| Negative validation: orphan visit case | Rejected with `Orphan visit case` |
| Negative validation: missing report changed to zero | Rejected with `Missing reports became zero` |
| Negative validation: point outside district | Rejected with `Point outside assigned district` |

The negative checks ran on temporary disposable copies and did not modify the delivered files. The SQL templates ran against views over local CSV files in an in-memory DuckDB database. They do not establish that Avandar's additional query authorization, projection, browser-WASM engine, UI or persistence layers behave identically. Rehearse those separately before filming.
