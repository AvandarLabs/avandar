import { Box } from "@mantine/core";
import { Select, SelectData } from "@ui";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs";
import { VizSettingsFormBody } from "@/components/Visualization/VizSettingsForm/VizSettingsFormBody";
import type { UnknownDataFrame } from "@utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

type Props = {
  columns: readonly QueryResultColumn[];
  data: UnknownDataFrame;

  /** Current visualization config. */
  vizConfig: VizConfig;

  /** Called when the user edits any control inside a per-type subform. */
  onVizConfigChange: (vizConfig: VizConfig) => void;

  /** Called when the user picks a different viz type from the type picker. */
  onVizTypeChange: (vizType: VizType) => void;
};

/**
 * Renders the controls used to edit a `VizConfig`: a type picker plus the
 * per-type subform for the currently selected viz type. Pure and prop-driven
 * so it can be reused in any context (DataExplorer sidebar, dashboard editor
 * side panel, etc.) by wiring `vizConfig` + `onVizConfigChange` to whichever
 * store owns the config.
 */
export function VizSettingsForm({
  columns,
  data,
  vizConfig,
  onVizConfigChange,
  onVizTypeChange,
}: Props): JSX.Element {
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
            onVizTypeChange(selectedVizType);
          }
        }}
      />

      <VizSettingsFormBody
        columns={columns}
        data={data}
        vizConfig={vizConfig}
        onVizConfigChange={onVizConfigChange}
      />
    </Box>
  );
}
