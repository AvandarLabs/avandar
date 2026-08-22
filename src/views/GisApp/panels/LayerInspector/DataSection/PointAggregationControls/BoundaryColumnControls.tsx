import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

type PointAggregationBinding = Extract<
  MapLayer.GeoBinding,
  { type: "aggregatePointsToBoundaries" }
>;

type Props = {
  binding: PointAggregationBinding;
  columns: readonly DatasetColumn.T[];
  updateBoundary: (boundary: MapLayer.BoundarySource) => void;
};

/** Selects the boundary geometry and join-key columns. */
export function BoundaryColumnControls({
  binding,
  columns,
  updateBoundary,
}: Props): ReactNode {
  const { t } = useLingui();
  const data = columns.map((column) => {
    return { value: column.id, label: column.name };
  });
  return (
    <>
      <Select
        label={t`Boundary geometry column`}
        data={data}
        value={binding.boundary.geometryColumnId}
        allowDeselect={false}
        onChange={(value) => {
          if (value) {
            updateBoundary({
              ...binding.boundary,
              geometryColumnId: value as DatasetColumn.Id,
            });
          }
        }}
      />
      <Select
        label={t`Boundary key column`}
        data={data}
        value={binding.boundary.keyColumnId}
        allowDeselect={false}
        onChange={(value) => {
          if (value) {
            updateBoundary({
              ...binding.boundary,
              keyColumnId: value as DatasetColumn.Id,
            });
          }
        }}
      />
    </>
  );
}
