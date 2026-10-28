import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { VizConfigPField } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { LocalFiltersPField } from "../LocalFiltersPField/LocalFiltersPField";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { LegacyLocalFilter } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

type RenderFieldOptions = {
  value: VizConfig.T | VizConfig.NameBound;
  legacy?: boolean;
  localFilters?: readonly LegacyLocalFilter[];
  local?: boolean;
};

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;
const TEST_DASHBOARD_ID =
  "00000000-0000-4000-8000-000000000002" as Dashboard.Id;

const editor = vi.hoisted<{
  dispatch: ReturnType<typeof vi.fn>;
  selectedItem: { type: string; props: Record<string, unknown> };
  getSelectorForId: () => { index: number; zone: undefined };
}>(() => {
  return {
    dispatch: vi.fn(),
    selectedItem: { type: "DataViz", props: {} as Record<string, unknown> },
    getSelectorForId: () => {
      return { index: 0, zone: undefined };
    },
  };
});
vi.mock("@puckeditor/core", () => {
  return {
    createUsePuck: () => {
      return (selector: (state: unknown) => unknown) => {
        return selector(editor);
      };
    },
  };
});
const schema = reconcileQueryResultColumnBindings({
  scopeKey: "viz-block",
  sqlKey: "SELECT * FROM foo",
  columns: [
    { name: "category", dataType: "varchar" },
    { name: "value", dataType: "double" },
  ],
  projections: [],
  previous: undefined,
});
vi.mock(
  "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizColumnBindings/useDataVizColumnBindings",
  () => {
    return {
      useDataVizColumnBindings: () => {
        return { status: "ready", schema, error: undefined };
      },
    };
  },
);

const { useDataQueryMock } = vi.hoisted<{
  useDataQueryMock: ReturnType<typeof vi.fn>;
}>(() => {
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

function _renderField(props: RenderFieldOptions): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  editor.selectedItem.props = {
    id: "viz-block",
    columnBindingVersion: props.legacy ? 0 : 1,
    nlQuery: {
      prompt: "find data",
      rawSql: "SELECT * FROM foo",
      generations: [],
    },
    vizType: props.value.vizType,
    vizConfig: props.value,
    columnBindings: schema.registry,
    localFilters: props.localFilters ?? [],
    globalFilterTargets: {},
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AvandarAppProvider>
        <DashboardFilterStateManager.Provider>
          {props.local ? (
            <LocalFiltersPField
              auth={{ auth: "workspace", workspaceId: TEST_WORKSPACE_ID }}
            />
          ) : (
            <VizConfigPField
              value={props.value}
              onChange={onChange}
              workspaceId={TEST_WORKSPACE_ID}
              dashboardId={TEST_DASHBOARD_ID}
              snapshotRevision="2026-08-14T01:00:00.000Z"
            />
          )}
        </DashboardFilterStateManager.Provider>
      </AvandarAppProvider>
    </QueryClientProvider>,
  );
  return { onChange };
}

describe("VizConfigPField", () => {
  beforeEach(() => {
    return vi.clearAllMocks();
  });
  it("runs its preview query under the viz_config analytics surface", () => {
    _renderField({ value: { vizType: "table" } });
    expect(useDataQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ analyticsSurface: "viz_config" }),
    );
  });

  it("shows a hint and no axis controls for the table viz type", () => {
    _renderField({ value: { vizType: "table" } });
    expect(screen.getByText(/no extra settings/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /X Axis/i })).toBeNull();
  });

  it("renders the bar form when vizType is bar", () => {
    _renderField({
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

  it("atomically stores the selected ID and owning registry when an axis option is picked", () => {
    const { onChange } = _renderField({
      value: {
        vizType: "bar",
        xAxisKey: undefined,
        series: [],
        layout: "group",
        withLegend: true,
      },
    });
    pickMantineSelectOption(/X axis/i, "value");
    expect(onChange).not.toHaveBeenCalled();
    expect(editor.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "replace",
        data: expect.objectContaining({
          props: expect.objectContaining({
            columnBindingVersion: 1,
            columnBindings: schema.registry,
            vizConfig: expect.objectContaining({
              vizType: "bar",
              xAxisKey: schema.columns[1]!.id,
            }),
          }),
        }),
      }),
    );
  });
});

it("preserves unresolved legacy siblings when an existing field explicitly changes", () => {
  vi.clearAllMocks();
  const original: VizConfig.NameBound = {
    vizType: "bar",
    xAxisKey: "missing-category",
    layout: "group",
    withLegend: true,
    series: [
      { key: "missing-series", renderAs: "bar", color: "#654321" },
      { key: "value", renderAs: "bar", label: "Existing", color: "#123456" },
    ],
  };
  _renderField({ value: original, legacy: true });
  expect(editor.dispatch).not.toHaveBeenCalled();
  pickMantineSelectOption(/X axis/i, "category");
  expect(editor.dispatch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        props: expect.objectContaining({
          columnBindingVersion: 0,
          vizConfig: { ...original, xAxisKey: "category" },
        }),
      }),
    }),
  );
  editor.dispatch.mockClear();
  fireEvent.change(screen.getByRole("textbox", { name: "Series label" }), {
    target: { value: "Edited label" },
  });
  expect(editor.dispatch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        props: expect.objectContaining({
          columnBindingVersion: 0,
          vizConfig: {
            ...original,
            series: [
              original.series[0],
              { ...original.series[1], label: "Edited label" },
            ],
          },
        }),
      }),
    }),
  );
  expect(original.series[1]!.label).toBe("Existing");
});

it("edits legacy local controls without discarding an unresolved sibling", () => {
  vi.clearAllMocks();
  const localFilters: LegacyLocalFilter[] = [
    {
      id: "one",
      columnName: "missing-one",
      label: "First",
      mode: "select_single",
      optionsRaw: "A,B",
      defaultValue: "A",
    },
    {
      id: "two",
      columnName: "missing-two",
      label: "Second",
      mode: "contains",
      optionsRaw: "",
      defaultValue: "B",
    },
  ];
  _renderField({
    value: { vizType: "table" },
    legacy: true,
    local: true,
    localFilters,
  });
  expect(editor.dispatch).not.toHaveBeenCalled();
  fireEvent.change(screen.getAllByPlaceholderText("Label, e.g. Region")[0]!, {
    target: { value: "Updated" },
  });
  expect(editor.dispatch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        props: expect.objectContaining({
          columnBindingVersion: 0,
          localFilters: [
            { ...localFilters[0], label: "Updated" },
            localFilters[1],
          ],
        }),
      }),
    }),
  );
  fireEvent.click(screen.getAllByRole("combobox", { name: "Column" })[0]!);
  fireEvent.click(
    screen.getAllByRole("option", { name: "category", hidden: true })[0]!,
  );
  expect(editor.dispatch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        props: expect.objectContaining({
          columnBindingVersion: 0,
          localFilters: [
            { ...localFilters[0], columnName: "category" },
            localFilters[1],
          ],
        }),
      }),
    }),
  );
});
