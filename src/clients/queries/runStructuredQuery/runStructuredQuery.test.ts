import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const SNAPSHOT_REVISION = "2026-08-14T01:00:00.000Z";

const {
  runQueryMock,
  publicRunQueryMock,
  makeExecutableQueryFromManualQueryMock,
} = vi.hoisted(() => {
  return {
    runQueryMock: vi.fn(),
    publicRunQueryMock: vi.fn(),
    makeExecutableQueryFromManualQueryMock: vi.fn(),
  };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});
vi.mock("@/clients/qetl/PublicQuerySession/PublicQuerySession", () => {
  return { PublicQuerySession: { runQuery: publicRunQueryMock } };
});
vi.mock(
  "@/views/DataExplorerApp/makeExecutableQueryFromManualQuery/makeExecutableQueryFromManualQuery",
  () => {
    return {
      makeExecutableQueryFromManualQuery:
        makeExecutableQueryFromManualQueryMock,
    };
  },
);

/** An honest `Concept.T`, built through `Model.make` with no cast. */
function _createConcept(): Concept.T {
  const now = new Date().toISOString();
  return Model.make("Concept", {
    id: uuid<Concept.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    name: "Cases",
    description: undefined,
    createdAt: now,
    updatedAt: now,
    allowManualCreation: false,
    defaultStatusId: uuid<ConceptStatus.Id>(),
  });
}

/** An honest `ConceptAttribute.T`, built through `Model.make` with no cast. */
function _createConceptAttribute(
  conceptId: Concept.Id,
  name: string,
): ConceptAttribute.T {
  const now = new Date().toISOString();
  return Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId,
    workspaceId: uuid<Workspace.Id>(),
    name,
    description: undefined,
    createdAt: now,
    updatedAt: now,
    dataType: "varchar",
    mappingType: "manual_entry",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: true,
    isArray: false,
  });
}

/** An honest `Dataset`, used to ensure structured SQL is generated. */
function _createDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Cases",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

beforeEach(() => {
  runQueryMock.mockReset();
  publicRunQueryMock.mockReset();
  // Mirrors the real resolver's behavior for queries that never trip the
  // large-dataset auto-limit guard, which is every query these tests use
  // unless a test overrides this default.
  makeExecutableQueryFromManualQueryMock.mockReset();
  makeExecutableQueryFromManualQueryMock.mockImplementation((params) => {
    return Promise.resolve({ query: params.query, didAutoLimit: false });
  });
});

describe("runStructuredQuery", () => {
  const workspaceId = uuid<Workspace.Id>();

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

  it("runs workspace-published raw SQL against the private snapshot client", async () => {
    const dashboardId = uuid<Dashboard.Id>();
    publicRunQueryMock.mockResolvedValue({
      id: uuid(),
      data: [],
      columns: [],
      numRows: 0,
    });

    await runStructuredQuery({
      auth: "workspace_published",
      publicAvaPageId: dashboardId,
      snapshotRevision: SNAPSHOT_REVISION,
      query: StructuredQuery.makeEmpty(),
      rawSql: "SELECT 1 AS one",
    });

    expect(publicRunQueryMock).toHaveBeenCalledWith({
      rawSql: "SELECT 1 AS one",
      dashboardId,
      visibility: "workspace",
      snapshotRevision: SNAPSHOT_REVISION,
    });
    expect(runQueryMock).not.toHaveBeenCalled();
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

  it("rejects structured queries on snapshot routes", async () => {
    const dashboardId = uuid<Dashboard.Id>();

    await expect(
      runStructuredQuery({
        auth: "public",
        publicAvaPageId: dashboardId,
        snapshotRevision: SNAPSHOT_REVISION,
        query: StructuredQuery.makeEmpty(),
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);

    await expect(
      runStructuredQuery({
        auth: "workspace_published",
        publicAvaPageId: dashboardId,
        snapshotRevision: SNAPSHOT_REVISION,
        query: StructuredQuery.makeEmpty(),
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);
  });

  it("rejects generated structured SQL on every snapshot route", async () => {
    const dashboardId = uuid<Dashboard.Id>();
    const query = {
      ...StructuredQuery.makeEmpty(),
      dataSource: _createDataset(),
    };

    await expect(
      runStructuredQuery({
        auth: "public",
        publicAvaPageId: dashboardId,
        snapshotRevision: SNAPSHOT_REVISION,
        query,
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);

    await expect(
      runStructuredQuery({
        auth: "workspace_published",
        publicAvaPageId: dashboardId,
        snapshotRevision: SNAPSHOT_REVISION,
        query,
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);

    expect(publicRunQueryMock).not.toHaveBeenCalled();
  });

  // A form out of sync with its SQL still compiles to SQL, for a case type as
  // for a dataset, so filters, grouping, sorting, and status all apply.
  it("runs an out-of-sync case type query as SQL over the case type's view", async () => {
    const concept = _createConcept();
    const ageColumn = QueryColumn.makeFromConceptAttribute(
      _createConceptAttribute(concept.id, "age"),
    );
    runQueryMock.mockResolvedValue({
      id: uuid(),
      data: [],
      columns: [],
      numRows: 0,
    });

    await runStructuredQuery({
      auth: "workspace",
      workspaceId,
      query: {
        ...StructuredQuery.makeEmpty(),
        dataSource: concept,
        queryColumns: [ageColumn],
      },
      rawSql: undefined,
      isStructuredQueryInSync: false,
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rawSql: expect.stringContaining(`"concept_${concept.id}"`),
      }),
    );
  });

  it("selects the status column in an out-of-sync case type query", async () => {
    const concept = _createConcept();
    runQueryMock.mockResolvedValue({
      id: uuid(),
      data: [],
      columns: [],
      numRows: 0,
    });

    await runStructuredQuery({
      auth: "workspace",
      workspaceId,
      query: {
        ...StructuredQuery.makeEmpty(),
        dataSource: concept,
        queryColumns: [
          QueryColumn.makeFromConceptAttribute(
            _createConceptAttribute(concept.id, "age"),
          ),
          QueryColumn.makeFromConceptStatusColumn(
            ConceptStatusColumn.fromConceptId(concept.id),
          ),
        ],
      },
      rawSql: undefined,
      isStructuredQueryInSync: false,
    });

    const { rawSql } = runQueryMock.mock.calls[0]![0] as { rawSql: string };
    expect(rawSql).toContain('"status"');
  });
});

/**
 * `didAutoLimit` is decided deep inside SQL selection, several calls below the
 * public entry point. These tests pin which path reaches the resolver at all,
 * and that when it does, the value the resolver returned is the value the
 * caller sees rather than a constant.
 */
describe("runStructuredQueryWithMetadata", () => {
  it("reports false for raw SQL, which never consults the resolver", async () => {
    const emptyResult = { id: "r1", columns: [], data: [], numRows: 0 };
    runQueryMock.mockResolvedValue(emptyResult);
    // Set up to fail the assertion if the raw-SQL path ever starts consulting
    // the resolver. Passing `rawSql` means it must not, so the reported value
    // has to stay false even though the resolver would say otherwise.
    makeExecutableQueryFromManualQueryMock.mockResolvedValue({
      query: StructuredQuery.makeEmpty(),
      didAutoLimit: true,
      rowCount: 900000,
    });

    const { result, didAutoLimit, executedSql } =
      await runStructuredQueryWithMetadata({
        auth: "workspace",
        workspaceId: uuid<Workspace.Id>(),
        query: StructuredQuery.makeEmpty(),
        rawSql: "SELECT 1",
      });

    expect(result).toBe(emptyResult);
    expect(executedSql).toBe("SELECT 1");
    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ rawSql: executedSql }),
    );
    expect(didAutoLimit).toBe(false);
    expect(makeExecutableQueryFromManualQueryMock).not.toHaveBeenCalled();
  });

  it("reports true when the resolver bounded a large dataset", async () => {
    makeExecutableQueryFromManualQueryMock.mockResolvedValue({
      query: { ...StructuredQuery.makeEmpty(), limit: 5000 },
      didAutoLimit: true,
      rowCount: 900000,
    });

    // rawSql is undefined and the query has no dataSource, so execution falls
    // through to the empty-result path in `_runSourceQuery` rather than
    // reaching `WorkspaceQuerySession.runQuery`. `didAutoLimit` still comes
    // from the resolver, which is what this test pins.
    const { didAutoLimit } = await runStructuredQueryWithMetadata({
      auth: "workspace",
      workspaceId: uuid<Workspace.Id>(),
      query: StructuredQuery.makeEmpty(),
      rawSql: undefined,
      isStructuredQueryInSync: true,
    });

    expect(didAutoLimit).toBe(true);
  });
});
