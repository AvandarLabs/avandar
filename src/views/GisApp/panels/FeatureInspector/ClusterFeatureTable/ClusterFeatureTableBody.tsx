import { Pagination, Table } from "@mantine/core";
import css from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable.module.css";
import { getClusterTableColumnsFromLeaves } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";
import type { ClusterTableColumns } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";
import type { ReactNode } from "react";

type Props = {
  leaves: readonly GeoJSON.Feature[];
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

/** Presses Enter or Space on a row the same as clicking it. */
function _onRowKeyDown(
  event: React.KeyboardEvent<HTMLTableRowElement>,
  onActivate: () => void,
): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  onActivate();
}

/** A resolved page of cluster leaves, rendered as clickable table rows. */
export function ClusterFeatureTableBody({
  leaves,
  page,
  totalPages,
  onPageChange,
  onRowClick,
}: Props): ReactNode {
  const columns = getClusterTableColumnsFromLeaves(leaves);

  return (
    <>
      <div className={css.clusterFeatureTableScrollArea}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {columns.keys.map((key) => {
                return <Table.Th key={key}>{key}</Table.Th>;
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {leaves.map((leaf, index) => {
              const onActivate = (): void => {
                onRowClick(leaf);
              };
              return (
                <Table.Tr
                  key={leaf.id ?? index}
                  className={css.clusterFeatureTableRow}
                  tabIndex={0}
                  role="button"
                  onClick={onActivate}
                  onKeyDown={(event) => {
                    _onRowKeyDown(event, onActivate);
                  }}
                >
                  {columns.keys.map((key) => {
                    const value = _getCellValue(leaf, columns, key);
                    return (
                      <Table.Td key={key}>
                        {value == null ? "" : String(value)}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
      {totalPages > 1 ?
        <div className={css.clusterFeatureTablePagination}>
          <Pagination total={totalPages} value={page} onChange={onPageChange} />
        </div>
      : null}
    </>
  );
}
