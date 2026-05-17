import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { VisualizationContainer } from "@/components/Visualization/VisualizationContainer";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";

vi.mock("@/lib/ui/viz/DataGrid", () => {
  return {
    DataGrid: (props: { columnNames: readonly string[] }) => {
      return (
        <div data-testid="data-grid">
          {props.columnNames.map((name) => {
            return <span key={name}>{name}</span>;
          })}
        </div>
      );
    },
  };
});

vi.mock("@/lib/ui/viz/BarChart", () => {
  return {
    BarChart: (props: { xAxisKey?: string; yAxisKey?: string }) => {
      return (
        <div
          data-testid="bar-chart"
          data-x={props.xAxisKey}
          data-y={props.yAxisKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/LineChart", () => {
  return {
    LineChart: (props: { xAxisKey?: string; yAxisKey?: string }) => {
      return (
        <div
          data-testid="line-chart"
          data-x={props.xAxisKey}
          data-y={props.yAxisKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/AreaChart", () => {
  return {
    AreaChart: (props: { xAxisKey?: string; yAxisKey?: string }) => {
      return (
        <div
          data-testid="area-chart"
          data-x={props.xAxisKey}
          data-y={props.yAxisKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/ScatterChart", () => {
  return {
    ScatterChart: (props: { xAxisKey?: string; yAxisKey?: string }) => {
      return (
        <div
          data-testid="scatter-chart"
          data-x={props.xAxisKey}
          data-y={props.yAxisKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/PieChart", () => {
  return {
    PieChart: (props: { nameKey?: string; valueKey?: string }) => {
      return (
        <div
          data-testid="pie-chart"
          data-name={props.nameKey}
          data-value={props.valueKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/FunnelChart", () => {
  return {
    FunnelChart: (props: { nameKey?: string; valueKey?: string }) => {
      return (
        <div
          data-testid="funnel-chart"
          data-name={props.nameKey}
          data-value={props.valueKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/RadarChart", () => {
  return {
    RadarChart: (props: { nameKey?: string; valueKey?: string }) => {
      return (
        <div
          data-testid="radar-chart"
          data-name={props.nameKey}
          data-value={props.valueKey}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/BubbleChart", () => {
  return {
    BubbleChart: (props: {
      xAxisKey?: string;
      yAxisKey?: string;
      sizeKey?: string;
    }) => {
      return (
        <div
          data-testid="bubble-chart"
          data-x={props.xAxisKey}
          data-y={props.yAxisKey}
          data-size={props.sizeKey}
        />
      );
    },
  };
});

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "category", dataType: "varchar" },
  { name: "value", dataType: "double" },
  { name: "score", dataType: "double" },
];

const DATA = [
  { category: "Alpha", value: 10, score: 1 },
  { category: "Beta", value: 20, score: 2 },
  { category: "Gamma", value: 30, score: 3 },
];

const EMPTY_DATE_COLUMNS: ReadonlySet<string> = new Set();

function renderViz(
  vizConfig: Parameters<typeof VisualizationContainer>[0]["vizConfig"],
): ReturnType<typeof render> {
  return render(
    <AvandarUiProvider>
      <VisualizationContainer
        columns={COLUMNS}
        data={DATA}
        dateColumns={EMPTY_DATE_COLUMNS}
        vizConfig={vizConfig}
      />
    </AvandarUiProvider>,
  );
}

describe("VisualizationContainer", () => {
  it("renders the data grid for the 'table' viz type", () => {
    renderViz({ vizType: "table" });
    const grid = screen.getByTestId("data-grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveTextContent("category");
    expect(grid).toHaveTextContent("value");
  });

  it("renders the bar chart with the chosen axes", () => {
    renderViz({
      vizType: "bar",
      xAxisKey: "category",
      yAxisKey: "value",
      withLegend: true,
    });
    const bar = screen.getByTestId("bar-chart");
    expect(bar).toHaveAttribute("data-x", "category");
    expect(bar).toHaveAttribute("data-y", "value");
  });

  it("shows an error callout when the bar chart is missing axes", () => {
    renderViz({
      vizType: "bar",
      xAxisKey: undefined,
      yAxisKey: undefined,
      withLegend: true,
    });
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(screen.getByText(/cannot be displayed/i)).toBeInTheDocument();
    expect(screen.getByText(/X axis/i)).toBeInTheDocument();
  });

  it("renders the line chart with the chosen axes", () => {
    renderViz({
      vizType: "line",
      xAxisKey: "category",
      yAxisKey: "value",
      withLegend: false,
      curveType: "monotone",
    });
    const line = screen.getByTestId("line-chart");
    expect(line).toHaveAttribute("data-x", "category");
    expect(line).toHaveAttribute("data-y", "value");
  });

  it("renders the area chart with the chosen axes", () => {
    renderViz({
      vizType: "area",
      xAxisKey: "category",
      yAxisKey: "value",
      withLegend: false,
      curveType: "linear",
    });
    const area = screen.getByTestId("area-chart");
    expect(area).toHaveAttribute("data-x", "category");
    expect(area).toHaveAttribute("data-y", "value");
  });

  it("renders the scatter chart with the chosen axes", () => {
    renderViz({
      vizType: "scatter",
      xAxisKey: "value",
      yAxisKey: "score",
    });
    const scatter = screen.getByTestId("scatter-chart");
    expect(scatter).toHaveAttribute("data-x", "value");
    expect(scatter).toHaveAttribute("data-y", "score");
  });

  it("renders the pie chart with the chosen name and value", () => {
    renderViz({
      vizType: "pie",
      nameKey: "category",
      valueKey: "value",
      isDonut: false,
      withLabels: true,
      labelsType: "value",
    });
    const pie = screen.getByTestId("pie-chart");
    expect(pie).toHaveAttribute("data-name", "category");
    expect(pie).toHaveAttribute("data-value", "value");
  });

  it("renders the funnel chart with the chosen name and value", () => {
    renderViz({
      vizType: "funnel",
      nameKey: "category",
      valueKey: "value",
    });
    const funnel = screen.getByTestId("funnel-chart");
    expect(funnel).toHaveAttribute("data-name", "category");
    expect(funnel).toHaveAttribute("data-value", "value");
  });

  it("renders the radar chart with the chosen name and value", () => {
    renderViz({
      vizType: "radar",
      nameKey: "category",
      valueKey: "value",
    });
    const radar = screen.getByTestId("radar-chart");
    expect(radar).toHaveAttribute("data-name", "category");
    expect(radar).toHaveAttribute("data-value", "value");
  });

  it("renders the bubble chart with the chosen axes and size", () => {
    renderViz({
      vizType: "bubble",
      xAxisKey: "value",
      yAxisKey: "score",
      sizeKey: "value",
    });
    const bubble = screen.getByTestId("bubble-chart");
    expect(bubble).toHaveAttribute("data-x", "value");
    expect(bubble).toHaveAttribute("data-y", "score");
    expect(bubble).toHaveAttribute("data-size", "value");
  });
});
