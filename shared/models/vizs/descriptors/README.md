# Viz setting descriptors

A **setting descriptor** is a schema-like object that describes one row of a
chart's settings form. It points at one setting in the viz config and says
which control edits it:

```ts
{
  key: "chartStyle.yAxis.max", // the setting: a typed dotted path into the config
  label: "Y axis maximum", // shown next to the control
  group: "Y axis", // the fieldset it is clustered under
  control: { kind: "number" }, // the widget that edits it
}
```

A setting is the persisted field the user changes. A control is the widget
they change it with. `VizSettingDescriptors.types.ts` defines both terms and
every descriptor type.

## Who reads descriptors

Only the settings form. `VizSettingsForm` gets a viz type's descriptors from
`AvaVizConfigs.getDescriptors` and renders one control per descriptor, grouped
by `group`. When the user edits a control, the form writes the new value to
the descriptor's `key`.

Descriptors do not describe how a chart is drawn. The renderers in
`src/lib/ui/viz` read the config directly, for example `chartStyle.yAxis.max`,
and never see a descriptor. Descriptors do not validate a saved config either.
A number control's `min` and `max` only bound what the form input accepts.

## What lives here

Each viz type's module (`AvaBarChartVizConfigs`, `AvaLineChartVizConfigs`, and
so on) declares its own descriptor list. The builders in this directory make
the descriptors that several of those modules share, so every chart offers the
same controls with the same labels:

- `makeAxisDescriptors`: label, colors, and visibility for an X or Y axis.
  A value axis adds minimum, maximum, and tick interval. Label rotation is
  opt-in.
- `makeGridDescriptors`: gridline color and horizontal and vertical gridlines.
- `makeLegendPositionDescriptor`: where the legend sits.

All three build chart-level descriptors (`ChartSettingDescriptor`), which edit
a field on the whole config. Series-level descriptors
(`SeriesSettingDescriptor`), which edit one series such as its color, are
declared in each viz type's module and are not built here.
