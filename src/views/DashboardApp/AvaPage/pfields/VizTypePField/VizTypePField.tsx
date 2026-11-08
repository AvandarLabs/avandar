import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import { useDataVizAuthoring } from "../useDataVizAuthoring/useDataVizAuthoring";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { ReactElement } from "react";

type Props = {
  /**
   * Authorizes the chart query whose result columns fill a picked plugin
   * chart's required column settings.
   */
  auth: StructuredQueryAuth;

  /**
   * Puck's setter for the block's `vizType` prop. A built-in type goes
   * through it so `resolveData` converts the config.
   */
  onChange: (vizType: AvaVizConfig.Type) => void;
};

/**
 * Puck custom field for a DataViz block's chart type, built from the
 * `VizTypeSelect` the Data Explorer also uses, so it lists the workspace's
 * plugin chart types beside the built-in ones. A built-in type goes through
 * Puck's field change, so `resolveData` converts the config as for any type
 * change. A plugin chart type is written with the config built for it, since
 * only this field has the plugin chart's settings. Use it as the `vizType`
 * field of a chart block, for example the dashboard's DataViz block.
 */
export function VizTypePField({
  auth,
  onChange,
}: Readonly<Props>): ReactElement {
  const authoring = useDataVizAuthoring(auth);
  return (
    <VizTypeSelect
      vizConfig={authoring.props.vizConfig}
      columns={authoring.schema?.columns ?? []}
      onChange={(target) => {
        if (typeof target === "string") {
          onChange(target);
          return;
        }
        authoring.replaceVizConfig({ vizType: "plugin", vizConfig: target });
      }}
    />
  );
}
