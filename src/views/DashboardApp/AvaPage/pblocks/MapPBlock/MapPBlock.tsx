import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { createMapViewerSourceFromMetadata } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/createMapViewerSourceFromMetadata/createMapViewerSourceFromMetadata";
import { MapPBlockEmptyState } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlockEmptyState";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { MapViewer } from "@/views/GisApp/MapViewer/MapViewer";
import type { MapPBlockSettings } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { WithPuckProps } from "@puckeditor/core";
import type { ReactElement } from "react";

/** A saved Map block's props. */
export type Props = MapPBlockSettings;

/**
 * Shows a GIS map on a dashboard: live on workspace surfaces, from the
 * published snapshot on a public page. Dashboard filters do not reach it, and
 * the editor says so.
 */
export function MapPBlock(
  props: Readonly<WithPuckProps<Props & { id: string }>>,
): ReactElement {
  const metadata = useAvaPageMetadata(props.puck);
  const display = useMemo(() => {
    return {
      camera: props.view,
      heightPx: props.heightPx,
      showLegend: props.showLegend,
      isInteractive: props.isInteractive,
    };
  }, [props.view, props.heightPx, props.showLegend, props.isInteractive]);
  return (
    <Stack gap="xxs">
      {props.mapId === undefined ? (
        <MapPBlockEmptyState heightPx={props.heightPx} />
      ) : (
        <MapViewer
          source={createMapViewerSourceFromMetadata({
            metadata,
            mapId: props.mapId,
          })}
          display={display}
        />
      )}
      {props.puck.isEditing ? (
        <Text size="xs" c="dimmed">
          <Trans>Dashboard filters don't apply to this map yet.</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
