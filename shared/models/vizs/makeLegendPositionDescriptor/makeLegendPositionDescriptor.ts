import type {
  ChartStyle,
  LegendPosition,
} from "$/models/vizs/ChartStyle.types.ts";
import type {
  ChartSettingDescriptor,
  SelectOption,
} from "$/models/vizs/SettingDescriptor.ts";

/**
 * The positions the legend control offers.
 *
 * The `satisfies` clause rejects an option whose `value` is not a
 * `LegendPosition`. It does not check the reverse: adding a member to
 * `LegendPosition` leaves the new position unoffered rather than failing
 * this file.
 */
const LEGEND_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const satisfies ReadonlyArray<SelectOption<LegendPosition>>;

/**
 * A legend descriptor before its key is narrowed to `TConfig`'s paths.
 * Mirrors the same widening `makeAxisDescriptors` uses.
 */
type LegendDescriptor<TConfig> = Omit<
  ChartSettingDescriptor<TConfig>,
  "key"
> & {
  key: string;
};

/**
 * Returns the `chartStyle.legend.position` descriptor for a viz type.
 *
 * Built here rather than redeclared per viz module so every chart offers
 * the same positions and each label keeps a single entry in the
 * `vizSettingControlLabel` catalog.
 */
export function makeLegendPositionDescriptor<
  TConfig extends { chartStyle?: ChartStyle },
>(): ChartSettingDescriptor<TConfig> {
  const descriptor: LegendDescriptor<TConfig> = {
    key: "chartStyle.legend.position",
    label: "Legend position",
    group: "Legend",
    control: { kind: "segmented", options: LEGEND_POSITION_OPTIONS },
  };

  // The key stays `string` while `TConfig` is generic. The `ChartStyle`
  // constraint guarantees the path exists on every config that uses this.
  return descriptor as ChartSettingDescriptor<TConfig>;
}
