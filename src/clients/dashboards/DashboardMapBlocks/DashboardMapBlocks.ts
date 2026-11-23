import { isDefined, isPlainObject, isString, traverse } from "@avandar/utils";
import { parseMapPBlockSettings } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapPBlockSettings } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";

/** One Map block found in a saved dashboard page. */
export type DashboardMapBlock = {
  blockId: string;
  settings: MapPBlockSettings;
};

function _getMapBlocks(dashboardConfig: unknown): DashboardMapBlock[] {
  const blocks: DashboardMapBlock[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node) || node["type"] !== "Map") {
      return;
    }
    const props: unknown = node["props"];
    if (!isPlainObject(props) || !isString(props["id"])) {
      return;
    }
    const settings = parseMapPBlockSettings(props);
    if (settings) {
      blocks.push({ blockId: props["id"], settings });
    }
  });
  return blocks;
}

function _getMapIds(dashboardConfig: unknown): AvaMap.Id[] {
  return Array.from(
    new Set(
      _getMapBlocks(dashboardConfig)
        .map((block) => {
          return block.settings.mapId;
        })
        .filter(isDefined),
    ),
  );
}

/** Reads the Map blocks out of a saved dashboard page, at any depth. */
export const DashboardMapBlocks = {
  /** Every readable Map block, in document order. */
  getMapBlocks: _getMapBlocks,

  /** Each map the page's blocks show, once, in first-use order. */
  getMapIds: _getMapIds,
};
