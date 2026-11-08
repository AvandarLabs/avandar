/**
 * The offline schema is fetched while online and cached for later, so what it
 * carries is all an offline prompt ever sees about a case type.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOfflineChatSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/fetchOfflineChatSchema";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "wwwwwwww-wwww-4www-8www-wwwwwwwwwwww" as Workspace.Id;
const CONCEPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const FIELD_ID = "11111111-1111-4111-8111-111111111111";

const {
  datasetsWithColumnsMock,
  conceptGetAllMock,
  conceptAttributeGetAllMock,
  conceptStatusGetAllMock,
} = vi.hoisted(() => {
  return {
    datasetsWithColumnsMock: vi.fn(),
    conceptGetAllMock: vi.fn(),
    conceptAttributeGetAllMock: vi.fn(),
    conceptStatusGetAllMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: { getAllDatasetsWithColumns: datasetsWithColumnsMock },
  };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { getAll: conceptGetAllMock } };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { getAll: conceptAttributeGetAllMock } };
});
vi.mock("@/clients/ontology/ConceptStatusClient", () => {
  return { ConceptStatusClient: { getAll: conceptStatusGetAllMock } };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  datasetsWithColumnsMock.mockResolvedValue([]);
  conceptGetAllMock.mockResolvedValue([{ id: CONCEPT_ID, name: "Case" }]);
  conceptAttributeGetAllMock.mockResolvedValue([]);
  conceptStatusGetAllMock.mockResolvedValue([
    { conceptId: CONCEPT_ID, name: "Suspected", position: 0 },
    { conceptId: CONCEPT_ID, name: "Confirmed", position: 1 },
  ]);
});

describe("fetchOfflineChatSchema", () => {
  it("carries each case type's statuses into the offline schema", async () => {
    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptStatuses).toEqual([
      { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
      { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
    ]);
  });

  it("reads no statuses for a workspace with no case types", async () => {
    conceptGetAllMock.mockResolvedValue([]);

    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptStatuses).toEqual([]);
    expect(conceptStatusGetAllMock).not.toHaveBeenCalled();
  });

  it("carries each field's id and whether it keeps every value into the offline schema", async () => {
    conceptAttributeGetAllMock.mockResolvedValue([
      { id: FIELD_ID, conceptId: CONCEPT_ID, name: "Symptoms", isArray: true },
    ]);

    const schema = await fetchOfflineChatSchema({
      workspace: { id: WORKSPACE_ID } as Workspace.T,
      navigatorOnLine: true,
    });

    expect(schema.conceptAttributes).toEqual([
      {
        id: FIELD_ID,
        concept_id: CONCEPT_ID,
        name: "Symptoms",
        is_array: true,
      },
    ]);
  });
});
