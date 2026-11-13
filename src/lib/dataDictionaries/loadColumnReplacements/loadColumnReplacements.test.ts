import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { loadColumnReplacements } from "@/lib/dataDictionaries/loadColumnReplacements/loadColumnReplacements";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

const {
  BINDINGS_QUERY_KEY,
  COLUMNS_QUERY_KEY,
  bindingsGetAllMock,
  codeListsGetAllMock,
  columnsGetAllMock,
} = vi.hoisted(() => {
  return {
    BINDINGS_QUERY_KEY: ["DictionaryBindingClient", "getAll", "test"],
    COLUMNS_QUERY_KEY: ["DatasetColumnClient", "getAll", "test"],
    bindingsGetAllMock: vi.fn(),
    codeListsGetAllMock: vi.fn(),
    columnsGetAllMock: vi.fn(),
  };
});

// Reads go through the real query cache, so a test can tell a read that
// serves invalidated rows from one that reads them again.
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  type QueryCache = Pick<QueryClient, "ensureQueryData" | "fetchQuery">;
  const toGetAll = (read: QueryCache["fetchQuery"]) => {
    return {
      getAll: (params: unknown) => {
        return read({
          queryKey: COLUMNS_QUERY_KEY,
          queryFn: () => {
            return columnsGetAllMock(params);
          },
        });
      },
    };
  };
  return {
    DatasetColumnClient: {
      QueryKeys: {
        getAll: () => {
          return COLUMNS_QUERY_KEY;
        },
      },
      withCache: (queryClient: QueryCache) => {
        return {
          withEnsureQueryData: () => {
            return toGetAll(queryClient.ensureQueryData.bind(queryClient));
          },
          withFetchQuery: () => {
            return toGetAll(queryClient.fetchQuery.bind(queryClient));
          },
        };
      },
    },
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      QueryKeys: {
        getAll: () => {
          return BINDINGS_QUERY_KEY;
        },
      },
      withCache: () => {
        return {
          withFetchQuery: () => {
            return { getAll: bindingsGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return {
    DataDictionaryCodeListClient: {
      QueryKeys: {
        getAll: () => {
          return ["DataDictionaryCodeListClient", "getAll", "test"];
        },
      },
      withCache: () => {
        return {
          withFetchQuery: () => {
            return { getAll: codeListsGetAllMock };
          },
        };
      },
    },
  };
});

const DATASET_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const WORKSPACE_ID = "44444444-4444-4444-8444-444444444444" as Workspace.Id;
const GENDER_ID = "11111111-1111-4111-8111-111111111111" as DatasetColumn.Id;
const LIST_ID =
  "55555555-5555-4555-8555-555555555555" as DataDictionaryCodeList.Id;

const SEX_PAIRS: DataDictionaryCodeList.Pair[] = [
  { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
];

const GENDER = Model.make("DatasetColumn", {
  id: GENDER_ID,
  datasetId: DATASET_ID,
  workspaceId: WORKSPACE_ID,
  createdAt: "2026-11-13T00:00:00.000Z",
  updatedAt: "2026-11-13T00:00:00.000Z",
  name: "GENDER",
  originalName: "GENDER",
  originalDataType: "BIGINT",
  detectedDataType: "BIGINT",
  dataType: "varchar",
  description: undefined,
  columnIdx: 0,
  dictionaryBindingId: undefined,
});

function _makeBinding(
  overrides: Partial<DictionaryBinding.T> = {},
): DictionaryBinding.T {
  return Model.make("DictionaryBinding", {
    id: "66666666-6666-4666-8666-666666666666" as DictionaryBinding.Id,
    workspaceId: WORKSPACE_ID,
    datasetId: DATASET_ID,
    datasetColumnId: GENDER_ID,
    dictionaryId: "77777777-7777-4777-8777-777777777777" as DataDictionary.Id,
    entryId: "88888888-8888-4888-8888-888888888888" as DataDictionaryEntry.Id,
    codeListId: LIST_ID,
    mode: "convert",
    direction: "decode",
    appliedDictionaryVersion: 1,
    createdAt: "2026-11-13T00:00:00.000Z",
    updatedAt: "2026-11-13T00:00:00.000Z",
    keepsOriginal: false,
    valueOverrides: [],
    pinnedPairs: undefined,
    pinnedIsOrdered: undefined,
    replacedDataType: "bigint",
    ...overrides,
  });
}

function _makeCodeList(
  pairs: DataDictionaryCodeList.Pair[],
): DataDictionaryCodeList.T {
  return Model.make("DataDictionaryCodeList", {
    id: LIST_ID,
    workspaceId: WORKSPACE_ID,
    dictionaryId: "77777777-7777-4777-8777-777777777777" as DataDictionary.Id,
    name: "Sex (1/2)",
    isOrdered: false,
    pairs,
    createdAt: "2026-11-13T00:00:00.000Z",
    updatedAt: "2026-11-13T00:00:00.000Z",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  AvaQueryClient.clear();
  columnsGetAllMock.mockResolvedValue([GENDER]);
  bindingsGetAllMock.mockResolvedValue([]);
  codeListsGetAllMock.mockResolvedValue([]);
});

describe("loadColumnReplacements", () => {
  it("reads nothing for a query that names no dataset", async () => {
    const loaded = await loadColumnReplacements([]);

    expect(loaded).toEqual({
      replacementsByDatasetId: {},
      projectionKeyByDatasetId: {},
    });
    expect(columnsGetAllMock).not.toHaveBeenCalled();
    expect(bindingsGetAllMock).not.toHaveBeenCalled();
  });

  it("reads no code list when no column converts", async () => {
    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(codeListsGetAllMock).not.toHaveBeenCalled();
    expect(bindingsGetAllMock).toHaveBeenCalledWith({
      where: { dataset_id: { in: [DATASET_ID] }, mode: { eq: "convert" } },
    });
    expect(loaded.projectionKeyByDatasetId[DATASET_ID]).toBeDefined();
  });

  it("converts a column with its live code list", async () => {
    bindingsGetAllMock.mockResolvedValue([_makeBinding()]);
    codeListsGetAllMock.mockResolvedValue([_makeCodeList(SEX_PAIRS)]);

    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(codeListsGetAllMock).toHaveBeenCalledWith({
      where: { id: { in: [LIST_ID] } },
    });
    expect(loaded.replacementsByDatasetId[DATASET_ID]).toEqual([
      expect.objectContaining({
        originalName: "GENDER",
        valueMapping: expect.objectContaining({
          direction: "decode",
          pairs: SEX_PAIRS,
        }),
      }),
    ]);
  });

  it("converts a pinned column with its pinned pairs, reading no code list", async () => {
    bindingsGetAllMock.mockResolvedValue([
      _makeBinding({ pinnedPairs: SEX_PAIRS, pinnedIsOrdered: false }),
    ]);

    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(codeListsGetAllMock).not.toHaveBeenCalled();
    expect(
      loaded.replacementsByDatasetId[DATASET_ID]?.[0]?.valueMapping?.pairs,
    ).toEqual(SEX_PAIRS);
  });

  it("gives a relabeled list a new projection key", async () => {
    bindingsGetAllMock.mockResolvedValue([_makeBinding()]);
    codeListsGetAllMock.mockResolvedValue([_makeCodeList(SEX_PAIRS)]);
    const before = await loadColumnReplacements([DATASET_ID]);
    codeListsGetAllMock.mockResolvedValue([
      _makeCodeList([
        { code: "1", label: "Man", acceptedSpellings: [], isMissing: false },
      ]),
    ]);

    const after = await loadColumnReplacements([DATASET_ID]);

    expect(after.projectionKeyByDatasetId[DATASET_ID]).not.toBe(
      before.projectionKeyByDatasetId[DATASET_ID],
    );
  });

  it("reads the columns again once they are invalidated, so a column converted since converts to labels", async () => {
    // Read before converting: GENDER holds its codes as numbers.
    columnsGetAllMock.mockResolvedValue([{ ...GENDER, dataType: "bigint" }]);
    await loadColumnReplacements([DATASET_ID]);
    // Converting retypes GENDER to text and invalidates the columns.
    columnsGetAllMock.mockResolvedValue([GENDER]);
    bindingsGetAllMock.mockResolvedValue([
      _makeBinding({ pinnedPairs: SEX_PAIRS, pinnedIsOrdered: false }),
    ]);
    await AvaQueryClient.invalidateQueries({ queryKey: COLUMNS_QUERY_KEY });

    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(
      loaded.replacementsByDatasetId[DATASET_ID]?.[0]?.valueMapping
        ?.outputDataType,
    ).toBe("varchar");
  });

  it("converts with the cached bindings when a fresh read fails", async () => {
    AvaQueryClient.setQueryData(BINDINGS_QUERY_KEY, [
      _makeBinding({ pinnedPairs: SEX_PAIRS, pinnedIsOrdered: false }),
    ]);
    bindingsGetAllMock.mockRejectedValue(new Error("Failed to fetch"));

    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(
      loaded.replacementsByDatasetId[DATASET_ID]?.[0]?.valueMapping,
    ).toBeDefined();
  });

  it("loads unconverted, and never fails the query, when nothing can be read", async () => {
    bindingsGetAllMock.mockRejectedValue(new Error("Failed to fetch"));

    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(loaded.replacementsByDatasetId[DATASET_ID]).toEqual([
      // Without its conversion GENDER is only a retyped column.
      { originalName: "GENDER", alias: undefined, dataType: "VARCHAR" },
    ]);
  });

  it("loads with no replacements and no keys, and never fails the query, when the columns cannot be read", async () => {
    // Offline with nothing cached: no key means a loaded view stays current,
    // and an unloaded one loads as its Parquet holds it.
    columnsGetAllMock.mockRejectedValue(new Error("Failed to fetch"));

    const loaded = await loadColumnReplacements([DATASET_ID]);

    expect(loaded).toEqual({
      replacementsByDatasetId: {},
      projectionKeyByDatasetId: {},
    });
    expect(bindingsGetAllMock).not.toHaveBeenCalled();
  });
});
