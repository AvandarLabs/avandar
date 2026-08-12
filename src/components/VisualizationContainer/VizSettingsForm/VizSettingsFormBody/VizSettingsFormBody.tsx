import { match } from "ts-pattern";
import { BubbleChartForm } from "@/components/VisualizationContainer/VizSettingsForm/BubbleChartForm";
import { FunnelChartForm } from "@/components/VisualizationContainer/VizSettingsForm/FunnelChartForm";
import { PieChartForm } from "@/components/VisualizationContainer/VizSettingsForm/PieChartForm";
import { ScatterChartForm } from "@/components/VisualizationContainer/VizSettingsForm/ScatterChartForm";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

type Props = {
  columns: readonly QueryResultColumn[];
  data: UnknownDataFrame;

  /** Current visualization config. */
  vizConfig: VizConfig;

  /** Called when the user edits any control inside a per-type subform. */
  onVizConfigChange: (vizConfig: VizConfig) => void;

  /**
   * How each subform arranges its setting groups. Defaults to a vertical
   * stack, which suits narrow hosts like the dashboard settings panel.
   */
  layout?: SettingsColumnsLayout;
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
  layout = "stacked",
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
          layout={layout}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "line" }, (config) => {
      return (
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          layout={layout}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "area" }, (config) => {
      return (
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          layout={layout}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "radar" }, (config) => {
      return (
        <SeriesAwareVizForm
          fields={columns}
          config={config}
          layout={layout}
          onConfigChange={onVizConfigChange}
        />
      );
    })
    .with({ vizType: "scatter" }, (config) => {
      return (
        <ScatterChartForm
          fields={columns}
          config={config}
          layout={layout}
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
          layout={layout}
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
          layout={layout}
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
          layout={layout}
          onConfigChange={(newConfig) => {
            onVizConfigChange({ ...config, ...newConfig });
          }}
        />
      );
    })
    .exhaustive();
}
