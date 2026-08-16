import { useLingui } from "@lingui/react/macro";
import { ColorInput, TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits the no-data color and optional label override. */
export function NoDataControls(props: Props): ReactNode {
  const { t } = useLingui();
  const { symbology } = props.layer;
  if (symbology.type === "heatmap" || symbology.color.type === "single") {
    return null;
  }
  const color = symbology.color;
  const update = (noData: typeof color.noData): void => {
    props.onLayerChange((current) => {
      if (current.symbology.type === "heatmap") {
        return current;
      }
      const currentColor = current.symbology.color;
      return currentColor.type === "single" ?
          current
        : MapLayerUpdates.withLayerColor(current, { ...currentColor, noData });
    });
  };
  return (
    <>
      <ColorInput
        label={t`No data color`}
        value={color.noData.color}
        onChange={(value) => {
          return update({ ...color.noData, color: value });
        }}
      />
      <TextInput
        label={t`No data label`}
        placeholder={t`Not reported`}
        value={color.noData.label}
        onChange={(event) => {
          update({ ...color.noData, label: event.currentTarget.value });
        }}
      />
    </>
  );
}
