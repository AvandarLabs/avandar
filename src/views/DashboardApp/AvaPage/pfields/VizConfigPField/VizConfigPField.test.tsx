import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { Workspace } from "$/models/Workspace/Workspace";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { VizConfigPField } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;
const TEST_DASHBOARD_ID =
  "00000000-0000-4000-8000-000000000002" as Dashboard.Id;

vi.mock("@puckeditor/core", () => {
  return {
    createUsePuck: () => {
      return (selector: (state: unknown) => unknown) => {
        return selector({
          selectedItem: {
            props: {
              id: "viz-block",
              nlQuery: {
                prompt: "find data",
                rawSql: "SELECT * FROM foo",
                generations: [],
              },
            },
          },
        });
      };
    },
  };
});

const { useDataQueryMock } = vi.hoisted(() => {
  return {
    useDataQueryMock: vi.fn(() => {
      return [
        {
          id: "result-1",
          numRows: 3,
          columns: [
            { name: "category", dataType: "varchar" },
            { name: "value", dataType: "double" },
          ],
          data: [
            { category: "Alpha", value: 10 },
            { category: "Beta", value: 20 },
          ],
        },
        false,
      ];
    }),
  };
});

vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", () => {
  return { useDataQuery: useDataQueryMock };
});

function renderField(props: { value: VizConfig.T }): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AvandarAppProvider>
        <VizConfigPField
          value={props.value}
          onChange={onChange}
          workspaceId={TEST_WORKSPACE_ID}
          dashboardId={TEST_DASHBOARD_ID}
          snapshotRevision="2026-08-14T01:00:00.000Z"
        />
      </AvandarAppProvider>
    </QueryClientProvider>,
  );
  return { onChange };
}

describe("VizConfigPField", () => {
  it("runs its preview query under the viz_config analytics surface", () => {
    renderField({ value: { vizType: "table" } });
    expect(useDataQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ analyticsSurface: "viz_config" }),
    );
  });

  it("shows a hint and no axis controls for the table viz type", () => {
    renderField({ value: { vizType: "table" } });
    expect(screen.getByText(/no extra settings/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /X Axis/i })).toBeNull();
  });

  it("renders the bar form when vizType is bar", () => {
    renderField({
      value: {
        vizType: "bar",
        xAxisKey: undefined,
        series: [],
        layout: "group",
        withLegend: true,
      },
    });
    expect(
      screen.getByRole("combobox", { name: /X axis/i }),
    ).toBeInTheDocument();
  });

  it("calls onChange when an axis option is picked", () => {
    const { onChange } = renderField({
      value: {
        vizType: "bar",
        xAxisKey: undefined,
        series: [],
        layout: "group",
        withLegend: true,
      },
    });
    pickMantineSelectOption(/X axis/i, "category");
    expect(onChange).toHaveBeenCalledWith({
      vizType: "bar",
      xAxisKey: "category",
      series: [],
      layout: "group",
      withLegend: true,
    });
  });
});
