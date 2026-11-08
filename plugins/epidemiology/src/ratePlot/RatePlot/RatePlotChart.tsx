import { useT } from "@avandar/plugin-sdk";
import {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Scatter,
  Tooltip,
  useChartTheme,
  XAxis,
  YAxis,
} from "@avandar/plugin-ui/charts";
import { RatePlotTooltip } from "./RatePlotTooltip";
import type { RatePlotChartRow } from "./RatePlot.types";
import type { ReactNode } from "react";

type Props = {
  chartRows: readonly RatePlotChartRow[];
  width: number;
  height: number;
};

const CHART_MARGIN = { top: 8, right: 24, bottom: 8, left: 8 };

/** Room for row labels such as "Staten Island" beside the chart. */
const LABEL_AXIS_WIDTH = 120;

const WHISKER_CAP_WIDTH = 6;

/**
 * Draws the rate plot's rows as dots on a horizontal rate axis, one row per
 * label, with whiskers for rows that have both bounds. `RatePlot` renders it
 * once it has at least one row to draw.
 */
export function RatePlotChart({
  chartRows,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  const axisProps = {
    stroke: theme.gridColor,
    tick: { fill: theme.textColor },
  };
  return (
    <ComposedChart
      width={width}
      height={height}
      layout="vertical"
      data={chartRows}
      margin={CHART_MARGIN}
      role="img"
      title={t("viz.ratePlot.title")}
    >
      <CartesianGrid stroke={theme.gridColor} horizontal={false} />
      <XAxis type="number" dataKey="rate" {...axisProps} />
      <YAxis
        type="category"
        dataKey="label"
        width={LABEL_AXIS_WIDTH}
        {...axisProps}
      />
      <Tooltip cursor={false} content={RatePlotTooltip} />
      <Scatter dataKey="rate" fill={theme.colors[0]}>
        <ErrorBar
          dataKey="rateError"
          direction="x"
          stroke={theme.textColor}
          width={WHISKER_CAP_WIDTH}
        />
      </Scatter>
    </ComposedChart>
  );
}
