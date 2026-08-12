import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { render, screen } from "@/test-utils";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";

const { notifyWarningMock } = vi.hoisted(() => {
  return { notifyWarningMock: vi.fn() };
});

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return {
    ...actual,
    notifyWarning: notifyWarningMock,
  };
});

vi.mock("@/lib/ui/viz/DataGrid", () => {
  return {
    DataGrid: (props: {
      columnNames: readonly string[];
      data: UnknownDataFrame;
    }) => {
      return (
        <div data-testid="data-grid" data-row-count={props.data.length}>
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
    BarChart: (props: {
      xAxisKey?: string;
      series?: ReadonlyArray<{ key: string }>;
      data: UnknownDataFrame;
    }) => {
      return (
        <div
          data-testid="bar-chart"
          data-x={props.xAxisKey}
          data-y={props.series?.[0]?.key}
          data-row-count={props.data.length}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/LineChart", () => {
  return {
    LineChart: (props: {
      xAxisKey?: string;
      series?: ReadonlyArray<{ key: string }>;
    }) => {
      return (
        <div
          data-testid="line-chart"
          data-x={props.xAxisKey}
          data-y={props.series?.[0]?.key}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/AreaChart", () => {
  return {
    AreaChart: (props: {
      xAxisKey?: string;
      series?: ReadonlyArray<{ key: string }>;
    }) => {
      return (
        <div
          data-testid="area-chart"
          data-x={props.xAxisKey}
          data-y={props.series?.[0]?.key}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/ScatterChart", () => {
  return {
    ScatterChart: (props: {
      series?: ReadonlyArray<{ xKey: string; key: string }>;
    }) => {
      return (
        <div
          data-testid="scatter-chart"
          data-x={props.series?.[0]?.xKey}
          data-y={props.series?.[0]?.key}
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
    RadarChart: (props: {
      nameKey?: string;
      series?: ReadonlyArray<{ key: string }>;
    }) => {
      return (
        <div
          data-testid="radar-chart"
          data-name={props.nameKey}
          data-value={props.series?.[0]?.key}
        />
      );
    },
  };
});

vi.mock("@/lib/ui/viz/BubbleChart", () => {
  return {
    BubbleChart: (props: {
      series?: ReadonlyArray<{ xKey: string; key: string; sizeKey: string }>;
    }) => {
      return (
        <div
          data-testid="bubble-chart"
          data-x={props.series?.[0]?.xKey}
          data-y={props.series?.[0]?.key}
          data-size={props.series?.[0]?.sizeKey}
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
  data: UnknownDataFrame = DATA,
): ReturnType<typeof render> {
  return render(
    <AvandarAppProvider>
      <VisualizationContainer
        columns={COLUMNS}
        data={data}
        dateColumns={EMPTY_DATE_COLUMNS}
        vizConfig={vizConfig}
      />
    </AvandarAppProvider>,
  );
}

describe("VisualizationContainer", () => {
  beforeEach(() => {
    notifyWarningMock.mockClear();
  });

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
      series: [{ renderAs: "bar", key: "value" }],
      layout: "group",
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
      series: [],
      layout: "group",
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
      series: [{ renderAs: "line", key: "value", curveType: "monotone" }],
      withLegend: false,
    });
    const line = screen.getByTestId("line-chart");
    expect(line).toHaveAttribute("data-x", "category");
    expect(line).toHaveAttribute("data-y", "value");
  });

  it("renders the area chart with the chosen axes", () => {
    renderViz({
      vizType: "area",
      xAxisKey: "category",
      series: [{ renderAs: "area", key: "value", curveType: "linear" }],
      layout: "default",
      withLegend: false,
    });
    const area = screen.getByTestId("area-chart");
    expect(area).toHaveAttribute("data-x", "category");
    expect(area).toHaveAttribute("data-y", "value");
  });

  it("renders the scatter chart with the chosen axes", () => {
    renderViz({
      vizType: "scatter",
      series: [{ xKey: "value", key: "score" }],
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
      series: [{ key: "value" }],
      withLegend: true,
    });
    const radar = screen.getByTestId("radar-chart");
    expect(radar).toHaveAttribute("data-name", "category");
    expect(radar).toHaveAttribute("data-value", "value");
  });

  it("renders the bubble chart with the chosen axes and size", () => {
    renderViz({
      vizType: "bubble",
      series: [{ xKey: "value", key: "score", sizeKey: "value" }],
    });
    const bubble = screen.getByTestId("bubble-chart");
    expect(bubble).toHaveAttribute("data-x", "value");
    expect(bubble).toHaveAttribute("data-y", "score");
    expect(bubble).toHaveAttribute("data-size", "value");
  });

  it("passes truncated data to bar charts over the render limit", () => {
    const barMax = VIZ_RENDER_LIMITS.bar!.max;
    const overLimitData: UnknownDataFrame = Array.from(
      { length: barMax + 50 },
      (_, index) => {
        return { category: `row-${index}`, value: index, score: index };
      },
    );

    renderViz(
      {
        vizType: "bar",
        xAxisKey: "category",
        series: [{ renderAs: "bar", key: "value" }],
        layout: "group",
        withLegend: true,
      },
      overLimitData,
    );

    const bar = screen.getByTestId("bar-chart");
    expect(bar).toHaveAttribute("data-row-count", String(barMax));
    expect(notifyWarningMock).toHaveBeenCalledTimes(1);
  });

  it("does not truncate table data", () => {
    const rowCount = 500;
    const tableData: UnknownDataFrame = Array.from(
      { length: rowCount },
      (_, index) => {
        return { category: `row-${index}`, value: index, score: index };
      },
    );

    renderViz({ vizType: "table" }, tableData);

    expect(screen.getByTestId("data-grid")).toHaveAttribute(
      "data-row-count",
      String(rowCount),
    );
    expect(notifyWarningMock).not.toHaveBeenCalled();
  });
});
