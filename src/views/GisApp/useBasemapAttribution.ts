import { useLingui } from "@lingui/react/macro";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * The attribution string shown on screen and on the exported PDF: a custom
 * basemap's own attribution, or the Lingui-translated MapLibre/OSM credit for
 * a built-in basemap.
 */
export function useBasemapAttribution(basemap: AvaMapConfig.Basemap): string {
  const { t } = useLingui();
  return basemap.type === "custom" ?
      basemap.attribution
    : t`MapLibre, OpenStreetMap contributors`;
}
