/**
 * The scatter and bubble forms keep their hand-coded pair-series
 * editors but render chart-level descriptors through the shared
 * `ChartSettingsFieldsets`. These tests prove the axis settings appear
 * and write back to the config.
 */
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { BubbleChartForm } from "@/components/VisualizationContainer/VizSettingsForm/BubbleChartForm";
import { ScatterChartForm } from "@/components/VisualizationContainer/VizSettingsForm/ScatterChartForm";
import { fireEvent, render, screen } from "@/test-utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types";

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "spend", dataType: "double" },
  { name: "revenue", dataType: "double" },
  { name: "weight", dataType: "double" },
];

const scatterConfig: ScatterPlotVizConfig = {
  vizType: "scatter",
  series: [{ key: "revenue", xKey: "spend" }],
};

const bubbleConfig: BubbleChartVizConfig = {
  vizType: "bubble",
  series: [{ key: "revenue", xKey: "spend", sizeKey: "weight" }],
};

describe("ScatterChartForm — axis settings", () => {
  it("renders a minimum control for each value axis", () => {
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={scatterConfig}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByLabelText(/^X axis minimum$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Y axis minimum$/i)).toBeInTheDocument();
  });

  it("writes the tick interval back to the config", () => {
    const onConfigChange = vi.fn();
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={scatterConfig}
          onConfigChange={onConfigChange}
        />
      </AvandarAppProvider>,
    );
    fireEvent.change(screen.getByLabelText(/^Y axis tick interval$/i), {
      target: { value: "25" },
    });
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        chartStyle: expect.objectContaining({
          yAxis: expect.objectContaining({ tickInterval: 25 }),
        }),
      }),
    );
  });

  it("offers rotation on the X axis only", () => {
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={scatterConfig}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(
      screen.getByLabelText(/^X axis label rotation$/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^Y axis label rotation$/i),
    ).not.toBeInTheDocument();
  });
});

describe("BubbleChartForm — axis settings", () => {
  it("renders the axis controls", () => {
    render(
      <AvandarAppProvider>
        <BubbleChartForm
          fields={COLUMNS}
          config={bubbleConfig}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByLabelText(/^X axis maximum$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Y axis maximum$/i)).toBeInTheDocument();
  });

  it("writes a maximum back to the config", () => {
    const onConfigChange = vi.fn();
    render(
      <AvandarAppProvider>
        <BubbleChartForm
          fields={COLUMNS}
          config={bubbleConfig}
          onConfigChange={onConfigChange}
        />
      </AvandarAppProvider>,
    );
    fireEvent.change(screen.getByLabelText(/^Y axis maximum$/i), {
      target: { value: "500" },
    });
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        chartStyle: expect.objectContaining({
          yAxis: expect.objectContaining({ max: 500 }),
        }),
      }),
    );
  });
});
