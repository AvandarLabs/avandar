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

export type Props = {
  fields: readonly QueryResultField[];
  vizConfig: VizConfig;
  onVizConfigChange: (config: VizConfig) => void;
};

const VIZ_TYPES: Array<{ type: VizType; displayName: string }> = [
  { type: "table", displayName: "Table" },
  { type: "bar", displayName: "Bar Chart" },
  { type: "line", displayName: "Line Chart" },
];

export function VizSettingsForm({
  vizConfig,
  fields,
  onVizConfigChange,
}: Props): JSX.Element {
  const vizTypeOptions = makeSelectOptions(VIZ_TYPES, {
    valueFn: getProp("type"),
    labelFn: getProp("displayName"),
  });

  // helper to seed next config with cached XY
  function seedXY<T extends VizConfig>(next: T): T {
    const xy = vizConfig.cachedXY;
    if (!xy) return next;
    // only charts have settings to merge into; table just carries the cache
    if (next.type === "bar" || next.type === "line") {
      return {
        ...next,
        cachedXY: xy,
        settings: { ...next.settings, ...xy },
      } as T;
    }
    return { ...next, cachedXY: xy } as T;
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
