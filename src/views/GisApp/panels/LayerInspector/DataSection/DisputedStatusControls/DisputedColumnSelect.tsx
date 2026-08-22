import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ColumnOption } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedColumnOption.types";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { withQueryColumn } from "@/views/GisApp/layers/MapLayerUpdates/withQueryColumn";

type Props = {
  value: string | null;
  description: string | undefined;
  options: readonly ColumnOption[];
  onLayerChange: LayerChangeHandler;
};

/**
 * The query column to bind, reusing an entry already on the layer's query
 * (matched by the underlying dataset or concept-attribute id) instead of the
 * freshly minted one an options list hands back. `useLayerSourceColumns`
 * mints a new `QueryColumn.id` on every call, so matching by the option's own
 * id would append a second entry for a column already selected elsewhere
 * (e.g. as the time column).
 */
function _queryColumnOnLayer(
  layer: MapLayer.T,
  column: QueryColumn.T,
): QueryColumn.T {
  return (
    layer.source.queryColumns.find(
      propEq("baseColumn.id", column.baseColumn.id),
    ) ?? column
  );
}

/**
 * Binds the selected option, or clears the bind when nothing is selected.
 *
 * A `geometryColumn` selection also adds its column to the layer's query if
 * it is not already selected, since a column a layer binds to must be part
 * of its query or it yields no column name. The disputed reference is bound
 * to whichever column object ends up on the query, so the reference id and
 * the query entry never drift apart.
 */
function _bindSelectedColumn(
  layer: MapLayer.T,
  selected: ColumnOption | undefined,
): MapLayer.T {
  if (selected?.queryColumn === undefined) {
    return MapLayerUpdates.withDisputedStatusColumn({
      layer,
      reference: selected?.reference,
    });
  }
  const boundColumn = _queryColumnOnLayer(layer, selected.queryColumn);
  return MapLayerUpdates.withDisputedStatusColumn({
    layer: withQueryColumn({ layer, column: boundColumn }),
    reference: { type: "queryColumn", column: boundColumn.id },
  });
}

/** Binds or clears the layer's disputed-status column. */
export function DisputedColumnSelect({
  value,
  description,
  options,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Disputed status column`}
      placeholder={t`Select a column`}
      description={description}
      clearable
      clearButtonProps={{
        "aria-label": t`Clear Disputed status column`,
        "aria-hidden": false,
      }}
      data={options}
      value={value}
      onChange={(nextValue) => {
        const selected =
          nextValue === null
            ? undefined
            : options.find(propEq("value", nextValue));
        onLayerChange((current) => {
          return _bindSelectedColumn(current, selected);
        });
      }}
    />
  );
}
