import { uuid } from "$/lib/uuid";
import { describe, expect, it, vi } from "vitest";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const runQueryMock = vi.fn();
const getAllEntityFieldValuesMock = vi.fn();

vi.mock("@/clients/qetl/WorkspaceQETLClient", () => {
  return { WorkspaceQETLClient: { runQuery: runQueryMock } };
});
vi.mock("@/clients/qetl/PublicQETLClient", () => {
  return { PublicQETLClient: { runQuery: vi.fn() } };
});
vi.mock(
  "@/clients/entities/EntityFieldValueClient/EntityFieldValueClient",
  () => {
    return {
      EntityFieldValueClient: {
        getAllEntityFieldValues: getAllEntityFieldValuesMock,
      },
    };
  },
);

const { runStructuredQuery } =
  await import("@/clients/queries/runStructuredQuery/runStructuredQuery");
const { StructuredQuery } =
  await import("$/models/queries/StructuredQuery/StructuredQuery");
const { QueryColumn } =
  await import("$/models/queries/QueryColumn/QueryColumn");

/** An honest `EntityConfig.T`, built with no cast. */
function createEntityConfig(): EntityConfig.T {
  const now = new Date().toISOString();
  return {
    __type: "EntityConfig",
    id: uuid<EntityConfigId>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<UserId>(),
    name: "Cases",
    description: undefined,
    createdAt: now,
    updatedAt: now,
    allowManualCreation: false,
  };
}

/** An honest `EntityFieldConfig.T`, built with no cast. */
function createEntityFieldConfig(
  entityConfigId: EntityConfigId,
  name: string,
): EntityFieldConfig.T {
  const now = new Date().toISOString();
  return {
    __type: "EntityFieldConfig",
    id: uuid(),
    entityConfigId,
    workspaceId: uuid<Workspace.Id>(),
    name,
    description: undefined,
    createdAt: now,
    updatedAt: now,
    dataType: "varchar",
    valueExtractorType: "manual_entry",
    isTitleField: false,
    isIdField: false,
    allowManualEdit: true,
    isArray: false,
  };
}

describe("runStructuredQuery", () => {
  it("runs caller-supplied raw SQL verbatim", async () => {
    runQueryMock.mockResolvedValue({
      id: "r1",
      data: [],
      columns: [],
      numRows: 0,
    });
    await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: StructuredQuery.makeEmpty(),
      rawSql: "SELECT 1 AS one",
    });
    expect(runQueryMock).toHaveBeenCalledWith({
      rawSql: "SELECT 1 AS one",
      workspaceId: "workspace-1",
    });
  });

  it("returns an empty result when there is nothing to run", async () => {
    runQueryMock.mockClear();
    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: StructuredQuery.makeEmpty(),
      rawSql: undefined,
    });
    expect(runQueryMock).not.toHaveBeenCalled();
    expect(result.numRows).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("rejects a structured query on the public path", async () => {
    await expect(
      runStructuredQuery({
        auth: "public",
        publicAvaPageId: "page-1" as never,
        query: StructuredQuery.makeEmpty(),
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);
  });

  it("remaps entity field values from field ids to field names", async () => {
    const entityConfig = createEntityConfig();
    const nameField = createEntityFieldConfig(entityConfig.id, "name");
    const ageField = createEntityFieldConfig(entityConfig.id, "age");
    const nameColumn = QueryColumn.makeFromEntityFieldConfig(nameField);
    const ageColumn = QueryColumn.makeFromEntityFieldConfig(ageField);

    getAllEntityFieldValuesMock.mockResolvedValue([
      { [nameField.id]: "Ada", [ageField.id]: 30 },
      { [nameField.id]: "Grace", [ageField.id]: 40 },
    ]);

    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: {
        ...StructuredQuery.makeEmpty(),
        dataSource: entityConfig,
        queryColumns: [nameColumn, ageColumn],
      },
      rawSql: undefined,
      isStructuredQueryInSync: false,
    });

    // `sortedQueryColumns` orders columns by query-column id (a random uuid),
    // not by name, so compare the returned columns order-independently.
    const columnsByName = [...result.columns].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    expect(columnsByName).toEqual([
      { name: "age", dataType: "varchar" },
      { name: "name", dataType: "varchar" },
    ]);
    expect(result.data).toEqual([
      { name: "Ada", age: 30 },
      { name: "Grace", age: 40 },
    ]);
  });
});
