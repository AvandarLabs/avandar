import { CommentCard } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard";
import type { ActivityFeedItemProps } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import type { ReactNode } from "react";

/** The feed row for a posted comment: its card, or nothing if it is gone. */
export function CommentCreatedItem({
  entry,
  currentUserId,
  getMemberName,
  mentionCandidates,
  highlightedCommentId,
}: ActivityFeedItemProps): ReactNode {
  if (!entry.comment) {
    return null;
  }
  return (
    <CommentCard
      comment={entry.comment}
      reactions={entry.reactions}
      currentUserId={currentUserId}
      getMemberName={getMemberName}
      mentionCandidates={mentionCandidates}
      isHighlighted={highlightedCommentId === entry.comment.id}
    />
  );
}
