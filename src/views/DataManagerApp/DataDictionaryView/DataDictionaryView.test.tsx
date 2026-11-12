import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DataDictionaryView } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryView";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type QueryState = { isError: boolean; isLoadingError: boolean };

const DICTIONARY = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Measles",
} as unknown as DataDictionary.T;

const mocks = vi.hoisted(() => {
  return {
    dictionaryQuery: { isError: false, isLoadingError: false },
    dictionary: undefined as unknown,
    getByIdOptions: [] as unknown[],
    getAllOptions: [] as unknown[],
  };
});

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        useGetById: (options: unknown) => {
          mocks.getByIdOptions.push(options);
          return [mocks.dictionary, undefined, mocks.dictionaryQuery];
        },
      },
    };
  },
);

function _mockListClient(): { useGetAll: (options: unknown) => unknown[] } {
  return {
    useGetAll: (options: unknown) => {
      mocks.getAllOptions.push(options);
      return [[], undefined, { isError: false, isLoadingError: false }];
    },
  };
}

vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return { DataDictionaryCodeListClient: _mockListClient() };
});
vi.mock("@/clients/dataDictionaries/DataDictionaryEntryClient", () => {
  return { DataDictionaryEntryClient: _mockListClient() };
});
vi.mock("@/clients/dataDictionaries/DataDictionaryEntryCodingClient", () => {
  return { DataDictionaryEntryCodingClient: _mockListClient() };
});
vi.mock(
  "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor",
  () => {
    return {
      DataDictionaryEditor: () => {
        return <div>Editor is open</div>;
      },
    };
  },
);

function _setDictionaryQuery(state: QueryState): void {
  mocks.dictionaryQuery = state;
}

describe("DataDictionaryView", () => {
  beforeEach(() => {
    mocks.getByIdOptions = [];
    mocks.getAllOptions = [];
    mocks.dictionary = DICTIONARY;
    _setDictionaryQuery({ isError: false, isLoadingError: false });
  });

  it("refetches every query on mount so a quick reload never shows a pre-save snapshot", () => {
    render(<DataDictionaryView dictionaryId={DICTIONARY.id} />);
    const allOptions = [...mocks.getByIdOptions, ...mocks.getAllOptions];
    expect(allOptions).toHaveLength(4);
    for (const options of allOptions) {
      expect(options).toMatchObject({
        useQueryOptions: { refetchOnMount: "always" },
      });
    }
  });

  it("shows the error state when the first load fails", () => {
    mocks.dictionary = undefined;
    _setDictionaryQuery({ isError: true, isLoadingError: true });
    render(<DataDictionaryView dictionaryId={DICTIONARY.id} />);
    expect(screen.getByText("Dictionary failed to load")).toBeInTheDocument();
  });

  it("keeps the editor open when a refetch fails after the data loaded", () => {
    _setDictionaryQuery({ isError: true, isLoadingError: false });
    render(<DataDictionaryView dictionaryId={DICTIONARY.id} />);
    expect(screen.getByText("Editor is open")).toBeInTheDocument();
    expect(
      screen.queryByText("Dictionary failed to load"),
    ).not.toBeInTheDocument();
  });
});
