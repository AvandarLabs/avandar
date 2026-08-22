import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

import { Divider, Stack } from "@mantine/core";

import { ExportSheetHeaderLineFields } from "@/views/GisApp/export/ExportSheet/ExportSheetHeaderLineFields";
import { ExportSheetMandatoryFurniture } from "@/views/GisApp/export/ExportSheet/ExportSheetMandatoryFurniture";
import { ExportSheetPaperOrientationFields } from "@/views/GisApp/export/ExportSheet/ExportSheetPaperOrientationFields";
import { ExportSheetSourceAndDisclaimerFields } from "@/views/GisApp/export/ExportSheet/ExportSheetSourceAndDisclaimerFields";
import { ExportSheetToggleFields } from "@/views/GisApp/export/ExportSheet/ExportSheetToggleFields";
import { getExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";

type Props = {
  config: AvaMapConfig.T;
  mapName: string;
  basemapAttribution: string;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/**
 * Every editable field of the export sheet. Each field funnels its edit
 * through `updateExportLayout`, so `AvaMapConfig.withExportLayout` is never
 * called outside this directory.
 */
export function ExportSheetControls({
  config,
  mapName,
  basemapAttribution,
  onConfigChange,
}: Props): ReactNode {
  const furnitureText = getExportFurnitureText({
    config,
    mapName,
    basemapAttribution,
  });

  return (
    <Stack gap="md">
      <ExportSheetPaperOrientationFields
        exportLayout={config.exportLayout}
        onConfigChange={onConfigChange}
      />
      <Divider />
      <ExportSheetHeaderLineFields
        config={config}
        mapName={mapName}
        basemapAttribution={basemapAttribution}
        onConfigChange={onConfigChange}
      />
      <ExportSheetToggleFields
        exportLayout={config.exportLayout}
        onConfigChange={onConfigChange}
      />
      <ExportSheetSourceAndDisclaimerFields
        exportLayout={config.exportLayout}
        sourceLinePlaceholder={furnitureText.sourceLine}
        onConfigChange={onConfigChange}
      />
      <Divider />
      <ExportSheetMandatoryFurniture />
    </Stack>
  );
}
