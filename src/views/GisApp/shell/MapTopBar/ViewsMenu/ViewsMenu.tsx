import { useLingui } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconBookmark } from "@tabler/icons-react";
import { BookmarkMenuItems } from "@/views/GisApp/shell/MapTopBar/ViewsMenu/BookmarkMenuItems";
import css from "@/views/GisApp/shell/MapTopBar/ViewsMenu/ViewsMenu.module.css";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  bookmarks: readonly AvaMapConfig.Bookmark[];
  onSaveCurrentView: () => void;
  onGoToBookmark: (bookmark: AvaMapConfig.Bookmark) => void;
  onRemoveBookmark: (bookmarkId: AvaMapConfig.BookmarkId) => void;
};

/** Lists saved camera positions and exposes their map actions. */
export function ViewsMenu({
  bookmarks,
  onSaveCurrentView,
  onGoToBookmark,
  onRemoveBookmark,
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <Menu position="bottom-end" withinPortal closeOnItemClick={false}>
      <Menu.Target>
        <Button
          variant="subtle"
          color="neutral"
          size="compact-sm"
          leftSection={<IconBookmark size={15} stroke={1.5} />}
        >
          <span className={css.viewsMenuActionLabel}>{t`Views`}</span>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={onSaveCurrentView}>
          {t`Save the current view`}
        </Menu.Item>
        {bookmarks.length === 0 ? null : <Menu.Divider />}
        <BookmarkMenuItems
          bookmarks={bookmarks}
          onGoToBookmark={onGoToBookmark}
          onRemoveBookmark={onRemoveBookmark}
        />
      </Menu.Dropdown>
    </Menu>
  );
}
