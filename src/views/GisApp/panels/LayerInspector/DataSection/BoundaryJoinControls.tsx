import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AreaAggregationControls } from "./AreaAggregationControls";
import { BoundarySourceControls } from "./BoundarySourceControls";
import type { BoundarySourceOption } from "./useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  options: readonly BoundarySourceOption[];
  onLayerChange: LayerChangeHandler;
};

/** Edits a complete source-key boundary join and its aggregation. */
export function BoundaryJoinControls(props: Props): ReactNode {
  const { t } = useLingui();
  const binding = props.layer.geoBinding;
  if (binding?.type !== "joinToBoundaries") return null;
  const dataSourceId =
    props.layer.source.dataSource ?
      Model.getTypedId(props.layer.source.dataSource)
    : undefined;
  const dataKeyColumn = MapLayerUpdates.getQueryColumnFromLayer({
    layer: props.layer,
    columnId: binding.dataKeyColumn,
  });
  if (!dataKeyColumn) return null;
  const updateJoin = (
    column: typeof dataKeyColumn,
    matching: "exact" | "normalizedName",
  ) => {
    props.onLayerChange((current) => {
      return MapLayerUpdates.withBoundaryJoin(current, {
        dataKeyColumn: column,
        matching,
        boundary: binding.boundary,
      });
    });
  };
  return (
    <>
      <QueryColumnSingleSelect
        label={t`Data key column`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={dataKeyColumn}
        onChange={(column) => {
          if (column) updateJoin(column, binding.matching);
        }}
      />
      <Select
        label={t`Matching`}
        data={[
          { value: "exact", label: t`Exact` },
          { value: "normalizedName", label: t`Normalized name` },
        ]}
        value={binding.matching}
        allowDeselect={false}
        onChange={(matching) => {
          if (matching) {
            updateJoin(dataKeyColumn, matching as "exact" | "normalizedName");
          }
        }}
      />
      <BoundarySourceControls {...props} dataKeyColumn={dataKeyColumn} />
      <AreaAggregationControls
        layer={props.layer}
        dataSourceId={dataSourceId}
        sourceColumns={props.layer.source.queryColumns}
        onLayerChange={props.onLayerChange}
      />
    </>
  );
}
