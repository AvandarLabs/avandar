import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Stack, Switch } from "@mantine/core";

import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";

type Props = {
  exportLayout: AvaMapConfig.ExportLayout;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** The north arrow and scale bar switches. */
export function ExportSheetToggleFields({
  exportLayout,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="xs">
      <Switch
        label={t`North arrow`}
        checked={exportLayout.northArrow}
        onChange={(event) => {
          const northArrow = event.currentTarget.checked;
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, northArrow };
            },
          });
        }}
      />
      <Switch
        label={t`Scale bar`}
        checked={exportLayout.scaleBar}
        onChange={(event) => {
          const scaleBar = event.currentTarget.checked;
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, scaleBar };
            },
          });
        }}
      />
    </Stack>
  );
}
