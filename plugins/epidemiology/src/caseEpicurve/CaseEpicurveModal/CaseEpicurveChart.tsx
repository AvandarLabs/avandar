import { useT } from "@avandar/plugin-sdk";
import { Stack } from "@avandar/plugin-ui";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Tooltip,
  useChartTheme,
  XAxis,
  YAxis,
} from "@avandar/plugin-ui/charts";
import { CaseEpicurveTooltip } from "./CaseEpicurveTooltip";
import { useContainerWidth } from "./useContainerWidth";
import type { PluginVizTransformResult } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  epicurve: PluginVizTransformResult;
};

/**
 * The chart fills its container, within these widths. The least keeps the
 * period labels readable, and the most keeps bars from stretching when the
 * container is wider than the plugin modal.
 */
const MIN_CHART_WIDTH = 280;
const MAX_CHART_WIDTH = 720;
const CHART_HEIGHT = 300;

/** The least space between two period labels, so they never overlap. */
const MIN_TICK_GAP = 16;
const CHART_MARGIN = { top: 8, right: 8, bottom: 8, left: 0 };

/**
 * Draws the case epicurve: one touching bar per bucket, stacked by series,
 * with a legend once there is more than one series. It is as wide as the
 * space around it, and skips period labels that would overlap.
 * `CaseEpicurveView` renders it once at least one case has an onset date.
 */
export function CaseEpicurveChart({ epicurve }: Readonly<Props>): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  const { containerRef, width: containerWidth } = useContainerWidth();
  const chartWidth = Math.min(
    Math.max(containerWidth, MIN_CHART_WIDTH),
    MAX_CHART_WIDTH,
  );
  const axisProps = {
    stroke: theme.gridColor,
    tick: { fill: theme.textColor },
  };
  const { xColumn, series } = epicurve.chart;
  return (
    <Stack ref={containerRef} gap={0} w="100%" miw={0}>
      <ComposedChart
        width={chartWidth}
        height={CHART_HEIGHT}
        data={epicurve.rows}
        margin={CHART_MARGIN}
        barCategoryGap={0}
        role="img"
        title={t("cases.epicurve.title")}
      >
        <CartesianGrid stroke={theme.gridColor} vertical={false} />
        <XAxis dataKey={xColumn} minTickGap={MIN_TICK_GAP} {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip
          cursor={{ fill: theme.gridColor }}
          content={CaseEpicurveTooltip}
        />
        {series.length > 1 ? <Legend /> : null}
        {series.map((oneSeries, index) => {
          return (
            <Bar
              key={oneSeries.column}
              dataKey={oneSeries.column}
              name={oneSeries.label}
              stackId="cases"
              fill={theme.colors[index % theme.colors.length]}
            />
          );
        })}
      </ComposedChart>
    </Stack>
  );
}
