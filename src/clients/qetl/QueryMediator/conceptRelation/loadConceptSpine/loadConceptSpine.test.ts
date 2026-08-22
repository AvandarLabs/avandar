import type { Concept } from "$/models/ontology/Concept/Concept";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

import { beforeEach, describe, expect, it, vi } from "vitest";

const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const CONCEPT_REF = { kind: "concept", id: CONCEPT_ID } as const;
const SPINE_TABLE = `concept_${CONCEPT_ID}__individuals`;

const { dropTableViewAndFileMock, loadCsvMock, runRawQueryMock } = vi.hoisted(
  () => {
    return {
      dropTableViewAndFileMock: vi.fn(),
      loadCsvMock: vi.fn(),
      runRawQueryMock: vi.fn(),
    };
  },
);

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      dropTableViewAndFile: dropTableViewAndFileMock,
      loadCsv: loadCsvMock,
      runRawQuery: runRawQueryMock,
    },
  };
});

// A lease is opaque to this module; it only has to be handed through unchanged.
const LEASE = {
  datasetIds: new Set([SPINE_TABLE]),
} as unknown as DatasetDuckDbLease;

beforeEach(() => {
  vi.clearAllMocks();
  dropTableViewAndFileMock.mockResolvedValue(undefined);
  loadCsvMock.mockResolvedValue({});
  runRawQueryMock.mockResolvedValue({ data: [] });
});

describe("getConceptSpineTableNameFromRef", () => {
  // The name deliberately keeps the `concept_` prefix so `fromTableName` strips
  // it, then fails the uuid test on `<id>__individuals` and resolves to
  // undefined. A name that resolved to a relation would make the analyzer treat
  // the spine as a queryable relation and try to load it.
  it("names the spine so it does not resolve back to a relation", async () => {
    const { getConceptSpineTableNameFromRef } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine");
    const { RelationRef } =
      await import("$/models/relations/RelationRef/RelationRef");

    const spineTableName = getConceptSpineTableNameFromRef(CONCEPT_REF);

    expect(spineTableName).toBe(SPINE_TABLE);
    expect(RelationRef.fromTableName(spineTableName)).toBeUndefined();
  });
});

describe("loadConceptSpine", () => {
  it("loads the ids as CSV text with the key column pinned to VARCHAR", async () => {
    const { loadConceptSpine } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine");

    const spineTableName = await loadConceptSpine({
      ref: CONCEPT_REF,
      externalIds: ["p1", "Brien, O"],
      datasetDuckDbLease: LEASE,
    });

    expect(spineTableName).toBe(SPINE_TABLE);
    expect(loadCsvMock).toHaveBeenCalledWith({
      tableName: SPINE_TABLE,
      fileText: 'external_id\np1\n"Brien, O"',
      columns: [["external_id", "VARCHAR"]],
      datasetDuckDbLease: LEASE,
    });
  });

  // The obligation `toCsvColumn` hands over. DuckDB maps a quoted empty CSV
  // field to NULL, so an empty id keeps its row but loses its key, and every
  // attribute of that individual comes back NULL: it reads as "we know nothing
  // about them" rather than as the data error it is.
  it("refuses an empty external id rather than loading a NULL key", async () => {
    const { loadConceptSpine } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine");

    await expect(
      loadConceptSpine({
        ref: CONCEPT_REF,
        externalIds: ["p1", "", "p3"],
        datasetDuckDbLease: LEASE,
      }),
    ).rejects.toThrow(/1 individual\(s\) with an empty external_id/);
    expect(loadCsvMock).not.toHaveBeenCalled();
  });

  // A concept with no individuals is an ordinary state, not an error: nobody
  // has generated them yet. `loadCsv` throws on a zero-row file by design, so
  // the empty case takes its own path and answers with an empty relation.
  it("creates an empty typed spine for a concept with no individuals", async () => {
    const { loadConceptSpine } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine");

    await loadConceptSpine({
      ref: CONCEPT_REF,
      externalIds: [],
      datasetDuckDbLease: LEASE,
    });

    expect(loadCsvMock).not.toHaveBeenCalled();
    // The drop has to come first: a previous non-empty load left a *view* over
    // a registered parquet file, and `CREATE TABLE` over an existing view
    // errors.
    expect(dropTableViewAndFileMock).toHaveBeenCalledWith({
      tableOrViewName: SPINE_TABLE,
      datasetDuckDbLease: LEASE,
    });
    expect(runRawQueryMock).toHaveBeenCalledWith(
      `CREATE TABLE "${SPINE_TABLE}" ("external_id" VARCHAR)`,
      { datasetDuckDbLease: LEASE },
    );
  });

  // The DDL has to survive the analyzer every raw query passes through, which
  // rejects anything it cannot fully account for. A hand-checked SQL string
  // proves nothing about that; the real analyzer does.
  it("emits DDL the SQL analyzer accepts and reads as naming no dataset", async () => {
    const { loadConceptSpine } =
      await import("@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine");
    const { DuckDbSqlAnalyzer } =
      await import("@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer");

    await loadConceptSpine({
      ref: CONCEPT_REF,
      externalIds: [],
      datasetDuckDbLease: LEASE,
    });
    const emittedSql = runRawQueryMock.mock.calls[0]?.[0] as string;

    expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(emittedSql)).toEqual({
      kind: "mutating",
      readDatasetIds: [],
      mutatedDatasetIds: [],
    });
  });
});
