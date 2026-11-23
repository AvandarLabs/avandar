import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  featureList: AvaMapConfig.ExportFeatureList;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** How many rows the PDF prints at most. */
export function ExportSheetFeatureListMaxRowsField({
  featureList,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <NumberInput
      label={t`Maximum rows`}
      description={t`Up to 1,000. The PDF says when the list is cut short.`}
      min={1}
      max={ExportFeatureListConfig.maxRows}
      clampBehavior="strict"
      allowDecimal={false}
      value={featureList.maxRows}
      onChange={(value) => {
        if (typeof value !== "number") {
          return;
        }
        updateExportFeatureList({
          onConfigChange,
          update: (current) => {
            return { ...current, maxRows: value };
          },
        });
      }}
    />
  );
}
