import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";

/** A dashboard Map block's saved props, apart from Puck's own `id`. */
export type MapPBlockSettings = {
  /** The map to show, or `undefined` until the author picks one. */
  mapId: AvaMap.Id | undefined;
  view: MapViewerCamera;
  heightPx: number;
  showLegend: boolean;
  isInteractive: boolean;
};

/** The block heights the editor allows, in pixels. */
export const MAP_PBLOCK_HEIGHT_RANGE = { min: 240, max: 1200 } as const;

/** A new Map block: no map yet, the saved view, legend on, interactive. */
export const DEFAULT_MAP_PBLOCK_SETTINGS: MapPBlockSettings = {
  mapId: undefined,
  view: { type: "saved" },
  heightPx: 480,
  showLegend: true,
  isInteractive: true,
};

const MapViewerCameraSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("saved") }),
  z.object({
    type: z.literal("bookmark"),
    bookmarkId: uuidType<AvaMapConfig.BookmarkId>(),
  }),
]);

const MapPBlockSettingsSchema = z.object({
  mapId: uuidType<AvaMap.Id>().optional(),
  view: MapViewerCameraSchema.catch(DEFAULT_MAP_PBLOCK_SETTINGS.view),
  heightPx: z
    .number()
    .int()
    .min(MAP_PBLOCK_HEIGHT_RANGE.min)
    .max(MAP_PBLOCK_HEIGHT_RANGE.max)
    .catch(DEFAULT_MAP_PBLOCK_SETTINGS.heightPx),
  showLegend: z.boolean().catch(DEFAULT_MAP_PBLOCK_SETTINGS.showLegend),
  isInteractive: z.boolean().catch(DEFAULT_MAP_PBLOCK_SETTINGS.isInteractive),
});

/**
 * Reads a Map block's saved props. Display settings that are missing or out
 * of range fall back to the defaults. A map id that is not a uuid makes the
 * whole block unreadable, since there is no map to fall back to.
 */
export function parseMapPBlockSettings(
  value: unknown,
): MapPBlockSettings | undefined {
  const result = MapPBlockSettingsSchema.safeParse(value);
  return result.success
    ? { ...result.data, mapId: result.data.mapId }
    : undefined;
}
