import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import { useMeaningMatches } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

const { makeRequestMock } = vi.hoisted(() => {
  return { makeRequestMock: vi.fn() };
});

vi.mock(
  "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions",
  () => {
    return {
      DictionarySuggestions: {
        makeMatchesRequestFromProposal: makeRequestMock,
      },
    };
  },
);

const PROPOSAL = { entries: [] } as unknown as DictionaryProposal.T;
const MATCHES_REQUEST = {
  task: "matches",
  locale: "en",
  columns: [
    { name: "dob", otherNames: [], kind: "date", values: [] },
    { name: "birth_date", otherNames: [], kind: "date", values: [] },
  ],
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
  const onFound = vi.fn();
  const rendered = renderHook(
    () => {
      return useMeaningMatches({ requestReply, onFound });
    },
    { wrapper: _makeWrapper() },
  );
  return { ...rendered, onFound };
}

describe("useMeaningMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeRequestMock.mockReturnValue(MATCHES_REQUEST);
  });

  it.each([
    ["a 400", "INVALID_SUGGESTIONS_REQUEST: a column may not send its values"],
    ["a 413", "SUGGESTIONS_REQUEST_TOO_LARGE: the request is too long"],
  ])(
    "reports the search as failed when the route answers %s",
    async (_name, message) => {
      const { result, onFound } = _render(() => {
        return Promise.reject(new Error(message));
      });
      result.current.findMatches(PROPOSAL);
      await waitFor(() => {
        expect(result.current.status).toBe("failed");
      });
      expect(onFound).not.toHaveBeenCalled();
    },
  );

  it("hands back the matches the reply names", async () => {
    const { result, onFound } = _render(() => {
      return Promise.resolve(
        '{"matches":[{"name":"birth_date","sameAs":"dob"}]}',
      );
    });
    result.current.findMatches(PROPOSAL);
    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });
    expect(onFound).toHaveBeenCalledWith([
      { name: "birth_date", sameAs: "dob" },
    ]);
  });

  it("finds nothing when the user declined to send the request", async () => {
    const { result, onFound } = _render(() => {
      return Promise.resolve(undefined);
    });
    result.current.findMatches(PROPOSAL);
    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });
    expect(onFound).not.toHaveBeenCalled();
  });
});
