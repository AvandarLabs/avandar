import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { renderHook } from "@/test-utils";
import { useExplorerColumnCodes } from "@/views/DataExplorerApp/useExplorerColumnCodes/useExplorerColumnCodes";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

const KINGS_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const QUEENS_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Dataset.Id;

const mocks = vi.hoisted(() => {
  return {
    useGetAllColumns: vi.fn(),
    useDatasetColumnCodes: vi.fn(),
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { useGetAll: mocks.useGetAllColumns } };
});
vi.mock(
  "@/hooks/dataDictionaries/useDatasetColumnCodes/useDatasetColumnCodes",
  () => {
    return { useDatasetColumnCodes: mocks.useDatasetColumnCodes };
  },
);

function _makeCodes(dictionaryName: string): ColumnCodes.T {
  return {
    direction: "decode",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    ],
    description: undefined,
    datasetColumnId: `${dictionaryName}-gender`,
    dictionaryId: dictionaryName,
    dictionaryName,
    entryName: "sex",
    codeListName: undefined,
    isOrdered: false,
    mode: "reference",
  };
}

const KINGS_CODES = _makeCodes("kings");
const QUEENS_CODES = _makeCodes("queens");
const RESULT_COLUMNS: QueryResult.Column[] = [
  { name: "GENDER", dataType: "bigint" },
];

function _projectionsFrom(datasetId: string) {
  return makeProjectionDescriptorsFromSql({
    sql: `SELECT "GENDER" FROM "${datasetId}"`,
    columns: RESULT_COLUMNS,
  });
}

describe("useExplorerColumnCodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useGetAllColumns.mockReturnValue([[], false]);
    mocks.useDatasetColumnCodes.mockImplementation(
      (options: { datasetId: Dataset.Id | undefined }) => {
        const codes =
          options.datasetId === KINGS_ID
            ? KINGS_CODES
            : options.datasetId === QUEENS_ID
              ? QUEENS_CODES
              : undefined;
        return {
          byColumnId: new Map(),
          byColumnName: new Map(codes ? [["GENDER", codes]] : []),
          isLoading: false,
        };
      },
    );
  });

  it("reads no columns and gives no codes when no dataset is selected", () => {
    const projections = makeProjectionDescriptorsFromSql({
      sql: "SELECT 1 AS one",
      columns: [{ name: "one", dataType: "bigint" }],
    });
    const { result } = renderHook(() => {
      return useExplorerColumnCodes(projections, RESULT_COLUMNS);
    });

    expect(result.current.size).toBe(0);
    expect(mocks.useGetAllColumns).toHaveBeenLastCalledWith(
      expect.objectContaining({ useQueryOptions: { enabled: false } }),
    );
    expect(mocks.useDatasetColumnCodes).toHaveBeenLastCalledWith(
      expect.objectContaining({ datasetId: undefined }),
    );
  });

  it("follows the query to another dataset", () => {
    const { result, rerender } = renderHook(
      (props: { datasetId: string }) => {
        return useExplorerColumnCodes(
          _projectionsFrom(props.datasetId),
          RESULT_COLUMNS,
        );
      },
      { initialProps: { datasetId: KINGS_ID } },
    );
    expect(result.current.get("GENDER")).toBe(KINGS_CODES);

    rerender({ datasetId: QUEENS_ID });

    expect(result.current.get("GENDER")).toBe(QUEENS_CODES);
    expect(mocks.useDatasetColumnCodes).toHaveBeenLastCalledWith(
      expect.objectContaining({ datasetId: QUEENS_ID }),
    );
  });
});
