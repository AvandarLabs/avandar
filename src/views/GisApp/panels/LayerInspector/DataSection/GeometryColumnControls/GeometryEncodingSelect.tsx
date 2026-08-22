import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { isGeometryEncoding } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  encoding: MapLayer.GeometryEncoding;
  onLayerChange: LayerChangeHandler;
};

/** Selects how the geometry column is encoded. */
export function GeometryEncodingSelect({
  encoding,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Encoding`}
      data={[
        { value: "wkt", label: t`WKT` },
        { value: "wkb", label: t`WKB` },
        { value: "geojson", label: t`GeoJSON` },
      ]}
      value={encoding}
      allowDeselect={false}
      onChange={(nextEncoding) => {
        if (!nextEncoding || !isGeometryEncoding(nextEncoding)) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withGeometryEncoding({
            layer: current,
            encoding: nextEncoding,
          });
        });
      }}
    />
  );
}
