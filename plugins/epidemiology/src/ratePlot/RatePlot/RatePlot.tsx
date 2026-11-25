import { useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import { useMemo } from "react";
import { makeRatePlotPointsFromRows } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";
import { makeRateTextFromPoint } from "../makeRateTextFromPoint/makeRateTextFromPoint";
import { RatePlotChart } from "./RatePlotChart";
import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";
import type { RatePlotChartRow } from "./RatePlot.types";
import type {
  AvandarApi,
  PluginVizComponentProps,
  PluginVizSettingValue,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

function _getColumnFromSetting(
  value: PluginVizSettingValue | undefined,
): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * How far the whiskers reach below and above the rate. Undefined, so no
 * whiskers are drawn, unless both bounds are numbers.
 */
function _getRateErrorFromPoint(
  point: RatePlotPoint,
): readonly [number, number] | undefined {
  if (point.lower === undefined || point.upper === undefined) {
    return undefined;
  }
  return [
    Math.max(0, point.rate - point.lower),
    Math.max(0, point.upper - point.rate),
  ];
}

function _makeChartRowsFromInput(options: {
  rows: PluginVizComponentProps["rows"];
  settings: PluginVizComponentProps["settings"];
  t: AvandarApi["i18n"]["t"];
}): RatePlotChartRow[] {
  const { rows, settings, t } = options;
  const labelColumn = _getColumnFromSetting(settings.labelColumn);
  const rateColumn = _getColumnFromSetting(settings.rateColumn);
  if (labelColumn === undefined || rateColumn === undefined) {
    return [];
  }
  const points = makeRatePlotPointsFromRows({
    rows,
    labelColumn,
    rateColumn,
    lowerColumn: _getColumnFromSetting(settings.lowerColumn),
    upperColumn: _getColumnFromSetting(settings.upperColumn),
    sort: settings.sort === "label" ? "label" : "rate",
  });
  return points.map((point) => {
    return {
      ...point,
      rateError: _getRateErrorFromPoint(point),
      rateText: makeRateTextFromPoint({ point, t }),
    };
  });
}

/**
 * Draws rates with confidence intervals, one horizontal row per label: a dot
 * at the rate and whiskers from the lower to the upper bound, for example
 * incidence per 100,000 by borough. A row without both bounds, or a chart
 * without both bound columns set, has no whiskers. With no numeric rate to
 * draw, it says so instead.
 */
export function RatePlot(props: PluginVizComponentProps): ReactNode {
  const { rows, settings, width, height } = props;
  const t = useT();
  const chartRows = useMemo(() => {
    return _makeChartRowsFromInput({ rows, settings, t });
  }, [rows, settings, t]);
  if (chartRows.length === 0) {
    return (
      <Stack h={height} justify="center" align="center">
        <Text size="sm" c="dimmed">
          {t("viz.ratePlot.empty")}
        </Text>
      </Stack>
    );
  }
  return <RatePlotChart chartRows={chartRows} width={width} height={height} />;
}
