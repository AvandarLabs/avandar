import { useLingui } from "@lingui/react/macro";
import { Stack, Switch } from "@mantine/core";
import { useId } from "react";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { ExportSheetFeatureListOptions } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListOptions";
import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  config: AvaMapConfig.T;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/**
 * The "Include a feature list" switch and, while it is on, the list's
 * options. Only layers the feature list drawer lists rows for can be printed
 * (exact points, lines, or polygons drawn from rows), so with none on the map
 * the switch is disabled and says why. A list that is already on can always
 * be turned off. Mantine renders the description inside the switch's label,
 * so the switch names itself and points at the description instead.
 */
export function ExportSheetFeatureListFields({
  config,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const eligibleLayers = ExportFeatureListConfig.getEligibleLayers(config);
  const firstLayer = eligibleLayers[0];
  const { featureList } = config.exportLayout;
  const descriptionId = useId();
  return (
    <Stack gap="sm">
      <Switch
        label={t`Include a feature list`}
        aria-label={t`Include a feature list`}
        aria-describedby={descriptionId}
        attributes={{ description: { id: descriptionId } }}
        description={
          firstLayer === undefined
            ? t`Only point, line, or polygon layers with exact locations can be listed.`
            : t`Prints the layer's features as a table after the map.`
        }
        disabled={firstLayer === undefined && featureList === undefined}
        checked={featureList !== undefined}
        onChange={(event) => {
          const isChecked = event.currentTarget.checked;
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return {
                ...layout,
                featureList:
                  isChecked && firstLayer !== undefined
                    ? ExportFeatureListConfig.createFromLayer(firstLayer)
                    : undefined,
              };
            },
          });
        }}
      />
      {featureList !== undefined ? (
        <ExportSheetFeatureListOptions
          featureList={featureList}
          eligibleLayers={eligibleLayers}
          onConfigChange={onConfigChange}
        />
      ) : null}
    </Stack>
  );
}
