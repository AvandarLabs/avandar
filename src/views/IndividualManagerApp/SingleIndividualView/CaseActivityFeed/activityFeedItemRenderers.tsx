import { CommentCard } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard";
import type { ActivityEvent } from "$/models/activity/ActivityEvent/ActivityEvent";
import type { User } from "$/models/User/User";
import type { ActivityFeedEntry } from "@/clients/activity/ActivityEventClient";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

/** What every feed row receives. */
export type ActivityFeedItemProps = {
  entry: ActivityFeedEntry;
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
  mentionCandidates: readonly MentionCandidate[];
  highlightedCommentId: string | undefined;
};

function CommentCreatedItem({
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

/**
 * The row component for each activity kind, or `null` for kinds that change
 * an existing row instead of adding one. A new kind (a status change, a
 * field edit) is one more entry here, drawn as a single line with an icon.
 */
export const activityFeedItemRenderers: Readonly<
  Record<
    ActivityEvent.Kind,
    ((props: ActivityFeedItemProps) => ReactNode) | null
  >
> = {
  comment_created: CommentCreatedItem,
  comment_edited: null,
  comment_deleted: null,
};

/** Kinds that get their own row. The feed query asks only for these. */
export const ACTIVITY_FEED_VISIBLE_KINDS: readonly ActivityEvent.Kind[] = (
  Object.keys(activityFeedItemRenderers) as ActivityEvent.Kind[]
).filter((kind) => {
  return activityFeedItemRenderers[kind] !== null;
});
