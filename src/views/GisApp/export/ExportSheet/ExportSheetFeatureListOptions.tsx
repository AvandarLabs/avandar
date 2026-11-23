import { useLingui } from "@lingui/react/macro";
import { Select, Stack } from "@mantine/core";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { ExportSheetFeatureListColumnFields } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListColumnFields";
import { ExportSheetFeatureListMaxRowsField } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListMaxRowsField";
import { ExportSheetFeatureListSortFields } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListSortFields";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  featureList: AvaMapConfig.ExportFeatureList;
  eligibleLayers: readonly MapLayer.T[];
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** The listed layer, then its columns, order, and row cap. */
export function ExportSheetFeatureListOptions({
  featureList,
  eligibleLayers,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const layer = eligibleLayers.find((candidate) => {
    return candidate.id === featureList.layerId;
  });
  return (
    <Stack gap="sm">
      <Select
        label={t`Layer`}
        placeholder={t`Pick a layer`}
        data={eligibleLayers.map((candidate) => {
          return { value: candidate.id, label: candidate.name };
        })}
        value={layer?.id ?? null}
        allowDeselect={false}
        onChange={(layerId) => {
          const nextLayer = eligibleLayers.find((candidate) => {
            return candidate.id === layerId;
          });
          if (nextLayer === undefined) {
            return;
          }
          updateExportFeatureList({
            onConfigChange,
            update: (current) => {
              return ExportFeatureListConfig.withLayer({
                featureList: current,
                layer: nextLayer,
              });
            },
          });
        }}
      />
      {layer !== undefined ? (
        <ExportSheetFeatureListColumnFields
          layer={layer}
          featureList={featureList}
          onConfigChange={onConfigChange}
        />
      ) : null}
      {layer !== undefined ? (
        <ExportSheetFeatureListSortFields
          layer={layer}
          featureList={featureList}
          onConfigChange={onConfigChange}
        />
      ) : null}
      <ExportSheetFeatureListMaxRowsField
        featureList={featureList}
        onConfigChange={onConfigChange}
      />
    </Stack>
  );
}
