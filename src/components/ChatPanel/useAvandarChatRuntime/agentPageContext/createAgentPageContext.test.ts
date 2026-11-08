import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { createAgentPageContext } from "./createAgentPageContext";
import type { AgentPageNameLoader } from "./createAgentPageContext";

const DASHBOARD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const DATASET_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const DATASETS = [{ id: DATASET_ID, name: "cases.csv", columns: [] }];
const TILE_DATA = {
  root: { props: { title: "Measles 2026" } },
  content: [
    {
      type: "DataViz",
      props: {
        vizType: "line",
        nlQuery: { prompt: "Cases", rawSql: "SELECT 1" },
      },
    },
  ],
};

function _loader(
  overrides: Partial<AgentPageNameLoader> = {},
): AgentPageNameLoader {
  return {
    getDashboard: vi.fn().mockResolvedValue(undefined),
    getMapName: vi.fn().mockResolvedValue(undefined),
    getCaseTypeName: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function _create(
  pathname: string,
  options: Partial<Parameters<typeof createAgentPageContext>[0]> = {},
) {
  return createAgentPageContext({
    pathname,
    chatPageContext: Model.make("ChatPageContext", { app: "other" }),
    dashboardEditorState: {
      activeDashboardId: undefined,
      editorData: undefined,
    },
    datasets: DATASETS,
    loader: _loader(),
    ...options,
  });
}

describe("createAgentPageContext", () => {
  it("reads the Data Explorer's open dataset and query", async () => {
    const context = await _create("/acme/data-explorer", {
      chatPageContext: Model.make("ChatPageContext", {
        app: "data-explorer",
        openDatasetId: DATASET_ID,
        lastSql: "SELECT 1",
        lastResultColumns: [{ name: "n", dataType: "bigint" }],
      }),
    });

    expect(context).toEqual({
      app: "data-explorer",
      dataset: { id: DATASET_ID, name: "cases.csv" },
      explorer: {
        sql: "SELECT 1",
        resultColumns: [{ name: "n", dataType: "bigint" }],
      },
    });
  });

  it("reads an open editor's unsaved charts without loading", async () => {
    const loader = _loader();
    const context = await _create(`/acme/dashboards/edit/${DASHBOARD_ID}`, {
      dashboardEditorState: {
        activeDashboardId: DASHBOARD_ID,
        editorData: TILE_DATA as never,
      },
      loader,
    });

    expect(context.dashboard).toEqual({
      id: DASHBOARD_ID,
      name: "Measles 2026",
      tiles: [{ title: "Cases", chartType: "line", sql: "SELECT 1" }],
    });
    expect(loader.getDashboard).not.toHaveBeenCalled();
  });

  it("keeps an open editor's dashboard when its charts cannot be read", async () => {
    const brokenTile = {
      type: "DataViz",
      get props(): never {
        throw new Error("unreadable chart");
      },
    };
    const context = await _create(`/acme/dashboards/edit/${DASHBOARD_ID}`, {
      dashboardEditorState: {
        activeDashboardId: DASHBOARD_ID,
        editorData: {
          root: { props: { title: "Measles 2026" } },
          content: [brokenTile],
        } as never,
      },
    });

    expect(context.dashboard).toEqual({
      id: DASHBOARD_ID,
      name: "Measles 2026",
      tiles: [],
    });
  });

  it("loads a dashboard that is not open in the editor", async () => {
    const context = await _create(`/acme/dashboards/preview/${DASHBOARD_ID}`, {
      loader: _loader({
        getDashboard: vi
          .fn()
          .mockResolvedValue({ name: "Saved", config: TILE_DATA }),
      }),
    });

    expect(context.dashboard?.name).toBe("Saved");
    expect(context.dashboard?.tiles).toHaveLength(1);
  });

  it("names a case's type through the loader", async () => {
    const context = await _create(
      `/acme/individual-manager/${CONCEPT_ID}/${DATASET_ID}`,
      {
        loader: _loader({
          getCaseTypeName: vi.fn().mockResolvedValue("Measles case"),
        }),
      },
    );

    expect(context).toEqual({
      app: "case",
      caseType: { id: CONCEPT_ID, name: "Measles case" },
    });
  });

  it("keeps only the page when a name cannot be loaded", async () => {
    const context = await _create(`/acme/map/${DASHBOARD_ID}`, {
      loader: _loader({
        getMapName: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    });

    expect(context).toEqual({ app: "map" });
  });

  it("reads a slugged dashboard under its real id", async () => {
    const getDashboard = vi.fn().mockResolvedValue({
      id: DASHBOARD_ID,
      name: "Measles 2026",
      config: TILE_DATA,
    });
    const context = await _create("/acme/d/measles-2026", {
      loader: _loader({ getDashboard }),
    });

    expect(getDashboard).toHaveBeenCalledWith("measles-2026");
    expect(context.dashboard?.id).toBe(DASHBOARD_ID);
    expect(context.dashboard?.name).toBe("Measles 2026");
  });

  it("reads a saved dashboard that predates nlQuery props", async () => {
    const context = await _create(`/acme/d/${DASHBOARD_ID}`, {
      loader: _loader({
        getDashboard: vi.fn().mockResolvedValue({
          name: "Old",
          config: {
            root: { props: { title: "Old" } },
            content: [
              {
                type: "DataViz",
                props: {
                  id: "DataViz-1",
                  vizType: "bar",
                  prompt: "Old chart",
                  sql: "SELECT 9",
                },
              },
            ],
          },
        }),
      }),
    });

    expect(context.dashboard?.tiles).toEqual([
      { title: "Old chart", chartType: "table", sql: "SELECT 9" },
    ]);
  });

  it("takes the saved name when the editor's title is blank", async () => {
    const context = await _create(`/acme/dashboards/edit/${DASHBOARD_ID}`, {
      dashboardEditorState: {
        activeDashboardId: DASHBOARD_ID,
        editorData: {
          ...TILE_DATA,
          root: { props: { title: "  " } },
        } as never,
      },
      loader: _loader({
        getDashboard: vi
          .fn()
          .mockResolvedValue({ name: "Saved name", config: {} }),
      }),
    });

    expect(context.dashboard?.name).toBe("Saved name");
    expect(context.dashboard?.tiles).toHaveLength(1);
  });

  it("keeps the dashboard without charts when its config cannot upgrade", async () => {
    const context = await _create(`/acme/d/${DASHBOARD_ID}`, {
      loader: _loader({
        getDashboard: vi.fn().mockResolvedValue({ name: "Broken", config: {} }),
      }),
    });

    expect(context.dashboard).toEqual({
      id: DASHBOARD_ID,
      name: "Broken",
      tiles: [],
    });
  });
});
