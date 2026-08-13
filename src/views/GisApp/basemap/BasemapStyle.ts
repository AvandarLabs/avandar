import { match } from "ts-pattern";
import { MapStyles } from "@/views/GisApp/basemap/MapStyles";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { StyleSpecification } from "maplibre-gl";

/** Resolves an {@link AvaMap.Basemap} into what MapLibre needs to render it. */
export const BasemapStyle = {
  /**
   * The style MapLibre should load for a basemap.
   *
   * MapLibre always needs a style, so a basemap of `none` resolves to a flat
   * background layer instead of tiles. That is the usable fallback when tile
   * hosts are unreachable.
   */
  build: (basemap: AvaMap.Basemap): string | StyleSpecification => {
    return match(basemap)
      .with({ type: "builtIn" }, (builtIn) => {
        return MapStyles[builtIn.style].url;
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
  buildKey: (basemap: AvaMap.Basemap): string => {
    return match(basemap)
      .with({ type: "builtIn" }, (builtIn) => {
        return `builtIn:${builtIn.style}`;
      })
      .with({ type: "none" }, (none) => {
        return `none:${none.background}`;
      })
      .exhaustive();
  },
};
