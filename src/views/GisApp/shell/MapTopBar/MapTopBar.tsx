import { MapOutputActions } from "@/views/GisApp/shell/MapTopBar/MapOutputActions";
import { MapTitleInput } from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleInput";
import css from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import { SaveStateIndicator } from "@/views/GisApp/shell/MapTopBar/SaveStateIndicator/SaveStateIndicator";
import type { MapSaveState } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  avaMapId: AvaMap.Id;
  name: string;
  saveState: MapSaveState;
  basemap: AvaMapConfig.Basemap;
  bookmarks: readonly AvaMapConfig.Bookmark[];
  onNameChange: (name: string) => void;
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
  onSaveCurrentView: () => void;
  onGoToBookmark: (bookmark: AvaMapConfig.Bookmark) => void;
  onRemoveBookmark: (bookmarkId: AvaMapConfig.BookmarkId) => void;
};

/** Renders map identity on the left and map output actions on the right. */
export function MapTopBar({
  avaMapId,
  name,
  saveState,
  basemap,
  bookmarks,
  onNameChange,
  onBasemapChange,
  onSaveCurrentView,
  onGoToBookmark,
  onRemoveBookmark,
}: Props): ReactNode {
  return (
    <>
      <div className={css.mapTopBarCluster}>
        <MapTitleInput name={name} onNameChange={onNameChange} />
        <SaveStateIndicator saveState={saveState} />
      </div>
      <div className={css.mapTopBarCluster}>
        <MapOutputActions
          {...{
            avaMapId,
            name,
            basemap,
            bookmarks,
            onBasemapChange,
            onSaveCurrentView,
            onGoToBookmark,
            onRemoveBookmark,
          }}
        />
      </div>
    </>
  );
}
