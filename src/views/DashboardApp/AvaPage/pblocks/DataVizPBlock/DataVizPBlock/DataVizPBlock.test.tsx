import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/common/AvandarUiProvider";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { PuckContext } from "@puckeditor/core";
import type { ReactElement } from "react";

vi.mock("@/views/DataExplorerApp/useDataQuery", () => {
  return {
    useDataQuery: () => {
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
      ];
    },
  };
});

vi.mock("@/components/Visualization/VisualizationContainer", () => {
  return {
    VisualizationContainer: (props: {
      columns: ReadonlyArray<{ name: string }>;
      vizConfig: { vizType: string };
    }) => {
      return (
        <div
          data-testid="visualization-container"
          data-viz-type={props.vizConfig.vizType}
          data-columns={props.columns.map((c) => {return c.name}).join(",")}
        />
      );
    },
  };
});

const TEST_DASHBOARD_ID = "00000000-0000-4000-8000-000000000001";
const TEST_WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

function fakePuckContext(): PuckContext {
  return {
    renderDropZone: () => {return null},
    metadata: {
      auth: "workspace",
      workspaceId: TEST_WORKSPACE_ID,
      dashboardId: TEST_DASHBOARD_ID,
    },
    isEditing: true,
    dragRef: null,
  };
}

function renderBlock(props: {
  prompt: string;
  rawSql: string;
  vizType: string;
  vizConfig: Parameters<typeof DataVizPBlock>[0]["vizConfig"];
}): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AvandarUiProvider>
        <DataVizPBlock
          puck={fakePuckContext()}
          nlQuery={{
            prompt: props.prompt,
            rawSql: props.rawSql,
            generations: [],
          }}
          vizType={
            props.vizType as Parameters<typeof DataVizPBlock>[0]["vizType"]
          }
          vizConfig={props.vizConfig}
        />
      </AvandarUiProvider>
    </QueryClientProvider>,
  ) as unknown as ReactElement;
}

describe("DataVizPBlock", () => {
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
        yAxisKey: "value",
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
        yAxisKey: "value",
        withLegend: false,
        curveType: "monotone",
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
        yAxisKey: "value",
        withLegend: true,
        curveType: "linear",
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
        xAxisKey: "value",
        yAxisKey: "score",
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
        valueKey: "value",
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
        xAxisKey: "value",
        yAxisKey: "score",
        sizeKey: "value",
      },
    });
    expect(screen.getByTestId("visualization-container")).toHaveAttribute(
      "data-viz-type",
      "bubble",
    );
  });
});
