// lib/ui/data-viz/requirements/sanitizeXYSettings.ts
import { match } from "ts-pattern";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { VizConfig } from "@/components/DataExplorerApp/VizSettingsForm/makeDefaultVizConfig";
import { UnknownDataFrame } from "@/lib/types/common";
import {
  CHART_REQUIREMENTS,
  classifyFieldsByKind,
} from "@/lib/ui/data-viz/requirements/chartRequirements";

/**
 * Returns a copy of vizConfig with xAxisKey/yAxisKey cleared
 * if they are not valid for the current dataset and chart requirements.
 * Pure/synchronous: no effects, no state mutations.
 */
export function sanitizeXYSettings(
  vizConfig: VizConfig,
  fields: readonly QueryResultField[],
  data: UnknownDataFrame,
): VizConfig {
  return match(vizConfig)
    .with({ type: "bar" }, (config) => {
      const byKind = classifyFieldsByKind(fields, data);
      const allowedXAxisNames = CHART_REQUIREMENTS.bar.x.flatMap((kind) => {
        return byKind[kind];
      });
      const allowedYAxisNames = CHART_REQUIREMENTS.bar.y.flatMap((kind) => {
        return byKind[kind];
      });

      const sanitizedXAxisKey =
        allowedXAxisNames.includes(config.settings.xAxisKey ?? "") ?
          config.settings.xAxisKey
        : undefined;

      const sanitizedYAxisKey =
        allowedYAxisNames.includes(config.settings.yAxisKey ?? "") ?
          config.settings.yAxisKey
        : undefined;

      return {
        ...config,
        settings: {
          xAxisKey: sanitizedXAxisKey,
          yAxisKey: sanitizedYAxisKey,
        },
      };
    })
    .with({ type: "line" }, (config) => {
      const byKind = classifyFieldsByKind(fields, data);
      const allowedXAxisNames = CHART_REQUIREMENTS.line.x.flatMap((kind) => {
        return byKind[kind];
      });
      const allowedYAxisNames = CHART_REQUIREMENTS.line.y.flatMap((kind) => {
        return byKind[kind];
      });

      const sanitizedXAxisKey =
        allowedXAxisNames.includes(config.settings.xAxisKey ?? "") ?
          config.settings.xAxisKey
        : undefined;

      const sanitizedYAxisKey =
        allowedYAxisNames.includes(config.settings.yAxisKey ?? "") ?
          config.settings.yAxisKey
        : undefined;

      return {
        ...config,
        settings: {
          xAxisKey: sanitizedXAxisKey,
          yAxisKey: sanitizedYAxisKey,
        },
      };
    })
    .otherwise((config) => {
      return config;
    });
}
