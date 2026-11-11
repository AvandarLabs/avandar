import { uuid } from "$/lib/uuid";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { DEFAULT_MAP_PBLOCK_SETTINGS } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

type AvaPageItem = AvaPageData["content"][number];

/** A Map block showing `mapId`, with a fresh id and the default settings. */
function _createMapPBlockItem(mapId: AvaMap.Id): AvaPageItem {
  return {
    type: "Map",
    props: { ...DEFAULT_MAP_PBLOCK_SETTINGS, id: uuid(), mapId },
  };
}

function _appendToPageData(
  options: Readonly<{ pageData: AvaPageData; mapId: AvaMap.Id }>,
): AvaPageData {
  return {
    ...options.pageData,
    content: [...options.pageData.content, _createMapPBlockItem(options.mapId)],
  };
}

function _createPageData(
  options: Readonly<{ dashboardName: string; mapId: AvaMap.Id }>,
): AvaPageData {
  const emptyPageData = DashboardConfigs.makeEmpty() as AvaPageData;
  return {
    ...emptyPageData,
    root: {
      ...emptyPageData.root,
      props: { ...emptyPageData.root.props, title: options.dashboardName },
    },
    content: [_createMapPBlockItem(options.mapId)],
  } as AvaPageData;
}

/** Builds dashboard pages that show a map, for the GIS "Add to dashboard". */
export const MapPBlockDashboardConfigs = {
  /** A page with a new Map block after its existing blocks. */
  appendToPageData: _appendToPageData,

  /** A new page titled with the dashboard's name, holding one Map block. */
  createPageData: _createPageData,
};
