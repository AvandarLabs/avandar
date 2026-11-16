import { useT } from "@avandar/plugin-sdk";
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
import type { PluginVizTransformResult } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  epicurve: PluginVizTransformResult;
};

/** Fits the chart inside the plugin modal's content column. */
const CHART_WIDTH = 560;
const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 8, right: 8, bottom: 8, left: 0 };

/**
 * Draws the case epicurve: one touching bar per bucket, stacked by series,
 * with a legend once there is more than one series. `CaseEpicurveView`
 * renders it once at least one case has an onset date.
 */
export function CaseEpicurveChart({ epicurve }: Readonly<Props>): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  const axisProps = {
    stroke: theme.gridColor,
    tick: { fill: theme.textColor },
  };
  const { xColumn, series } = epicurve.chart;
  return (
    <ComposedChart
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      data={epicurve.rows}
      margin={CHART_MARGIN}
      barCategoryGap={0}
      role="img"
      title={t("cases.epicurve.title")}
    >
      <CartesianGrid stroke={theme.gridColor} vertical={false} />
      <XAxis dataKey={xColumn} {...axisProps} />
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
  );
}
