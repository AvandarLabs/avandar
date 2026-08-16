import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Input, NumberInput, SegmentedControl } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AreaAggregationControls } from "./AreaAggregationControls";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

function _setGridType(
  props: Props,
  grid: MapLayer.GridBinBinding["grid"],
): void {
  props.onLayerChange((current) => {
    return MapLayerUpdates.withGridType(current, grid);
  });
}

function _setGridSize(props: Props, sizeMeters: string | number): void {
  if (typeof sizeMeters !== "number") {
    return;
  }
  props.onLayerChange((current) => {
    return MapLayerUpdates.withGridSizeMeters(current, sizeMeters);
  });
}

/** Edits grid shape, fixed meter size, and cell aggregation. */
export function GridBinControls(props: Props): ReactNode {
  const { t } = useLingui();
  const binding = props.layer.geoBinding;
  if (binding?.type !== "binPointsToGrid") {
    return null;
  }
  return (
    <>
      <Input.Wrapper label={t`Grid shape`}>
        <SegmentedControl
          aria-label={t`Grid shape`}
          data={[
            { value: "hex", label: t`Hex` },
            { value: "square", label: t`Square` },
          ]}
          value={binding.grid}
          onChange={(grid) => {
            _setGridType(props, grid);
          }}
        />
      </Input.Wrapper>
      <NumberInput
        label={t`Cell size (meters)`}
        value={binding.sizeMeters}
        min={100}
        max={1_000_000}
        clampBehavior="blur"
        allowDecimal={false}
        onChange={(sizeMeters) => {
          _setGridSize(props, sizeMeters);
        }}
      />
      <AreaAggregationControls
        layer={props.layer}
        dataSourceId={
          props.layer.source.dataSource ?
            Model.getTypedId(props.layer.source.dataSource)
          : undefined
        }
        sourceColumns={props.sourceColumns}
        onLayerChange={props.onLayerChange}
      />
    </>
  );
}
