import { match } from "ts-pattern";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { BarChartForm } from "./BarChartForm";
import { LineChartForm } from "./LineChartForm";
import {
  makeDefaultVizConfig,
  VizConfig,
  VizType,
} from "./makeDefaultVizConfig";

type VizTypeMetadata = { type: VizType; displayName: string };

const VIZ_TYPES: VizTypeMetadata[] = [
  { type: "table", displayName: "Table" },
  { type: "bar", displayName: "Bar Chart" },
  { type: "line", displayName: "Line Chart" },
];

type VizTypeMetadata = { type: VizType; displayName: string };

const VIZ_TYPES: VizTypeMetadata[] = [
  { type: "table", displayName: "Table" },
  { type: "bar", displayName: "Bar Chart" },
  { type: "line", displayName: "Line Chart" },
];

export type Props = {
  fields: readonly QueryResultField[];
  vizConfig: VizConfig;
  onVizConfigChange: (config: VizConfig) => void;
};

export function VizSettingsForm({
  vizConfig,
  fields,
  onVizConfigChange,
}: Props): JSX.Element {
  const vizTypeOptions = makeSelectOptions(VIZ_TYPES, {
    valueFn: getProp("type"),
    labelFn: getProp("displayName"),
  });

  // helper to read XY from the current config (prefer settings;
  // fallback to cachedXY)
  function getCurrentXY(
    cfg: VizConfig,
  ): { xAxisKey?: string; yAxisKey?: string } | undefined {
    const fromSettings = match(cfg)
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
      .with({ type: "table" }, () => {
        return undefined;
      })
      .exhaustive();

    if (fromSettings?.xAxisKey || fromSettings?.yAxisKey) return fromSettings;

    // if cachedXY only exists on XY charts in your types, this guard is correct
    return "cachedXY" in cfg ? cfg.cachedXY : undefined;
  }

  // helper to seed the *new* config with the cached XY (when applicable)
  function seedXY(newVizConfig: VizConfig): VizConfig {
    const xy = "cachedXY" in vizConfig ? vizConfig.cachedXY : undefined;
    if (!xy) {
      return newVizConfig;
    }

    return match(newVizConfig)
      .with({ type: "bar" }, (cfg) => {
        return {
          ...cfg,
          cachedXY: xy,
          settings: {
            xAxisKey: cfg.settings.xAxisKey ?? xy.xAxisKey,
            yAxisKey: cfg.settings.yAxisKey ?? xy.yAxisKey,
          },
        };
      })
      .with({ type: "line" }, (cfg) => {
        return {
          ...cfg,
          cachedXY: xy,
          settings: {
            xAxisKey: cfg.settings.xAxisKey ?? xy.xAxisKey,
            yAxisKey: cfg.settings.yAxisKey ?? xy.yAxisKey,
          },
        };
      })
      .with({ type: "table" }, (cfg) => {
        return cfg;
      })
      .exhaustive();
  }

  return (
    <form>
      <Select
        allowDeselect={false}
        data={vizTypeOptions}
        label="Visualization Type"
        value={vizConfig.type}
        onChange={(value) => {
          if (value) {
            const next = makeDefaultVizConfig(value as VizType);
            return onVizConfigChange(seedXY(next));
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
              fields={fields}
              settings={config.settings}
              onSettingsChange={(settings) => {
                onVizConfigChange({
                  ...config,
                  settings,
                  cachedXY: {
                    xAxisKey: settings.xAxisKey,
                    yAxisKey: settings.yAxisKey,
                  },
                });
              }}
            />
          );
        })
        .with({ type: "line" }, (config) => {
          return (
            <LineChartForm
              fields={fields}
              settings={config.settings}
              onSettingsChange={(settings) => {
                onVizConfigChange({
                  ...config,
                  settings,
                  cachedXY: {
                    xAxisKey: settings.xAxisKey,
                    yAxisKey: settings.yAxisKey,
                  },
                });
              }}
            />
          );
        })
        .exhaustive()}
    </form>
  );
}
