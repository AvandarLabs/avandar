import { useLingui } from "@lingui/react/macro";
import { Stack, Textarea, TextInput } from "@mantine/core";
import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  exportLayout: AvaMapConfig.ExportLayout;
  sourceLinePlaceholder: string;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/**
 * The source line and the disclaimer. An empty disclaimer is stored
 * verbatim here: `AvaMapConfig.withExportLayout` normalizes a blank or
 * whitespace-only value to `undefined`, so clearing the field restores the
 * localized default rather than printing nothing.
 */
export function ExportSheetSourceAndDisclaimerFields({
  exportLayout,
  sourceLinePlaceholder,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="xs">
      <TextInput
        label={t`Source line`}
        placeholder={sourceLinePlaceholder}
        value={exportLayout.sourceLine}
        onChange={(event) => {
          const sourceLine = event.currentTarget.value;
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, sourceLine };
            },
          });
        }}
      />
      <Textarea
        label={t`Disclaimer`}
        placeholder={t`The boundaries and names shown do not imply official endorsement or acceptance.`}
        value={exportLayout.disclaimer ?? ""}
        onChange={(event) => {
          const disclaimer = event.currentTarget.value;
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return { ...layout, disclaimer };
            },
          });
        }}
      />
    </Stack>
  );
}
