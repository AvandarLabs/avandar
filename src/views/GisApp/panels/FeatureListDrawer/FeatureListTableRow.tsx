import { useLingui } from "@lingui/react/macro";
import { Button, Table } from "@mantine/core";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import { formatFeatureListCell } from "@/views/GisApp/panels/FeatureListDrawer/formatFeatureListCell/formatFeatureListCell";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ReactNode } from "react";

type Props = {
  row: MapLayerFeatureList["rows"][number];
  list: MapLayerFeatureList;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/**
 * One row of `FeatureListTable`. Pressing the row, or its "Show" button for
 * keyboard users, shows the feature on the map.
 */
export function FeatureListTableRow({
  row,
  list,
  onRowClick,
}: Props): ReactNode {
  const { i18n, t } = useLingui();
  const cells = list.columns.map((column) => {
    return {
      key: column.key,
      text: formatFeatureListCell({
        value: row[column.key],
        column,
        distanceUnit: list.distanceUnit,
        i18n,
      }),
    };
  });
  const rowLabel = cells[0]?.text ?? "";
  const onActivate = (): void => {
    onRowClick(row);
  };
  return (
    <Table.Tr className={css.featureListRow} onClick={onActivate}>
      {cells.map((cell) => {
        return <Table.Td key={cell.key}>{cell.text}</Table.Td>;
      })}
      <Table.Td>
        <Button
          size="compact-xs"
          variant="subtle"
          color="neutral"
          aria-label={t`Show ${rowLabel} on the map`}
          onClick={(event) => {
            event.stopPropagation();
            onActivate();
          }}
        >
          {t`Show`}
        </Button>
      </Table.Td>
    </Table.Tr>
  );
}
