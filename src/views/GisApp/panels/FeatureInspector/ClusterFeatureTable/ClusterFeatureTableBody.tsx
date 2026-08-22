import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ClusterTableColumns } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Button, Pagination, Table } from "@mantine/core";

import css from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable.module.css";
import { getClusterTableColumns } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumns/getClusterTableColumns";

type Props = {
  leaves: readonly GeoJSON.Feature[];
  layer: MapLayer.T | undefined;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowClick: (feature: GeoJSON.Feature) => void;
};

/** Reads one cell's display value from either a leaf's properties or id. */
function _getCellValue(
  leaf: GeoJSON.Feature,
  columns: ClusterTableColumns,
  key: string,
): unknown {
  return columns.source === "id" ? leaf.id : leaf.properties?.[key];
}

/** A short label identifying one row, for the row's "view" button. */
function _getRowLabel(
  leaf: GeoJSON.Feature,
  columns: ClusterTableColumns,
): string {
  const [firstKey] = columns.keys;
  const value = firstKey ? _getCellValue(leaf, columns, firstKey) : undefined;
  return value == null ? String(leaf.id) : String(value);
}

/** A resolved page of cluster leaves, rendered as clickable table rows. */
export function ClusterFeatureTableBody({
  leaves,
  layer,
  page,
  totalPages,
  onPageChange,
  onRowClick,
}: Props): ReactNode {
  const { t } = useLingui();
  const columns = getClusterTableColumns({ layer, leaves });

  return (
    <>
      <div className={css.clusterFeatureTableScrollArea}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {columns.keys.map((key) => {
                return <Table.Th key={key}>{key}</Table.Th>;
              })}
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {leaves.map((leaf) => {
              const onActivate = (): void => {
                onRowClick(leaf);
              };
              return (
                <Table.Tr
                  key={String(leaf.id)}
                  className={css.clusterFeatureTableRow}
                  onClick={onActivate}
                >
                  {columns.keys.map((key) => {
                    const value = _getCellValue(leaf, columns, key);
                    return (
                      <Table.Td key={key}>
                        {value == null ? "" : String(value)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      aria-label={t`View details for ${_getRowLabel(leaf, columns)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onActivate();
                      }}
                    >
                      {t`View`}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
      {totalPages > 1 ? (
        <div className={css.clusterFeatureTablePagination}>
          <Pagination total={totalPages} value={page} onChange={onPageChange} />
        </div>
      ) : null}
    </>
  );
}
