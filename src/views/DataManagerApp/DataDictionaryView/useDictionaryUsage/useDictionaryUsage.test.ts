import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { renderHook } from "@/test-utils";
import { useDictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

const mocks = vi.hoisted(() => {
  return {
    bindings: [] as unknown[],
    datasets: [] as unknown[],
    isBindingsError: false,
    crosswalks: [] as unknown[],
    codeLists: [] as unknown[],
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      useGetAll: () => {
        return [mocks.bindings, false, { isError: mocks.isBindingsError }];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      // Row-level security returns only the datasets the user can read.
      useGetAll: () => {
        return [mocks.datasets, false, { isError: false }];
      },
    },
  };
});
vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      useGetAll: () => {
        return [mocks.crosswalks, false, { isError: false }];
      },
    },
  };
});
vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return {
    DataDictionaryCodeListClient: {
      useGetAll: () => {
        return [mocks.codeLists, false, { isError: false }];
      },
    },
  };
});
const DICTIONARY_ID = "dictionary-1" as DataDictionary.Id;

function _binding(
  datasetId: string,
  entryId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    datasetId,
    entryId,
    dictionaryId: DICTIONARY_ID,
    mode: "reference",
    codeListId: "list-sex",
    pinnedPairs: undefined,
    appliedDictionaryVersion: 3,
    ...overrides,
  };
}

const PINNED = {
  mode: "convert",
  pinnedPairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
};

const SEX_PAIRS = [
  { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
];

/** A crosswalk that combined `dataset-combined`, embedding the sex list. */
function _useCombinedDataset(currentPairs: typeof SEX_PAIRS): void {
  mocks.bindings = [_binding("dataset-combined", "entry-gender")];
  mocks.datasets = [
    {
      id: "dataset-combined",
      name: "Measles, all boroughs",
      sourceType: "virtual",
    },
  ];
  mocks.crosswalks = [
    {
      id: "crosswalk-1",
      name: "Borough line lists",
      outputDatasetId: "dataset-combined",
      compiledCodeLists: [
        {
          codeListId: "list-sex",
          fingerprint: CrosswalkSql.getCodeListFingerprint(SEX_PAIRS),
        },
      ],
    },
  ];
  mocks.codeLists = [{ id: "list-sex", pairs: currentPairs }];
}

describe("useDictionaryUsage", () => {
  beforeEach(() => {
    mocks.isBindingsError = false;
    mocks.crosswalks = [];
    mocks.codeLists = [];
    mocks.bindings = [
      _binding("dataset-kings", "entry-gender"),
      _binding("dataset-kings", "entry-gender"),
      _binding("dataset-kings", "entry-outcome"),
      _binding("dataset-bronx", "entry-gender", {
        ...PINNED,
        appliedDictionaryVersion: 2,
      }),
      _binding("dataset-bronx", "entry-outcome", {
        ...PINNED,
        appliedDictionaryVersion: 3,
      }),
      _binding("dataset-labeled", "entry-gender", { mode: "convert" }),
      _binding("dataset-hidden", "entry-gender"),
    ];
    mocks.datasets = [
      { id: "dataset-kings", name: "Kings line list", sourceType: "csv_file" },
      { id: "dataset-bronx", name: "Bronx line list", sourceType: "csv_file" },
      {
        id: "dataset-labeled",
        name: "Kings line list (labeled)",
        sourceType: "virtual",
      },
    ];
  });

  it("says how each readable dataset uses the dictionary, sorted by name", () => {
    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        dictionaryName: "NYS codes",
        currentVersion: 3,
      });
    });

    expect(result.current.rows).toEqual([
      {
        datasetId: "dataset-bronx",
        datasetName: "Bronx line list",
        sourceType: "csv_file",
        entryCount: 2,
        howApplied: "changed",
        appliedVersion: 2,
        isBehind: true,
      },
      {
        datasetId: "dataset-kings",
        datasetName: "Kings line list",
        sourceType: "csv_file",
        entryCount: 2,
        howApplied: "reference",
        appliedVersion: undefined,
        isBehind: false,
      },
      {
        datasetId: "dataset-labeled",
        datasetName: "Kings line list (labeled)",
        sourceType: "virtual",
        entryCount: 1,
        howApplied: "linked",
        appliedVersion: undefined,
        isBehind: false,
      },
    ]);
    expect(result.current.currentVersion).toBe(3);
    expect(result.current.hasError).toBe(false);
  });

  it("does not count a binding pinned because its code list was deleted", () => {
    mocks.bindings = [
      _binding("dataset-labeled", "entry-gender", {
        ...PINNED,
        codeListId: undefined,
        appliedDictionaryVersion: 1,
      }),
    ];
    mocks.datasets = [
      {
        id: "dataset-labeled",
        name: "Kings line list (labeled)",
        sourceType: "virtual",
      },
    ];

    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        dictionaryName: "NYS codes",
        currentVersion: 3,
      });
    });

    expect(result.current.rows[0]).toMatchObject({
      howApplied: "linked",
      appliedVersion: undefined,
      isBehind: false,
    });
  });

  it("reports a failed read", () => {
    mocks.isBindingsError = true;
    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        dictionaryName: "NYS codes",
        currentVersion: 3,
      });
    });
    expect(result.current.hasError).toBe(true);
  });

  it("lists a crosswalk's combined dataset as Crosswalk, up to date while its lists are unchanged", () => {
    _useCombinedDataset(SEX_PAIRS);

    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        dictionaryName: "NYS codes",
        currentVersion: 3,
      });
    });

    expect(result.current.rows).toEqual([
      {
        datasetId: "dataset-combined",
        datasetName: "Measles, all boroughs",
        sourceType: "virtual",
        entryCount: 1,
        howApplied: "crosswalk",
        appliedVersion: undefined,
        isBehind: false,
        crosswalk: { id: "crosswalk-1", name: "Borough line lists" },
      },
    ]);
  });

  it("says a crosswalk's combined dataset is behind once a list it embedded changed", () => {
    _useCombinedDataset([SEX_PAIRS[0]!, { ...SEX_PAIRS[1]!, label: "Woman" }]);

    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        dictionaryName: "NYS codes",
        currentVersion: 3,
      });
    });

    expect(result.current.rows[0]).toMatchObject({
      howApplied: "crosswalk",
      isBehind: true,
    });
  });
});
