import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DOB,
  makeMeaningDraft,
  MEANING_CONTEXT,
  MEANING_SOURCES,
  MEANING_SOURCES_BY_NAME,
  MEANING_TARGETS,
  QUEENS_LAYOUT,
  REFERENCE_LAYOUT,
} from "@/lib/crosswalks/__tests__/meaningMatchFixtures";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import {
  useCrosswalkMeaningMatches,
  useCrosswalkSuggestionConsent,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    availability: "online" as string,
    model: "online" as string,
    requestReply: vi.fn(),
    consentOptions: undefined as
      | undefined
      | { consent: string; onConsentDecided: (isApproved: boolean) => void },
  };
});

vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions",
  () => {
    return {
      useDictionarySuggestions: (options: typeof mocks.consentOptions) => {
        mocks.consentOptions = options;
        return {
          availability: mocks.availability,
          model: mocks.model,
          requestReply: mocks.requestReply,
        };
      },
    };
  },
);

/** Providers with one query client for the whole render, rerenders included. */
function _makeWrapper(): (props: { children: ReactNode }) => ReactNode {
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

function _render(layoutId: CrosswalkLayout.Id = QUEENS_LAYOUT) {
  const dispatch = vi.fn();
  const rendered = renderHook(
    (props: { layoutId: CrosswalkLayout.Id }) => {
      // Step 2 keeps the consent above the shown layout. Kept here too.
      const suggestionConsent = useCrosswalkSuggestionConsent();
      return useCrosswalkMeaningMatches({
        draft: makeMeaningDraft(),
        layoutId: props.layoutId,
        context: MEANING_CONTEXT,
        targets: MEANING_TARGETS,
        profilesBySourceColumn: MEANING_SOURCES_BY_NAME,
        suggestionConsent,
        dispatch,
      });
    },
    { wrapper: _makeWrapper(), initialProps: { layoutId } },
  );
  return { ...rendered, dispatch };
}

describe("useCrosswalkMeaningMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.availability = "online";
    mocks.model = "online";
  });

  it("dispatches the pairs that join a combined-dataset column to a layout column", async () => {
    mocks.requestReply.mockResolvedValue(
      '{"matches":[{"name":"birth_date","sameAs":"dob"},{"name":"sex","sameAs":"dob"}]}',
    );
    const { result, dispatch } = _render();

    act(() => {
      result.current.suggestMatches();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });
    expect(mocks.requestReply).toHaveBeenCalledWith(
      expect.objectContaining({ task: "matches", locale: "en" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "meaning_matches_found",
      layoutId: QUEENS_LAYOUT,
      matches: [{ columnId: DOB, sourceColumn: "birth_date" }],
      sources: MEANING_SOURCES,
      context: MEANING_CONTEXT,
    });
    expect(result.current.foundCount).toBe(1);
  });

  it("dispatches nothing and says done when the user declined to send", async () => {
    mocks.requestReply.mockResolvedValue(undefined);
    const { result, dispatch } = _render();

    act(() => {
      result.current.suggestMatches();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.foundCount).toBe(0);
  });

  it("reports a failed search without dispatching", async () => {
    mocks.requestReply.mockRejectedValue(
      new Error("SUGGESTIONS_REQUEST_TOO_LARGE"),
    );
    const { result, dispatch } = _render();

    act(() => {
      result.current.suggestMatches();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("failed");
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("shows another layout's search as idle", async () => {
    mocks.requestReply.mockResolvedValue('{"matches":[]}');
    const { result, rerender } = _render();

    act(() => {
      result.current.suggestMatches();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });
    rerender({ layoutId: REFERENCE_LAYOUT });

    expect(result.current.status).toBe("idle");
    expect(result.current.foundCount).toBeUndefined();
  });

  it("cannot suggest with nothing to ask, or with no model", () => {
    expect(_render(REFERENCE_LAYOUT).result.current.canSuggest).toBe(false);
    mocks.availability = "unavailable";
    mocks.model = "unavailable";
    expect(_render().result.current.canSuggest).toBe(false);
    mocks.availability = "declined";
    mocks.model = "online";
    expect(_render().result.current.canSuggest).toBe(false);
  });

  it("keeps the user's consent answer for the rest of the session", () => {
    const { rerender } = _render();

    act(() => {
      mocks.consentOptions?.onConsentDecided(false);
    });
    rerender({ layoutId: QUEENS_LAYOUT });

    expect(mocks.consentOptions?.consent).toBe("declined");
  });
});
