import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ExportLegendEntry } from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Button, Divider, Drawer, Stack, Text } from "@mantine/core";

import css from "@/views/GisApp/export/ExportSheet/ExportSheet.module.css";
import { ExportSheetControls } from "@/views/GisApp/export/ExportSheet/ExportSheetControls";
import { ExportSheetNotices } from "@/views/GisApp/export/ExportSheet/ExportSheetNotices";
import { ExportSheetPreview } from "@/views/GisApp/export/ExportSheet/ExportSheetPreview/ExportSheetPreview";
import { useExportPdfDownload } from "@/views/GisApp/export/useExportPdfDownload/useExportPdfDownload";

type Props = {
  opened: boolean;
  onClose: () => void;
  config: AvaMapConfig.T;
  mapName: string;
  workspaceName: string;
  basemapAttribution: string;
  spec: MapSpec;
  view: AvaMapConfig.ViewState;
  legendEntries: readonly ExportLegendEntry[];
  hasDrawnDisputedFeature: boolean;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/**
 * Edits and persists the map's `exportLayout`, the furniture the PDF prints,
 * and drives the actual capture-and-compose download.
 *
 * This sheet is the sole writer of `exportLayout`: every field routes its
 * edit through `ExportSheetControls`, which calls
 * `AvaMapConfig.withExportLayout` and nowhere else in the app does. Download
 * is never gated by anything the sheet checks, because Export snapshots
 * whatever the screen already shows; a failed download leaves the button
 * enabled so the same click can retry.
 */
export function ExportSheet({
  opened,
  onClose,
  config,
  mapName,
  workspaceName,
  basemapAttribution,
  spec,
  view,
  legendEntries,
  hasDrawnDisputedFeature,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const { status, errorMessage, download } = useExportPdfDownload({
    config,
    spec,
    view,
    mapName,
    workspaceName,
    basemapAttribution,
    legendEntries,
    hasDrawnDisputedFeature,
  });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t`Export`}
      position="right"
      size="md"
    >
      <Stack className={css.exportSheetBody} gap="md">
        <ExportSheetPreview
          config={config}
          mapName={mapName}
          basemapAttribution={basemapAttribution}
        />
        <ExportSheetControls
          config={config}
          mapName={mapName}
          basemapAttribution={basemapAttribution}
          onConfigChange={onConfigChange}
        />
        <Divider />
        <ExportSheetNotices config={config} />
        <Button
          loading={status === "pending"}
          onClick={() => {
            return void download();
          }}
        >
          {t`Download PDF`}
        </Button>
        {status === "error" && errorMessage !== undefined ? (
          <Text size="sm" c="red">
            {errorMessage}
          </Text>
        ) : null}
      </Stack>
    </Drawer>
  );
}
