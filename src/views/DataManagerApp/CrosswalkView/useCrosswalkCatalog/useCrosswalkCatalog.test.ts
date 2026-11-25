import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useCrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const BRONX_ID = "dddddddd-0000-4000-8000-000000000001" as Dataset.Id;
const KINGS_ID = "dddddddd-0000-4000-8000-000000000002" as Dataset.Id;
const NYS_ID = "eeeeeeee-0000-4000-8000-000000000001" as DataDictionary.Id;
const SEX_ENTRY_ID =
  "eeeeeeee-0000-4000-8000-000000000002" as DataDictionaryEntry.Id;

const mocks = vi.hoisted(() => {
  return {
    datasets: undefined as unknown[] | undefined,
    columns: undefined as unknown[] | undefined,
    bindings: undefined as unknown[] | undefined,
    isDictionaryLoading: false,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [mocks.datasets, mocks.datasets === undefined];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [mocks.columns, mocks.columns === undefined];
      },
    },
  };
});
vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      useGetAll: () => {
        return [mocks.bindings, mocks.bindings === undefined];
      },
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents",
  () => {
    return {
      useWorkspaceDictionaryContents: () => {
        return {
          dictionaries: [{ id: NYS_ID, name: "NYS" }],
          entries: [
            {
              id: SEX_ENTRY_ID,
              dictionaryId: NYS_ID,
              name: "sex",
              columnNames: ["sex"],
              kind: "categorical",
              position: 0,
            },
          ],
          codeLists: [],
          codings: [],
          isLoading: mocks.isDictionaryLoading,
          hasLoadFailed: false,
        };
      },
    };
  },
);

function _column(
  datasetId: Dataset.Id,
  name: string,
  columnIdx: number,
): DatasetColumn.T {
  return {
    id: `${datasetId}-${name}`,
    datasetId,
    name,
    dataType: "varchar",
    columnIdx,
  } as unknown as DatasetColumn.T;
}

describe("useCrosswalkCatalog", () => {
  beforeEach(() => {
    mocks.datasets = [
      { id: BRONX_ID, name: "Bronx line list" },
      { id: KINGS_ID, name: "Kings line list" },
    ];
    mocks.columns = [
      _column(BRONX_ID, "county", 2),
      _column(BRONX_ID, "case_id", 0),
      _column(BRONX_ID, "sex", 1),
      _column(KINGS_ID, "CaseNo", 0),
    ];
    mocks.bindings = [
      {
        id: "binding-1",
        datasetId: BRONX_ID,
        datasetColumnId: `${BRONX_ID}-sex`,
      },
      {
        id: "binding-2",
        datasetId: KINGS_ID,
        datasetColumnId: `${KINGS_ID}-CaseNo`,
      },
    ] as unknown as DictionaryBinding.T[];
    mocks.isDictionaryLoading = false;
  });

  it("lists every dataset with its columns in column order", () => {
    const { result } = renderHook(() => {
      return useCrosswalkCatalog([BRONX_ID]);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.context.datasetsById.get(BRONX_ID)).toEqual({
      id: BRONX_ID,
      name: "Bronx line list",
      columns: [
        { name: "case_id", dataType: "varchar" },
        { name: "sex", dataType: "varchar" },
        { name: "county", dataType: "varchar" },
      ],
    });
    expect(result.current.columnNameById.get(`${BRONX_ID}-sex`)).toBe("sex");
  });

  it("makes every dictionary entry ready to match, by id", () => {
    const { result } = renderHook(() => {
      return useCrosswalkCatalog([]);
    });

    expect(result.current.context.entriesById.get(SEX_ENTRY_ID)).toMatchObject({
      entryId: SEX_ENTRY_ID,
      dictionaryId: NYS_ID,
      entryName: "sex",
    });
  });

  it("keeps only the bindings of the given datasets", () => {
    const { result } = renderHook(() => {
      return useCrosswalkCatalog([BRONX_ID]);
    });

    expect(result.current.bindingsByDatasetId.get(BRONX_ID)).toHaveLength(1);
    expect(result.current.bindingsByDatasetId.has(KINGS_ID)).toBe(false);
  });

  it("is loading until every query has answered", () => {
    mocks.columns = undefined;
    const { result } = renderHook(() => {
      return useCrosswalkCatalog([]);
    });

    expect(result.current.isLoading).toBe(true);
  });
});
