import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { act, renderHook, waitFor } from "@/test-utils";
import {
  buildCaseActivityFeedQueryKey,
  useCaseActivityFeed,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { ActivityEvent } from "$/models/activity/ActivityEvent/ActivityEvent";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  ActivityFeedEntry,
  ActivityFeedPage,
} from "@/clients/activity/ActivityEventClient";
import type { ReactNode } from "react";

const INDIVIDUAL_ID = "i1" as Individual.Id;

function _entry(id: string, occurredAt: string): ActivityFeedEntry {
  return {
    actorUserId: undefined,
    comment: undefined,
    commentId: `comment-${id}` as Comment.Id,
    id: id as ActivityEvent.Id,
    individualId: INDIVIDUAL_ID,
    kind: "comment_created",
    occurredAt,
    payload: {},
    payloadVersion: 1,
    reactions: [],
    recordedAt: occurredAt,
    source: "avandar",
    workspaceId: "w1" as Workspace.Id,
  };
}

function _page(entries: ActivityFeedEntry[], hasMore = true): ActivityFeedPage {
  return { entries, hasMore };
}

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

function _renderFeed(linkedCommentId?: string) {
  return renderHook(
    () => {
      return useCaseActivityFeed({
        individualId: INDIVIDUAL_ID,
        kinds: ["comment_created"],
        linkedCommentId,
      });
    },
    { wrapper: _wrapper },
  );
}

/** Settles pending promises and any effects they trigger. */
async function _flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCaseActivityFeed", () => {
  it("puts earlier entries before newer ones", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockImplementation(
      async ({ before }) => {
        return before === undefined
          ? _page([_entry("e3", "2026-10-27T13:00:00")])
          : _page([_entry("e2", "2026-10-26T13:00:00")], false);
      },
    );
    const { result } = _renderFeed();
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });
    act(() => {
      result.current.loadEarlier();
    });
    await waitFor(() => {
      expect(
        result.current.entries.map((entry) => {
          return entry.id;
        }),
      ).toEqual(["e2", "e3"]);
    });
    expect(result.current.hasEarlier).toBe(false);
  });

  it("keeps loaded entries when an earlier page fails to load", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockImplementation(
      async ({ before }) => {
        if (before !== undefined) {
          throw new Error("offline");
        }
        return _page([_entry("e3", "2026-10-27T13:00:00")]);
      },
    );
    const { result } = _renderFeed();
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });
    act(() => {
      result.current.loadEarlier();
    });
    await waitFor(() => {
      expect(result.current.hasEarlierError).toBe(true);
    });
    expect(result.current.isLoadError).toBe(false);
    expect(result.current.entries).toHaveLength(1);
  });

  it("loads earlier pages until the linked comment is present", async () => {
    const pageSpy = vi
      .spyOn(ActivityEventClient, "getCaseActivityPage")
      .mockImplementation(async ({ before }) => {
        return before === undefined
          ? _page([_entry("e3", "2026-10-27T13:00:00")])
          : _page([_entry("e2", "2026-10-26T13:00:00")]);
      });
    const { result } = _renderFeed("comment-e2");
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });
    await _flush();
    expect(result.current.isSeekingLinkedComment).toBe(false);
    expect(pageSpy).toHaveBeenCalledTimes(2);
  });

  it("stops looking for the linked comment after an earlier page fails", async () => {
    const pageSpy = vi
      .spyOn(ActivityEventClient, "getCaseActivityPage")
      .mockImplementation(async ({ before }) => {
        if (before !== undefined) {
          throw new Error("offline");
        }
        return _page([_entry("e3", "2026-10-27T13:00:00")]);
      });
    const { result } = _renderFeed("comment-missing");
    await waitFor(() => {
      expect(result.current.hasEarlierError).toBe(true);
    });
    await _flush();
    await _flush();
    expect(pageSpy).toHaveBeenCalledTimes(2);
    expect(result.current.isSeekingLinkedComment).toBe(false);
  });

  it("stops looking for the linked comment after ten pages", async () => {
    let callCount = 0;
    const pageSpy = vi
      .spyOn(ActivityEventClient, "getCaseActivityPage")
      .mockImplementation(async () => {
        callCount += 1;
        const day = String(30 - callCount).padStart(2, "0");
        return _page([_entry(`e${callCount}`, `2026-10-${day}T13:00:00`)]);
      });
    const { result } = _renderFeed("comment-missing");
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(10);
    });
    await _flush();
    await _flush();
    expect(pageSpy).toHaveBeenCalledTimes(10);
    expect(result.current.isSeekingLinkedComment).toBe(false);
  });

  describe("freshness", () => {
    /**
     * A client whose cache never goes stale, standing in for a feed that
     * the persister restored from IndexedDB on boot.
     */
    function _renderFeedOnRestoredCache() {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(
        [...buildCaseActivityFeedQueryKey(INDIVIDUAL_ID), ["comment_created"]],
        {
          pages: [_page([_entry("restored", "2026-10-01T13:00:00")], false)],
          pageParams: [undefined],
        },
      );
      const rendered = renderHook(
        () => {
          return useCaseActivityFeed({
            individualId: INDIVIDUAL_ID,
            kinds: ["comment_created"],
            linkedCommentId: undefined,
          });
        },
        {
          wrapper: ({ children }: { children: ReactNode }) => {
            return (
              <QueryClientProvider client={queryClient}>
                {children}
              </QueryClientProvider>
            );
          },
        },
      );
      return { ...rendered, queryClient };
    }

    it("refetches on mount even when the cached feed is still fresh", async () => {
      const pageSpy = vi
        .spyOn(ActivityEventClient, "getCaseActivityPage")
        .mockResolvedValue(
          _page([_entry("fetched", "2026-10-02T13:00:00")], false),
        );
      const { result } = _renderFeedOnRestoredCache();
      await waitFor(() => {
        expect(result.current.entries[0]?.id).toBe("fetched");
      });
      expect(pageSpy).toHaveBeenCalledTimes(1);
    });

    it("keeps the feed out of the persisted cache", async () => {
      vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockResolvedValue(
        _page([], false),
      );
      const { queryClient } = _renderFeedOnRestoredCache();
      await waitFor(() => {
        const feedQuery = queryClient
          .getQueryCache()
          .find({
            queryKey: buildCaseActivityFeedQueryKey(INDIVIDUAL_ID),
            exact: false,
          });
        expect(feedQuery?.meta?.persist).toBe(false);
      });
    });
  });
});
