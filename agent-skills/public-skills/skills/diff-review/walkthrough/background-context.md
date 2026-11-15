# Background technical context

The map of the code a reader needs before the strand sections make sense. The
background context pass writes it, per
[The background context pass runs in a subagent](pass-background.md).
Two parts, in this order:

1. **A directory tree** in a `text` fence, showing only the directories and
   units the walkthrough involves and the reader needs as background. It is
   not a file inventory of the change. Mark a unit the change adds `(new)` and
   one it modifies `(changed)`; an unmarked unit is unchanged code the change
   depends on. A directory that only leads to a unit is a path, not a unit: it
   carries no marker and gets no row. A directory that is itself a unit, such
   as a page or a module, keeps its marker and row even when units inside it
   are listed too. The tree needs no caption, because the table under it is
   its legend.
2. **A two-column table, `Unit` and `What it is`,** one row per unit in the
   tree, in tree order, and not numbered. Wrap it in `<small>` the same way as
   the [Glossary](glossary.md), so it prints a size smaller. Each row is one or
   two short sentences and never more: what the unit is in product terms, then
   the one relationship the reader needs, such as what it writes to or who
   calls it. A row may name a unit that has no row of its own, such as the
   client it writes through. The strand sections carry everything else.

The tree and its table are one figure, so they fit on one printed page, per
[A figure never spans two pages](figures.md#a-figure-never-spans-two-pages): in practice
a tree of about 25 lines and about a dozen rows, fewer when rows run to two
sentences. When the change is too wide for that, show each area's anchor unit
and let the strand sections introduce the rest. A long name widens the whole
`Unit` column, so a unit with a long name earns its row only when nothing
shorter anchors its area. Do not define vocabulary in a row: terms belong
in the [Glossary](glossary.md), which the clarity pass drafts after this section
exists.

````markdown
## 2. Background technical context

```text
shared/models/
├── Dashboard/                                     (changed)
├── queries/
│   ├── StructuredQuery/                           (changed)
│   └── QueryColumnBindings/                       (new)
└── vizs/
    └── makeOutputNameVizConfigFromColumnIdConfig/ (new)
src/clients/dashboards/
└── DashboardClient/
src/views/
├── DataExplorerApp/                               (changed)
└── DashboardApp/AvaPage/pblocks/
    └── DataVizPBlock/                             (changed)
```

<small>

| Unit | What it is |
| --- | --- |
| `Dashboard` | The model that holds everything about one dashboard, including its page and the charts on it. Written to the `dashboards` table through `DashboardClient`. |
| `StructuredQuery` | The model for a query a user builds with the Query tab's form instead of typing SQL. `structuredQueryToSql` turns it into the SQL that runs. |
| `QueryColumnBindings` | Matches each column of a query's results to the column ID that chart settings and filters saved. |
| `makeOutputNameVizConfigFromColumnIdConfig` | Just before a chart draws, swaps each saved column ID for that column's current name in the results. |
| `DashboardClient` | Reads and writes rows of the `dashboards` table. |
| `DataExplorerApp` | The Data Explorer page, where a user writes a query and charts its results. |
| `DataVizPBlock` | One chart on a dashboard page. It runs its own query and draws the result. |

</small>
````
