import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { VizConfigPField } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;
const TEST_DASHBOARD_ID = "00000000-0000-4000-8000-000000000002" as DashboardId;

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

vi.mock("@/views/DataExplorerApp/useDataQuery", () => {
  return {
    useDataQuery: () => {
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
    },
  };
});

function renderField(props: { value: VizConfig }): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AvandarUiProvider>
        <VizConfigPField
          value={props.value}
          onChange={onChange}
          workspaceId={TEST_WORKSPACE_ID}
          dashboardId={TEST_DASHBOARD_ID}
        />
      </AvandarUiProvider>
    </QueryClientProvider>,
  );
  return { onChange };
}

describe("VizConfigPField", () => {
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
