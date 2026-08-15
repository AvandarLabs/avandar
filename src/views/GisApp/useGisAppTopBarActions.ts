import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { GisAppState } from "@/views/GisApp/useGisApp";

type GisAppBookmark = AvaMapConfig.T["bookmarks"][number];

type GisAppTopBarActions = {
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
  onSaveCurrentView: () => void;
  onGoToBookmark: (bookmark: GisAppBookmark) => void;
  onRemoveBookmark: (bookmarkId: AvaMapConfig.BookmarkId) => void;
};

/** Provides immutable map-config updates for top-bar controls. */
export function useGisAppTopBarActions(app: GisAppState): GisAppTopBarActions {
  const { t } = useLingui();
  const onBasemapChange = (basemap: AvaMapConfig.Basemap): void => {
    app.updateConfig((current) => {
      return { ...current, basemap };
    });
  };
  const onSaveCurrentView = (): void => {
    app.updateConfig((current) => {
      return AvaMapConfig.withBookmarkAdded({
        config: current,
        bookmark: AvaMapConfig.makeBookmark({
          name: t`View ${current.bookmarks.length + 1}`,
          view: current.view,
        }),
      });
    });
  };
  const onGoToBookmark = (bookmark: GisAppBookmark): void => {
    app.updateConfig((current) => {
      return { ...current, view: bookmark.view };
    });
  };
  const onRemoveBookmark = (bookmarkId: AvaMapConfig.BookmarkId): void => {
    app.updateConfig((current) => {
      return AvaMapConfig.withBookmarkRemoved({ config: current, bookmarkId });
    });
  };

  return {
    onBasemapChange,
    onGoToBookmark,
    onRemoveBookmark,
    onSaveCurrentView,
  };
}
