import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { describe, expect, it } from "vitest";
import { buildDataExplorerStateFromUrl } from "@/views/DataExplorerApp/buildDataExplorerStateFromUrl/buildDataExplorerStateFromUrl";
import { serializeDataExplorerStateToUrl } from "@/views/DataExplorerApp/serializeDataExplorerStateToUrl/serializeDataExplorerStateToUrl";
import type {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { VirtualDatasetId } from "$/models/datasets/VirtualDataset/VirtualDataset.types";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function _mockQueryColumn(
  queryId: string,
  baseId: string,
  name: string,
): QueryColumnRead {
  return {
    id: queryId as QueryColumnId,
    aggregation: undefined,
    baseColumn: { id: baseId as DatasetColumnId, name, dataType: "varchar" },
  } as QueryColumnRead;
}

function _makeState(overrides: {
  query?: PartialStructuredQuery;
  rawSQL?: string;
  vizConfig?: VizConfig;
  openDataset?: OpenDatasetInfo;
}): DataExplorerAppState {
  return {
    query: StructuredQuery.makeEmpty(),
    vizConfig: { vizType: "table" },
    rawSQL: undefined,
    nlPrompt: undefined,
    openDataset: undefined,
    lastQueryError: undefined,
    ...overrides,
  };
}

function _makeQueryWithColumns(
  dataSource: QueryDataSource,
  columns: QueryColumnRead[],
): PartialStructuredQuery {
  return {
    ...StructuredQuery.makeEmpty(),
    dataSource,
    queryColumns: columns,
    aggregations: {},
  } as unknown as PartialStructuredQuery;
}

const DS_ID = "2d527857-010e-498f-99af-a7a7c70cef5a";
const MOCK_DS = { id: DS_ID } as QueryDataSource;

// ---------------------------------------------------------------------------
// serializeStateToURL
// ---------------------------------------------------------------------------

describe("serializeStateToURL", () => {
  it("produces an empty param object for the initial empty state", () => {
    const result = serializeDataExplorerStateToUrl(_makeState({}));
    expect(result).toEqual({});
  });

  it("serializes the data source id into ds", () => {
    const result = serializeDataExplorerStateToUrl(
      _makeState({
        query: _makeQueryWithColumns(MOCK_DS, []),
      }),
    );
    expect(result.ds).toBe(DS_ID);
  });

  it("serializes column names as a comma-separated cols string", () => {
    const col1 = _mockQueryColumn("q1", "b1", "month");
    const col2 = _mockQueryColumn("q2", "b2", "total_cases");
    const result = serializeDataExplorerStateToUrl(
      _makeState({
        query: _makeQueryWithColumns(MOCK_DS, [col1, col2]),
      }),
    );
    expect(result.cols).toBe("month,total_cases");
  });

  it("omits cols when no columns are selected", () => {
    const result = serializeDataExplorerStateToUrl(
      _makeState({ query: _makeQueryWithColumns(MOCK_DS, []) }),
    );
    expect(result.cols).toBeUndefined();
  });

  it("omits agg when all aggregations are none", () => {
    const col = _mockQueryColumn("q1", "b1", "month");
    const query = {
      ..._makeQueryWithColumns(MOCK_DS, [col]),
      aggregations: { ["q1" as QueryColumnId]: "none" as const },
    } as unknown as PartialStructuredQuery;
    const result = serializeDataExplorerStateToUrl(_makeState({ query }));
    expect(result.agg).toBeUndefined();
  });

  it("includes agg only for non-none aggregations", () => {
    const col = _mockQueryColumn("q1", "b1", "total_cases");
    const query = {
      ..._makeQueryWithColumns(MOCK_DS, [col]),
      aggregations: { ["q1" as QueryColumnId]: "sum" as const },
    } as unknown as PartialStructuredQuery;
    const result = serializeDataExplorerStateToUrl(_makeState({ query }));
    expect(result.agg).toBe("total_cases:sum");
  });

  it("serializes rawSQL into the sql param", () => {
    const result = serializeDataExplorerStateToUrl(
      _makeState({ rawSQL: "SELECT * FROM t" }),
    );
    expect(result.sql).toBe("SELECT * FROM t");
  });

  it("includes vc when vizType is not the default table", () => {
    const vizConfig: VizConfig = {
      vizType: "line",
      xAxisKey: "month",
      yAxisKey: "total_cases",
      withLegend: false,
      curveType: "monotone",
    };
    const result = serializeDataExplorerStateToUrl(_makeState({ vizConfig }));
    expect(result.vc).toBeDefined();
    expect(JSON.parse(result.vc!)).toMatchObject({
      vizType: "line",
      xAxisKey: "month",
    });
  });

  it("omits vc when vizType is the default table", () => {
    const result = serializeDataExplorerStateToUrl(
      _makeState({ vizConfig: { vizType: "table" } }),
    );
    expect(result.vc).toBeUndefined();
  });

  it("omits ds, cols, agg, and order when rawSQL is set", () => {
    const col = _mockQueryColumn("q1", "b1", "month");
    const query = {
      ..._makeQueryWithColumns(MOCK_DS, [col]),
      aggregations: { ["q1" as QueryColumnId]: "sum" as const },
      orderByColumn: "q1" as QueryColumnId,
      orderByDirection: "desc" as const,
    } as unknown as PartialStructuredQuery;
    const result = serializeDataExplorerStateToUrl(
      _makeState({ query, rawSQL: "SELECT 1" }),
    );
    expect(result.sql).toBe("SELECT 1");
    expect(result.ds).toBeUndefined();
    expect(result.cols).toBeUndefined();
    expect(result.agg).toBeUndefined();
    expect(result.orderBy).toBeUndefined();
    expect(result.orderDir).toBeUndefined();
  });

  it("serializes openDataset into the od param", () => {
    const openDataset: OpenDatasetInfo = {
      datasetId: "did-1" as DatasetId,
      name: "My Dataset",
      virtualDatasetId: "vid-1" as VirtualDatasetId,
    };
    const result = serializeDataExplorerStateToUrl(_makeState({ openDataset }));
    expect(result.od).toBeDefined();
    const parsed = JSON.parse(result.od!);
    expect(parsed).toEqual({ did: "did-1", name: "My Dataset", vid: "vid-1" });
  });
});

// ---------------------------------------------------------------------------
// Round-trip: serializeStateToURL → buildDataExplorerStateFromUrl
// ---------------------------------------------------------------------------

describe("round-trip: serialize then parse", () => {
  it("preserves ds and cols through a serialize/parse cycle", () => {
    const col1 = _mockQueryColumn("q1", "b1", "month");
    const col2 = _mockQueryColumn("q2", "b2", "total_cases");
    const state = _makeState({
      query: _makeQueryWithColumns(MOCK_DS, [col1, col2]),
    });

    const parsed = buildDataExplorerStateFromUrl(
      serializeDataExplorerStateToUrl(state),
    );

    expect(parsed.dsId).toBe(DS_ID);
    expect(parsed.colNames).toEqual(["month", "total_cases"]);
  });

  it("preserves rawSQL through a serialize/parse cycle", () => {
    const sql = "SELECT month, total_cases FROM t";
    const parsed = buildDataExplorerStateFromUrl(
      serializeDataExplorerStateToUrl(_makeState({ rawSQL: sql })),
    );
    expect(parsed.rawSql).toBe(sql);
  });

  it("does not put structured keys in URL when rawSQL is set", () => {
    const col1 = _mockQueryColumn("q1", "b1", "month");
    const state = _makeState({
      query: _makeQueryWithColumns(MOCK_DS, [col1]),
      rawSQL: 'SELECT * FROM "dummy"',
    });
    const parsed = buildDataExplorerStateFromUrl(
      serializeDataExplorerStateToUrl(state),
    );
    expect(parsed.rawSql).toBe('SELECT * FROM "dummy"');
    expect(parsed.dsId).toBeUndefined();
    expect(parsed.colNames).toBeUndefined();
  });

  it("preserves vizConfig type through a serialize/parse cycle", () => {
    const vizConfig: VizConfig = {
      vizType: "bar",
      xAxisKey: "month",
      yAxisKey: "total_cases",
      withLegend: true,
    };
    const parsed = buildDataExplorerStateFromUrl(
      serializeDataExplorerStateToUrl(_makeState({ vizConfig })),
    );
    expect(parsed.vizConfig?.vizType).toBe("bar");
  });
});
