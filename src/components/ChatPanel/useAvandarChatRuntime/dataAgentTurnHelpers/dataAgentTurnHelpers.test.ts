import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DataAgentDatasetCache } from "./DataAgentDatasetCache";
import {
  createExplorerShowQuery,
  loadDataAgentDatasets,
} from "./dataAgentTurnHelpers";
import type { DataAgentTurnOptions } from "./dataAgentTurnHelpers";

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome",
  () => {
    return {
      waitForAppliedSqlOutcome: vi.fn().mockResolvedValue("rows"),
      readAppliedSqlResult: () => {
        return {
          result: {
            columns: [
              { name: "state", dataType: "varchar" },
              { name: "cases", dataType: "bigint" },
            ],
            data: [
              { state: "Ohio", cases: 3 },
              { state: "Utah", cases: 2 },
              { state: "Iowa", cases: 1 },
            ],
            numRows: 3,
          },
        };
      },
    };
  },
);

function _createTurnOptions(): DataAgentTurnOptions {
  return {
    apiMessages: [],
    workspaceId: "workspace-1" as DataAgentTurnOptions["workspaceId"],
    currentUser: undefined,
    chatGeneration: 0,
    parseSqlRef: {
      current: () => {
        throw new Error("no structured mapping");
      },
    },
    dataExplorerDispatch: {
      setRawSql: vi.fn(),
      setNlPrompt: vi.fn(),
      applySqlMapping: vi.fn(),
      setActiveVizType: vi.fn(),
    } as unknown as DataAgentTurnOptions["dataExplorerDispatch"],
    chatPanelDispatch: {} as DataAgentTurnOptions["chatPanelDispatch"],
  };
}

describe("createExplorerShowQuery", () => {
  it("returns the first rows, in column order, when a preview is asked for", async () => {
    const showQuery = createExplorerShowQuery(_createTurnOptions());

    const outcome = await showQuery({
      sql: "select 1",
      summary: "cases",
      previewRowCount: 2,
    });

    expect(outcome).toMatchObject({
      kind: "rows",
      rowCount: 3,
      previewRows: [
        ["Ohio", 3],
        ["Utah", 2],
      ],
    });
  });

  it("returns no rows when no preview is asked for", async () => {
    const showQuery = createExplorerShowQuery(_createTurnOptions());

    const outcome = await showQuery({ sql: "select 1", summary: "cases" });

    expect(outcome).not.toHaveProperty("previewRows");
  });
});

describe("loadDataAgentDatasets", () => {
  const WORKSPACE_ID = "workspace-1" as DataAgentTurnOptions["workspaceId"];
  const DATASET = {
    id: "dataset-1",
    name: "cases.csv",
    columns: [{ name: "cases", dataType: "bigint" }],
  };

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("keeps what it loads online for later", async () => {
    vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockResolvedValue([
      DATASET,
    ] as never);

    await loadDataAgentDatasets(WORKSPACE_ID);

    expect(DataAgentDatasetCache.read(WORKSPACE_ID)).toEqual([DATASET]);
  });

  it("answers from the kept copy when the server cannot be reached", async () => {
    DataAgentDatasetCache.write(WORKSPACE_ID, [DATASET]);
    vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    await expect(loadDataAgentDatasets(WORKSPACE_ID)).resolves.toEqual([
      DATASET,
    ]);
  });

  it("does not call the server while the browser is offline", async () => {
    DataAgentDatasetCache.write(WORKSPACE_ID, [DATASET]);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchDatasets = vi.spyOn(DatasetClient, "getAllDatasetsWithColumns");

    await expect(loadDataAgentDatasets(WORKSPACE_ID)).resolves.toEqual([
      DATASET,
    ]);
    expect(fetchDatasets).not.toHaveBeenCalled();
  });
});
