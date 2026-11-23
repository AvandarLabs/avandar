import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { useBasemapAttribution } from "@/views/GisApp/useBasemapAttribution";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = { config: AvaMapConfig.T; hasDrawnDisputedFeature: boolean };

/**
 * Attribution under a read-only map, plus the map's boundary disclaimer
 * whenever a disputed or undetermined boundary is drawn, matching the GIS
 * bottom bar.
 */
export function MapViewerFurniture({
  config,
  hasDrawnDisputedFeature,
}: Props): ReactNode {
  const { t } = useLingui();
  const attribution = useBasemapAttribution(config.basemap);
  return (
    <Stack gap={2} className={css.mapViewerFurniture}>
      <Text size="xs" c="dimmed">
        {attribution}
      </Text>
      {hasDrawnDisputedFeature ? (
        <Text size="xs" c="dimmed">
          {config.exportLayout.disclaimer ??
            t`The boundaries and names shown do not imply official endorsement or acceptance.`}
        </Text>
      ) : null}
    </Stack>
  );
}
