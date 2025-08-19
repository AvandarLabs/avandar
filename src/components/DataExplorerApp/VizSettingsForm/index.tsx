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

  return (
    <form>
      <Select
        allowDeselect={false}
        data={vizTypeOptions}
        label="Visualization Type"
        value={vizConfig.type}
        onChange={(value) => {
          if (value) onVizConfigChange(makeDefaultVizConfig(value as VizType));
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
                return onVizConfigChange({ ...config, settings });
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
                return onVizConfigChange({ ...config, settings });
              }}
            />
          );
        })
        .exhaustive()}
    </form>
  );
}
