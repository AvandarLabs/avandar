# @avandar/plugin-ui

The components Avandar plugin UI may render. Plugins must import UI only from
this package, so the host controls which components plugins can render.

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`, `Title` | Components | Re-exported from Mantine with Avandar's theme |
| `CartesianGrid`, `ComposedChart`, `ErrorBar`, `Legend`, `ReferenceLine`, `Scatter`, `Tooltip`, `XAxis`, `YAxis` (from `@avandar/plugin-ui/charts`) | Components | Re-exported from Recharts for plugin chart components |
| `useChartTheme` (from `@avandar/plugin-ui/charts`) | Hook | Gets Avandar's series colors, text color, and grid color for the current color scheme |
| `ChartTheme` (from `@avandar/plugin-ui/charts`) | Type | What `useChartTheme` returns |
