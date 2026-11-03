/**
 * The scatter form keeps its hand-coded pair-series editor but renders
 * chart-level descriptors through the shared `ChartSettingsFieldsets`. These
 * tests prove the axis and legend settings appear and write back to the
 * config.
 */
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { ScatterChartForm } from "@/components/VisualizationContainer/VizSettingsForm/ScatterChartForm/ScatterChartForm";
import { fireEvent, render, screen } from "@/test-utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaScatterPlotVizConfig } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfig.types";

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: "spend" as QueryColumn.Id, name: "spend", dataType: "double" },
  { id: "revenue" as QueryColumn.Id, name: "revenue", dataType: "double" },
  { id: "weight" as QueryColumn.Id, name: "weight", dataType: "double" },
];

const SCATTER_CONFIG: AvaScatterPlotVizConfig = {
  vizType: "scatter",
  series: [
    { key: "revenue" as QueryColumn.Id, xKey: "spend" as QueryColumn.Id },
  ],
};

describe("ScatterChartForm: axis settings", () => {
  it("renders a minimum control for each value axis", () => {
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={SCATTER_CONFIG}
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
          config={SCATTER_CONFIG}
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
          config={SCATTER_CONFIG}
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

describe("ScatterChartForm: legend settings", () => {
  it("renders the legend position control", () => {
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={SCATTER_CONFIG}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByRole("radio", { name: /^Left$/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Right$/ })).toBeInTheDocument();
  });

  it("writes the legend position back to the config", () => {
    const onConfigChange = vi.fn();
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={SCATTER_CONFIG}
          onConfigChange={onConfigChange}
        />
      </AvandarAppProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: /^Right$/ }));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        chartStyle: expect.objectContaining({
          legend: expect.objectContaining({ position: "right" }),
        }),
      }),
    );
  });
});
