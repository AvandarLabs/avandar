import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import type { ActivityEvent } from "$/models/activity/ActivityEvent/ActivityEvent";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type {
  ActivityFeedCursor,
  ActivityFeedEntry,
  ActivityFeedPage,
} from "@/clients/activity/ActivityEventClient";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";

const PAGE_SIZE = 50;

/** How many pages, the first included, to load looking for a linked comment. */
const MAX_PAGES_FOR_LINKED_COMMENT = 10;

/** The cached shape of a case's feed. */
export type CaseActivityFeedData = InfiniteData<
  ActivityFeedPage,
  ActivityFeedCursor | undefined
>;

type CaseActivityFeed = {
  /** Every loaded entry, oldest first. */
  entries: ActivityFeedEntry[];
  isLoading: boolean;
  /** The first page failed, so there is nothing to show. */
  isLoadError: boolean;
  hasEarlier: boolean;
  isLoadingEarlier: boolean;
  /** The last request for an earlier page failed; the loaded ones stay. */
  hasEarlierError: boolean;
  /** True while earlier pages are still being loaded to find the link. */
  isSeekingLinkedComment: boolean;
  pageCount: number;
  loadEarlier: () => void;
};

type SeekState = {
  seekKey: string;
  attemptCount: number;
  isInFlight: boolean;
};

/**
 * The query key prefix of one case's feed. Mutations invalidate and patch
 * only the queries under it.
 */
export function buildCaseActivityFeedQueryKey(
  individualId: Individual.Id,
): QueryKey {
  return [
    ActivityEventClient.getClientName(),
    "caseActivityFeed",
    individualId,
  ];
}

/** The cursor that continues before a page, or none when it was the last. */
function _buildCursorFromPage(
  page: ActivityFeedPage,
): ActivityFeedCursor | undefined {
  const oldestEntry = page.entries[0];
  if (!page.hasMore || !oldestEntry) {
    return undefined;
  }
  return {
    occurredAt: oldestEntry.occurredAt,
    recordedAt: oldestEntry.recordedAt,
    id: oldestEntry.id,
  };
}

/**
 * Loads earlier pages one at a time while `canSeek` holds, at most
 * `MAX_PAGES_FOR_LINKED_COMMENT - 1` times per `seekKey`. Returns whether it
 * is still seeking.
 */
function useSeekLinkedComment(options: {
  seekKey: string;
  canSeek: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}): boolean {
  const { seekKey, canSeek, isFetchingNextPage, fetchNextPage } = options;
  const [seekState, setSeekState] = useState<SeekState>({
    seekKey,
    attemptCount: 0,
    isInFlight: false,
  });
  const currentSeek =
    seekState.seekKey === seekKey
      ? seekState
      : { seekKey, attemptCount: 0, isInFlight: false };
  const isSeeking =
    canSeek && currentSeek.attemptCount < MAX_PAGES_FOR_LINKED_COMMENT - 1;

  useEffect(() => {
    if (!isSeeking || currentSeek.isInFlight || isFetchingNextPage) {
      return;
    }
    setSeekState({
      seekKey,
      attemptCount: currentSeek.attemptCount + 1,
      isInFlight: true,
    });
    void fetchNextPage().finally(() => {
      setSeekState((previousState) => {
        return previousState.seekKey === seekKey
          ? { ...previousState, isInFlight: false }
          : previousState;
      });
    });
  }, [
    isSeeking,
    currentSeek.isInFlight,
    currentSeek.attemptCount,
    isFetchingNextPage,
    seekKey,
    fetchNextPage,
  ]);

  return isSeeking || currentSeek.isInFlight;
}

/**
 * A case's feed, oldest entry first, loaded newest page first. When a
 * comment is linked, keeps loading earlier pages until it is present, a
 * page fails, or the page cap is reached.
 */
export function useCaseActivityFeed(options: {
  individualId: Individual.Id;
  kinds: readonly ActivityEvent.Kind[];
  linkedCommentId: string | undefined;
}): CaseActivityFeed {
  const { individualId, kinds, linkedCommentId } = options;
  const query = useInfiniteQuery({
    queryKey: [...buildCaseActivityFeedQueryKey(individualId), kinds],
    queryFn: (context) => {
      return ActivityEventClient.getCaseActivityPage({
        individualId,
        kinds,
        before: context.pageParam,
        limit: PAGE_SIZE,
      });
    },
    initialPageParam: undefined as ActivityFeedCursor | undefined,
    getNextPageParam: _buildCursorFromPage,
    refetchOnWindowFocus: true,
  });
  const { fetchNextPage, isFetchingNextPage, isFetchNextPageError } = query;

  const entries = useMemo(() => {
    return [...(query.data?.pages ?? [])].reverse().flatMap((page) => {
      return page.entries;
    });
  }, [query.data]);

  const isLinkedCommentLoaded =
    linkedCommentId === undefined ||
    entries.some((entry) => {
      return entry.commentId === linkedCommentId;
    });
  const isSeekingLinkedComment = useSeekLinkedComment({
    seekKey: `${individualId}:${linkedCommentId}`,
    canSeek:
      query.isSuccess &&
      !isLinkedCommentLoaded &&
      query.hasNextPage &&
      !isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
  });

  return {
    entries,
    isLoading: query.isLoading,
    isLoadError: query.isLoadingError,
    hasEarlier: query.hasNextPage,
    isLoadingEarlier: isFetchingNextPage,
    hasEarlierError: isFetchNextPageError,
    isSeekingLinkedComment,
    pageCount: query.data?.pages.length ?? 0,
    loadEarlier: () => {
      void fetchNextPage();
    },
  };
}
