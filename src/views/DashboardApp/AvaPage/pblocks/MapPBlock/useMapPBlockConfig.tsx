import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { MapPBlock } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";
import {
  DEFAULT_MAP_PBLOCK_SETTINGS,
  MAP_PBLOCK_HEIGHT_RANGE,
} from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import { MapPickerPField } from "@/views/DashboardApp/AvaPage/pfields/MapPickerPField/MapPickerPField";
import { MapViewPField } from "@/views/DashboardApp/AvaPage/pfields/MapViewPField/MapViewPField";
import type { Props as MapPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";
import type { ComponentConfig } from "@puckeditor/core";

/**
 * Builds the Puck component config for the dashboard's Map block: the map
 * picker, which camera it opens on, its height, legend, and interaction. The
 * camera field reads the picked map's bookmarks through its metadata, and
 * changing the map resets the camera to the new map's saved view.
 */
export function useMapPBlockConfig(): ComponentConfig<MapPBlockProps> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      label: t`Map`,
      fields: {
        mapId: { label: t`Map`, type: "custom", render: MapPickerPField },
        view: { label: t`Opens on`, type: "custom", render: MapViewPField },
        heightPx: {
          label: t`Height in pixels`,
          type: "number",
          min: MAP_PBLOCK_HEIGHT_RANGE.min,
          max: MAP_PBLOCK_HEIGHT_RANGE.max,
        },
        showLegend: {
          label: t`Legend`,
          type: "radio",
          options: [
            { label: t`Show`, value: true },
            { label: t`Hide`, value: false },
          ],
        },
        isInteractive: {
          label: t`Interaction`,
          type: "radio",
          options: [
            { label: t`Pan, zoom, and popups`, value: true },
            { label: t`Fixed picture`, value: false },
          ],
        },
      },
      defaultProps: DEFAULT_MAP_PBLOCK_SETTINGS,
      resolveFields: (data, { fields }) => {
        return {
          ...fields,
          view: { ...fields.view, metadata: { mapId: data.props.mapId } },
        };
      },
      // Puck merges the returned props over the block's own, so only the
      // reset camera is returned.
      resolveData: (_data, { changed, trigger }) => {
        const isNewMap = trigger !== "load" && changed.mapId === true;
        return {
          props: isNewMap ? { view: DEFAULT_MAP_PBLOCK_SETTINGS.view } : {},
        };
      },
      // Puck maps branded strings as objects. Runtime serialized IDs remain
      // strings.
      render: MapPBlock as unknown as ComponentConfig<MapPBlockProps>["render"],
    };
  }, [t]);
}
