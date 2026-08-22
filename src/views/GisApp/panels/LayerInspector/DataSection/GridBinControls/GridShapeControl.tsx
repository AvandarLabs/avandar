import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Input, SegmentedControl } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  grid: MapLayer.GridBinBinding["grid"];
  onLayerChange: LayerChangeHandler;
};

/** Selects hex or square cells for a grid-bin layer. */
export function GridShapeControl({ grid, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Input.Wrapper label={t`Grid shape`}>
      <SegmentedControl
        aria-label={t`Grid shape`}
        data={[
          { value: "hex", label: t`Hex` },
          { value: "square", label: t`Square` },
        ]}
        value={grid}
        onChange={(nextGrid) => {
          if (nextGrid !== "hex" && nextGrid !== "square") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withGridType({
              layer: current,
              grid: nextGrid,
            });
          });
        }}
      />
    </Input.Wrapper>
  );
}
