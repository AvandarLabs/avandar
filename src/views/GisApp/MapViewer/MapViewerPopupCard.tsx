import { Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { CloseButton, Group, Stack, Text } from "@mantine/core";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { useMapViewerPopupKeyboard } from "@/views/GisApp/MapViewer/useMapViewerPopupKeyboard/useMapViewerPopupKeyboard";
import type { MapViewerPopup } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import type { ReactNode } from "react";

type Props = { popup: MapViewerPopup; onClose: () => void };

/**
 * A clicked feature's popup columns, pinned to the map's corner. Focus moves
 * to its close button when it opens, and Escape inside it closes it.
 */
export function MapViewerPopupCard({ popup, onClose }: Props): ReactNode {
  const { t } = useLingui();
  const { closeButtonRef, onKeyDown } = useMapViewerPopupKeyboard({
    popupKey: popup,
    onClose,
  });
  return (
    <section
      className={css.mapViewerPopup}
      aria-label={popup.layerName}
      onKeyDown={onKeyDown}
    >
      <Paper p="xs">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="sm" fw={600}>
            {popup.layerName}
          </Text>
          <CloseButton
            ref={closeButtonRef}
            size="sm"
            aria-label={t`Close`}
            onClick={onClose}
          />
        </Group>
        <Stack gap={2} mt={4}>
          {popup.rows.map((row) => {
            return (
              <Text key={row.name} size="xs" className={css.mapViewerPopupRow}>
                <Text span fw={600} size="xs">
                  {row.name}
                </Text>{" "}
                {row.value}
              </Text>
            );
          })}
        </Stack>
      </Paper>
    </section>
  );
}
