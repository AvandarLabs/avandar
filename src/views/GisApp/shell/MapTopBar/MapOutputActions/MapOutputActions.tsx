import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { BasemapControl } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapControl";
import css from "@/views/GisApp/shell/MapTopBar/MapOutputActions/MapOutputActions.module.css";
import { ViewsMenu } from "@/views/GisApp/shell/MapTopBar/ViewsMenu/ViewsMenu";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  avaMapId: AvaMap.Id;
  name: string;
  basemap: AvaMapConfig.Basemap;
  bookmarks: readonly AvaMapConfig.Bookmark[];
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
  onSaveCurrentView: () => void;
  onGoToBookmark: (bookmark: AvaMapConfig.Bookmark) => void;
  onRemoveBookmark: (id: AvaMapConfig.BookmarkId) => void;
};

/** Renders basemap, view, sharing, and export controls. */
export function MapOutputActions({
  avaMapId,
  name,
  basemap,
  bookmarks,
  onBasemapChange,
  onSaveCurrentView,
  onGoToBookmark,
  onRemoveBookmark,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <BasemapControl basemap={basemap} onBasemapChange={onBasemapChange} />
      <ViewsMenu
        bookmarks={bookmarks}
        onSaveCurrentView={onSaveCurrentView}
        onGoToBookmark={onGoToBookmark}
        onRemoveBookmark={onRemoveBookmark}
      />
      <ShareResourceButton
        resourceName={name}
        resourceType="map"
        resourceId={avaMapId}
        size="compact-sm"
      />
      <Tooltip label={t`Print and PDF export arrives in a later release.`}>
        <Button
          size="compact-sm"
          leftSection={<IconDownload size={15} stroke={1.5} />}
          aria-disabled
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          <span className={css.mapOutputActionsLabel}>{t`Export`}</span>
        </Button>
      </Tooltip>
    </>
  );
}
