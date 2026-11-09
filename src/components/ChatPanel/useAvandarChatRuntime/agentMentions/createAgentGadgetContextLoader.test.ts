import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { createAgentGadgetContextLoader } from "./createAgentGadgetContextLoader";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";

const clients = vi.hoisted(() => {
  return {
    dashboard: { getById: vi.fn() },
    dataset: { getById: vi.fn() },
    map: { getById: vi.fn() },
    concept: { getById: vi.fn() },
    attribute: { getAll: vi.fn() },
  };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return { DashboardClient: clients.dashboard };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: clients.dataset };
});
vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: clients.map };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: clients.concept };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: clients.attribute };
});

const WORKSPACE = "ws-1" as Workspace.Id;
const OTHER_WORKSPACE = "ws-2";
const DASHBOARD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const DATASET_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const MAP_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const CONCEPT_ID = "dddddddd-4444-4444-8444-dddddddddddd";

const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: DASHBOARD_ID,
  subId: null,
};
const TILE_REF: Gadget.Ref = {
  gadgetType: "dashboard_tile",
  gadgetId: DASHBOARD_ID,
  subId: "b1",
};
const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: DATASET_ID,
  subId: null,
};
const MAP_REF: Gadget.Ref = {
  gadgetType: "map",
  gadgetId: MAP_ID,
  subId: null,
};
const CONCEPT_REF: Gadget.Ref = {
  gadgetType: "concept",
  gadgetId: CONCEPT_ID,
  subId: null,
};

const DASHBOARD_CONFIG = {
  root: { props: { title: "COVID", schemaVersion: 5 } },
  content: [
    {
      type: "DataViz",
      props: {
        id: "b1",
        vizType: "line",
        nlQuery: { prompt: "Weekly cases", rawSql: "SELECT 1" },
      },
    },
  ],
};

function _dashboardRow(workspaceId: string = WORKSPACE) {
  return {
    id: DASHBOARD_ID,
    workspaceId,
    name: "COVID",
    config: DASHBOARD_CONFIG,
  };
}

async function _loadOne(ref: Gadget.Ref) {
  const contexts = await createAgentGadgetContextLoader(WORKSPACE).load([ref]);
  return contexts.get(ChatMentionToken.buildRefKey(ref));
}

describe("createAgentGadgetContextLoader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads a dashboard's charts", async () => {
    clients.dashboard.getById.mockResolvedValue(_dashboardRow());

    expect(await _loadOne(DASHBOARD_REF)).toEqual({
      kind: "dashboard",
      ref: DASHBOARD_REF,
      name: "COVID",
      tiles: [{ title: "Weekly cases", chartType: "line", sql: "SELECT 1" }],
    });
  });

  it("loads one tile with its dashboard's name", async () => {
    clients.dashboard.getById.mockResolvedValue(_dashboardRow());

    expect(await _loadOne(TILE_REF)).toEqual({
      kind: "dashboard_tile",
      ref: TILE_REF,
      dashboardName: "COVID",
      tile: { title: "Weekly cases", chartType: "line", sql: "SELECT 1" },
    });
  });

  it("loads a dataset's name", async () => {
    clients.dataset.getById.mockResolvedValue({
      id: DATASET_ID,
      workspaceId: WORKSPACE,
      name: "US deaths",
    });

    expect(await _loadOne(DATASET_REF)).toEqual({
      kind: "dataset",
      ref: DATASET_REF,
      name: "US deaths",
    });
  });

  it("loads a map's layers and their source names", async () => {
    clients.map.getById.mockResolvedValue({
      id: MAP_ID,
      workspaceId: WORKSPACE,
      name: "Sites map",
      config: {
        layers: [
          { name: "Sites", source: { dataSource: { name: "Clinic list" } } },
          { name: "Areas", source: {} },
        ],
      },
    });

    expect(await _loadOne(MAP_REF)).toEqual({
      kind: "map",
      ref: MAP_REF,
      name: "Sites map",
      layers: [{ name: "Sites", sourceName: "Clinic list" }, { name: "Areas" }],
    });
  });

  it("loads a case type's field names", async () => {
    clients.concept.getById.mockResolvedValue({
      id: CONCEPT_ID,
      workspaceId: WORKSPACE,
      name: "Measles case",
    });
    clients.attribute.getAll.mockResolvedValue([
      { name: "Onset date" },
      { name: "Status" },
    ]);

    expect(await _loadOne(CONCEPT_REF)).toEqual({
      kind: "concept",
      ref: CONCEPT_REF,
      name: "Measles case",
      fieldNames: ["Onset date", "Status"],
    });
    expect(clients.attribute.getAll).toHaveBeenCalledWith({
      where: { concept_id: { eq: CONCEPT_ID } },
    });
  });

  it("is unavailable for another workspace's row", async () => {
    clients.dashboard.getById.mockResolvedValue(_dashboardRow(OTHER_WORKSPACE));

    expect(await _loadOne(DASHBOARD_REF)).toEqual({
      kind: "unavailable",
      ref: DASHBOARD_REF,
    });
  });

  it("is unavailable for a missing row", async () => {
    clients.dashboard.getById.mockResolvedValue(undefined);

    expect(await _loadOne(DASHBOARD_REF)).toEqual({
      kind: "unavailable",
      ref: DASHBOARD_REF,
    });
  });

  it("is unavailable for a removed tile", async () => {
    clients.dashboard.getById.mockResolvedValue(_dashboardRow());
    const goneRef: Gadget.Ref = { ...TILE_REF, subId: "gone" };

    expect(await _loadOne(goneRef)).toEqual({
      kind: "unavailable",
      ref: goneRef,
    });
  });

  it("is unavailable when the load fails", async () => {
    clients.dashboard.getById.mockRejectedValue(new Error("RLS"));

    expect(await _loadOne(DASHBOARD_REF)).toEqual({
      kind: "unavailable",
      ref: DASHBOARD_REF,
    });
  });

  it("never loads a case", async () => {
    const caseRef: Gadget.Ref = {
      gadgetType: "individual",
      gadgetId: DATASET_ID,
      subId: null,
    };

    expect(await _loadOne(caseRef)).toEqual({
      kind: "unavailable",
      ref: caseRef,
    });
    Object.values(clients).forEach((client) => {
      Object.values(client).forEach((method) => {
        expect(method).not.toHaveBeenCalled();
      });
    });
  });

  it("loads each ref once", async () => {
    clients.dashboard.getById.mockResolvedValue(_dashboardRow());

    const contexts = await createAgentGadgetContextLoader(WORKSPACE).load([
      DASHBOARD_REF,
      DASHBOARD_REF,
    ]);

    expect(clients.dashboard.getById).toHaveBeenCalledTimes(1);
    expect(contexts.size).toBe(1);
  });
});
