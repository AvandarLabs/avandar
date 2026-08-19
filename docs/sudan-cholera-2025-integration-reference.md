# Sudan cholera 2025 demo integration reference

This reference records the exact local branch topology used to prepare the
Sudan cholera demo runbook. It separates features already present in the
`feat/launch-demo` base from changes that still need integration.

Snapshot date: **2026-08-19**.

## Worktree identity

| Item                                 | Value                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| Worktree                             | `/Users/juanpablosarmiento/src/worktrees/avandar/feat/launch-demo` |
| Branch                               | `feat/launch-demo`                                                 |
| Branch creation point                | `a40d4fe70`, `Merge feat/nux`                                      |
| Latest local `develop`               | `761bcd20d`, `new translations`                                    |
| Latest local `feat/qetl-impl`        | `78be8860d`, QETL column-projection merge                          |
| Merge base of launch branch and QETL | `a625efc4d3df336b289da4cc3f012b41b49f9458`                         |

The launch worktree was created while `develop` pointed at `a40d4fe70`. A new
translation commit landed immediately afterward. Therefore
`feat/launch-demo` contains the latest feature merges but is one commit behind
the latest local `develop`.

## Current feature status

| Feature                                                 | Current source                                          | Status for the launch branch                | Demo use                                                   |
| ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| CSV import                                              | `develop` ancestry                                      | Already present                             | All paths                                                  |
| Excel import                                            | `develop` ancestry                                      | Already present                             | Paths 1 and 2                                              |
| PDF region extraction and review                        | PDF import merged at `d062dbc24`                        | Already present                             | Path 1                                                     |
| Manual filters                                          | Filters merged at `02cf4081b`                           | Already present                             | Paths 1 and 2                                              |
| GIS boundary joins, choropleth, annotations, PDF export | `develop` ancestry through `a625efc4d` and later merges | Already present                             | All paths                                                  |
| New-user experience                                     | NUX merged at `a40d4fe70`                               | Already present                             | Demo setup only                                            |
| Latest translations                                     | `develop` commit `761bcd20d`                            | Not present                                 | Optional for English demo, needed to match current develop |
| QETL registry, mediator, relation cache integration     | `feat/qetl-impl`                                        | Not present                                 | Live query portions of all paths                           |
| CKAN/HDX API-backed Open Data acquisition               | QETL integrated commit `709a9991b`                      | Not present                                 | Path 2                                                     |
| `CREATE TABLE AS SELECT` workspace loading fix          | `fcac11cfd`                                             | Not present directly, contained in QETL tip | Paths 2 and 3                                              |
| Chat concept aliases                                    | `47df766b9`, merged into QETL by `ac8ff0e6a`            | Not present directly, contained in QETL tip | Path 3                                                     |
| QETL column projection                                  | `27ae97abc`, merged into QETL by `78be8860d`            | Not present directly, contained in QETL tip | Paths 2 and 3                                              |

## Required integration by demo path

| Path                                   | Minimum branch state                                       | Notes                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Path 1, The blank is a signal          | Current launch branch                                      | Use a prepared joined CSV if QETL is not integrated. Integrate QETL only if the live script includes the SQL join. |
| Path 2, Pre-position before the rains  | Current launch branch plus `feat/qetl-impl` at `78be8860d` | The HDX resource must also be pre-registered in the Open Data catalog.                                             |
| Path 3, Naming is part of surveillance | Current launch branch plus `feat/qetl-impl` at `78be8860d` | Pre-create the Sudan State concept and mappings.                                                                   |

## Integration list

No Git integration was performed while writing these documents. The following
is the exact proposed list for a later, explicitly authorized integration.

### Preferred branch integration

| Order | Branch or commit                | Action                                  | Reason                                                                                                                                                   |
| ----: | ------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | `develop` commit `761bcd20d`    | Cherry-pick, or merge current `develop` | Brings the launch branch to the latest local translation catalogs. It is the only commit currently in `develop` but not in `feat/launch-demo`.           |
|     2 | `feat/qetl-impl` at `78be8860d` | Merge the branch                        | Brings the complete, dependent QETL graph, including registry, cache integration, Open Data/CKAN, rehearsal fix, concept aliases, and column projection. |

The QETL diff from its common base is 329 files and depends on a long reviewed
commit chain. Merge the QETL tip rather than cherry-picking its component
commits individually.

### QETL commits and side branches already contained in the tip

These entries are useful provenance and recovery points. Do **not** cherry-pick
them after merging `feat/qetl-impl`, because the tip already contains them.

| Branch or integrated change                 | Commit      | Purpose                                                                                                                    | Contained in `78be8860d`       |
| ------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Integrated QETL registry and connector work | `709a9991b` | Relation registry and mediator integration, CKAN/HDX Open Data acquisition, Google Sheets work, and related schema changes | Yes                            |
| Per-relation authorization                  | `12cfed47f` | Authorizes every relation named in a QETL query                                                                            | Yes                            |
| `feat/qetl-s3-9-rehearsal`                  | `fcac11cfd` | Loads datasets referenced by `CREATE TABLE AS SELECT` workspace queries                                                    | Yes                            |
| `feat/chat-concept-aliases`                 | `47df766b9` | Adds `c0`, `c1`, and later concept aliases to chat SQL rewriting                                                           | Yes, through merge `ac8ff0e6a` |
| `feat/qetl-column-projection`               | `27ae97abc` | Projects cached Parquet to the columns a query needs                                                                       | Yes, through merge `78be8860d` |

### Develop branches already contained in the launch base

Do **not** cherry-pick these again.

| Branch            | Develop integration commit | Launch status                |
| ----------------- | -------------------------- | ---------------------------- |
| `feat/pdf-import` | `d062dbc24`                | Already in launch base       |
| `feat/filters`    | `02cf4081b`                | Already in launch base       |
| `feat/nux`        | `a40d4fe70`                | Launch branch creation point |

## Why the QETL branch should be merged as a unit

The QETL tip has already reconciled the relation registry, relation cache,
workspace authorization, concept relations, CKAN acquisition, query mediator,
rehearsal fix, concept aliases, and column projection. Several side-branch
commits depend on types and behavior introduced earlier in that graph.

Selective cherry-picking creates three avoidable risks:

1. `fcac11cfd`, `47df766b9`, and `27ae97abc` are not standalone replacements
   for the QETL base they extend.
2. `709a9991b` is a large integrated commit, not an independent Open Data patch.
3. The QETL branch diverged before the recent PDF, filters, and NUX merges, so
   integration needs deliberate conflict resolution and focused verification.

## Expected conflict boundary

`feat/launch-demo` and `feat/qetl-impl` share merge base `a625efc4d`. Since that
point:

- `develop` added PDF import, filters, NUX, and translations.
- QETL added the registry, cache and mediator work, Open Data/CKAN, Google
  Sheets, authorization fixes, rehearsal fix, concept aliases, and column
  projection.

Plan for conflicts around shared generated database types, migrations, package
metadata, translations, Data Explorer, chat, and GIS surfaces. Preserve the
newer PDF, filter, NUX, and GIS behavior from `develop`, and preserve QETL's
query and connector behavior from `feat/qetl-impl`. Do not resolve a conflict
by choosing an entire side without inspecting the path's ownership.

## Suggested integration sequence

The commands below are a runbook, not a record of actions already taken.

1. Review and commit the two demo documents on `feat/launch-demo`.
2. Bring in `761bcd20d` from `develop`.
3. Merge `feat/qetl-impl` at `78be8860d`.
4. Resolve conflicts by feature ownership, then inspect the complete diff.
5. Switch this non-`develop` worktree to an isolated local Supabase project
   before applying or testing the QETL schema changes.
6. Reset that isolated database so PDF and QETL RPCs match the integrated tree.
7. Run focused PDF, CSV, Excel, filter, GIS join, GIS export, Open Data, QETL,
   concept relation, alias, and column-projection tests.
8. Run type-check and lint.
9. Rehearse the three demo paths in round-robin order from fresh workspaces.

## Verification targets after integration

Do not run the entire end-to-end suite. Run focused tests one at a time, as
required by the repository rules.

Minimum behavioral checks:

- The OCHA 3 July PDF opens, accepts a region selection, produces reviewable
  rows, and saves against the current local schema.
- CSV and the IOM XLSX both import through the user interface.
- The boundary join reports matches and preserves explicit no-data states.
- A map with a legend and annotations exports to PDF.
- A registered HDX/CKAN entry acquires the five-year rainfall CSV through the
  current Open Data path.
- A workspace query referencing multiple datasets loads each relation.
- A concept relation can generate individuals and participate in a join.
- A `c0` concept alias rewrites to its concept table.
- Column projection preserves row count and source row order.

## Known constraints that shape the demo

- PDF import supports user-selected region extraction. Automatic table
  detection, OCR, and chart understanding are not part of the guaranteed path.
- Open Data acquisition works for pre-registered entries. Arbitrary HDX search
  is not built.
- The current connector acquisition cap is 25 MB. Use the approximately 3.7 MB
  five-year rainfall CSV, not the larger full-history resource.
- Direct arbitrary GeoJSON upload is not a guaranteed path. Convert the Sudan
  Admin 1 boundaries to CSV with a GeoJSON string or WKT geometry column.
- The Sudan boundary source includes Abyei PCA, creating 19 Admin 1 features
  against the 18-state health and displacement universe.
- A stale shared local Supabase instance previously lacked the PDF save RPC.
  Use an isolated, reset stack before interpreting that failure as a product
  regression.

## Current recommendation

Choose Path 1 for the live demo. It can run on the current launch base with a
prepared joined CSV, and it becomes more technically ambitious after QETL is
integrated. Paths 2 and 3 are useful rehearsals and fallbacks, but they carry
more integration and setup dependencies.
