import { match } from "ts-pattern";
import { AreaChartForm } from "@/components/Visualization/VizSettingsForm/AreaChartForm";
import { BarChartForm } from "@/components/Visualization/VizSettingsForm/BarChartForm";
import { BubbleChartForm } from "@/components/Visualization/VizSettingsForm/BubbleChartForm";
import { FunnelChartForm } from "@/components/Visualization/VizSettingsForm/FunnelChartForm";
import { LineChartForm } from "@/components/Visualization/VizSettingsForm/LineChartForm";
import { PieChartForm } from "@/components/Visualization/VizSettingsForm/PieChartForm";
import { RadarChartForm } from "@/components/Visualization/VizSettingsForm/RadarChartForm";
import { ScatterChartForm } from "@/components/Visualization/VizSettingsForm/ScatterChartForm";
import type { UnknownDataFrame } from "@utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

type Props = {
  columns: readonly QueryResultColumn[];
  data: UnknownDataFrame;

  /** Current visualization config. */
  vizConfig: VizConfig;

  /** Called when the user edits any control inside a per-type subform. */
  onVizConfigChange: (vizConfig: VizConfig) => void;
};

/**
 * Renders the per-viz-type subform for a given `VizConfig`, **without** the
 * top-level viz type selector. Pure and prop-driven so it can be reused
 * anywhere a viz config needs to be edited (DataExplorer sidebar, Puck custom
 * field in the dashboard editor, etc.) by composing it with whatever viz-type
 * picker is appropriate for that context.
 */
export function VizSettingsFormBody({
  columns,
  data,
  vizConfig,
  onVizConfigChange,
}: Props): JSX.Element | null {
  return match(vizConfig)
    .with({ vizType: "table" }, () => {
      return null;
    })
    .with({ vizType: "bar" }, (config) => {
      return (
        <BarChartForm
          fields={columns}
          config={config}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
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
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .with({ vizType: "area" }, (config) => {
      return (
        <AreaChartForm
          fields={columns}
          config={config}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
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
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .with({ vizType: "pie" }, (config) => {
      return (
        <PieChartForm
          fields={columns}
          config={config}
          data={data}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .with({ vizType: "funnel" }, (config) => {
      return (
        <FunnelChartForm
          fields={columns}
          config={config}
          data={data}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .with({ vizType: "radar" }, (config) => {
      return (
        <RadarChartForm
          fields={columns}
          config={config}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .with({ vizType: "bubble" }, (config) => {
      return (
        <BubbleChartForm
          fields={columns}
          config={config}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .exhaustive();
}
