import { match } from "ts-pattern";
import { MapStyles } from "@/views/GisApp/basemap/MapStyles";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { StyleSpecification } from "maplibre-gl";

/** Source id for a workspace-supplied tile service. */
const CUSTOM_BASEMAP_SOURCE_ID = "ava-custom-basemap";

/** Layer id for a workspace-supplied tile service. */
const CUSTOM_BASEMAP_LAYER_ID = "ava-custom-basemap-layer";

function _makeCustomStyle(
  custom: Extract<AvaMapConfig.Basemap, { type: "custom" }>,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      [CUSTOM_BASEMAP_SOURCE_ID]: {
        type: "raster",
        tiles: [custom.url],
        tileSize: 256,
        attribution: custom.attribution,
      },
    },
    layers: [
      {
        id: CUSTOM_BASEMAP_LAYER_ID,
        type: "raster",
        source: CUSTOM_BASEMAP_SOURCE_ID,
      },
    ],
  };
}

/**
 * Turns an {@link AvaMapConfig.Basemap} into what MapLibre needs to render it.
 */
export const BasemapStyle = {
  /**
   * The style MapLibre should load for a basemap.
   *
   * MapLibre always needs a style, so a basemap of `none` becomes a flat
   * background layer instead of tiles. That is the usable fallback when tile
   * hosts are unreachable.
   */
  fromBasemap: (basemap: AvaMapConfig.Basemap): string | StyleSpecification => {
    return match(basemap)
      .with({ type: "builtIn" }, (builtIn) => {
        return MapStyles[builtIn.style].url;
      })
      .with({ type: "custom" }, (custom) => {
        return _makeCustomStyle(custom);
      })
      .with({ type: "none" }, (none) => {
        return {
          version: 8 as const,
          sources: {},
          layers: [
            {
              id: "background",
              type: "background" as const,
              paint: { "background-color": none.background },
            },
          ],
        };
      })
      .exhaustive();
  },

  /** Identity of a basemap, used to skip redundant `setStyle` calls. */
  toKey: (basemap: AvaMapConfig.Basemap): string => {
    return match(basemap)
      .with({ type: "builtIn" }, (builtIn) => {
        return `builtIn:${builtIn.style}`;
      })
      .with({ type: "custom" }, (custom) => {
        return JSON.stringify([
          custom.type,
          custom.kind,
          custom.url,
          custom.attribution,
        ]);
      })
      .with({ type: "none" }, (none) => {
        return `none:${none.background}`;
      })
      .exhaustive();
  },
};
