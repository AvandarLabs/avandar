import { definePlugin, useT } from "@avandar/plugin-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { loadPluginVizRuntime } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import { PluginVizRenderer } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer";
import { PLUGIN_VIZ_COMPONENT_ROW_LIMIT } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { Logger } from "@/utils/Logger";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  PluginCodeModule,
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type {
  PluginVizComponentProps,
  PluginVizInput,
  PluginVizTransform,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});
// Public dashboard links mount no workspace, so nothing a plugin chart
// renders may ask for one.
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      throw new Error("A plugin chart must draw without a workspace.");
    },
  };
});
vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...actual,
    // The test environment's ResizeObserver never fires, so a real
    // measurement would stay 0 by 0.
    useElementSize: () => {
      return { ref: () => {}, width: 640, height: 360 };
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
          data-x-values={props.data
            .map((row) => {
              return String(row[props.xAxisKey ?? ""]);
            })
            .join(",")}
        />
      );
    },
  };
});
const REGION_ID = "region-id" as QueryColumn.Id;
const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: REGION_ID, name: "region", dataType: "varchar" },
  { id: "cases-id" as QueryColumn.Id, name: "cases", dataType: "bigint" },
];
const DATA: UnknownDataFrame = [
  { region: "North", cases: 3 },
  { region: "South", cases: 5 },
];
const MESSAGES = { en: { heading: "Cases by region" } };

let queryClient: QueryClient;
let nextPluginNumber = 0;

function _makeCaseBarsFromRows(
  input: PluginVizInput,
): PluginVizTransformResult {
  const labelColumn = String(input.settings.labelColumn);
  return {
    rows: input.rows.map((row) => {
      return { label: row[labelColumn], cases: row.cases };
    }),
    chart: { kind: "bar", xColumn: "label", series: [{ column: "cases" }] },
  };
}

function CaseDots({
  rows,
  width,
  isTruncated,
}: PluginVizComponentProps): ReactNode {
  const t = useT();
  return (
    <div
      data-testid="case-dots"
      data-width={width}
      data-row-count={rows.length}
      data-truncated={String(isTruncated)}
    >
      {t("heading")}
    </div>
  );
}

function CrashingChart(): ReactNode {
  throw new Error("chart crashed");
}

function TwoRowCrashingChart({ rows }: PluginVizComponentProps): ReactNode {
  if (rows.length === 2) {
    throw new Error("chart crashed");
  }
  return <div data-testid="case-dots" />;
}

function CaseRings(): ReactNode {
  return <div data-testid="case-rings" />;
}

function UnlabelledCrashingRings({
  settings,
}: PluginVizComponentProps): ReactNode {
  if (settings.labelColumn === undefined) {
    throw new Error("chart crashed");
  }
  return <div data-testid="case-rings" />;
}

const CASE_CHARTS = definePlugin({
  vizTypes: {
    "case-bars": { transform: _makeCaseBarsFromRows },
    "case-dots": { Component: CaseDots },
  },
});

/** A component chart type whose one column setting is optional. */
const CASE_RINGS_VIZ_TYPE = {
  id: "case-rings",
  title: "%viz.caseRings.title%",
  icon: "chart-donut",
  render: "component",
  settings: [
    {
      key: "labelColumn",
      label: "%viz.labelColumn%",
      control: { kind: "columnPicker", dataType: "text" },
    },
  ],
};

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      name: "%name%",
      contributes: {
        vizTypes: [
          {
            id: "case-bars",
            title: "%viz.caseBars.title%",
            icon: "chart-bar",
            render: "transform",
            settings: [
              {
                key: "labelColumn",
                label: "%viz.labelColumn%",
                control: { kind: "columnPicker", dataType: "text" },
                required: true,
              },
            ],
          },
          {
            id: "case-dots",
            title: "%viz.caseDots.title%",
            icon: "chart-dots",
            render: "component",
            settings: [],
          },
          CASE_RINGS_VIZ_TYPE,
        ],
      },
    },
    strings: {
      en: {
        name: "Case charts",
        "viz.caseBars.title": "Case bars",
        "viz.caseDots.title": "Case dots",
        "viz.caseRings.title": "Case rings",
        "viz.labelColumn": "Label column",
      },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  options: {
    definition?: unknown;
    loadCode?: () => Promise<PluginCodeModule>;
  } = {},
): string {
  nextPluginNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `avandar.case-charts-${nextPluginNumber}`;
  const codeModule: PluginCodeModule = {
    definition: options.definition ?? CASE_CHARTS,
    messages: MESSAGES,
  };
  mocks.entries.push({
    id,
    loadManifest: () => {
      return Promise.resolve(_makeManifestModule(id));
    },
    loadCode:
      options.loadCode ??
      (() => {
        return Promise.resolve(codeModule);
      }),
  });
  return id;
}

function _addPluginWithBars(transform: PluginVizTransform): string {
  return _addBundledPlugin({
    definition: definePlugin({ vizTypes: { "case-bars": { transform } } }),
  });
}

function _makeConfig(options: {
  pluginId: string;
  pluginVizId?: string;
  columnSettings?: AvaVizConfig.Plugin["columnSettings"];
}): AvaVizConfig.Plugin {
  return {
    vizType: "plugin",
    pluginId: options.pluginId,
    pluginVizId: options.pluginVizId ?? "case-bars",
    columnSettings: options.columnSettings ?? { labelColumn: REGION_ID },
    settings: {},
  };
}

function _makeDotsConfig(pluginId: string): AvaVizConfig.Plugin {
  return _makeConfig({
    pluginId,
    pluginVizId: "case-dots",
    columnSettings: {},
  });
}

function _makeRingsConfig(
  pluginId: string,
  columnSettings: AvaVizConfig.Plugin["columnSettings"] = {},
): AvaVizConfig.Plugin {
  return _makeConfig({ pluginId, pluginVizId: "case-rings", columnSettings });
}

function _makeRows(rowCount: number): UnknownDataFrame {
  return Array.from({ length: rowCount }, (_row, index) => {
    return { region: `Region ${index}`, cases: index };
  });
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

type ChartOptions = {
  vizConfig: AvaVizConfig.Plugin;
  columns?: readonly QueryResult.ColumnWithId[];
  data?: UnknownDataFrame;
  isTruncated?: boolean;
};

function _makeChartElement(options: ChartOptions): JSX.Element {
  return (
    <PluginVizRenderer
      columns={options.columns ?? COLUMNS}
      data={options.data ?? DATA}
      vizConfig={options.vizConfig}
      isTruncated={options.isTruncated}
    />
  );
}

function _renderChart(options: ChartOptions): ReturnType<typeof render> {
  return render(_makeChartElement(options), { wrapper: QueryWrapper });
}

/**
 * Renders a chart over a result with no columns yet, and waits until the
 * plugin's manifest has loaded, so the chart is past its own loading state.
 */
async function _renderChartWithoutColumns(pluginId: string): Promise<void> {
  _renderChart({
    vizConfig: _makeConfig({ pluginId }),
    columns: [],
    data: [],
  });
  await waitFor(() => {
    expect(queryClient.isFetching()).toBe(0);
  });
}

describe("PluginVizRenderer", () => {
  beforeAll(async () => {
    // The first load of the runtime chunk compiles the plugin SDK, which can
    // outlast a findBy timeout. Later loads reuse it.
    await loadPluginVizRuntime();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
    vi.spyOn(Logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws a transform chart's output with the built-in bar chart", async () => {
    _renderChart({ vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }) });

    expect(await screen.findByTestId("bar-chart")).toHaveAttribute(
      "data-x",
      "label",
    );
  });

  it("passes column settings to the transform as column names", async () => {
    const transform = vi.fn(_makeCaseBarsFromRows);
    const pluginId = _addPluginWithBars(transform);

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });
    await screen.findByTestId("bar-chart");

    expect(transform).toHaveBeenCalledWith(
      expect.objectContaining({ settings: { labelColumn: "region" } }),
      expect.anything(),
    );
  });

  it("draws a component chart at the measured size", async () => {
    _renderChart({ vizConfig: _makeDotsConfig(_addBundledPlugin()) });

    expect(await screen.findByTestId("case-dots")).toHaveAttribute(
      "data-width",
      "640",
    );
  });

  it("gives a component chart the plugin's strings through useT", async () => {
    _renderChart({ vizConfig: _makeDotsConfig(_addBundledPlugin()) });

    expect(await screen.findByText("Cases by region")).toBeInTheDocument();
  });

  it("passes a component chart at most the component row limit", async () => {
    _renderChart({
      vizConfig: _makeDotsConfig(_addBundledPlugin()),
      data: _makeRows(PLUGIN_VIZ_COMPONENT_ROW_LIMIT + 200),
    });

    expect(await screen.findByTestId("case-dots")).toHaveAttribute(
      "data-row-count",
      String(PLUGIN_VIZ_COMPONENT_ROW_LIMIT),
    );
  });

  it("tells a component chart that its rows were cut to the row limit", async () => {
    _renderChart({
      vizConfig: _makeDotsConfig(_addBundledPlugin()),
      data: _makeRows(PLUGIN_VIZ_COMPONENT_ROW_LIMIT + 200),
    });

    expect(await screen.findByTestId("case-dots")).toHaveAttribute(
      "data-truncated",
      "true",
    );
  });

  it("draws a stored plugin chart with no plugin host or workspace mounted", async () => {
    // This file provides no ActivePluginsContext, so no plugin is installed,
    // and useCurrentWorkspace throws, as on a public dashboard link.
    _renderChart({ vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }) });

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows the missing-plugin placeholder for a plugin this deployment does not bundle", async () => {
    _renderChart({ vizConfig: _makeConfig({ pluginId: "avandar.removed" }) });

    expect(await screen.findByText("Plugin not available")).toBeInTheDocument();
  });

  it("shows the missing-plugin placeholder for a chart type the plugin does not declare", async () => {
    _renderChart({
      vizConfig: _makeConfig({
        pluginId: _addBundledPlugin(),
        pluginVizId: "case-pies",
      }),
    });

    expect(await screen.findByText("Plugin not available")).toBeInTheDocument();
  });

  it("shows the invalid-settings placeholder for a stored config that fails validation", () => {
    _renderChart({
      vizConfig: {
        ..._makeConfig({ pluginId: "avandar.case-charts" }),
        pluginId: "",
      },
    });

    expect(screen.getByText("Invalid chart settings")).toBeInTheDocument();
  });

  it("asks for a required setting that is unset", async () => {
    _renderChart({
      vizConfig: _makeConfig({
        pluginId: _addBundledPlugin(),
        columnSettings: {},
      }),
    });

    expect(
      await screen.findByText("You haven't chosen: Label column"),
    ).toBeInTheDocument();
  });

  it("asks for a required column setting whose column left the result", async () => {
    _renderChart({
      vizConfig: _makeConfig({
        pluginId: _addBundledPlugin(),
        columnSettings: { labelColumn: "district-id" as QueryColumn.Id },
      }),
    });

    expect(
      await screen.findByText("You haven't chosen: Label column"),
    ).toBeInTheDocument();
  });

  it("does not ask for a required column setting before the result has columns", async () => {
    await _renderChartWithoutColumns(_addBundledPlugin());

    expect(screen.queryByText("You haven't chosen: Label column")).toBeNull();
  });

  it("shows no loading status before the result has columns", async () => {
    await _renderChartWithoutColumns(_addBundledPlugin());

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not run the plugin's transform before the result has columns", async () => {
    const transform = vi.fn(_makeCaseBarsFromRows);

    await _renderChartWithoutColumns(_addPluginWithBars(transform));

    expect(transform).not.toHaveBeenCalled();
  });

  it("does not load the plugin code while a required setting is unset", async () => {
    const loadCode = vi.fn(() => {
      return Promise.resolve({ definition: CASE_CHARTS, messages: MESSAGES });
    });
    const pluginId = _addBundledPlugin({ loadCode });

    _renderChart({ vizConfig: _makeConfig({ pluginId, columnSettings: {} }) });
    await screen.findByText("You haven't chosen: Label column");

    expect(loadCode).not.toHaveBeenCalled();
  });

  it("shows a loader while the plugin code loads", async () => {
    const loadCode = vi.fn(() => {
      return new Promise<PluginCodeModule>(() => {});
    });
    const pluginId = _addBundledPlugin({ loadCode });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });
    await waitFor(() => {
      expect(loadCode).toHaveBeenCalled();
    });

    expect(
      screen.getByRole("status", { name: "Loading chart" }),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't load when the plugin code fails to load", async () => {
    const pluginId = _addBundledPlugin({
      loadCode: () => {
        return Promise.reject(new Error("chunk failed"));
      },
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("This chart couldn't load"),
    ).toBeInTheDocument();
  });

  it("draws the chart after a retry once the plugin code loads", async () => {
    let numLoads = 0;
    const pluginId = _addBundledPlugin({
      loadCode: () => {
        numLoads += 1;
        return numLoads === 1
          ? Promise.reject(new Error("chunk failed"))
          : Promise.resolve({ definition: CASE_CHARTS, messages: MESSAGES });
      },
    });
    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the transform throws", async () => {
    const pluginId = _addPluginWithBars(() => {
      throw new Error("boom");
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("logs a failed transform with the plugin and chart ids", async () => {
    const pluginId = _addPluginWithBars(() => {
      throw new Error("boom");
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });
    await screen.findByText("Case bars couldn't render");

    expect(Logger.error).toHaveBeenCalledWith(
      "Plugin chart failed to render",
      expect.objectContaining({ pluginId, pluginVizId: "case-bars" }),
    );
  });

  it("shows that the chart couldn't render when the transform returns a spec with no series", async () => {
    const pluginId = _addPluginWithBars((input) => {
      return {
        rows: input.rows,
        chart: { kind: "bar", xColumn: "region", series: [] },
      };
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the chart spec names a column the rows lack", async () => {
    const pluginId = _addPluginWithBars((input) => {
      return {
        rows: input.rows,
        chart: {
          kind: "bar",
          xColumn: "district",
          series: [{ column: "cases" }],
        },
      };
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when a transformed row is null", async () => {
    const pluginId = _addPluginWithBars(() => {
      return {
        rows: [{ label: "North", cases: 3 }, null],
        chart: { kind: "bar", xColumn: "label", series: [{ column: "cases" }] },
      } as unknown as PluginVizTransformResult;
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("contains to the chart a row value that throws while the chart draws", async () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const unprintableLabel = {
      toString(): never {
        throw new Error("cannot print");
      },
    };
    const pluginId = _addPluginWithBars(() => {
      return {
        rows: [{ label: unprintableLabel, cases: 3 }],
        chart: { kind: "bar", xColumn: "label", series: [{ column: "cases" }] },
      };
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the component throws", async () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pluginId = _addBundledPlugin({
      definition: definePlugin({
        vizTypes: { "case-dots": { Component: CrashingChart } },
      }),
    });

    _renderChart({ vizConfig: _makeDotsConfig(pluginId) });

    expect(
      await screen.findByText("Case dots couldn't render"),
    ).toBeInTheDocument();
  });

  it("draws a crashed component chart again once its data changes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const vizConfig = _makeDotsConfig(
      _addBundledPlugin({
        definition: definePlugin({
          vizTypes: { "case-dots": { Component: TwoRowCrashingChart } },
        }),
      }),
    );
    const { rerender } = _renderChart({ vizConfig });
    await screen.findByText("Case dots couldn't render");

    rerender(_makeChartElement({ vizConfig, data: _makeRows(3) }));

    expect(await screen.findByTestId("case-dots")).toBeInTheDocument();
  });

  it("draws a crashed component chart again once its settings change", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pluginId = _addBundledPlugin({
      definition: definePlugin({
        vizTypes: { "case-rings": { Component: UnlabelledCrashingRings } },
      }),
    });
    const { rerender } = _renderChart({
      vizConfig: _makeRingsConfig(pluginId),
    });
    await screen.findByText("Case rings couldn't render");

    rerender(
      _makeChartElement({
        vizConfig: _makeRingsConfig(pluginId, { labelColumn: REGION_ID }),
      }),
    );

    expect(await screen.findByTestId("case-rings")).toBeInTheDocument();
  });

  it("draws another chart type in place of a crashed one with the same settings", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pluginId = _addBundledPlugin({
      definition: definePlugin({
        vizTypes: {
          "case-dots": { Component: CrashingChart },
          "case-rings": { Component: CaseRings },
        },
      }),
    });
    // Neither chart type has a setting with a value, so both read `{}`.
    const { rerender } = _renderChart({ vizConfig: _makeDotsConfig(pluginId) });
    await screen.findByText("Case dots couldn't render");

    rerender(_makeChartElement({ vizConfig: _makeRingsConfig(pluginId) }));

    expect(await screen.findByTestId("case-rings")).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the plugin code declares no such chart", async () => {
    const pluginId = _addBundledPlugin({
      definition: definePlugin({ vizTypes: {} }),
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("notes how many rows a truncated result's chart was built from", async () => {
    _renderChart({
      vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }),
      isTruncated: true,
    });

    expect(
      await screen.findByText("Built from the first 2 rows of the result."),
    ).toBeInTheDocument();
  });

  it("notes a truncated result's chart built from one row in the singular", async () => {
    _renderChart({
      vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }),
      data: _makeRows(1),
      isTruncated: true,
    });

    expect(
      await screen.findByText("Built from the first row of the result."),
    ).toBeInTheDocument();
  });

  it("shows no truncation note for a complete result", async () => {
    _renderChart({ vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }) });
    await screen.findByTestId("bar-chart");

    expect(screen.queryByText(/Built from the first/)).toBeNull();
  });
});
