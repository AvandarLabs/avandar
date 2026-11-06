import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CommentReactionClient } from "@/clients/comments/CommentReactionClient";
import { notifyError } from "@/utils/notifications/notify";
import { getNextReactionKind } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/commentReactionKinds";
import { buildCaseActivityFeedQueryKey } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { User } from "$/models/User/User";
import type { CaseActivityFeedData } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** One member's reaction change on one comment. */
type ReactionChange = {
  comment: Comment.T;
  userId: User.Id;
  myReaction: CommentReaction.T | undefined;
  nextKind: CommentReaction.Kind | undefined;
};

type ToggleReaction = {
  pickReaction: (pickedKind: CommentReaction.Kind) => void;
  isSaving: boolean;
};

/** The feed with one member's reaction on one comment set, or removed. */
function _buildFeedDataWithReaction(
  data: CaseActivityFeedData | undefined,
  options: {
    commentId: Comment.Id;
    userId: User.Id;
    reaction: CommentReaction.T | undefined;
  },
): CaseActivityFeedData | undefined {
  if (!data) {
    return undefined;
  }
  const { commentId, userId, reaction } = options;
  return {
    ...data,
    pages: data.pages.map((page) => {
      return {
        ...page,
        entries: page.entries.map((entry) => {
          if (entry.comment?.id !== commentId) {
            return entry;
          }
          const otherReactions = entry.reactions.filter((existingReaction) => {
            return existingReaction.userId !== userId;
          });
          return {
            ...entry,
            reactions: reaction
              ? [...otherReactions, reaction]
              : otherReactions,
          };
        }),
      };
    }),
  };
}

/** The reaction to show while the save is in flight, if any. */
function _buildOptimisticReaction(
  change: ReactionChange,
): CommentReaction.T | undefined {
  const { comment, userId, myReaction, nextKind } = change;
  if (nextKind === undefined) {
    return undefined;
  }
  const now = new Date().toISOString();
  return {
    commentId: comment.id,
    createdAt: myReaction?.createdAt ?? now,
    id: myReaction?.id ?? (crypto.randomUUID() as CommentReaction.Id),
    kind: nextKind,
    updatedAt: now,
    userId,
    workspaceId: comment.workspaceId,
  };
}

/**
 * Shows the change in every cached copy of the case's feed and returns the
 * copies as they were, for a rollback.
 */
async function _applyOptimisticChange(
  queryClient: QueryClient,
  queryKey: QueryKey,
  change: ReactionChange,
): Promise<Array<[QueryKey, CaseActivityFeedData | undefined]>> {
  await queryClient.cancelQueries({ queryKey });
  const previousFeeds = queryClient.getQueriesData<CaseActivityFeedData>({
    queryKey,
  });
  queryClient.setQueriesData<CaseActivityFeedData>({ queryKey }, (data) => {
    return _buildFeedDataWithReaction(data, {
      commentId: change.comment.id,
      userId: change.userId,
      reaction: _buildOptimisticReaction(change),
    });
  });
  return previousFeeds;
}

/** Writes the member's next reaction: an upsert, or a delete to clear it. */
async function _saveReaction(change: ReactionChange): Promise<void> {
  const { comment, userId, myReaction, nextKind } = change;
  if (nextKind === undefined) {
    if (myReaction) {
      await CommentReactionClient.delete({ id: myReaction.id });
    }
    return;
  }
  await CommentReactionClient.insert({
    data: {
      commentId: comment.id,
      kind: nextKind,
      userId,
      workspaceId: comment.workspaceId,
    },
    upsert: true,
    onConflict: {
      columnNames: ["comment_id", "user_id"],
      ignoreDuplicates: false,
    },
  });
}

/**
 * Sets, swaps, or clears the current member's reaction on a comment. The
 * case feed shows the change at once and rolls it back if saving fails.
 */
export function useToggleReaction(options: {
  comment: Comment.T;
  myReaction: CommentReaction.T | undefined;
  currentUserId: User.Id | undefined;
}): ToggleReaction {
  const { comment, myReaction, currentUserId } = options;
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const pickReaction = async (pickedKind: CommentReaction.Kind) => {
    if (!currentUserId || isSaving) {
      return;
    }
    const change: ReactionChange = {
      comment,
      userId: currentUserId,
      myReaction,
      nextKind: getNextReactionKind(myReaction?.kind, pickedKind),
    };
    const queryKey = buildCaseActivityFeedQueryKey(comment.individualId);
    setIsSaving(true);
    const previousFeeds = await _applyOptimisticChange(
      queryClient,
      queryKey,
      change,
    );
    try {
      await _saveReaction(change);
    } catch {
      previousFeeds.forEach(([previousQueryKey, previousData]) => {
        queryClient.setQueryData(previousQueryKey, previousData);
      });
      notifyError(t`Your reaction could not be saved. Try again.`);
    } finally {
      setIsSaving(false);
      void queryClient.invalidateQueries({ queryKey });
    }
  };

  return {
    pickReaction: (pickedKind) => {
      void pickReaction(pickedKind);
    },
    isSaving,
  };
}
