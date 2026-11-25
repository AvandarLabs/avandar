/**
 * Tests for the DataViz block's chart type field: built-in picks go through
 * Puck's field change, and plugin picks write the plugin type and its config
 * to the selected block in one replace.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryResultColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { VizTypePField } from "@/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const PLUGIN_ID = "avandar.epidemiology";

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

const bindings = vi.hoisted(() => {
  return { isQueryPending: false };
});
const schema = reconcileQueryResultColumnBindings({
  scopeKey: "viz-block",
  sqlKey: "SELECT * FROM cases",
  columns: [
    { name: "cases", dataType: "bigint" },
    { name: "onset", dataType: "date" },
  ],
  projections: [],
  previous: undefined,
});
vi.mock(
  "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizColumnBindings/useDataVizColumnBindings",
  () => {
    return {
      useDataVizColumnBindings: () => {
        return bindings.isQueryPending
          ? { status: "loading", schema: undefined, error: undefined }
          : { status: "ready", schema, error: undefined };
      },
    };
  },
);

function _ChartBarIcon(): null {
  return null;
}

const EPIDEMIOLOGY_PLUGIN = {
  entry: { id: PLUGIN_ID },
  manifestModule: {
    manifest: {
      id: PLUGIN_ID,
      name: "%plugin.name%",
      contributes: {
        commands: [],
        menus: {},
        vizTypes: [
          {
            id: "epicurve",
            title: "%viz.epicurve.title%",
            icon: "chart-bar",
            render: "transform",
            settings: [
              {
                key: "dateColumn",
                label: "%viz.epicurve.dateColumn%",
                control: { kind: "columnPicker", dataType: "temporal" },
                required: true,
              },
              {
                key: "interval",
                label: "%viz.epicurve.interval%",
                control: {
                  kind: "select",
                  options: [
                    { value: "day", label: "%viz.epicurve.day%" },
                    { value: "epiWeek", label: "%viz.epicurve.epiWeek%" },
                  ],
                },
                required: false,
                default: "epiWeek",
              },
            ],
          },
        ],
      },
    },
    strings: {
      en: {
        "plugin.name": "Epidemiology",
        "viz.epicurve.title": "Epicurve",
        "viz.epicurve.dateColumn": "Date column",
        "viz.epicurve.interval": "Interval",
        "viz.epicurve.day": "Day",
        "viz.epicurve.epiWeek": "Epi week",
      },
    },
    icons: { "chart-bar": _ChartBarIcon },
  },
} as unknown as ActivePlugin;

function _renderField(vizConfig: AvaVizConfig.T): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  editor.selectedItem.props = {
    id: "viz-block",
    columnBindingVersion: 1,
    nlQuery: {
      prompt: "Cases by onset week",
      rawSql: "SELECT * FROM cases",
      generations: [],
    },
    vizType: vizConfig.vizType,
    vizConfig: vizConfig,
    columnBindings: schema.registry,
    localFilters: [],
    globalFilterTargets: {},
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardFilterStateManager.Provider>
        <ActivePluginsContext.Provider value={[EPIDEMIOLOGY_PLUGIN]}>
          <VizTypePField
            auth={{ auth: "workspace", workspaceId: TEST_WORKSPACE_ID }}
            onChange={onChange}
          />
        </ActivePluginsContext.Provider>
      </DashboardFilterStateManager.Provider>
    </QueryClientProvider>,
  );
  return { onChange };
}

describe("VizTypePField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bindings.isQueryPending = false;
  });

  it("writes the picked plugin chart type and its config to the block", () => {
    _renderField({ vizType: "table" });

    pickMantineSelectOption(/Visualization Type/i, "Epicurve");

    expect(editor.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "replace",
        data: expect.objectContaining({
          props: expect.objectContaining({
            vizType: "plugin",
            vizConfig: {
              vizType: "plugin",
              pluginId: PLUGIN_ID,
              pluginVizId: "epicurve",
              columnSettings: { dateColumn: schema.columns[1]!.id },
              settings: { interval: "epiWeek" },
            },
          }),
        }),
      }),
    );
  });

  it("hands a picked built-in type to Puck's field change", () => {
    const { onChange } = _renderField({ vizType: "table" });

    pickMantineSelectOption(/Visualization Type/i, "Bar Chart");

    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("shows the block's plugin chart type as its chart type", () => {
    _renderField({
      vizType: "plugin",
      pluginId: PLUGIN_ID,
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: schema.columns[1]!.id },
      settings: { interval: "epiWeek" },
    });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Epicurve");
  });

  it("writes a picked plugin chart to a block whose query has not run yet", () => {
    bindings.isQueryPending = true;
    _renderField({ vizType: "table" });

    pickMantineSelectOption(/Visualization Type/i, "Epicurve");

    expect(editor.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          props: expect.objectContaining({
            vizType: "plugin",
            vizConfig: expect.objectContaining({
              pluginVizId: "epicurve",
              columnSettings: {},
            }),
          }),
        }),
      }),
    );
  });
});
