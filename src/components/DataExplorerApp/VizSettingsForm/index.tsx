import { match } from "ts-pattern";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { QueryResultColumn } from "@/models/queries/QueryResultData/QueryResultData.types";
import { DataExplorerStore } from "../DataExplorerStore";
import { BarChartForm } from "./BarChartForm";
import { LineChartForm } from "./LineChartForm";
import {
  makeDefaultVizConfig,
  VizConfig,
  VizType,
} from "./makeDefaultVizConfig";
import { ScatterChartForm } from "./ScatterChartForm";

type VizTypeMetadata = { type: VizType; displayName: string };

const VIZ_TYPES: VizTypeMetadata[] = [
  { type: "table", displayName: "Table" },
  { type: "bar", displayName: "Bar Chart" },
  { type: "line", displayName: "Line Chart" },
  { type: "scatter", displayName: "Scatter Plot" },
];

type Props = {
  columns: readonly QueryResultColumn[];
};

function getXYFromVizConfig(
  vizConfig: VizConfig,
): { xAxisKey?: string; yAxisKey?: string } | undefined {
  return match(vizConfig)
    .with({ type: "bar" }, (config) => {
      return {
        xAxisKey: config.settings.xAxisKey,
        yAxisKey: config.settings.yAxisKey,
      };
    })
    .with({ type: "line" }, (config) => {
      return {
        xAxisKey: config.settings.xAxisKey,
        yAxisKey: config.settings.yAxisKey,
      };
    })
    .with({ type: "scatter" }, (c) => {
      return {
        xAxisKey: c.settings.xAxisKey,
        yAxisKey: c.settings.yAxisKey,
      };
    })
    .with({ type: "table" }, () => {
      return undefined;
    })
    .exhaustive();
}

function hydrateXY(options: {
  prevVizConfig: VizConfig;
  newVizConfig: VizConfig;
}): VizConfig {
  const { prevVizConfig, newVizConfig } = options;
  const prevXY = getXYFromVizConfig(prevVizConfig);
  if (!prevXY) {
    return newVizConfig;
  }

  return match(newVizConfig)
    .with({ type: "bar" }, (config) => {
      return {
        ...config,
        settings: {
          xAxisKey: config.settings.xAxisKey ?? prevXY.xAxisKey,
          yAxisKey: config.settings.yAxisKey ?? prevXY.yAxisKey,
        },
      };
    })
    .with({ type: "line" }, (config) => {
      return {
        ...config,
        settings: {
          xAxisKey: config.settings.xAxisKey ?? prevXY.xAxisKey,
          yAxisKey: config.settings.yAxisKey ?? prevXY.yAxisKey,
        },
      };
    })
    .with({ type: "scatter" }, (c) => {
      return {
        ...c,
        settings: {
          xAxisKey: c.settings.xAxisKey ?? prevXY.xAxisKey,
          yAxisKey: c.settings.yAxisKey ?? prevXY.yAxisKey,
        },
      };
    })
    .with({ type: "table" }, (config) => {
      return config;
    })
    .exhaustive();
}

export function VizSettingsForm({ columns }: Props): JSX.Element {
  const [{ vizConfig }, dispatch] = DataExplorerStore.use();

  const vizTypeOptions = makeSelectOptions(VIZ_TYPES, {
    valueFn: prop("type"),
    labelFn: prop("displayName"),
  });

  return (
    <form>
      <Select
        allowDeselect={false}
        data={vizTypeOptions}
        label="Visualization Type"
        value={vizConfig.type}
        onChange={(selectedVizType) => {
          if (selectedVizType) {
            const updated = hydrateXY({
              prevVizConfig: vizConfig,
              newVizConfig: makeDefaultVizConfig(selectedVizType as VizType),
            });
            dispatch.setVizConfig({ vizConfig: updated });
          }
        }}
      />

      {match(vizConfig)
        .with({ type: "table" }, () => {
          return null;
        })
        .with({ type: "bar" }, (config) => {
          return (
            <BarChartForm
              fields={columns}
              settings={config.settings}
              onSettingsChange={(newSettings) => {
                dispatch.setVizConfig({
                  vizConfig: { ...config, settings: newSettings },
                });
              }}
            />
          );
        })
        .with({ type: "line" }, (config) => {
          return (
            <LineChartForm
              fields={columns}
              settings={config.settings}
              onSettingsChange={(newSettings) => {
                dispatch.setVizConfig({
                  vizConfig: { ...config, settings: newSettings },
                });
              }}
            />
          );
        })
        .with({ type: "scatter" }, (config) => {
          return (
            <ScatterChartForm
              fields={columns}
              settings={config.settings}
              onSettingsChange={(newSettings) => {
                dispatch.setVizConfig({
                  vizConfig: { ...config, settings: newSettings },
                });
              }}
            />
          );
        })
        .exhaustive()}
    </form>
  );
}
