import { matchLiteral } from "@avandar/utils";
import { makeAxisScalePropsFromBounds } from "@/lib/ui/viz/axis/makeAxisScalePropsFromBounds/makeAxisScalePropsFromBounds";
import { makeTickRotationFromAngle } from "@/lib/ui/viz/axis/makeTickRotationFromAngle/makeTickRotationFromAngle";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import type { ValueExtent } from "@/lib/ui/viz/axis/getValueExtentFromSeries/getValueExtentFromSeries";
import type { AxisStyle, ChartStyle } from "$/models/vizs/ChartStyle.types";
import type {
  AxisRole,
  AxisRoles,
} from "$/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType";
import type { CSSProperties } from "react";
import type {
  CartesianGridProps,
  LegendProps,
  XAxisProps,
  YAxisProps,
} from "recharts";

const DEFAULT_TICK_FONT_SIZE = 12;
const DEFAULT_Y_AXIS_WIDTH = 64;
const TICK_DEFAULTS = {
  fontSize: DEFAULT_TICK_FONT_SIZE,
  fill: "currentColor",
} as const;
const DEFAULT_AXIS_ROLES = {
  x: "category",
  y: "value",
} as const satisfies AxisRoles;

function _formatYAxisTick(value: unknown): string {
  return formatChartNumber(value, { compact: true });
}

function _buildXAxisProps({
  xAxisStyle,
  baseXAxisProps,
  xExtent,
  xTickLabels,
  role,
}: Readonly<{
  xAxisStyle: Readonly<AxisStyle> | undefined;
  baseXAxisProps: Readonly<Omit<XAxisProps, "ref">> | undefined;
  xExtent: Readonly<ValueExtent> | undefined;
  xTickLabels: readonly string[];
  role: AxisRole;
}>): Omit<XAxisProps, "ref"> {
  const rotation = makeTickRotationFromAngle({
    angle: xAxisStyle?.tickAngle,
    tickLabels: xTickLabels,
    fontSize: DEFAULT_TICK_FONT_SIZE,
  });
  const scale = matchLiteral(role, {
    category: {},
    value: () => {
      return makeAxisScalePropsFromBounds({
        axis: xAxisStyle,
        extent: xExtent,
      });
    },
  });
  const hasTickColor = xAxisStyle?.tickColor !== undefined;
  const hasRotation = rotation.tick !== undefined;
  const tick =
    hasTickColor || hasRotation ?
      {
        ...TICK_DEFAULTS,
        ...(hasTickColor ? { fill: xAxisStyle?.tickColor } : {}),
        ...(rotation.tick ?? {}),
      }
    : undefined;

  return {
    ...baseXAxisProps,
    ...(tick !== undefined ? { tick } : {}),
    ...(rotation.interval !== undefined ? { interval: rotation.interval } : {}),
    ...(rotation.height !== undefined ? { height: rotation.height } : {}),
    ...scale,
  };
}

function _buildYAxisProps({
  yAxisStyle,
  yExtent,
  role,
}: Readonly<{
  yAxisStyle: Readonly<AxisStyle> | undefined;
  yExtent: Readonly<ValueExtent> | undefined;
  role: AxisRole;
}>): Omit<YAxisProps, "ref"> {
  const scale = matchLiteral(role, {
    category: {},
    value: () => {
      return makeAxisScalePropsFromBounds({
        axis: yAxisStyle,
        extent: yExtent,
      });
    },
  });
  const tick =
    yAxisStyle?.tickColor !== undefined ?
      { ...TICK_DEFAULTS, fill: yAxisStyle.tickColor }
    : undefined;

  return {
    tickFormatter: _formatYAxisTick,
    width: DEFAULT_Y_AXIS_WIDTH,
    ...(tick !== undefined ? { tick } : {}),
    ...scale,
  };
}

/** Mantine and Recharts props produced from a chart style. */
export type ChartStyleProps = {
  withXAxis?: boolean;
  withYAxis?: boolean;
  xAxisProps?: Omit<XAxisProps, "ref">;
  yAxisProps?: Omit<YAxisProps, "ref">;
  gridProps?: Omit<CartesianGridProps, "ref">;
  gridColor?: string;
  legendProps?: Omit<LegendProps, "ref">;
  xAxisLabel?: string;
  yAxisLabel?: string;
  styles?: Partial<Record<string, CSSProperties>>;
};

/** Inputs used to resolve chart-specific style props. */
export type ApplyChartStyleOptions = {
  style?: Readonly<ChartStyle>;
  baseXAxisProps?: Readonly<Omit<XAxisProps, "ref">>;
  xExtent?: Readonly<ValueExtent>;
  yExtent?: Readonly<ValueExtent>;
  xTickLabels?: readonly string[];
  axisRoles?: Readonly<AxisRoles>;
};

function _buildGridProps(
  gridStyle: Readonly<NonNullable<ChartStyle["grid"]>> | undefined,
): Pick<ChartStyleProps, "gridProps" | "gridColor"> {
  const gridProps: Omit<CartesianGridProps, "ref"> = {
    horizontal: gridStyle?.horizontal ?? true,
    vertical: gridStyle?.vertical ?? false,
    strokeDasharray: "5 5",
    ...(gridStyle?.color !== undefined ? { stroke: gridStyle.color } : {}),
  };
  return { gridProps, gridColor: gridStyle?.color };
}

function _buildLegendProps(
  legendStyle: Readonly<NonNullable<ChartStyle["legend"]>> | undefined,
): Pick<ChartStyleProps, "legendProps"> {
  const legendPosition = legendStyle?.position ?? "top";
  return {
    legendProps: {
      verticalAlign: matchLiteral(legendPosition, {
        top: "top" as const,
        bottom: "bottom" as const,
        left: "middle" as const,
        right: "middle" as const,
      }),
      align: matchLiteral(legendPosition, {
        top: "center" as const,
        bottom: "center" as const,
        left: "left" as const,
        right: "right" as const,
      }),
    },
  };
}

function _buildAxisLabels({
  xAxisStyle,
  yAxisStyle,
}: Readonly<{
  xAxisStyle: Readonly<AxisStyle> | undefined;
  yAxisStyle: Readonly<AxisStyle> | undefined;
}>): Pick<ChartStyleProps, "xAxisLabel" | "yAxisLabel" | "styles"> {
  const xAxisLabel =
    xAxisStyle?.label !== undefined && xAxisStyle.label !== "" ?
      xAxisStyle.label
    : undefined;
  const yAxisLabel =
    yAxisStyle?.label !== undefined && yAxisStyle.label !== "" ?
      yAxisStyle.label
    : undefined;
  const axisLabelColor = xAxisStyle?.labelColor ?? yAxisStyle?.labelColor;
  const styles =
    axisLabelColor !== undefined ?
      { axisLabel: { fill: axisLabelColor } }
    : undefined;
  return { xAxisLabel, yAxisLabel, styles };
}

/**
 * Translates a {@link ChartStyle} into the Mantine and Recharts props for
 * the five cartesian charts: bar, line, area, scatter, and bubble. Each one
 * reaches this through its own `use*ChartStyleProps` hook, which supplies the
 * value extents and tick labels this cannot derive on its own.
 *
 * Not for radar, pie, or funnel. Every field it produces (`withXAxis`,
 * `xAxisProps`, `yAxisProps`, grid, axis labels) describes an x/y plot, and
 * those three have no cartesian axes. Radar takes the one piece that does
 * apply to it, `chartStyle.legend.position`, straight from the config.
 */
export function applyChartStyle(
  options: Readonly<ApplyChartStyleOptions> = {},
): ChartStyleProps {
  const {
    style,
    baseXAxisProps,
    xExtent,
    yExtent,
    xTickLabels = [],
    axisRoles = DEFAULT_AXIS_ROLES,
  } = options;
  const xAxisStyle = style?.xAxis;
  const yAxisStyle = style?.yAxis;

  return {
    withXAxis: !(xAxisStyle?.hide ?? false),
    withYAxis: !(yAxisStyle?.hide ?? false),
    xAxisProps: _buildXAxisProps({
      xAxisStyle,
      baseXAxisProps,
      xExtent,
      xTickLabels,
      role: axisRoles.x,
    }),
    yAxisProps: _buildYAxisProps({
      yAxisStyle,
      yExtent,
      role: axisRoles.y,
    }),
    ..._buildGridProps(style?.grid),
    ..._buildLegendProps(style?.legend),
    ..._buildAxisLabels({ xAxisStyle, yAxisStyle }),
  };
}
