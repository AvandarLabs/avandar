import { useLingui } from "@lingui/react/macro";
import { SegmentedControl, Select, Stack } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
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

/** The "Sort by" option value that clears the sort. */
const DEFAULT_ORDER_VALUE = "default";

/** The column the list sorts by, or its default order, and the direction. */
export function ExportSheetFeatureListSortFields({
  layer,
  featureList,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const listedColumns = layer.source.queryColumns.filter((column) => {
    return featureList.columnIds.includes(column.id);
  });
  return (
    <Stack gap="xs">
      <Select
        label={t`Sort by`}
        description={t`The default order lists the nearest first when a buffer filters the layer.`}
        data={[
          { value: DEFAULT_ORDER_VALUE, label: t`Default order` },
          ...listedColumns.map((column) => {
            return {
              value: column.id,
              label: QueryColumn.getDerivedColumnName(column),
            };
          }),
        ]}
        value={featureList.sort?.columnId ?? DEFAULT_ORDER_VALUE}
        allowDeselect={false}
        onChange={(columnId) => {
          updateExportFeatureList({
            onConfigChange,
            update: (current) => {
              return ExportFeatureListConfig.withSortColumn({
                featureList: current,
                columnId,
              });
            },
          });
        }}
      />
      <SegmentedControl
        aria-label={t`Sort direction`}
        disabled={featureList.sort === undefined}
        data={[
          { value: "asc", label: t`Ascending` },
          { value: "desc", label: t`Descending` },
        ]}
        value={featureList.sort?.direction ?? "asc"}
        onChange={(direction) => {
          updateExportFeatureList({
            onConfigChange,
            update: (current) => {
              return ExportFeatureListConfig.withSortDirection({
                featureList: current,
                direction,
              });
            },
          });
        }}
      />
    </Stack>
  );
}
