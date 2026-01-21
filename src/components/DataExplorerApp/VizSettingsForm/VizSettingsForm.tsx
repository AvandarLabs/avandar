import { Box } from "@mantine/core";
import { match } from "ts-pattern";
import { Select, SelectData } from "@/lib/ui/inputs/Select";
import { QueryResultColumn } from "@/models/queries/QueryResult/QueryResult.types";
import { VizConfigs, VizType, VizTypes } from "@/models/vizs/VizConfig";
import { DataExplorerStateManager } from "../DataExplorerStateManager";
import { BarChartForm } from "./BarChartForm";
import { LineChartForm } from "./LineChartForm";
import { ScatterChartForm } from "./ScatterChartForm";

type Props = {
  columns: readonly QueryResultColumn[];
};

export function VizSettingsForm({ columns }: Props): JSX.Element {
  const [{ vizConfig }, dispatch] = DataExplorerStateManager.useContext();
  const vizTypeOptions: SelectData<VizType> = VizTypes.map((vizType) => {
    return {
      label: VizConfigs.getDisplayName(vizType),
      value: vizType,
    };
  });

  return (
    <Box component="form" px="md" py="md">
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
                dispatch.setVizConfig({ ...config, ...newConfig });
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
                dispatch.setVizConfig({ ...config, ...newConfig });
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
                dispatch.setVizConfig({ ...config, ...newConfig });
              }}
            />
          );
        })
        .exhaustive()}
    </Box>
  );
}
