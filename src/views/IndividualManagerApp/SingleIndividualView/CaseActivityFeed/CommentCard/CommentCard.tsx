import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useRef } from "react";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard.module.css";
import { CommentCardBody } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCardBody";
import { CommentCardHeader } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCardHeader";
import { useBriefHighlight } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/useBriefHighlight";
import { useCommentEditing } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/useCommentEditing";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { User } from "$/models/User/User";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

type Props = {
  comment: Comment.T;
  reactions: readonly CommentReaction.T[];
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
  mentionCandidates: readonly MentionCandidate[];
  isHighlighted: boolean;
};

/** Two-letter initials for the author's avatar. */
function _buildInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0]?.toUpperCase() ?? "";
    })
    .join("");
}

/**
 * One comment in a case feed: author, time, body, reactions, and, for the
 * author, edit and delete. Focus returns to the card after either.
 */
export function CommentCard({
  comment,
  reactions,
  currentUserId,
  getMemberName,
  mentionCandidates,
  isHighlighted,
}: Props): ReactNode {
  const { t } = useLingui();
  const articleRef = useRef<HTMLElement>(null);
  const editing = useCommentEditing(comment, articleRef);
  const isHighlightVisible = useBriefHighlight(isHighlighted);
  const authorName =
    (comment.authorUserId && getMemberName(comment.authorUserId)) ??
    t`Former member`;
  const authorLabelId = `comment-${comment.id}-author`;
  const isOwnLiveComment =
    comment.deletedAt === undefined &&
    comment.authorUserId !== undefined &&
    comment.authorUserId === currentUserId;

  return (
    <article
      ref={articleRef}
      id={`comment-${comment.id}`}
      tabIndex={-1}
      className={clsx(classes.card, isHighlightVisible && classes.highlighted)}
      aria-labelledby={authorLabelId}
    >
      <span className={classes.avatar} aria-hidden>
        {_buildInitials(authorName)}
      </span>
      <div>
        <CommentCardHeader
          comment={comment}
          authorName={authorName}
          authorLabelId={authorLabelId}
          hasActions={isOwnLiveComment && !editing.isEditing}
          onEdit={editing.onEdit}
          onDelete={editing.onDelete}
        />
        <CommentCardBody
          comment={comment}
          reactions={reactions}
          currentUserId={currentUserId}
          getMemberName={getMemberName}
          mentionCandidates={mentionCandidates}
          isEditing={editing.isEditing}
          isSaving={editing.isSaving}
          onSaveEdit={editing.onSaveEdit}
          onCancelEdit={editing.onCancelEdit}
        />
      </div>
    </article>
  );
}
