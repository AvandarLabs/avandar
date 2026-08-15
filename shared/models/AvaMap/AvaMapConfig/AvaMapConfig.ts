/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AvaMapConfigRead,
  BasemapConfig,
  BasemapStyleKey,
  CustomBasemapKind as CustomBasemapKindType,
  MapBookmark,
  MapBookmarkId,
  MapViewState,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";

/** Public model namespace for a map's editable configuration. */
// prettier-ignore
export {
  AvaMapConfigModule as AvaMapConfig,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts";

export namespace AvaMapConfig {
  export type T = AvaMapConfigRead;
  export type Basemap = BasemapConfig;
  export type BasemapStyle = BasemapStyleKey;
  /** Identifies the tile protocol for a custom basemap. */
  export type CustomBasemapKind = CustomBasemapKindType;
  export type ViewState = MapViewState;
  /** A saved camera position in a map configuration. */
  export type Bookmark = MapBookmark;
  /** Identifies a saved camera position in a map configuration. */
  export type BookmarkId = MapBookmarkId;
}
