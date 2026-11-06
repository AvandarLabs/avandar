import { formatDate } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text, Tooltip } from "@mantine/core";
import clsx from "clsx";
import { useState } from "react";
import {
  isRichTextDocument,
  RICH_TEXT_SCHEMA_VERSION,
} from "$/models/RichTextDocument/RichTextDocument";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { CommentClient } from "@/clients/comments/CommentClient";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import { notifyError } from "@/utils/notifications/notify";
import { CommentActionsMenu } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentActionsMenu";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard.module.css";
import { CommentReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { User } from "$/models/User/User";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

/** The full timestamp shown when hovering a comment's time. */
const FULL_TIMESTAMP_FORMAT = "MMM D, YYYY [at] h:mm A";

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
 * author, edit and delete.
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
  const [isEditing, setIsEditing] = useState(false);
  const [updateComment, isSaving] = CommentClient.useUpdate({
    queriesToInvalidate: [[ActivityEventClient.getClientName()]],
  });
  const authorName =
    (comment.authorUserId && getMemberName(comment.authorUserId)) ??
    t`Former member`;
  const isDeleted = comment.deletedAt !== undefined;
  const isOwn =
    !isDeleted &&
    comment.authorUserId !== undefined &&
    comment.authorUserId === currentUserId;

  const saveEdit = (
    body: RichTextDocument.T,
    plainText: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      updateComment(
        {
          id: comment.id,
          data: {
            body,
            bodyText: plainText,
            bodySchemaVersion: RICH_TEXT_SCHEMA_VERSION,
          },
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            resolve(true);
          },
          onError: () => {
            notifyError(t`Your changes could not be saved. Try again.`);
            resolve(false);
          },
        },
      );
    });
  };

  return (
    <article
      id={`comment-${comment.id}`}
      className={clsx(classes.card, isHighlighted && classes.highlighted)}
      aria-labelledby={`comment-${comment.id}-author`}
    >
      <span className={classes.avatar} aria-hidden>
        {_buildInitials(authorName)}
      </span>
      <div>
        <div className={classes.header}>
          <Text id={`comment-${comment.id}-author`} size="sm" fw={600}>
            {authorName}
          </Text>
          <Tooltip
            label={formatDate(comment.createdAt, {
              format: FULL_TIMESTAMP_FORMAT,
            })}
          >
            <Text
              size="xs"
              c="dimmed"
              component="time"
              dateTime={comment.createdAt}
            >
              {formatDate(comment.createdAt, { format: "h:mm A" })}
            </Text>
          </Tooltip>
          {comment.editedAt && !isDeleted ? (
            <Tooltip
              label={formatDate(comment.editedAt, {
                format: FULL_TIMESTAMP_FORMAT,
              })}
            >
              <Text size="xs" c="dimmed">
                <Trans>edited</Trans>
              </Text>
            </Tooltip>
          ) : null}
          {isOwn && !isEditing ? (
            <span className={classes.actions}>
              <CommentActionsMenu
                comment={comment}
                onEdit={() => {
                  if (!isRichTextDocument(comment.body)) {
                    notifyError(
                      t`This comment has content this version of Avandar cannot edit.`,
                    );
                    return;
                  }
                  setIsEditing(true);
                }}
                onDelete={() => {
                  updateComment(
                    {
                      id: comment.id,
                      data: { deletedAt: new Date().toISOString() },
                    },
                    {
                      onError: () => {
                        notifyError(
                          t`The comment could not be deleted. Try again.`,
                        );
                      },
                    },
                  );
                }}
              />
            </span>
          ) : null}
        </div>
        {isDeleted || !comment.body ? (
          <Text size="sm" c="dimmed" className={classes.deleted}>
            <Trans>This comment was deleted.</Trans>
          </Text>
        ) : isEditing ? (
          <RichTextComposer
            label={t`Edit comment`}
            placeholder={t`Write an update`}
            initialContent={comment.body}
            mentionCandidates={mentionCandidates}
            submitLabel={t`Save`}
            isSubmitting={isSaving}
            onSubmit={saveEdit}
            onCancel={() => {
              setIsEditing(false);
            }}
          />
        ) : (
          <>
            <RichTextView document={comment.body} />
            <CommentReactions
              comment={comment}
              reactions={reactions}
              currentUserId={currentUserId}
              getMemberName={getMemberName}
            />
          </>
        )}
      </div>
    </article>
  );
}
