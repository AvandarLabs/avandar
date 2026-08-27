# Manual Query Filters: Functionality and UI/UX Review

**Date:** 2026-08-17
**Status:** Findings list, not yet a spec
**Scope:** Data Explorer, bottom query drawer, `Manual` mode, `Filters (Where)`
panel only. The AI chat query path was not used.
**Author:** Claude, driven headless via agent-browser against the local dev
server

## Summary

The filter engine is, with a handful of exceptions, semantically correct: of the
30 predicate and grouping cases exercised, 28 produced exactly the row counts
computed independently from the CSVs, and the two failures were `contains` and
`does not contain`. The problems are concentrated in three places:

1. **Two operators are outright broken.** `contains` and `does not contain`
   emit a bare `LIKE 'value'` with no wildcards, so they behave as
   case-sensitive exact match and silently return the wrong rows.
2. **The panel is barely usable for typing or reading.** A filter value input
   loses focus after every single keystroke (one character per click), the
   AND/OR selector always renders blank, and column names are clipped without
   an ellipsis so you cannot tell which column a rule targets.
3. **Every failure is silent.** DuckDB conversion and binder errors, stale
   filters after a data-source switch, orphaned rules whose column was
   removed, and cleared values all present as an empty grid or as unchanged
   stale results, with no message anywhere.

The list below separates verified-correct behavior (so we do not re-litigate
it), functional defects (F1 to F16), UI/UX defects with descriptive fixes (U1
to U19), and missing filter capabilities that DuckDB supports today (M1 to
M14).

## How this was tested

- Local dev server (`vite`, port 5173) against the local Supabase stack, seeded
  user `user@avandarlabs.com`, workspace `avandar-labs`, Free plan.
- Datasets uploaded through the normal import flow:
  - `tests/data/california-covid-sample/california-covid-sample.csv`
    (14,700 rows; text `Province_State`, `Admin2`; numeric `Lat`, `Long_`;
    integer `date` holding epoch milliseconds; integer `daily_new_cases`
    ranging -3,711 to 29,423).
  - `tests/data/global-deaths-quote-sample/global-deaths-quote-sample.csv`
    (9 rows; a true `Date` column, all-empty `Province/State` for NULL tests,
    and `Korea, North` for comma-in-value tests).
  - A derived probe, `small-california-covid-sample` with realistic long
    headers (`province_state_administrative_name`, and so on), used to
    reproduce the reported "column name is not readable" problem. Written to
    `.temp/filters-review/long-column-names-probe.csv`.
- Oracle: expected row counts computed in Python directly from the CSVs, then
  compared against the grid's row summary and the generated SQL (captured from
  the DuckDB client log and from the `?sql=` URL parameter).
- Screenshots for every step are in `.temp/filters-review/` (gitignored, local
  only). File names are referenced below as `[shot: NN-name]`.

## Part 0: Verified correct

These all matched the independently computed expectation exactly. No action
needed.

| Case | Expected | Actual |
|---|---|---|
| `Admin2 = 'Alameda'` | 245 | 245 |
| `Admin2 != 'Alameda'` | 14,455 | 14,455 |
| `Admin2 in (Alameda, Butte, Kern)` | 735 | 735 |
| `Admin2 not in (Alameda, Butte, Kern)` | 13,965 | 13,965 |
| `daily_new_cases in (0, 1, 2)` (integer column) | 4,391 | 4,391 |
| `daily_new_cases > 0` / `>= 0` | 11,444 / 14,510 | same |
| `daily_new_cases < 0` / `<= 0` | 190 / 3,256 | same |
| `daily_new_cases = 0` | 3,066 | 3,066 |
| `daily_new_cases between 100 and 200` | 1,385 | 1,385 |
| `between` with reversed bounds (200, 100) | 0 | 0 |
| `Admin2 is null` / `is not null` | 0 / 14,700 | same |
| `Province/State is null` (empty CSV cells) | 9 | 9 |
| true `Date` column `> '2020-01-24'` | 3 | 3 |
| true `Date` column `between` two dates | 6 | 6 |
| epoch-integer `date > 1600000000000` | 6,540 | 6,540 |
| root AND, two rules | 150 | 150 |
| root OR, two rules | 3,472 | 3,472 |
| `(A OR B) AND C` (nested group) | 175 | 175 |
| root OR containing a nested OR group | 3,692 | 3,692 |
| root OR containing a nested AND group | 3,377 | 3,377 |
| `(A AND B) OR (C AND D)` (two sibling groups) | 154 | 154 |
| empty group contributes no SQL | no WHERE | no WHERE |
| `between` with only one bound filled | rule ignored | rule ignored |
| value containing an apostrophe (`O'Brien`) | escaped as `'O''Brien'` | correct |
| column names containing `/` (`Country/Region`) | quoted | quoted |
| WHERE combined with GROUP BY plus SUM | filter before aggregation | correct |
| `Manual` to `SQL` to `Manual` round trip | filter tree preserved | preserved |
| SQL the form cannot represent (`ILIKE`) | flagged, not silently lost | flagged |

Two genuinely good behaviors worth protecting in any redesign:

- Pasting SQL the manual form cannot express raises a `FORM IS AN
  APPROXIMATION` badge, and editing the form afterwards prompts `Overwrite
  SQL?` with `Overwrite SQL with form changes` versus `Keep SQL as-is`
  [shot: 91-ilike-sql, 94-approx-manual].
- Value escaping is correct, so there is no SQL injection path through the
  filter value field.

## Part 1: Functional defects

### F1. `contains` and `does not contain` are broken (P0)

`contains` generates `"Admin2" like 'San'` with no `%` wildcards, so it is an
exact, case-sensitive match.

- `Admin2 contains 'San'` returned **0** rows; expected **2,450**
  [shot: 26-t3-contains].
- `Admin2 does not contain 'San'` returned **14,700**; expected **12,250**
  [shot: 27-t4-notcontains].
- Typing your own wildcard works (`Korea%` returned 5), which confirms the
  value is passed to `LIKE` verbatim.
- Matching is case-sensitive: `korea%` returned 0 while `Korea%` returned 5
  [shot: 75-pct, 76-case].

Users cannot discover the wildcard requirement, and the label promises
substring matching.

### F2. One character per click: the value input loses focus on every keystroke (P0)

Click into a filter value, type one character, and the input is unmounted and
replaced. Focus moves to `<body>`, and every subsequent keystroke is dropped.
Typing `Alameda` requires seven separate clicks.

- Verified by tagging the input with an attribute, clicking it, typing one
  character: `document.activeElement` becomes `BODY` and the tagged element no
  longer exists in the DOM.
- Control test: the `Limit` field in `Sort & limit`, outside the filter
  builder, accepted `123` in one go and kept focus. So this is specific to the
  filter builder, not an automation artifact.
- Attempts to type `1234`, `555`, and `123` into a filter value each landed
  exactly one character.

Every change also re-runs the query immediately, so the character-by-character
flow additionally fires one query per keystroke.

### F3. The AND/OR selector always renders blank (P0)

The group combinator control shows an empty value at every level, root and
nested, before and after the user changes it.

- Reading the control directly: `value: ""`, no placeholder, while the query
  correctly ran `... where ("Admin2" = 'Alameda') or ("daily_new_cases" >
  '100')` [shot: 42-or-combinator-blank].
- Selecting `OR` changes the results (3,472 rows) but the control still shows
  nothing, so the only feedback that the change took effect is the row count.
- With two or more rules there is no other AND/OR indicator anywhere in the
  panel, so the panel does not communicate its own logic at all
  [shot: 40-and-two-rules, 61-sibling-groups-view].

The likely cause is a value-casing mismatch: the filter tree stores `AND`/`OR`
while the query-builder library's select options are keyed `and`/`or`, so no
option matches and the input renders empty.

### F4. `in`, `not in`, and `between` cannot express a value containing a comma (P1)

Values are comma-split with no escaping or quoting mechanism.

- `Country/Region = 'Korea, North'` returned 5 rows (correct).
- `Country/Region in 'Korea, North'` generated `in ('Korea', 'North')` and
  returned **0** rows [shot: 72-comma-eq, 73-comma-in].

Any real-world list of place names, org names, or free text is affected.

### F5. Query errors are swallowed and shown as "No Rows To Show" (P0)

Three separate error classes all surface identically as an empty grid with
`0 to 0 of 0` and no message, toast, or inline validation.

- Numeric column against a non-numeric value: `daily_new_cases = 'abc'` throws
  `Conversion Error: Could not convert string 'abc' to INT64` in the console
  only [shot: 38b-num-bad-value].
- Timestamp-looking column against a date string (see F9):
  `date > '2020-09-13'` throws the same conversion error.
- Columns that do not exist on the current table (see F6): `Binder Error:
  Referenced column ...`.

The user cannot distinguish "no rows match" from "your filter is invalid".

### F6. Switching data source keeps the previous dataset's columns and filters (P1)

After switching the source with a filter active, the app ran
`select "Long_", "date", "Lat", "daily_new_cases", "Province_State", "Admin2"
from <new table> where ("date" > '1600000000000')`, which is a binder error
against the new table.

Simultaneously [shot: 68-switch-source-view]:

- `Select columns` is emptied.
- The `Aggregations` panel still lists the **old** dataset's columns.
- The `Filters (Where)` panel still shows the old rule.
- The grid shows `No Rows To Show` with no explanation.

### F7. Removing a column leaves an invisible filter (P1)

With `Admin2 in (Alameda, Butte) AND daily_new_cases > 100` (175 rows),
removing `Admin2` from `Select columns`:

- Leaves the rule in place with an **empty** column select, so the panel shows
  a filter with an operator and a value but no column
  [shot: A2-removed-column].
- Still filters on it: the URL SQL remained
  `... where "Admin2" in ('Alameda', 'Butte') and "daily_new_cases" > '100'`
  and the grid stayed at 175 rows.

The data is filtered by a column the user can no longer see or edit.

### F8. Empty values are handled three different ways (P1)

- Clearing an `in` value does **not** re-run the query. The grid kept showing
  the previous `in ('197')` results (6 rows) while the form showed an empty
  rule [shot: C4-in-empty]. The displayed data no longer matches the displayed
  filter.
- Clearing an `=` value generates `"Province/State" = NULL`, which is never
  true in SQL, so it silently returns 0 rows instead of being ignored or
  treated as `IS NULL` [shot: 78-eq-empty].
- A freshly added rule immediately runs `col = ''`, which empties the grid
  before the user has typed anything, and on a numeric column raises a
  conversion error [shot: 21-rule1-added].
- An incomplete `between` is silently dropped, showing all rows as if no filter
  existed [shot: 35-t-between-empty].

### F9. Epoch-integer date columns are displayed as timestamps but must be filtered as integers (P1)

`california-covid-sample.csv` stores `date` as epoch milliseconds. The column
is typed `Integer` in dataset metadata, yet the grid renders
`2020-04-30 20:00:00 -04:00`.

- Filtering with what the grid shows (`2020-09-13`) throws a conversion error
  and shows an empty grid [shot: 64-date-string, 65-date-gt-string].
- Filtering with `1600000000000` works (6,540 rows, correct)
  [shot: 66-date-epoch-gt].
- The rendered value is also shifted by the local timezone: `1588291200000` is
  `2020-05-01T00:00:00Z` but displays as `2020-04-30 20:00`, so a date-only
  source appears to be a day earlier.

### F10. Aggregate filtering (HAVING) is unreachable from the UI (P1)

With `Admin2` grouped and `daily_new_cases` summed, adding a filter on
`daily_new_cases` produced
`select "Admin2", sum("daily_new_cases") ... where "daily_new_cases" > '1000'
group by "Admin2"`, that is, a pre-aggregation WHERE
[shot: 85-agg-having]. The field list offers only raw column names, never
`sum(daily_new_cases)`, so "groups whose sum exceeds N" cannot be expressed.
The `StructuredQuery` model already carries a `having` filter group with full
SQL rendering, so this is a UI gap rather than an engine gap.

### F11. Every value is emitted as a quoted string (P2)

Generated SQL is `> '1000'`, `between '100' and '200'`, `in ('0', '1', '2')`.
DuckDB's implicit cast makes these work on numeric and date columns, and all
count checks passed, but it means correctness depends on implicit casting and
that any typo becomes an opaque conversion error rather than a validation
message. It is also visible to users in SQL mode, where `WHERE daily_new_cases
> '1000'` looks wrong.

### F12. No debounce, and rules query before they are complete (P2)

Every field, operator, and value change immediately issues a new DuckDB query,
including the `col = ''` query fired the instant a rule is added. On a 14,700
row local table this is invisible, but combined with F2 it means one query per
character, and it will thrash on larger tables or remote sources.

### F13. New rules pick an arbitrary column, and changing the column silently resets the rule (P2)

- A new rule defaults to whichever column happens to be first in an unordered
  list (`daily_new_cases` in one session, `Admin2` in another).
- Changing a rule's column clears both the operator and the value with no
  warning: `Admin2 = 'Alameda'` became `daily_new_cases = ''` when the column
  was switched, and `daily_new_cases > 100` reverted to `= ` on the next
  column change [shot: 47-nested-ok, 96-save-ready].

### F14. Result column order is arbitrary (P2)

Selecting all six columns produced
`select "Long_", "date", "Lat", "daily_new_cases", "Province_State", "Admin2"`,
which is neither dataset order nor selection order. The filter field dropdown
lists columns in yet another order. Adjacent to filters, but it makes
verifying a filter against the grid harder than it should be.

### F15. Latent operator-mapping bugs (P2)

In the operator translation table, `notBetween` maps to the internal `between`
and both `beginsWith` and `endsWith` map to plain `like`. None of those three
are currently exposed in the operator list, so nothing is broken today, but
enabling them (or parsing SQL that produces them) would invert or flatten the
semantics silently.

### F16. Two competing filter surfaces (P1)

The grid has its own per-column funnel filters ("Contains" plus a text box)
that are entirely disconnected from the query panel [shot: C5-grid-filter].

- They are client-side and page-scoped, but they do change the row summary
  (`1 to 1 of 1`), so the number the user reads can reflect either system.
- The grid's `Contains` is case-insensitive while the query panel's `contains`
  is case-sensitive (and broken, see F1), so the same word behaves differently
  in the two places.
- Grid filters are not represented in the generated SQL, the `?sql=` URL, saved
  datasets, or presumably Export.

## Part 2: UI and UX defects

Fixes below are described in layout terms only (size, spacing, overlap, scroll
areas), as requested.

### Readability of column names and operators

**U1. The column select clips its own value with no ellipsis (P0).**
The control is 169px wide with only 128px usable (10.8px left padding plus
30.6px right padding for the chevron), and `text-overflow` is `clip`, not
`ellipsis`. Because the input scrolls to the end of its value, a long name
renders as its **tail**: `province_state_administrative_name` displays as
`e_administrative_name` [shot: 81-longnames-dropdown]. This is the reported
"cannot read the column name" problem.
*Fix:* make the column control wider than the operator control and let it flex
with the panel; keep text left-aligned (do not scroll to the tail); use an
end ellipsis; add a hover tooltip with the full name.

**U2. Dropdown options are clipped mid-word (P0).**
The dropdown inherits the input's 169px width while the option text needs
240px, so options read `province_state_administ`, `county_admin2_display_nar`,
`daily_new_confirmed_cases`. There is no ellipsis, no wrapping, and no `title`
tooltip on any option.
*Fix:* let the dropdown be wider than its trigger (roughly 320px, or sized to
content up to the panel width), allow options to wrap to a second line, and add
tooltips.

**U3. Everything in the panel is 12.6px (P1).**
Column select, operator select, value input, option rows, and both buttons all
render at 12.6px, smaller than surrounding UI text.
*Fix:* 13px to 14px for control text and options.

**U4. No visible labels on any filter control (P1).**
The three controls carry only `title` attributes (`Field`, `Operator`,
`Value`). An axe audit scoped to the panel reports one serious violation,
`label-title-only`, across 11 nodes. Combined with the vertical stacking
(U5) you cannot tell which stacked select is the column and which is the
operator except by reading their contents.
*Fix:* add small labels above the first rule (column / operator / value) or
placeholders inside each control.

### Layout, density, and hierarchy

**U5. A single rule occupies three to four stacked rows (P0).**
The Filters column is 333px wide and each control is a fixed 169px, so at most
two controls fit per row and the current layout stacks them vertically. One
rule is 212px tall; two rules 333px; six rules 818px [shot: A3-six-rules].
Meanwhile the `Aggregations` column holds a list of `None` selects and the
`Source` column has large empty space.
*Fix:* give Filters the widest column (it is the most complex control in the
drawer), lay each rule out as one row (column, operator, value, remove) with
the value input flexing to fill, and shrink or collapse the Aggregations column
when nothing is aggregated.

**U6. Consecutive rules visually merge (P0).**
Rules have no background, no border, no padding, and only an 8px gap. With the
combinator invisible (F3), a two-rule group reads as six unlabeled controls in
a column [shot: 40-and-two-rules].
*Fix:* separate rules with a 1px divider or an alternating row background, add
8px to 12px vertical padding per rule, and put an explicit `AND`/`OR` chip in
the gutter between rules (editable on the first gap, echoed as static text
below).

**U7. Nested groups are almost invisible (P1).**
The nested group body has `padding-left: 0` and `margin-left: 0`; nesting is
conveyed only by another translucent blue box (20% opacity blue over blue) with
8px padding and a 4px radius [shot: 43-group-added, 61-sibling-groups-view].
*Fix:* indent nested groups 12px to 16px, add a left accent rail (2px) per
depth level, and use a neutral or progressively lighter surface instead of
stacking translucent blue on blue.

**U8. Visual weight is inverted (P1).**
Each group renders two solid brand-blue buttons (`+ Rule`, `+ Group`) and each
rule a solid blue `×`. With two groups that is four blue action buttons plus
four blue remove buttons competing with the content
[shot: 61-sibling-groups-view].
*Fix:* make `+ Rule` and `+ Group` subtle (light or outline, smaller), make
remove a ghost icon button that turns red on hover, and let the predicate text
be the visually dominant element.

**U9. Remove buttons are large blocks with a tiny glyph and no confirmation (P1).**
Remove is a 40x32 solid blue button whose label is a 12.6px `⨯` character,
with only `title="Remove rule"` and no `aria-label`. The group remove sits
immediately beside `+ Group`, and removing a group with rules in it deleted two
rules instantly with no prompt and no undo [shot: 62-cleared].
*Fix:* 16px trash or × icon, ghost styling, real `aria-label`, more separation
from the add buttons, and either a confirm for non-empty groups or an undo
affordance.

**U10. The `between` editor has no separator or bound labels (P1).**
Two identical text inputs sit side by side with nothing between them, so which
one is the lower bound is guesswork [shot: 36-t-between].
*Fix:* insert a small `and` between them, or label them `From` and `To`.

**U11. Value inputs give no format guidance (P1).**
Every value input is `type="text"` with an empty placeholder and no
`inputmode`, for numbers, dates, and lists alike. Nothing indicates that `in`
expects a comma-separated list, or that the epoch date column wants
milliseconds (F9).
*Fix:* per-operator placeholders (`Comma-separated values`, `YYYY-MM-DD`,
`Lower bound`), numeric inputs for numeric columns, and a date picker for date
columns.

**U12. Long values are unreadable (P1).**
The value input is 148px wide. A 120-character value has a 950px scroll width
with no wrap and no tooltip, so about 18 characters are visible
[shot: B3-longvalue]. `in` lists are the common case here.
*Fix:* widen and flex the value field, render `in` values as removable chips
that wrap to multiple lines, and add a tooltip or an expandable multi-line
editor for long values.

### Scrolling, clipping, and popovers

**U13. The filter tree has no scroll area of its own and is clipped by default (P0).**
The drawer opens at 267px tall and the whole drawer (Source, Aggregations,
Filters, Sort & limit) shares one scroll container. With two rules the group
header (combinator plus `+ Rule` and `+ Group`) is already scrolled out of
view; with six rules the card is 818px inside a roughly 300px viewport, and the
user scrolls past large empty areas in the neighbouring columns to read the
filters [shot: 40-and-two-rules, A3-six-rules]. The drawer can only be enlarged
by dragging a 7px separator that has no visible handle
[shot: 54-drawer-resized]. Window height does not help: the grid absorbs the
extra space and the drawer keeps its height [shot: 53-tall].
*Fix:* give the filter tree its own scroll area with a sticky group header
(combinator plus add buttons pinned at the top), raise the default drawer
height when filters exist, and make the resize handle visible (grip dots,
larger hit area, hover state).

**U14. The operator dropdown opens past the bottom of the window (P0).**
The list is 207px tall and opens downward from a rule near the bottom of the
drawer, so `not in`, `is null`, `is not null`, and `between` are cut off below
the viewport, while the list auto-scrolls to the selected item and hides `=`
and `!=` above [shot: C2-operators].
*Fix:* flip the dropdown upward when it would overflow, constrain its height to
the available space with internal scrolling, and keep it inside the drawer
bounds.

**U15. The four-panel grid wraps unevenly and leaves a grey void (P1).**
`Sort & limit` drops onto a second row under `Source`, leaving a large empty
grey block to its right, while `Source` and `Aggregations` keep whitespace and
`Filters` stays cramped [shot: 61-sibling-groups-view, A2-removed-column]. At
900px width the panels reflow again and the group's blank combinator ends up
directly above a rule's blank column select, so two identical empty selects sit
adjacent [shot: A4-narrow900].
*Fix:* rebalance to two columns with `Filters` spanning the full width beneath,
or a 2x2 grid, and remove the empty grey region.

**U16. The `Overwrite SQL?` banner eats the drawer (P2).**
The yellow banner occupies roughly 130px of an already short drawer and pushes
the form down [shot: 94-approx-manual].
*Fix:* compact it to a single line with both actions inline.

**U17. Inconsistent empty state (P2).**
With no columns selected the panel shows `Add columns to the query above to
start defining filters` [shot: 11-columns-selected], but if columns are removed
afterwards the builder stays visible with an orphaned rule (F7) instead of
returning to that state or warning.
*Fix:* one canonical empty state, plus an explicit inline warning on rules
whose column is no longer available.

**U18. Grid date cells truncate while showing needless precision (P2).**
The `date` column shows `2020-05-21 20:00:0…` in a roughly 150px column,
including seconds and a timezone offset for what is a date-only source (see
F9).
*Fix:* widen the column or render date-typed values as dates.

**U19. Adjacent: two controls labeled `Upload` on the import page (P3).**
The `Upload` tab and the `Upload` submit button share a label, which is
ambiguous for both users and automation.
*Fix:* rename the action to `Process file` or `Continue`.

## Part 3: Missing filter capabilities that DuckDB supports

Nothing here needs new engine work beyond generating the SQL. The 13 operators
currently exposed are `=`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `does not
contain`, `in`, `not in`, `is null`, `is not null`, `between`.

| ID | Operator to add | DuckDB expression |
|---|---|---|
| M1 | `contains` (real substring) and `does not contain` | `col LIKE '%v%'`, `col NOT LIKE '%v%'` |
| M2 | case-insensitive variants of all text operators | `col ILIKE '%v%'`, `NOT ILIKE` |
| M3 | `begins with` / `ends with` (and negations) | `col LIKE 'v%'`, `col LIKE '%v'` |
| M4 | `is empty` / `is not empty`, distinct from null | `col = ''`, `col <> ''`, or `coalesce(trim(col), '') = ''` |
| M5 | `not between` | `col NOT BETWEEN a AND b` |
| M6 | `matches regex` / `does not match regex` | `regexp_matches(col, p)`, `regexp_full_match(col, p)` |
| M7 | `matches pattern` (glob) | `col GLOB 'p'` |
| M8 | `is true` / `is false` for boolean columns | `col IS TRUE`, `col IS FALSE` |
| M9 | null-safe equality | `col IS DISTINCT FROM v`, `IS NOT DISTINCT FROM` |
| M10 | date-aware `on` / `before` / `after` / `on or before` / `on or after` with a date picker | `col = DATE 'v'`, `col < DATE 'v'`, and so on |
| M11 | relative date ranges (`in the last N days`, `this month`, `year to date`) | `col >= current_date - INTERVAL 'N days'`, `date_trunc('month', col) = date_trunc('month', current_date)` |
| M12 | value picker for `in` (choose from actual column values) | `select distinct col from t order by 1 limit N` to populate a multi-select |
| M13 | `length` predicates on text | `length(col) > n` |
| M14 | filters on aggregates (see F10) | `HAVING sum(col) > n`, already modeled as `having` |

Supporting infrastructure the list above implies:

- Operator lists filtered by column type (no `contains` on an integer, no
  `between` on a boolean), which also removes most of the F5 error class.
- Typed value editors per column type (number, date, boolean, list), which
  addresses U11 and F11.
- A quoting or chip-based editor for list values so commas inside values work
  (F4).

## Priority summary

| Priority | Items |
|---|---|
| P0 (blocks real use) | F1 broken `contains`; F2 focus loss per keystroke; F3 blank AND/OR; F5 silent errors; U1 and U2 clipped column names; U5 and U6 unreadable rule layout; U13 clipped filter tree; U14 unreachable operators |
| P1 | F4 comma values; F6 stale filters after source switch; F7 invisible filter on removed column; F8 empty-value handling; F9 epoch date columns; F10 no HAVING; F16 competing grid filters; U3, U4, U7 to U12, U15 |
| P2 | F11 stringified values; F12 no debounce; F13 rule defaults and resets; F14 column order; F15 latent mappings; U16 to U18 |
| P3 | U19 |

## Reproduction notes

1. Start `vite` on 5173 with the local Supabase stack running; sign in as
   `user@avandarlabs.com` / `avandar`; pick the Free plan if the plan modal
   appears.
2. Import `tests/data/california-covid-sample/california-covid-sample.csv` via
   `Data Sources` then `Add new dataset`, then `Upload` (the submit button, not
   the tab), then `Save Dataset`.
3. `Data Explorer`, expand the bottom drawer, keep `Manual`, choose the data
   source, then select columns. The `Filters (Where)` panel only becomes
   available once at least one column is selected.
4. Generated SQL is observable in three ways: the `?sql=` URL parameter, the
   `SQL` toggle in the drawer, and the DuckDB client console log.

A caution for anyone re-running this: the local Supabase stack is shared across
worktrees. A `pnpm db:reset` in another worktree during this session wiped the
uploaded datasets and forced a re-login and re-upload.
