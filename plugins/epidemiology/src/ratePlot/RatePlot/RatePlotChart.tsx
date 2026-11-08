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
import type { ChartTheme } from "@avandar/plugin-ui/charts";
import type { ReactNode } from "react";

type Props = {
  chartRows: readonly RatePlotChartRow[];
  width: number;
  height: number;
};

const CHART_MARGIN = { top: 8, right: 24, bottom: 8, left: 8 };

/** Room for row labels such as "Staten Island" beside the chart. */
const LABEL_AXIS_WIDTH = 160;

/**
 * The longest row label the axis writes in full. Longer labels end in an
 * ellipsis here and appear in full in the tooltip.
 */
const MAX_LABEL_LENGTH = 22;

const WHISKER_CAP_WIDTH = 6;

function _getAxisLabelFromLabel(label: string): string {
  return label.length > MAX_LABEL_LENGTH
    ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…`
    : label;
}

const LABEL_AXIS_PROPS = {
  type: "category",
  dataKey: "label",
  width: LABEL_AXIS_WIDTH,
  tickFormatter: _getAxisLabelFromLabel,
} as const;

function _getAxisPropsFromTheme(theme: ChartTheme): {
  stroke: string;
  tick: { fill: string };
} {
  return { stroke: theme.gridColor, tick: { fill: theme.textColor } };
}

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
  const makeRateTickText = (value: number): string => {
    return t("viz.ratePlot.rateText", { rate: value });
  };
  const axisProps = _getAxisPropsFromTheme(theme);
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
      <XAxis
        type="number"
        dataKey="rate"
        tickFormatter={makeRateTickText}
        {...axisProps}
      />
      <YAxis {...LABEL_AXIS_PROPS} {...axisProps} />
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
