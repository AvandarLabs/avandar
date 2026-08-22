import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AxisRole } from "$/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType.ts";
import type {
  ChartSettingDescriptor,
  VizSettingGroup,
} from "$/models/vizs/SettingDescriptor.ts";

import { matchLiteral } from "@avandar/utils";

/** Which axis of `chartStyle` the descriptors address. */
export type AxisKey = "xAxis" | "yAxis";

const AXIS_NOUN = {
  xAxis: "X axis",
  yAxis: "Y axis",
} as const satisfies Record<AxisKey, VizSettingGroup>;

type AxisDescriptor<TConfig> = Omit<ChartSettingDescriptor<TConfig>, "key"> & {
  key: string;
};

function _createCosmeticAxisDescriptors<TConfig>(
  axis: AxisKey,
): Array<AxisDescriptor<TConfig>> {
  const noun = AXIS_NOUN[axis];
  return [
    {
      key: `chartStyle.${axis}.label`,
      label: `${noun} label`,
      group: noun,
      control: { kind: "text" },
    },
    {
      key: `chartStyle.${axis}.labelColor`,
      label: `${noun} label color`,
      group: noun,
      control: { kind: "color" },
    },
    {
      key: `chartStyle.${axis}.tickColor`,
      label: `${noun} tick color`,
      group: noun,
      control: { kind: "color" },
    },
    {
      key: `chartStyle.${axis}.hide`,
      label: `Hide ${noun}`,
      group: noun,
      control: { kind: "switch" },
    },
  ];
}

function _createValueAxisDescriptors<TConfig>(
  axis: AxisKey,
): Array<AxisDescriptor<TConfig>> {
  const noun = AXIS_NOUN[axis];
  return [
    {
      key: `chartStyle.${axis}.min`,
      label: `${noun} minimum`,
      group: noun,
      control: { kind: "number" },
    },
    {
      key: `chartStyle.${axis}.max`,
      label: `${noun} maximum`,
      group: noun,
      control: { kind: "number" },
    },
    {
      key: `chartStyle.${axis}.tickInterval`,
      label: `${noun} tick interval`,
      group: noun,
      control: { kind: "number", min: 0 },
    },
  ];
}

function _createRotationAxisDescriptors<TConfig>(
  axis: AxisKey,
): Array<AxisDescriptor<TConfig>> {
  const noun = AXIS_NOUN[axis];
  return [
    {
      key: `chartStyle.${axis}.tickAngle`,
      label: `${noun} label rotation`,
      group: noun,
      control: {
        kind: "number",
        min: -90,
        max: 90,
        step: 15,
        unit: "°",
      },
    },
  ];
}

/** Returns the chart-level setting descriptors for one axis. */
export function makeAxisDescriptors<
  TConfig extends { chartStyle?: ChartStyle },
>({
  axis,
  role,
  rotation = false,
}: Readonly<{
  axis: AxisKey;
  role: AxisRole;
  rotation?: boolean;
}>): Array<ChartSettingDescriptor<TConfig>> {
  const descriptors: Array<AxisDescriptor<TConfig>> = [
    ..._createCosmeticAxisDescriptors<TConfig>(axis),
    ...matchLiteral(role, {
      category: () => {
        return [];
      },
      value: () => {
        return _createValueAxisDescriptors<TConfig>(axis);
      },
    }),
    ...(rotation ? _createRotationAxisDescriptors<TConfig>(axis) : []),
  ];

  // Template-literal keys remain `string` while `TConfig` is generic. The
  // `ChartStyle` constraint guarantees every generated path exists.
  return descriptors as Array<ChartSettingDescriptor<TConfig>>;
}
