import { isPlainObject, isString, traverse } from "@avandar/utils";
import { VizTypes } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";

/**
 * The parts of a dashboard tile that describe it without running its query,
 * for example on a card that references the tile from a comment.
 */
export type DashboardTileSummary = {
  id: string;
  prompt: string | undefined;

  /**
   * A built-in viz type, `"plugin"` for any plugin chart, or undefined when
   * this build knows no viz type of that name.
   */
  vizType: AvaVizConfig.Type | undefined;
};

function _readPrompt(nlQuery: unknown): string | undefined {
  if (!isPlainObject(nlQuery)) {
    return undefined;
  }
  const prompt: unknown = nlQuery["prompt"];
  return isString(prompt) && prompt.trim() !== "" ? prompt : undefined;
}

/**
 * The viz type a stored value names, or undefined when this build has none.
 * Every plugin chart reads as `"plugin"`.
 */
function _readVizType(vizType: unknown): AvaVizConfig.Type | undefined {
  if (vizType === "plugin") {
    return "plugin";
  }
  return VizTypes.find((knownType) => {
    return knownType === vizType;
  });
}

/** A DataViz block found in a dashboard config, with its raw props. */
export type DataVizNode = {
  type: "DataViz";
  props: Record<string, unknown>;
};

/**
 * Every DataViz block in a dashboard config, in page order, at any depth and
 * in any slot, including the legacy top-level `zones`. Reads defensively: a
 * config is JSON of any age.
 */
export function collectDataVizNodes(dashboardConfig: unknown): DataVizNode[] {
  const nodes: DataVizNode[] = [];
  // `traverse` visits each object once, so a block is never collected twice.
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node) || node["type"] !== "DataViz") {
      return;
    }
    const props: unknown = node["props"];
    if (isPlainObject(props)) {
      nodes.push({ type: "DataViz", props });
    }
  });
  return nodes;
}

function _collectTiles(dashboardConfig: unknown): DashboardTileSummary[] {
  return collectDataVizNodes(dashboardConfig).flatMap(({ props }) => {
    const id = props["id"];
    return isString(id)
      ? [
          {
            id,
            prompt: _readPrompt(props["nlQuery"]),
            vizType: _readVizType(props["vizType"]),
          },
        ]
      : [];
  });
}

/**
 * Finds a DataViz block by its Puck id anywhere in a dashboard config,
 * including inside layout slots. Use it to describe one tile of a dashboard,
 * for example when a comment references that tile.
 */
export function findDashboardTile(
  dashboardConfig: unknown,
  tileId: string,
): DashboardTileSummary | undefined {
  return _collectTiles(dashboardConfig).find((tile) => {
    return tile.id === tileId;
  });
}

/**
 * How many DataViz blocks a dashboard config holds, at any depth. Use it to
 * summarize a dashboard, for example "4 tiles" on a dashboard card.
 */
export function countDashboardTiles(dashboardConfig: unknown): number {
  return _collectTiles(dashboardConfig).length;
}
