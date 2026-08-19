/**
 * Tests the mediator's concept-relation wiring: expansion, leasing and order.
 *
 * These are the properties that only exist once the pieces are connected. Each
 * one fails silently rather than loudly if it is wrong: a view created before
 * its datasets binds against nothing, a lease that does not cover the spine
 * table refuses the load with a message about leases, and a concept whose
 * contributing datasets were never added to the dependency set produces a view
 * over missing tables.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { IQueryMediator } from "@/clients/qetl/QueryMediator/QueryMediator";
import type { QetlRunnerOptions } from "@/clients/qetl/QueryMediator/QueryMediator.types";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const SPINE_TABLE = `concept_${CONCEPT_ID}__individuals`;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

const {
  callLog,
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getTableOrViewNamesMock,
  loadCsvMock,
  loadParquetMock,
  localDatasetGetByIdMock,
  localDatasetGetAllMock,
  runRawQueryMock,
  sourceDatasetGetAllMock,
} = vi.hoisted(() => {
  return {
    callLog: [] as string[],
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
    loadCsvMock: vi.fn(),
    loadParquetMock: vi.fn(),
    localDatasetGetByIdMock: vi.fn(),
    localDatasetGetAllMock: vi.fn(),
    runRawQueryMock: vi.fn(),
    sourceDatasetGetAllMock: vi.fn(),
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      dropTableViewAndFile: vi.fn(),
      getTableOrViewNames: getTableOrViewNamesMock,
      loadCsv: loadCsvMock,
      loadParquet: loadParquetMock,
      runRawQuery: runRawQueryMock,
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      getById: localDatasetGetByIdMock,
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: localDatasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return {
    CsvFileDatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: sourceDatasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetColumnGetAllMock };
          },
        };
      },
    },
  };
});

/** The shape `getRelationSources` filters datasets with. */
type DatasetIdFilter = { where?: { id?: { in?: readonly Dataset.Id[] } } };

/** One concept plan reading one dataset, with one individual. */
const CONCEPT_PLAN: ConceptRelationPlan = {
  ref: { kind: "concept", id: CONCEPT_ID },
  contributingDatasetIds: [DATASET_ID],
  externalIds: ["p1"],
  attributeColumns: [
    {
      kind: "dataset_column",
      attributeName: "age",
      selectColumnName: "age_years",
      datasetId: DATASET_ID,
      primaryKeyColumnName: "person_id",
      valuePickerRuleType: "first",
      isArray: false,
    },
  ],
};

async function _createQetlClient(
  options: Pick<
    QetlRunnerOptions,
    "getQueryDependencies" | "planConceptRelations"
  >,
): Promise<IQueryMediator> {
  const { QueryMediatorFactory } =
    await import("@/clients/qetl/QueryMediator/QueryMediator");
  const relationCache = createInMemoryRelationCache();
  void relationCache.write({
    identity: {
      principal: PRINCIPAL_KEY,
      relation: { kind: "dataset", id: DATASET_ID },
      definition: undefined,
      sourceVersion: undefined,
    },
    columns: "all",
    payload: new Blob(["cached"]),
  });
  return QueryMediatorFactory.create({
    getQueryDependencies: options.getQueryDependencies,
    planConceptRelations: options.planConceptRelations,
    relationCache,
    principalKey: PRINCIPAL_KEY,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  callLog.length = 0;
  // Nothing is cached in DuckDB, so the contributing dataset has to be loaded.
  getTableOrViewNamesMock.mockResolvedValue([]);
  localDatasetGetAllMock.mockResolvedValue([]);
  localDatasetGetByIdMock.mockResolvedValue({
    parseStatus: "ready",
    parquetData: new Blob(["cached"]),
  });
  datasetColumnGetAllMock.mockResolvedValue([]);
  // The filter is honoured rather than ignored, and that is what makes the
  // expansion test mean something: a resolver that answered with the dataset
  // whatever it was asked would load it even when nothing named it.
  datasetGetAllMock.mockImplementation(async (filters?: DatasetIdFilter) => {
    const requestedIds = filters?.where?.id?.in ?? [];
    return requestedIds.includes(DATASET_ID) ?
        [
          {
            id: DATASET_ID,
            name: "people",
            sourceType: "csv_file",
            workspaceId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
          },
        ]
      : [];
  });
  sourceDatasetGetAllMock.mockResolvedValue([{ datasetId: DATASET_ID }]);
  loadParquetMock.mockImplementation(async () => {
    callLog.push("loadParquet");
    return {};
  });
  loadCsvMock.mockImplementation(async () => {
    callLog.push("loadCsv");
    return {};
  });
  runRawQueryMock.mockImplementation(async (rawSql: string) => {
    callLog.push(
      rawSql.startsWith("CREATE OR REPLACE VIEW") ? "createView" : "query",
    );
    return { data: [] };
  });
});

describe("QueryMediator concept relations", () => {
  // Expansion. The concept's SQL names no dataset, so without expanding the
  // concept to its contributors nothing loads the dataset its view reads.
  it("loads a dataset the SQL never names but the concept reads", async () => {
    const qetlClient = await _createQetlClient({
      getQueryDependencies: async () => {
        return [];
      },
      planConceptRelations: async () => {
        return [CONCEPT_PLAN];
      },
    });

    await qetlClient.runQuery({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
    });

    expect(loadParquetMock).toHaveBeenCalledWith(
      expect.objectContaining({ tableName: DATASET_ID }),
    );
  });

  // Order. A view is bound when it is defined, so both the contributing dataset
  // and the spine must exist first. The final query runs last.
  it("loads datasets, then the spine, then the view, then the query", async () => {
    const qetlClient = await _createQetlClient({
      getQueryDependencies: async () => {
        return [];
      },
      planConceptRelations: async () => {
        return [CONCEPT_PLAN];
      },
    });

    await qetlClient.runQuery({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
    });

    expect(callLog).toEqual(["loadParquet", "loadCsv", "createView", "query"]);
  });

  // Leasing. `loadCsv` coordinates on the table name it is handed, so a lease
  // covering only the contributing datasets is refused as insufficient. This is
  // the one place the spine's name has to be added to the lease.
  it("takes a lease covering the spine table, not only the datasets", async () => {
    const qetlClient = await _createQetlClient({
      getQueryDependencies: async () => {
        return [];
      },
      planConceptRelations: async () => {
        return [CONCEPT_PLAN];
      },
    });

    await qetlClient.runQuery({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
    });

    const lease = loadCsvMock.mock.calls[0]?.[0]?.datasetDuckDbLease as
      | { datasetIds: Set<string> }
      | undefined;
    expect(lease?.datasetIds.has(SPINE_TABLE)).toBe(true);
    expect(lease?.datasetIds.has(DATASET_ID)).toBe(true);
  });

  // The view's `FROM` names the spine table, which deliberately resolves to no
  // relation, so the fail-closed analyzer reports `uninspectable-source` and
  // `runRawQuery` accepts that reason only for trusted internal SQL. Without
  // the flag every concept query fails at runtime, and no test of the SQL
  // builder would notice. `buildConceptViewSql`'s executed suite asserts the
  // analyzer's verdict, which is the other half of this claim.
  it("marks the view definition as trusted internal SQL", async () => {
    const { TRUSTED_INTERNAL_SQL } =
      await import("@/clients/DuckDbClient/duckDbClientOperations");
    const qetlClient = await _createQetlClient({
      getQueryDependencies: async () => {
        return [];
      },
      planConceptRelations: async () => {
        return [CONCEPT_PLAN];
      },
    });

    await qetlClient.runQuery({
      rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
    });

    const viewCall = runRawQueryMock.mock.calls.find((call) => {
      return (call[0] as string).startsWith("CREATE OR REPLACE VIEW");
    });
    expect(viewCall?.[1]?.[TRUSTED_INTERNAL_SQL]).toBe(true);
  });

  // A session with no ontology access supplies no planner, and nothing about
  // the dataset path may change for it.
  it("leaves a dataset-only session untouched when no planner is supplied", async () => {
    const qetlClient = await _createQetlClient({
      getQueryDependencies: async () => {
        return [DATASET_ID];
      },
    });

    await qetlClient.runQuery({ rawSql: `SELECT * FROM "${DATASET_ID}"` });

    expect(callLog).toEqual(["loadParquet", "query"]);
    expect(loadCsvMock).not.toHaveBeenCalled();
  });
});
