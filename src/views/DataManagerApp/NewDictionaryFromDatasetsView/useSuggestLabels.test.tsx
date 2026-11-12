import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import { useSuggestLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestLabels";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

const { makeRequestMock, notifyErrorMock, notifySuccessMock } = vi.hoisted(
  () => {
    return {
      makeRequestMock: vi.fn(),
      notifyErrorMock: vi.fn(),
      notifySuccessMock: vi.fn(),
    };
  },
);

vi.mock(
  "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions",
  () => {
    return {
      DictionarySuggestions: { makeLabelsRequestFromCodeList: makeRequestMock },
    };
  },
);

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: notifyErrorMock, notifySuccess: notifySuccessMock };
});

const PROPOSAL = { entries: [] } as unknown as DictionaryProposal.T;
const CODE_LIST = {
  key: "list-1",
  entryKeys: ["entry-1"],
} as unknown as DictionaryProposal.CodeList;
const LABELS_REQUEST = {
  task: "labels",
  locale: "en",
  column: { name: "sex", otherNames: [], kind: "categorical", values: ["1"] },
};

function _makeWrapper(): (props: { children: ReactNode }) => JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (props) => {
    return (
      <TestProviders>
        <QueryClientProvider client={queryClient}>
          {props.children}
        </QueryClientProvider>
      </TestProviders>
    );
  };
}

function _render(requestReply: () => Promise<string | undefined>) {
  const dispatch = vi.fn();
  const rendered = renderHook(
    () => {
      return useSuggestLabels({
        proposal: PROPOSAL,
        model: "online",
        requestReply,
        dispatch,
      });
    },
    { wrapper: _makeWrapper() },
  );
  return { ...rendered, dispatch };
}

describe("useSuggestLabels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeRequestMock.mockReturnValue(LABELS_REQUEST);
  });

  it.each([
    ["a 400", "INVALID_SUGGESTIONS_REQUEST: a column may not send its values"],
    ["a 413", "SUGGESTIONS_REQUEST_TOO_LARGE: the request is too long"],
  ])(
    "says suggestions did not come back and fills nothing in when the route answers %s",
    async (_name, message) => {
      const { result, dispatch } = _render(() => {
        return Promise.reject(new Error(message));
      });
      result.current.suggestLabels(CODE_LIST);
      await waitFor(() => {
        expect(notifyErrorMock).toHaveBeenCalledTimes(1);
      });
      expect(dispatch).not.toHaveBeenCalled();
      expect(notifySuccessMock).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(result.current.suggestingCodeListKey).toBeUndefined();
      });
    },
  );

  it("fills the suggested labels in", async () => {
    const { result, dispatch } = _render(() => {
      return Promise.resolve(
        '{"labels":[{"value":"1","label":"Male","isMissing":false}],"description":"Sex."}',
      );
    });
    result.current.suggestLabels(CODE_LIST);
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({
        type: "labels_suggested",
        codeListKey: "list-1",
        entryKey: "entry-1",
        suggestions: {
          labels: [{ value: "1", label: "Male", isMissing: false }],
          description: "Sex.",
        },
      });
    });
  });

  it("fills nothing in when the user declined to send the request", async () => {
    const { result, dispatch } = _render(() => {
      return Promise.resolve(undefined);
    });
    result.current.suggestLabels(CODE_LIST);
    await waitFor(() => {
      expect(result.current.suggestingCodeListKey).toBeUndefined();
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("says a code list cannot be sent when no request can be made for it", () => {
    const { result } = _render(() => {
      return Promise.resolve(undefined);
    });
    makeRequestMock.mockReturnValueOnce(undefined);
    expect(result.current.canSuggestLabels(CODE_LIST)).toBe(false);
    expect(result.current.canSuggestLabels(CODE_LIST)).toBe(true);
    expect(makeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ proposal: PROPOSAL, codeList: CODE_LIST }),
    );
  });
});
