import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AxisRole } from "$/models/vizs/getAxisRoles/getAxisRoles.ts";
import type { ChartSettingDescriptor } from "$/models/vizs/SettingDescriptor.ts";

/** Which axis of `chartStyle` the descriptors address. */
export type AxisKey = "xAxis" | "yAxis";

export type MakeAxisDescriptorsOptions = {
  /**
   * Include the tick label rotation control. Only the X axis offers it:
   * rotating Y tick labels is a capability nobody asks for and would
   * need a different layout lever (`width` rather than `height`).
   */
  rotation?: boolean;
};

const AXIS_NOUN: Record<AxisKey, string> = {
  xAxis: "X axis",
  yAxis: "Y axis",
};

/**
 * The chart-level descriptors for one axis.
 *
 * Every axis gets the cosmetic settings. A `value` axis additionally
 * gets minimum, maximum, and tick interval, which have no meaning on a
 * category scale. Rotation is opt-in via `options.rotation`.
 *
 * Bar, line, and area all call this instead of repeating the same
 * literals, so a new axis setting is added once.
 *
 * The `key`s are built by template literal, so they are only `string`
 * to the compiler while `ChartSettingDescriptor` demands the narrower
 * `Paths<TConfig>`. `Paths<TConfig>` is unresolvable while `TConfig` is
 * still a type parameter, so the keys are asserted on the way out. The
 * assertion is sound because `TConfig extends { chartStyle?: ChartStyle }`
 * guarantees every path below exists on the config.
 */
export function makeAxisDescriptors<
  TConfig extends { chartStyle?: ChartStyle },
>(
  axis: AxisKey,
  role: AxisRole,
  options: MakeAxisDescriptorsOptions = {},
): ReadonlyArray<ChartSettingDescriptor<TConfig>> {
  const noun = AXIS_NOUN[axis];
  const group = noun;

  /**
   * Locally typed with a plain `string` key so the literals below are
   * still checked against the descriptor shape (labels, groups, and
   * especially `control`); only the key narrowing is deferred.
   */
  type AxisDescriptor = Omit<ChartSettingDescriptor<TConfig>, "key"> & {
    key: string;
  };

  const descriptors: readonly AxisDescriptor[] = [
    {
      key: `chartStyle.${axis}.label`,
      label: `${noun} label`,
      group,
      control: { kind: "text" },
    },
    {
      key: `chartStyle.${axis}.labelColor`,
      label: `${noun} label color`,
      group,
      control: { kind: "color" },
    },
    {
      key: `chartStyle.${axis}.tickColor`,
      label: `${noun} tick color`,
      group,
      control: { kind: "color" },
    },
    {
      key: `chartStyle.${axis}.hide`,
      label: `Hide ${noun}`,
      group,
      control: { kind: "switch" },
    },
    ...(role === "value" ?
      [
        {
          key: `chartStyle.${axis}.min`,
          label: `${noun} minimum`,
          group,
          control: { kind: "number" as const },
        },
        {
          key: `chartStyle.${axis}.max`,
          label: `${noun} maximum`,
          group,
          control: { kind: "number" as const },
        },
        {
          key: `chartStyle.${axis}.tickInterval`,
          label: `${noun} tick interval`,
          group,
          control: { kind: "number" as const, min: 0 },
        },
      ]
    : []),
    ...(options.rotation === true ?
      [
        {
          key: `chartStyle.${axis}.tickAngle`,
          label: `${noun} label rotation`,
          group,
          control: {
            kind: "number" as const,
            min: -90,
            max: 90,
            step: 15,
            unit: "°",
          },
        },
      ]
    : []),
  ];

  return descriptors as ReadonlyArray<ChartSettingDescriptor<TConfig>>;
}
