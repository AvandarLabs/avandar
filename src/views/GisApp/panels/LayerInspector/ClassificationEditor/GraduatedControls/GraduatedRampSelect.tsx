import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  color: Extract<MapLayer.Color, { type: "graduated" }>;
  onLayerChange: LayerChangeHandler;
};

/** Selects a sequential color ramp for graduated symbology. */
export function GraduatedRampSelect({
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Color ramp`}
      data={[
        { value: "blue", label: t`Blue` },
        { value: "orange", label: t`Orange` },
      ]}
      value={color.ramp[0] === GraduatedRamps.presets.orange[0] ? "orange" : "blue"}
      allowDeselect={false}
      onChange={(value) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withLayerColor({
            layer: current,
            color: {
              ...color,
              ramp:
                value === "orange"
                  ? GraduatedRamps.presets.orange
                  : GraduatedRamps.presets.blue,
            },
          });
        });
      }}
    />
  );
}
