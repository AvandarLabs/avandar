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
  };
});

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        useGetById: () => {
          return [mocks.dictionary, undefined, mocks.dictionaryQuery];
        },
      },
    };
  },
);

function _mockListClient(): { useGetAll: () => unknown[] } {
  return {
    useGetAll: () => {
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
    mocks.dictionary = DICTIONARY;
    _setDictionaryQuery({ isError: false, isLoadingError: false });
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
