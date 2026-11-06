import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard.module.css";
import { CommentReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { User } from "$/models/User/User";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

type Props = {
  comment: Comment.T;
  reactions: readonly CommentReaction.T[];
  currentUserId: User.Id | undefined;
  getMemberName: (userId: string) => string | undefined;
  mentionCandidates: readonly MentionCandidate[];
  isEditing: boolean;
  isSaving: boolean;
  onSaveEdit: (body: RichTextDocument.T, plainText: string) => Promise<boolean>;
  onCancelEdit: () => void;
};

/**
 * A comment's content: the deleted placeholder, the editor while editing,
 * or the rendered text with its reactions.
 */
export function CommentCardBody({
  comment,
  reactions,
  currentUserId,
  getMemberName,
  mentionCandidates,
  isEditing,
  isSaving,
  onSaveEdit,
  onCancelEdit,
}: Props): ReactNode {
  const { t } = useLingui();
  if (comment.deletedAt !== undefined || !comment.body) {
    return (
      <Text size="sm" c="dimmed" className={classes.deleted}>
        <Trans>This comment was deleted.</Trans>
      </Text>
    );
  }
  if (isEditing) {
    return (
      <RichTextComposer
        label={t`Edit comment`}
        placeholder={t`Write an update`}
        initialContent={comment.body}
        mentionCandidates={mentionCandidates}
        submitLabel={t`Save`}
        isSubmitting={isSaving}
        onSubmit={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }
  return (
    <>
      <RichTextView document={comment.body} />
      <CommentReactions
        comment={comment}
        reactions={reactions}
        currentUserId={currentUserId}
        getMemberName={getMemberName}
      />
    </>
  );
}
