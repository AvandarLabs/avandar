import { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { reconcileResultColumnBindings } from "$/models/queries/QueryColumnBindings/reconcileResultColumnBindings/reconcileResultColumnBindings";
import { screen } from "@/test-utils";
import { upgradeAvaPageData } from "../../../utils/upgradeAvaPageData";
import { useDataVizPBlockConfig } from "../useDataVizPBlockConfig";
import { createDataVizTestWrapper } from "./createDataVizTestWrapper";
import { DataVizPBlockTestFixtures } from "./DataVizPBlockTestFixtures";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Props } from "./DataVizPBlock";

const { useDataQueryMock } = vi.hoisted<{
  useDataQueryMock: ReturnType<typeof vi.fn>;
}>(() => {
  return {
    useDataQueryMock: vi.fn(() => {
      return [
        {
          id: "query-result-1",
          numRows: 3,
          columns: [
            { name: "category", dataType: "varchar" },
            { name: "value", dataType: "double" },
            { name: "score", dataType: "double" },
          ],
          data: [
            { category: "Alpha", value: 10, score: 1 },
            { category: "Beta", value: 20, score: 2 },
            { category: "Gamma", value: 30, score: 3 },
          ],
        },
        false,
        // Third element mirrors the real hook's react-query result, which the
        // block reads to tell a failed query from an empty one.
        { isError: false, error: null },
      ];
    }),
  };
});

vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", () => {
  return { useDataQuery: useDataQueryMock };
});

vi.mock(
  "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizColumnBindings/useDataVizColumnBindings",
  () => {
    return {
      useDataVizColumnBindings: () => {
        return {
          status: "ready",
          schema: reconcileResultColumnBindings({
            scopeKey: "chart",
            sqlKey: "SELECT * FROM foo",
            columns: [
              { name: "category", dataType: "varchar" },
              { name: "value", dataType: "double" },
              { name: "score", dataType: "double" },
            ],
            projections: [],
            previous: undefined,
          }),
          error: undefined,
        };
      },
    };
  },
);

vi.mock("@/components/VisualizationContainer/VisualizationContainer", () => {
  return {
    VisualizationContainer: (props: {
      columns: ReadonlyArray<{ name: string }>;
      vizConfig: { vizType: string };
    }) => {
      return (
        <div
          data-testid="visualization-container"
          data-viz-type={props.vizConfig.vizType}
          data-columns={props.columns
            .map((c) => {
              return c.name;
            })
            .join(",")}
        />
      );
    },
  };
});

const { TEST_DASHBOARD_ID, TEST_WORKSPACE_ID, renderBlock } =
  DataVizPBlockTestFixtures;

describe("DataVizPBlock", () => {
  it("runs its query under the dashboard_block analytics surface", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT 1",
      vizType: "table",
      vizConfig: { vizType: "table" },
    });
    expect(useDataQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ analyticsSurface: "dashboard_block" }),
    );
  });

  it("shows the empty-prompt hint when no prompt is set", () => {
    renderBlock({
      prompt: "",
      rawSql: "",
      vizType: "table",
      vizConfig: { vizType: "table" },
    });
    expect(
      screen.getByText(/add a prompt and generate SQL/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("visualization-container")).toBeNull();
  });

  it("shows the run-query hint when prompt exists but SQL is empty", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "",
      vizType: "table",
      vizConfig: { vizType: "table" },
    });
    expect(screen.getByText(/run a query/i)).toBeInTheDocument();
    expect(screen.queryByTestId("visualization-container")).toBeNull();
  });

  it("renders the visualization container with the active viz config for table", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "table",
      vizConfig: { vizType: "table" },
    });
    const viz = screen.getByTestId("visualization-container");
    expect(viz).toHaveAttribute("data-viz-type", "table");
    expect(viz).toHaveAttribute("data-columns", "category,value,score");
  });

  it("renders for bar viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "bar",
      vizConfig: {
        vizType: "bar",
        xAxisKey: "category",
        series: [{ renderAs: "bar", key: "value" }],
        layout: "group",
        withLegend: true,
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "bar",
    );
  });

  it("renders for line viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "line",
      vizConfig: {
        vizType: "line",
        xAxisKey: "category",
        series: [{ renderAs: "line", key: "value", curveType: "monotone" }],
        withLegend: false,
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "line",
    );
  });

  it("renders for area viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "area",
      vizConfig: {
        vizType: "area",
        xAxisKey: "category",
        series: [{ renderAs: "area", key: "value", curveType: "linear" }],
        layout: "default",
        withLegend: true,
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "area",
    );
  });

  it("renders for scatter viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "scatter",
      vizConfig: {
        vizType: "scatter",
        series: [{ xKey: "value", key: "score" }],
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "scatter",
    );
  });

  it("renders for pie viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "pie",
      vizConfig: {
        vizType: "pie",
        nameKey: "category",
        valueKey: "value",
        isDonut: false,
        withLabels: true,
        labelsType: "value",
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "pie",
    );
  });

  it("renders for funnel viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "funnel",
      vizConfig: {
        vizType: "funnel",
        nameKey: "category",
        valueKey: "value",
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "funnel",
    );
  });

  it("renders for radar viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "radar",
      vizConfig: {
        vizType: "radar",
        nameKey: "category",
        series: [{ key: "value" }],
        withLegend: true,
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "radar",
    );
  });

  it("renders for bubble viz type", () => {
    renderBlock({
      prompt: "find me data",
      rawSql: "SELECT * FROM foo",
      vizType: "bubble",
      vizConfig: {
        vizType: "bubble",
        series: [{ xKey: "value", key: "score", sizeKey: "value" }],
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "bubble",
    );
  });
});

it("converts the migrated top-level type picker and restores unresolved legacy styles on return", async () => {
  const original = {
    id: "chart",
    vizType: "line",
    nlQuery: { prompt: "Sales", rawSql: "SELECT * FROM foo", generations: [] },
    vizConfig: {
      vizType: "line",
      xAxisKey: "category",
      withLegend: true,
      series: [
        {
          renderAs: "line",
          key: "value",
          label: "Revenue",
          color: "#123456",
          strokeWidth: 4,
        },
        {
          renderAs: "line",
          key: "missing",
          label: "Missing",
          color: "#654321",
          strokeWidth: 3,
        },
      ],
    },
    localFilters: [],
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
  };
  const upgraded = upgradeAvaPageData({
    root: { props: { schemaVersion: 4, title: "Legacy chart" } },
    content: [{ type: "DataViz", props: original }],
  });
  const props = upgraded.content[0]!.props as Props & { id: string };
  const client = new QueryClient();
  const { result } = renderHook(
    () => {
      return useDataVizPBlockConfig({
        dashboardTitle: "Saved",
        workspaceId: TEST_WORKSPACE_ID as Workspace.Id,
        dashboardId: TEST_DASHBOARD_ID as Dashboard.Id,
      });
    },
    {
      wrapper: createDataVizTestWrapper(client),
    },
  );
  const resolveData = result.current.resolveData!;
  const load = await resolveData(
    { type: "DataViz", props } as Parameters<typeof resolveData>[0],
    { changed: { vizType: true }, trigger: "load" } as Parameters<
      typeof resolveData
    >[1],
  );
  expect(load.props).toEqual(props);
  const switched = await resolveData(
    { type: "DataViz", props: { ...props, vizType: "bar" } } as Parameters<
      typeof resolveData
    >[0],
    { changed: { vizType: true }, trigger: "replace" } as Parameters<
      typeof resolveData
    >[1],
  );
  expect(switched.props).toMatchObject({
    columnBindingVersion: 0,
    vizType: "bar",
    vizConfig: {
      vizType: "bar",
      series: [
        { key: "value", label: "Revenue", color: "#123456" },
        { key: "missing", label: "Missing", color: "#654321" },
      ],
    },
  });
  const barProps = switched.props as Props & { id: string };
  renderBlock({
    prompt: barProps.nlQuery.prompt,
    rawSql: barProps.nlQuery.rawSql,
    vizType: barProps.vizType,
    vizConfig: barProps.vizConfig,
  });
  expect(screen.getByTestId("visualization-container")).toHaveAttribute(
    "data-viz-type",
    "bar",
  );
  const restored = await resolveData(
    { type: "DataViz", props: { ...barProps, vizType: "line" } } as Parameters<
      typeof resolveData
    >[0],
    { changed: { vizType: true }, trigger: "replace" } as Parameters<
      typeof resolveData
    >[1],
  );
  expect(restored.props).toMatchObject({
    columnBindingVersion: 0,
    vizConfig: original.vizConfig,
  });
});
