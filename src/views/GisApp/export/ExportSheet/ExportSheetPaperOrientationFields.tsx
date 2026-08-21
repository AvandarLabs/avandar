import { useLingui } from "@lingui/react/macro";
import { Radio, Stack } from "@mantine/core";
import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  exportLayout: AvaMapConfig.ExportLayout;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** Paper size and orientation, the two radio groups the page geometry uses. */
export function ExportSheetPaperOrientationFields({
  exportLayout,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <Radio.Group
        label={t`Paper size`}
        value={exportLayout.paper}
        onChange={(value) => {
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, paper: value };
            },
          });
        }}
      >
        <Stack gap={4}>
          <Radio value="a4" label={t`A4`} />
          <Radio value="letter" label={t`US Letter`} />
        </Stack>
      </Radio.Group>

      <Radio.Group
        label={t`Orientation`}
        value={exportLayout.orientation}
        onChange={(value) => {
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, orientation: value };
            },
          });
        }}
      >
        <Stack gap={4}>
          <Radio value="landscape" label={t`Landscape`} />
          <Radio value="portrait" label={t`Portrait`} />
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
