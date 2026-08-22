import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";

import { ExportSheetHeaderLineField } from "@/views/GisApp/export/ExportSheet/ExportSheetHeaderLineField";
import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import { getExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";

type Props = {
  config: AvaMapConfig.T;
  mapName: string;
  basemapAttribution: string;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** The title and subtitle fields, each with its own visibility switch. */
export function ExportSheetHeaderLineFields({
  config,
  mapName,
  basemapAttribution,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const furnitureText = getExportFurnitureText({
    config,
    mapName,
    basemapAttribution,
  });

  return (
    <Stack gap="xs">
      <ExportSheetHeaderLineField
        label={t`Title`}
        visibilityLabel={t`Show the title on the page`}
        headerLine={config.exportLayout.title}
        placeholder={furnitureText.title}
        onChange={(title) => {
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, title };
            },
          });
        }}
      />
      <ExportSheetHeaderLineField
        label={t`Subtitle`}
        visibilityLabel={t`Show the subtitle on the page`}
        headerLine={config.exportLayout.subtitle}
        placeholder={furnitureText.subtitle}
        onChange={(subtitle) => {
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, subtitle };
            },
          });
        }}
      />
    </Stack>
  );
}
