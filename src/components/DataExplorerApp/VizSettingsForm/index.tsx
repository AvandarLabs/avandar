import { match } from "ts-pattern";
import { Select, SelectData } from "@/lib/ui/inputs/Select";
import { QueryResultColumn } from "@/models/queries/QueryResultData/QueryResultData.types";
import { VizConfigUtils, VizType, VizTypes } from "@/models/vizs/VizConfig";
import { DataExplorerStore } from "../DataExplorerStore";
import { BarChartForm } from "./BarChartForm";
import { LineChartForm } from "./LineChartForm";
import { ScatterChartForm } from "./ScatterChartForm";

type Props = {
  columns: readonly QueryResultColumn[];
};

export function VizSettingsForm({ columns }: Props): JSX.Element {
  const [{ vizConfig }, dispatch] = DataExplorerStore.use();
  const vizTypeOptions: SelectData<VizType> = VizTypes.map((vizType) => {
    return {
      label: VizConfigUtils.ofVizType(vizType).displayName,
      value: vizType,
    };
  });

  return (
    <form>
      <Select
        allowDeselect={false}
        data={vizTypeOptions}
        label="Visualization Type"
        value={vizConfig.vizType}
        onChange={(selectedVizType) => {
          if (selectedVizType) {
            dispatch.setActiveVizType(selectedVizType);
          }
        }}
      />

      {match(vizConfig)
        .with({ vizType: "table" }, () => {
          return null;
        })
        .with({ vizType: "bar" }, (config) => {
          return (
            <BarChartForm
              fields={columns}
              config={config}
              onConfigChange={(newConfig) => {
                dispatch.setVizConfig({
                  vizConfig: { ...config, ...newConfig },
                });
              }}
            />
          );
        })
        .with({ vizType: "line" }, (config) => {
          return (
            <LineChartForm
              fields={columns}
              config={config}
              onConfigChange={(newConfig) => {
                dispatch.setVizConfig({
                  vizConfig: { ...config, ...newConfig },
                });
              }}
            />
          );
        })
        .with({ vizType: "scatter" }, (config) => {
          return (
            <ScatterChartForm
              fields={columns}
              config={config}
              onConfigChange={(newConfig) => {
                dispatch.setVizConfig({
                  vizConfig: { ...config, ...newConfig },
                });
              }}
            />
          );
        })
        .exhaustive()}
    </form>
  );
}
