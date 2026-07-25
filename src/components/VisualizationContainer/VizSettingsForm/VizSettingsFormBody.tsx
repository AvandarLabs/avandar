import { match } from "ts-pattern";
import { BubbleChartForm } from "@/components/VisualizationContainer/VizSettingsForm/BubbleChartForm";
import { FunnelChartForm } from "@/components/VisualizationContainer/VizSettingsForm/FunnelChartForm";
import { PieChartForm } from "@/components/VisualizationContainer/VizSettingsForm/PieChartForm";
import { ScatterChartForm } from "@/components/VisualizationContainer/VizSettingsForm/ScatterChartForm";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm";
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
 *
 * Bar / line / area / radar share a descriptor-driven form
 * (`SeriesAwareVizForm`). The remaining single-series vizs (pie,
 * funnel, scatter, bubble) keep their hand-coded forms for now.
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
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "line" }, (config) => {
      return (
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "area" }, (config) => {
      return (
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "radar" }, (config) => {
      return (
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          onConfigChange={onVizConfigChange}
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
