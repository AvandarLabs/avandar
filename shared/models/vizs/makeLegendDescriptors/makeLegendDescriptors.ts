import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { ChartSettingDescriptor } from "$/models/vizs/SettingDescriptor.ts";

const LEGEND_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

// Template-literal / fixed string keys remain `string` while `TConfig` is
// generic; the `ChartStyle` constraint guarantees the `chartStyle.legend.*`
// path exists, and callers opt into the top-level `withLegend` key explicitly.
type LegendDescriptor<TConfig> = Omit<ChartSettingDescriptor<TConfig>, "key"> & {
  key: string;
};

/**
 * Chart-level legend setting descriptors, declared once and shared across viz
 * registries (parallel to {@link makeAxisDescriptors}).
 *
 * `withVisibilityToggle` controls whether the "Show legend" switch — bound to
 * the top-level `withLegend` field — is included. Charts that have no
 * `withLegend` field pass `false` and expose only legend position.
 */
export function makeLegendDescriptors<
  TConfig extends { chartStyle?: ChartStyle },
>({
  withVisibilityToggle,
}: Readonly<{
  withVisibilityToggle: boolean;
}>): Array<ChartSettingDescriptor<TConfig>> {
  const visibilityToggle: Array<LegendDescriptor<TConfig>> =
    withVisibilityToggle ?
      [
        {
          key: "withLegend",
          label: "Show legend",
          group: "Legend",
          control: { kind: "switch" },
        },
      ]
    : [];

  const descriptors: Array<LegendDescriptor<TConfig>> = [
    ...visibilityToggle,
    {
      key: "chartStyle.legend.position",
      label: "Legend position",
      group: "Legend",
      control: { kind: "segmented", options: LEGEND_POSITION_OPTIONS },
    },
  ];

  return descriptors as Array<ChartSettingDescriptor<TConfig>>;
}
