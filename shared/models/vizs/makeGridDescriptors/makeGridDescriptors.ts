import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { ChartSettingDescriptor } from "$/models/vizs/SettingDescriptor.ts";

// Fixed `chartStyle.grid.*` keys stay `string` while `TConfig` is generic; the
// `ChartStyle` constraint guarantees the paths exist.
type GridDescriptor<TConfig> = Omit<ChartSettingDescriptor<TConfig>, "key"> & {
  key: string;
};

/**
 * Chart-level gridline setting descriptors, declared once and shared across the
 * cartesian viz registries (parallel to {@link makeAxisDescriptors}).
 */
export function makeGridDescriptors<
  TConfig extends { chartStyle?: ChartStyle },
>(): Array<ChartSettingDescriptor<TConfig>> {
  const descriptors: Array<GridDescriptor<TConfig>> = [
    {
      key: "chartStyle.grid.color",
      label: "Gridline color",
      group: "Grid",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.grid.horizontal",
      label: "Horizontal gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.grid.vertical",
      label: "Vertical gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
  ];

  return descriptors as Array<ChartSettingDescriptor<TConfig>>;
}
