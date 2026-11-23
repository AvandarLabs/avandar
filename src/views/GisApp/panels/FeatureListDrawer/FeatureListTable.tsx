import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Group, Table, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useState } from "react";
import { sortMapLayerFeatureListRows } from "@/clients/maps/MapLayerFeatureList/sortMapLayerFeatureListRows/sortMapLayerFeatureListRows";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import { FeatureListTableRow } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListTableRow";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListColumn,
  MapLayerFeatureListSort,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ReactNode } from "react";

type Props = {
  list: MapLayerFeatureList;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/** Nearest first when the list has a distance column. */
function _getDefaultSort(
  list: MapLayerFeatureList,
): MapLayerFeatureListSort | undefined {
  const distanceColumn = list.columns.find(propEq("kind", "distance"));
  return distanceColumn
    ? { key: distanceColumn.key, direction: "asc" }
    : undefined;
}

function _getNextSort(
  current: MapLayerFeatureListSort | undefined,
  key: string,
): MapLayerFeatureListSort {
  return current?.key === key && current.direction === "asc"
    ? { key, direction: "desc" }
    : { key, direction: "asc" };
}

function _getAriaSort(
  sort: MapLayerFeatureListSort | undefined,
  key: string,
): "ascending" | "descending" | "none" {
  if (sort?.key !== key) {
    return "none";
  }
  return sort.direction === "asc" ? "ascending" : "descending";
}

/** Each row's position in the unsorted list, a key that survives sorting. */
function _getRowKeys(
  rows: MapLayerFeatureList["rows"],
): ReadonlyMap<MapLayerFeatureList["rows"][number], number> {
  return new Map(
    rows.map((row, rowIndex) => {
      return [row, rowIndex];
    }),
  );
}

/** One column header that sorts the table by its column when pressed. */
function FeatureListSortHeader({
  column,
  sort,
  onSort,
}: {
  column: MapLayerFeatureListColumn;
  sort: MapLayerFeatureListSort | undefined;
  onSort: (key: string) => void;
}): ReactNode {
  const ariaSort = _getAriaSort(sort, column.key);
  const SortIcon = ariaSort === "descending" ? IconArrowDown : IconArrowUp;
  return (
    <Table.Th aria-sort={ariaSort}>
      <UnstyledButton
        fz="sm"
        fw={600}
        onClick={() => {
          onSort(column.key);
        }}
      >
        <Group gap={4} wrap="nowrap">
          {column.label}
          {ariaSort === "none" ? null : <SortIcon size={12} aria-hidden />}
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

/**
 * The feature list drawer's table: one sortable header per column, and rows
 * that show their feature on the map when pressed. Rendered by
 * `FeatureListBody`, keyed by its columns so the sort starts over (nearest
 * first, when there is a distance column) whenever the columns change.
 */
export function FeatureListTable({ list, onRowClick }: Props): ReactNode {
  const { t } = useLingui();
  const [sort, setSort] = useState(() => {
    return _getDefaultSort(list);
  });
  const rows = sort
    ? sortMapLayerFeatureListRows({ rows: list.rows, sort })
    : list.rows;
  const rowKeys = _getRowKeys(list.rows);
  const onSort = (key: string): void => {
    setSort(_getNextSort(sort, key));
  };
  return (
    <div className={css.featureListScrollArea}>
      {/* Matches the toolbar's inset so columns line up with the count. */}
      <Table stickyHeader highlightOnHover horizontalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {list.columns.map((column) => {
              return (
                <FeatureListSortHeader
                  key={column.key}
                  column={column}
                  sort={sort}
                  onSort={onSort}
                />
              );
            })}
            <Table.Th>
              <VisuallyHidden>{t`Actions`}</VisuallyHidden>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, rowIndex) => {
            return (
              <FeatureListTableRow
                key={rowKeys.get(row)}
                row={row}
                list={list}
                position={rowIndex + 1}
                onRowClick={onRowClick}
              />
            );
          })}
        </Table.Tbody>
      </Table>
    </div>
  );
}
