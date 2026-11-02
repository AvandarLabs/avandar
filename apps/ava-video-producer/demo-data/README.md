# Harborfield response demo data

Entirely fictional data for local Avandar rehearsal and product recordings. No real person, facility, district, administrative boundary, incident, or clinical observation is represented. The invented geometry is a small grid near 10 degrees east, 10 degrees north, chosen to match the geometry conventions of Avandar's GIS tests. It does not describe the real place under a basemap. Keep **Fictional demonstration data** visible in the recording and in exported artifacts.

## The story

An information manager reviews six weeks of response records, from 3 August to 13 September 2026. Eastbank's recorded cases rise from 4 to 17 per week, 19 cases await contact, and its two facilities have 17 supply kits in the latest stock snapshot. West Marsh's final two weekly reports were not received. The dataset supports an inspectable planning conversation, with no claims about real outbreaks or medical decisions.

The source field `referral_status` is imported administrative data. It does not imply that Avandar implements assignment, follow-up automation, or editable case-status workflows.

## Files and import order

| File | Grain | Rows | Uses |
| --- | --- | ---: | --- |
| `facilities.csv` | One fictional facility | 12 | Point map, source preview, stock snapshot |
| `cases.csv` | One anonymous response case | 240 | Import, filters, table/chart, Case Manager, point map |
| `visits.csv` | One recorded follow-up contact | 297 | One-to-many join, case fields using count/sum, contact coverage |
| `districts.csv` | One fictional district and its current summary | 6 | WKT polygons, choropleth, exact-key boundary matching |
| `weekly_reports.csv` | One district and Monday-start reporting week | 36 | Time series, filters, missing-report distinction |

Use one dataset per CSV. Suggested names are `Harborfield facilities`, `Harborfield cases`, `Harborfield visits`, `Harborfield districts`, and `Harborfield weekly reports`. Names are recommendations for newly created demo records, not preexisting Avandar UI labels. Add the fictional provenance above to each dataset's Description field. CSV preserves numeric inference better than the current XLSX path, which reads workbook cells as text.

All CSVs are UTF-8, comma-delimited, one header row, LF line endings, ISO dates. Empty numeric cells mean missing, never zero. Text IDs have stable prefixes and are safe to use in the current Case Manager record reader. Geometry uses WKT with longitude first, latitude second, EPSG:4326. Point columns are explicitly named `latitude` and `longitude`.

## Relationships and interpretation

| Relationship | Meaning |
| --- | --- |
| `visits.case_id` -> `cases.case_id` | Zero or more contacts per case; 221 distinct cases have contacts |
| `cases.facility_id`, `visits.facility_id` -> `facilities.facility_id` | Responsible facility in the fictional source system |
| `cases.district_id`, `facilities.district_id`, `weekly_reports.district_id` -> `districts.district_id` | Consistent district keys and point containment |
| `weekly_reports.(district_id, week_start)` | Unique district-week; two missing West Marsh reports retain blank counts |

`cases.household_size` is people per household. `facilities.staff_count` is a headcount snapshot. `supply_kits_available` is a stock snapshot as of 13 September; `visits.supply_kits_delivered` is a per-visit quantity. Do not subtract lifetime deliveries from a stock snapshot or sum stock across dates. `staff_minutes` is per visit. `population` is invented resident population for optional rate examples, not a source of real demographic facts. `age_band` and `support_need` are illustrative categories, not clinical classifications.

`districts.recorded_cases` counts all recorded cases over the six-week period. West Marsh's 25 recorded cases cover four received reports. Its missing final weeks are not evidence of zero cases. `latest_reporting_status` makes this visible. Use `weekly_reports.reporting_status` when distinguishing weekly missingness.

For Case Manager, join `cases` and `visits` on `case_id`, use `cases.case_label` as the title, and create only dataset-backed fields. Every visit has a matching case label; avoid joining facilities as a third source into the same case type because its identifier grain differs. Use `first` or `most_frequent` for text/date fields, and `sum` or `count` for appropriate numeric visit fields. Current product limitations are documented in [the user manual](../docs/using-avandar.md).

## Regenerate and validate

From the video-agent repository root, using Python 3.9 or newer:

```sh
python3 demo-data/generate.py
python3 demo-data/generate.py --check
python3 demo-data/validate.py
```

The generator is deterministic (seed `20261014`) and has no dependencies, credentials, network calls, or product database writes. It rewrites only the five CSVs and `manifest.json` in this directory. The manifest records every field, row count, byte size, SHA-256 digest, date range, coordinate system, and provenance. `--check` only reads files. `validate.py` independently reads the exported CSVs and checks primary keys, foreign keys, dates, summary totals, narrative counts, missingness, WKT closure, coordinate bounds/containment, checksums, and unexpected formula-like cell inputs.

The initial CSVs were also authored and inspected through the available artifact workbook API, with representative rows rendered for visual review. Its output matched this portable generator byte for byte. This verifies file contents, not live Avandar import. Browser verification belongs in a session capture report.

[queries.sql](queries.sql) contains rehearsal queries. Replace placeholders with actual imported dataset UUIDs. All five queries were executed against the CSV files with local in-memory DuckDB and returned the expected result counts; [validation.md](validation.md) records the checks. They have not been executed through the product's QETL/browser path by the documentation agent. Keep explicit `AS` aliases and qualified field references because the current QETL column projection has documented edge cases around inference.

## Fixture selection and provenance

Reviewed Avandar's `tests/data` fixtures: the 100-row and 17,367-row fake NYC cholera XLSX files are explicitly synthetic; `gis/` provides deterministic geometry, coordinates, temporal points, invalid-coordinate examples, boundary joins and suppression tests; `multi-sheet-regions` tests one-tab-per-dataset behavior; the California COVID samples and global-death CSVs have their own source/parse-test roles. No file was copied. This bundle was generated from scratch to provide coherent keys, chronology, geography and a reusable story without importing real health observations or making an actual place appear to have a fictional outbreak.

The fixtures are suitable to commit in this private video repository. Reviewed Avandar captures made with these fictional inputs may also be committed with provenance. Raw recordings, signed URLs, auth state, customer data, and unrelated product assets stay out of Git.
