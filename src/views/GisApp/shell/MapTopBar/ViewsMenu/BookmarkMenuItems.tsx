import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Menu, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  bookmarks: readonly AvaMapConfig.Bookmark[];
  onGoToBookmark: (bookmark: AvaMapConfig.Bookmark) => void;
  onRemoveBookmark: (id: AvaMapConfig.BookmarkId) => void;
};

/** Renders saved view navigation and deletion items. */
export function BookmarkMenuItems({
  bookmarks,
  onGoToBookmark,
  onRemoveBookmark,
}: Props): ReactNode {
  const { t } = useLingui();
  return bookmarks.map((bookmark) => {
    return (
      <Menu.Item
        key={bookmark.id}
        component="div"
        onClick={() => {
          onGoToBookmark(bookmark);
        }}
      >
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Text size="sm" truncate>
            {bookmark.name}
          </Text>
          <ActionIcon
            variant="subtle"
            color="neutral"
            size="sm"
            aria-label={t`Delete the view ${bookmark.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveBookmark(bookmark.id);
            }}
          >
            <IconTrash size={14} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Menu.Item>
    );
  });
}
