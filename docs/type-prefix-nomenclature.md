# Type prefix nomenclature

What the `Ava` and `Ui` prefixes mean on a type, module, or function name. Use
them in code, comments, and commits so a reader can tell a business-logic
representation from a conventional one by the name alone.

## `Ava`: Avandar's own representation

An `Ava` prefix marks a type that is Avandar's business-logic representation of
something that also exists in a standard, conventional form, or a wrapper that
adds Avandar behavior to a library type. The unprefixed name, when it exists,
is the conventional form that libraries and renderers expect.

| Name | What it adds over the conventional form |
| --- | --- |
| `AvaVizConfig` | Keys every column by its stable column ID (`QueryColumn.Id`) instead of its name, so a chart survives column renames and SQL edits. |
| `AvaRadarSeries`, `AvaXYSeries`, and the other `Ava*Series` types | The same, for one series of a chart. |
| `AvaBarChartVizConfig` and the other `Ava{Chart}VizConfig` models | The per-chart config models of `AvaVizConfig`. |
| `AvaDataType` | The base column data types Avandar handles, as one enum instead of each engine's own type names. |
| `AvaQueryClient`, `AvaSupabase`, `AvaDexie` | Avandar's configured instances of TanStack Query, Supabase, and Dexie, with Avandar defaults and behavior. |
| `AvaForm` | A form component that builds Avandar forms from field definitions, on top of the shared `useForm` hook. |
| `AvaPage`, `AvaMapConfig` | Avandar's documents for a dashboard page and a map. |

Do not add `Ava` to a type that has no conventional counterpart: an
unprefixed descriptive name is clearer there.

## `Ui`: the bare form a renderer takes

A `Ui` prefix marks the conventional form of an `Ava` type, with no business
logic: the shape a UI component or chart library consumes. The pair converts
one way at the boundary.

`Ui` plays the role a `ViewModel` suffix plays in the MVVM pattern: the `Ava`
type is the domain model, and the `Ui` type is that model converted for
display. `UiVizConfig` is what MVVM would call `VizConfigViewModel`. We use the
`Ui` prefix only because it is shorter, and because it pairs with the `Ava`
prefix.

- `UiVizConfig` is an `AvaVizConfig` with each column ID replaced by its
  `QueryResult` column name, the key each result row is read by.
  `makeUiVizConfigFromAvaVizConfig` converts an `AvaVizConfig` to a
  `UiVizConfig`, and `makeAvaVizConfigFromUiVizConfig` converts back once
  every name binds to a column ID.
- The series inside a `UiVizConfig` take the plain conventional names:
  `RadarSeries`, `XYSeries`, `BarSeries`, `LineSeries`, `AreaSeries`,
  `ScatterSeries`, and `BubbleSeries`. The renderers in `src/lib/ui/viz` use
  only these, so they never need an import alias.

Use the `Ui` prefix only for the top-level conventional config whose `Ava`
counterpart exists. Its parts keep the plain conventional names.
