import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { ACTIVITY_FEED_VISIBLE_KINDS } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type {
  ActivityFeedCursor,
  ActivityFeedEntry,
} from "@/clients/activity/ActivityEventClient";

const PAGE_SIZE = 50;

/** How many pages to load while looking for a linked comment. */
const MAX_PAGES_FOR_LINKED_COMMENT = 10;

type CaseActivityFeed = {
  entries: ActivityFeedEntry[];
  isLoading: boolean;
  isError: boolean;
  hasEarlier: boolean;
  isLoadingEarlier: boolean;
  /** True while earlier pages are still being loaded to find the link. */
  isSeekingLinkedComment: boolean;
  loadEarlier: () => void;
};

/**
 * A case's feed, oldest entry first, loaded newest page first. When a
 * comment is linked, keeps loading earlier pages until it is present.
 */
export function useCaseActivityFeed(
  individualId: Individual.Id,
  linkedCommentId: string | undefined,
): CaseActivityFeed {
  const query = useInfiniteQuery({
    queryKey: [
      ActivityEventClient.getClientName(),
      "caseActivityFeed",
      individualId,
    ],
    queryFn: (context) => {
      return ActivityEventClient.getCaseActivityPage({
        individualId,
        kinds: ACTIVITY_FEED_VISIBLE_KINDS,
        before: context.pageParam,
        limit: PAGE_SIZE,
      });
    },
    initialPageParam: undefined as ActivityFeedCursor | undefined,
    getNextPageParam: (lastPage): ActivityFeedCursor | undefined => {
      const oldestEntry = lastPage.entries[0];
      if (!lastPage.hasMore || !oldestEntry) {
        return undefined;
      }
      return {
        occurredAt: oldestEntry.occurredAt,
        recordedAt: oldestEntry.recordedAt,
        id: oldestEntry.id,
      };
    },
    refetchOnWindowFocus: true,
  });

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
  const pageCount = query.data?.pages.length ?? 0;
  const isSeekingLinkedComment =
    !query.isLoading &&
    !isLinkedCommentLoaded &&
    query.hasNextPage &&
    pageCount < MAX_PAGES_FOR_LINKED_COMMENT;

  const { fetchNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    if (isSeekingLinkedComment && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [isSeekingLinkedComment, isFetchingNextPage, pageCount, fetchNextPage]);

  return {
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    hasEarlier: query.hasNextPage,
    isLoadingEarlier: isFetchingNextPage,
    isSeekingLinkedComment,
    loadEarlier: () => {
      void fetchNextPage();
    },
  };
}
