import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { act, renderHook, TestProviders } from "@/test-utils";
import { makeInitialNewDictionaryState } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import { useNewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  NewDictionaryState,
  ProposalReadId,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { ReactNode } from "react";

type ReadOptions = {
  onRead: (proposal: DictionaryProposal.T, datasets: unknown[]) => void;
  onFailed: (datasets: unknown[]) => void;
};
type MatchOptions = {
  onFound: (
    matches: unknown[],
    proposal: DictionaryProposal.T,
    readId: ProposalReadId,
  ) => void;
};

const mocks = vi.hoisted(() => {
  return {
    readMock: vi.fn(),
    findMatchesMock: vi.fn(),
    createMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    readOptions: undefined as unknown,
    matchOptions: undefined as unknown,
  };
});

vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets",
  () => {
    return {
      useReadDatasets: (options: unknown) => {
        mocks.readOptions = options;
        return [mocks.readMock, false];
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches",
  () => {
    return {
      useMeaningMatches: (options: unknown) => {
        mocks.matchOptions = options;
        return { findMatches: mocks.findMatchesMock, status: "idle" };
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions",
  () => {
    return {
      useDictionarySuggestions: () => {
        return {
          availability: "online",
          model: "online",
          requestReply: vi.fn(),
        };
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestLabels",
  () => {
    return {
      useSuggestLabels: () => {
        return {
          suggestLabels: vi.fn(),
          suggestingCodeListKey: undefined,
          getLabelsBlockReason: () => {
            return undefined;
          },
        };
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary",
  () => {
    return {
      useCreateDictionary: () => {
        return [mocks.createMock, false];
      },
    };
  },
);
vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [{ userId: "user-1", profileId: "profile-1" }];
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyErrorMock };
});

const DATASET_ID = uuid<Dataset.Id>();
const OTHER_DATASET_ID = uuid<Dataset.Id>();
const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  {
    datasetId: DATASET_ID,
    datasetName: "Kings line list",
    columnName: "GENDER",
    dataType: "varchar",
    rowCount: 10,
    nonNullCount: 10,
    distinctCount: 2,
    values: [
      { value: "1", rowCount: 5 },
      { value: "2", rowCount: 5 },
    ],
    dateShare: undefined,
    numberRange: undefined,
  },
]);
const DATASET = { id: DATASET_ID, name: "Kings line list" };

function _makeSources(
  isLoading = false,
  hasDataset = true,
): NewDictionarySources {
  return {
    datasets: hasDataset ? [DATASET as never] : [],
    columnsByDatasetId: new Map(),
    isLoading,
  };
}

function _render(
  state: NewDictionaryState,
  sources: NewDictionarySources = _makeSources(),
) {
  const dispatch = vi.fn();
  const rendered = renderHook(
    (props: { state: NewDictionaryState }) => {
      return useNewDictionaryFlow({ state: props.state, dispatch, sources });
    },
    {
      initialProps: { state },
      wrapper: (props: { children: ReactNode }) => {
        return <TestProviders>{props.children}</TestProviders>;
      },
    },
  );
  return { ...rendered, dispatch };
}

function _pickedState(): NewDictionaryState {
  return {
    ...makeInitialNewDictionaryState(undefined),
    pickedDatasetIds: [DATASET_ID],
  };
}

function _finishRead(datasets: unknown[] = [{ dataset: DATASET }]): void {
  (mocks.readOptions as ReadOptions).onRead(PROPOSAL, datasets);
}

describe("useNewDictionaryFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hands over a finished read and asks for meaning matches", () => {
    const { dispatch } = _render(_pickedState());
    act(() => {
      _finishRead([{ dataset: { id: DATASET_ID, name: "Kings line list" } }]);
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "datasets_read",
      proposal: PROPOSAL,
      datasetIds: [DATASET_ID],
      readId: expect.any(String),
      defaultName: "Kings line list values",
    });
    // The matches are asked for under the id of the read they belong to.
    const readId = dispatch.mock.calls[0]?.[0].readId;
    expect(mocks.findMatchesMock).toHaveBeenCalledWith(PROPOSAL, readId);
  });

  it("does not ask for matches when the read is for datasets that are no longer picked", () => {
    const { dispatch, rerender } = _render(_pickedState());
    rerender({
      state: {
        ..._pickedState(),
        pickedDatasetIds: [DATASET_ID, OTHER_DATASET_ID],
      },
    });
    act(() => {
      _finishRead();
    });
    expect(mocks.findMatchesMock).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "meaning_matches_found" }),
    );
  });

  it("tags found matches with the read they were found for", () => {
    const { dispatch } = _render(_pickedState());
    const readId = uuid<ProposalReadId>();
    act(() => {
      (mocks.matchOptions as MatchOptions).onFound(
        [{ name: "a", sameAs: "b" }],
        PROPOSAL,
        readId,
      );
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "meaning_matches_found",
      matches: [{ name: "a", sameAs: "b" }],
      readId,
    });
  });

  it("does nothing when a read finishes after the flow was left", () => {
    const { dispatch, unmount } = _render(_pickedState());
    unmount();
    _finishRead();
    expect(dispatch).not.toHaveBeenCalled();
    expect(mocks.findMatchesMock).not.toHaveBeenCalled();
  });

  it("creates the dictionary once when the button is pressed twice in one frame", () => {
    const state: NewDictionaryState = {
      ..._pickedState(),
      proposal: PROPOSAL,
      name: "Kings codes",
    };
    const { result } = _render(state);
    act(() => {
      result.current.createDictionary();
      result.current.createDictionary();
    });
    expect(mocks.createMock).toHaveBeenCalledTimes(1);
  });

  it("reads the dataset whose menu opened the flow once it resolves", () => {
    _render(makeInitialNewDictionaryState(DATASET_ID));
    expect(mocks.readMock).toHaveBeenCalledWith([
      { dataset: DATASET, columns: [] },
    ]);
  });

  it("falls back to Pick with a notice when the origin dataset does not resolve", () => {
    const { dispatch } = _render(
      makeInitialNewDictionaryState(DATASET_ID),
      _makeSources(false, false),
    );
    expect(mocks.readMock).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: "origin_dataset_unavailable",
    });
    expect(mocks.notifyErrorMock).toHaveBeenCalledTimes(1);
  });

  it("waits for the datasets to load before judging the origin dataset", () => {
    const { dispatch } = _render(
      makeInitialNewDictionaryState(DATASET_ID),
      _makeSources(true, false),
    );
    expect(mocks.readMock).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not read an empty list when the picked datasets cannot be found", () => {
    const { result } = _render(_pickedState(), _makeSources(false, false));
    act(() => {
      result.current.readPickedDatasets();
    });
    expect(mocks.readMock).not.toHaveBeenCalled();
    expect(mocks.notifyErrorMock).toHaveBeenCalledTimes(1);
  });

  it("sends the flow back to Pick when reading the datasets fails", () => {
    const { dispatch } = _render(_pickedState());
    act(() => {
      (mocks.readOptions as ReadOptions).onFailed([{ dataset: DATASET }]);
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "read_failed",
      datasetIds: [DATASET_ID],
    });
  });

  it("does nothing when a read fails after the flow was left", () => {
    const { dispatch, unmount } = _render(_pickedState());
    unmount();
    (mocks.readOptions as ReadOptions).onFailed([{ dataset: DATASET }]);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
