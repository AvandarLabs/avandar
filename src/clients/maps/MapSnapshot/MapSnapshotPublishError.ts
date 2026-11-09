import type { AvaMap } from "$/models/AvaMap/AvaMap";

/**
 * Why a map cannot be published to a public dashboard.
 * - `filtersNoLongerApply`: a layer's saved filters name columns its data no
 *   longer has, so the map would publish more rows than its author limited
 *   it to. The author opens the map and fixes the filters first.
 * - `cannotEditMap`: the publisher cannot edit the map, so they cannot read
 *   the secret salt that displaces its jittered points. Publishing without
 *   it would expose exact locations, so an editor of the map publishes.
 */
export type MapSnapshotPublishReason = "filtersNoLongerApply" | "cannotEditMap";

function _buildPublishErrorMessage(
  options: Readonly<{
    reason: MapSnapshotPublishReason;
    mapId: AvaMap.Id;
    layerNames: readonly string[];
  }>,
): string {
  switch (options.reason) {
    case "filtersNoLongerApply":
      return `Cannot publish map ${options.mapId}: saved filters no longer apply on ${options.layerNames.join(", ")}.`;
    case "cannotEditMap":
      return `Cannot publish map ${options.mapId}: the publisher cannot edit it, so its jitter salt is unavailable.`;
  }
}

/**
 * Thrown while compiling a map for a public dashboard when publishing it
 * would show less restricted data than the map is saved with. The publish
 * UI checks `instanceof` and translates `reason` into copy; the message is
 * for logs only.
 */
export class MapSnapshotPublishError extends Error {
  readonly reason: MapSnapshotPublishReason;
  readonly mapId: AvaMap.Id;
  readonly mapName: string;

  /**
   * The layers whose restrictions would be lost, in layer order. Empty when
   * the reason concerns the whole map.
   */
  readonly layerNames: readonly string[];

  /** Creates an error naming the map, its affected layers, and why. */
  constructor(
    options: Readonly<{
      reason: MapSnapshotPublishReason;
      mapId: AvaMap.Id;
      mapName: string;
      layerNames: readonly string[];
    }>,
  ) {
    super(_buildPublishErrorMessage(options));
    this.name = "MapSnapshotPublishError";
    this.reason = options.reason;
    this.mapId = options.mapId;
    this.mapName = options.mapName;
    this.layerNames = options.layerNames;
  }
}
