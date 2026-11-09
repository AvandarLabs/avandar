import { Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { CloseButton, Group, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import type { MapViewerPopup } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import type { ReactNode } from "react";

type Props = { popup: MapViewerPopup; onClose: () => void };

/**
 * A clicked feature's popup columns, pinned to the map's corner. Focus moves
 * to its close button when it opens, and Escape closes it.
 */
export function MapViewerPopupCard({ popup, onClose }: Props): ReactNode {
  const { t } = useLingui();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [popup]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  return (
    <section className={css.mapViewerPopup} aria-label={popup.layerName}>
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
