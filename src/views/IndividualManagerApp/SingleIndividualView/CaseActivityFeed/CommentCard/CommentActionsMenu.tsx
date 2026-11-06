import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDots, IconLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { ReactNode } from "react";

type Props = {
  comment: Comment.T;
  onEdit: () => void;
  onDelete: () => void;
};

/** This page's URL pointing at one comment, without other query params. */
function _buildCommentUrl(commentId: Comment.Id): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("comment", commentId);
  return url.toString();
}

/** Copies a link to the comment and reports whether it worked. */
function _copyCommentLink(
  commentId: Comment.Id,
  messages: { copied: string; failed: string },
): void {
  navigator.clipboard.writeText(_buildCommentUrl(commentId)).then(
    () => {
      notifySuccess(messages.copied);
    },
    () => {
      notifyError(messages.failed);
    },
  );
}

/** Edit, copy a link to, or delete your own comment. */
export function CommentActionsMenu({
  comment,
  onEdit,
  onDelete,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={t`Comment actions`}
        >
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={onEdit}>
          {t`Edit`}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconLink size={14} />}
          onClick={() => {
            _copyCommentLink(comment.id, {
              copied: t`Link copied`,
              failed: t`The link could not be copied.`,
            });
          }}
        >
          {t`Copy link to comment`}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="danger"
          leftSection={<IconTrash size={14} />}
          onClick={() => {
            modals.openConfirmModal({
              title: t`Delete comment?`,
              children: t`The comment is removed from the case for everyone.`,
              labels: { confirm: t`Delete`, cancel: t`Cancel` },
              confirmProps: { color: "danger" },
              onConfirm: onDelete,
            });
          }}
        >
          {t`Delete`}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
