import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { DisputedColumnSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedColumnSelect";
import { DisputedStatusValueFields } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedStatusValueFields";
import { useBoundarySourceOptions } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { ColumnOption } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedColumnOption.types";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
};

/**
 * Text query columns on the layer's own source, offered for a direct bind.
 *
 * The `id` used is the query column's own id, matching what a resolved
 * `queryColumn` reference is looked up by, not the underlying dataset or
 * concept-attribute id.
 */
function _queryColumnOptions(
  columns: readonly QueryColumn.T[],
): ColumnOption[] {
  return columns
    .filter((column) => {
      return AvaDataType.isText(column.baseColumn.dataType);
    })
    .map((column) => {
      return {
        value: column.id,
        label: QueryColumn.getDerivedColumnName(column),
        reference: { type: "queryColumn", column: column.id },
        queryColumn: column,
      };
    });
}

/**
 * Text columns on the boundary dataset a `joinToBoundaries` or
 * `aggregatePointsToBoundaries` binding resolves to.
 *
 * The boundary, not the layer's own source, is the thing whose line is
 * disputed, so its columns are what the author binds against.
 */
function _boundaryColumnOptions(
  layer: MapLayer.T,
  boundaryOptions: readonly BoundarySourceOption[],
): ColumnOption[] {
  const binding = layer.geoBinding;
  const datasetId =
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries"
      ? binding.boundary.datasetId
      : undefined;
  // `datasetId` is optional, so this stays a lambda: `propEq` requires a
  // defined comparison value and would need a cast to accept `undefined`.
  const selected = boundaryOptions.find((option) => {
    return option.dataset.id === datasetId;
  });
  return (selected?.columns ?? [])
    .filter((column) => {
      return AvaDataType.isText(column.dataType);
    })
    .map((column) => {
      return {
        value: column.id,
        label: column.name,
        reference: { type: "boundaryColumn", column: column.id },
        queryColumn: undefined,
      };
    });
}

/**
 * Binds a disputed-status column and assigns its disputed and undetermined
 * values in the layer inspector.
 *
 * Renders nothing when the layer cannot carry a disputed-status bind: only
 * fill or line symbology on a `geometryColumn`, `joinToBoundaries`, or
 * `aggregatePointsToBoundaries` binding qualifies. A `joinToBoundaries` or
 * `aggregatePointsToBoundaries` layer binds against the boundary dataset's
 * columns rather than its own source, since the boundary is the thing whose
 * line is disputed.
 *
 * The observed values a column actually contains are not available from the
 * inspector today (no distinct-values query is plumbed for a bound layer), so
 * the disputed and undetermined fields are free-text, creatable inputs: the
 * author types the values that mean "disputed" and "undetermined" rather than
 * picking them from a fetched list.
 */
export function DisputedStatusControls({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const sourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(sourceId);
  const boundarySources = useBoundarySourceOptions(
    layer.source.dataSource?.workspaceId,
  );
  if (!MapLayer.canBindDisputedStatus(layer)) {
    return null;
  }

  const options =
    layer.geoBinding?.type === "geometryColumn"
      ? _queryColumnOptions(sourceColumns)
      : _boundaryColumnOptions(layer, boundarySources.options);
  const description =
    layer.disputedStatusColumn === undefined
      ? t`No disputed-status column. Outlines render as settled.`
      : layer.disputedStatusValues.disputed.length === 0 &&
          layer.disputedStatusValues.undetermined.length === 0
        ? t`Column bound. No values assigned; outlines render as settled.`
        : undefined;

  return (
    <>
      <DisputedColumnSelect
        value={layer.disputedStatusColumn?.column ?? null}
        description={description}
        options={options}
        onLayerChange={onLayerChange}
      />
      {layer.disputedStatusColumn === undefined ? null : (
        <DisputedStatusValueFields
          layer={layer}
          onLayerChange={onLayerChange}
        />
      )}
    </>
  );
}
