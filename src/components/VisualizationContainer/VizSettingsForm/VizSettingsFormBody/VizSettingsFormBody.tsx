import { match } from "ts-pattern";
import { BubbleChartForm } from "@/components/VisualizationContainer/VizSettingsForm/BubbleChartForm/BubbleChartForm";
import { FunnelChartForm } from "@/components/VisualizationContainer/VizSettingsForm/FunnelChartForm/FunnelChartForm";
import { PieChartForm } from "@/components/VisualizationContainer/VizSettingsForm/PieChartForm/PieChartForm";
import { ScatterChartForm } from "@/components/VisualizationContainer/VizSettingsForm/ScatterChartForm/ScatterChartForm";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];
  data: UnknownDataFrame;

  /** Current visualization config. */
  vizConfig: AvaVizConfig;

  /** Called when the user edits any control inside a per-type subform. */
  onVizConfigChange: (vizConfig: AvaVizConfig) => void;

  /**
   * How each subform arranges its setting groups. Defaults to a vertical
   * stack, which suits narrow hosts like the dashboard settings panel.
   */
  layout?: SettingsColumnsLayout;
};

/**
 * Renders the settings subform for an `AvaVizConfig`'s viz type, without the
 * viz type selector, so any place that edits a chart's settings can pair it
 * with its own viz type picker, for example the Data Explorer drawer's
 * visualization tab or the dashboard editor's chart settings field.
 *
 * Bar, line, area, and radar share the descriptor-driven
 * `SeriesAwareVizForm`. Pie, funnel, scatter, and bubble have their own forms.
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
