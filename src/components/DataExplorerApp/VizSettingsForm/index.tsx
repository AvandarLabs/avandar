import { match } from "ts-pattern";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { BarChartForm } from "./BarChartForm";
import { makeDefaultVizConfig, VizConfig } from "./makeDefaultVizConfig";

export type VizType = "table" | "bar";
type VizTypeMetadata = {
  type: VizType;
  displayName: string;
};

const VIZ_TYPES: VizTypeMetadata[] = [
  {
    type: "table",
    displayName: "Table",
  },
  {
    type: "bar",
    displayName: "Bar Chart",
  },
];

type Props = {
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

  return (
    <form>
      <Select
        allowDeselect={false}
        data={vizTypeOptions}
        label="Visualization Type"
        value={vizConfig.type}
        onChange={(value) => {
          if (value) {
            return onVizConfigChange(makeDefaultVizConfig(value));
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
                onVizConfigChange({ ...config, settings });
              }}
            />
          );
        })
        .exhaustive()}
    </form>
  );
}
