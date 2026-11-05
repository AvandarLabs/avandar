/**
 * The bubble form keeps its hand-coded pair-series editor but renders
 * chart-level descriptors through the shared `ChartSettingsFieldsets`. These
 * tests prove the axis and legend settings appear and write back to the
 * config.
 */
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { BubbleChartForm } from "@/components/VisualizationContainer/VizSettingsForm/BubbleChartForm/BubbleChartForm";
import { fireEvent, render, screen } from "@/test-utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaBubbleChartVizConfig } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfig.types";

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: "spend" as QueryColumn.Id, name: "spend", dataType: "double" },
  { id: "revenue" as QueryColumn.Id, name: "revenue", dataType: "double" },
  { id: "weight" as QueryColumn.Id, name: "weight", dataType: "double" },
];

const BUBBLE_CONFIG: AvaBubbleChartVizConfig = {
  vizType: "bubble",
  series: [
    {
      key: "revenue" as QueryColumn.Id,
      xKey: "spend" as QueryColumn.Id,
      sizeKey: "weight" as QueryColumn.Id,
    },
  ],
};

describe("BubbleChartForm: axis settings", () => {
  it("renders the axis controls", () => {
    render(
      <AvandarAppProvider>
        <BubbleChartForm
          fields={COLUMNS}
          config={BUBBLE_CONFIG}
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
          config={BUBBLE_CONFIG}
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

describe("BubbleChartForm: legend settings", () => {
  it("writes the legend position back to the config", () => {
    const onConfigChange = vi.fn();
    render(
      <AvandarAppProvider>
        <BubbleChartForm
          fields={COLUMNS}
          config={BUBBLE_CONFIG}
          onConfigChange={onConfigChange}
        />
      </AvandarAppProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: /^Left$/ }));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        chartStyle: expect.objectContaining({
          legend: expect.objectContaining({ position: "left" }),
        }),
      }),
    );
  });
});
