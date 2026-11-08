import { describe, expect, it, vi } from "vitest";
import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import { UiVizConfigRenderer } from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer";
import { render, screen } from "@/test-utils";
import type { UnknownDataFrame } from "@avandar/utils";

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return { ...actual, notifyWarning: vi.fn() };
});

vi.mock("@/lib/ui/viz/DataGrid", () => {
  return {
    DataGrid: (props: { columnNames: readonly string[] }) => {
      return <div data-testid="data-grid">{props.columnNames.join(",")}</div>;
    },
  };
});

vi.mock("@/lib/ui/viz/BarChart/BarChart", () => {
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

const DATA: UnknownDataFrame = [
  { week: "2024-01-07", cases: 3 },
  { week: "2024-01-14", cases: 5 },
];

const NO_DATE_COLUMNS: ReadonlySet<string> = new Set();

describe("UiVizConfigRenderer", () => {
  it("draws the bar chart from the config's column names", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: "week",
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "group",
          withLegend: false,
        }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    const bar = screen.getByTestId("bar-chart");
    expect(bar).toHaveAttribute("data-x", "week");
    expect(bar).toHaveAttribute("data-y", "cases");
  });

  it("lists the given column names in the table view", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{ vizType: "table" }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["cases", "week"]}
      />,
    );
    expect(screen.getByTestId("data-grid")).toHaveTextContent("cases,week");
  });

  it("shows the missing X axis message instead of a bar chart with no X axis", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: undefined,
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "group",
          withLegend: false,
        }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(
      screen.getByText("You haven't chosen an X axis"),
    ).toBeInTheDocument();
  });

  it("passes at most the bar render limit of rows to the bar chart", () => {
    const barMax = VIZ_RENDER_LIMITS.bar.max;
    const overLimitData: UnknownDataFrame = Array.from(
      { length: barMax + 10 },
      (_, index) => {
        return { week: `week-${index}`, cases: index };
      },
    );
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: "week",
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "group",
          withLegend: false,
        }}
        data={overLimitData}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    expect(screen.getByTestId("bar-chart")).toHaveAttribute(
      "data-row-count",
      String(barMax),
    );
  });
});
