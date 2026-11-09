import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Stack } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getFeatureListQueryColumns } from "@/clients/maps/MapLayerFeatureList/getFeatureListQueryColumns/getFeatureListQueryColumns";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  featureList: AvaMapConfig.ExportFeatureList;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/**
 * One checkbox per field of the listed layer, in the layer's order. The
 * layer's bound geometry, latitude, and longitude columns are left out, as
 * the feature list drawer leaves them out: a location is unreadable as a
 * cell. Column labels are the layer's field names, which are data, so they
 * are not translated.
 */
export function ExportSheetFeatureListColumnFields({
  layer,
  featureList,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const listableColumns = getFeatureListQueryColumns(
    layer,
    layer.source.queryColumns.map(prop("id")),
  );
  return (
    <Checkbox.Group
      label={t`Columns`}
      value={[...featureList.columnIds]}
      onChange={(selectedIds) => {
        updateExportFeatureList({
          onConfigChange,
          update: (current) => {
            return ExportFeatureListConfig.withColumns({
              featureList: current,
              layer,
              selectedIds,
            });
          },
        });
      }}
    >
      <Stack gap={4} mt="xs">
        {listableColumns.map((column) => {
          return (
            <Checkbox
              key={column.id}
              value={column.id}
              label={QueryColumn.getDerivedColumnName(column)}
            />
          );
        })}
      </Stack>
    </Checkbox.Group>
  );
}
