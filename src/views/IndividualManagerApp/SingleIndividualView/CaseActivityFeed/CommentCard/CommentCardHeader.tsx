import { Trans } from "@lingui/react/macro";
import { Skeleton, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import { CommentActionsMenu } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentActionsMenu";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard.module.css";
import { useDateTimeFormatter } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useDateTimeFormatter";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { ReactNode } from "react";

const TIME_FORMAT: Intl.DateTimeFormatOptions = { timeStyle: "short" };

const FULL_TIMESTAMP_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

type Props = {
  comment: Comment.T;
  /** The author's name, or `undefined` while the members still load. */
  authorName: string | undefined;
  authorLabelId: string;
  /** Shows the edit and delete menu; only for your own live comment. */
  hasActions: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

/** A comment's author, time, edited mark, and, for the author, its menu. */
export function CommentCardHeader({
  comment,
  authorName,
  authorLabelId,
  hasActions,
  onEdit,
  onDelete,
}: Props): ReactNode {
  const timeFormatter = useDateTimeFormatter(TIME_FORMAT);
  const fullFormatter = useDateTimeFormatter(FULL_TIMESTAMP_FORMAT);
  const isDeleted = comment.deletedAt !== undefined;
  return (
    <div className={classes.header}>
      <Text id={authorLabelId} size="sm" fw={600}>
        {authorName === undefined ? (
          <>
            <Skeleton
              component="span"
              height={12}
              width={96}
              display="inline-block"
              aria-hidden
            />
            <VisuallyHidden>
              <Trans>Loading author</Trans>
            </VisuallyHidden>
          </>
        ) : (
          authorName
        )}
      </Text>
      <Tooltip label={fullFormatter.format(new Date(comment.createdAt))}>
        <Text
          size="xs"
          c="dimmed"
          component="time"
          dateTime={comment.createdAt}
        >
          {timeFormatter.format(new Date(comment.createdAt))}
        </Text>
      </Tooltip>
      {comment.editedAt && !isDeleted ? (
        <Tooltip label={fullFormatter.format(new Date(comment.editedAt))}>
          <Text size="xs" c="dimmed">
            <Trans>edited</Trans>
          </Text>
        </Tooltip>
      ) : null}
      {hasActions ? (
        <span className={classes.actions}>
          <CommentActionsMenu
            comment={comment}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </span>
      ) : null}
    </div>
  );
}
