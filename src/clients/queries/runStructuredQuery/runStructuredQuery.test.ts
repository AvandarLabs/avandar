import { Model } from "@avandar/models";
import { prop, sortObjList } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const { runQueryMock, publicRunQueryMock, getAllEntityFieldValuesMock } =
  vi.hoisted(() => {
    return {
      runQueryMock: vi.fn(),
      publicRunQueryMock: vi.fn(),
      getAllEntityFieldValuesMock: vi.fn(),
    };
  });

vi.mock("@/clients/qetl/WorkspaceQetlClient", () => {
  return { WorkspaceQetlClient: { runQuery: runQueryMock } };
});
vi.mock("@/clients/qetl/PublicQetlClient", () => {
  return { PublicQetlClient: { runQuery: publicRunQueryMock } };
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

/** An honest `EntityConfig.T`, built through `Model.make` with no cast. */
function _createEntityConfig(): EntityConfig.T {
  const now = new Date().toISOString();
  return Model.make("EntityConfig", {
    id: uuid<EntityConfig.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    name: "Cases",
    description: undefined,
    createdAt: now,
    updatedAt: now,
    allowManualCreation: false,
  });
}

/** An honest `EntityFieldConfig.T`, built through `Model.make` with no cast. */
function _createEntityFieldConfig(
  entityConfigId: EntityConfig.Id,
  name: string,
): EntityFieldConfig.T {
  const now = new Date().toISOString();
  return Model.make("EntityFieldConfig", {
    id: uuid<EntityFieldConfig.Id>(),
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
  });
}

describe("runStructuredQuery", () => {
  const workspaceId = uuid<Workspace.Id>();

  beforeEach(() => {
    runQueryMock.mockReset();
    publicRunQueryMock.mockReset();
    getAllEntityFieldValuesMock.mockReset();
  });

  it("runs caller-supplied raw SQL verbatim", async () => {
    runQueryMock.mockResolvedValue({
      id: uuid(),
      data: [],
      columns: [],
      numRows: 0,
    });
    await runStructuredQuery({
      auth: "workspace",
      workspaceId,
      query: StructuredQuery.makeEmpty(),
      rawSql: "SELECT 1 AS one",
    });
    expect(runQueryMock).toHaveBeenCalledWith({
      rawSql: "SELECT 1 AS one",
      workspaceId,
    });
  });

  it("returns an empty result when there is nothing to run", async () => {
    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId,
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
        publicAvaPageId: uuid<Dashboard.Id>(),
        query: StructuredQuery.makeEmpty(),
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);
  });

  it("remaps entity field values from field ids to field names", async () => {
    const entityConfig = _createEntityConfig();
    const nameField = _createEntityFieldConfig(entityConfig.id, "name");
    const ageField = _createEntityFieldConfig(entityConfig.id, "age");
    const nameColumn = QueryColumn.makeFromEntityFieldConfig(nameField);
    const ageColumn = QueryColumn.makeFromEntityFieldConfig(ageField);

    getAllEntityFieldValuesMock.mockResolvedValue([
      { [nameField.id]: "Ada", [ageField.id]: 30 },
      { [nameField.id]: "Grace", [ageField.id]: 40 },
    ]);

    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId,
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
    const columnsByName = sortObjList(result.columns, { sortBy: prop("name") });
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
