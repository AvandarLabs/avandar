import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { isAutomaticClassificationMethod } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { GraduatedClassCountControl } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassCountControl";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

type Props = {
  layer: MapLayer.T;
  color: GraduatedColor;
  classCount: number;
  manualBreaks: readonly number[];
  onLayerChange: LayerChangeHandler;
};

function _applyClassificationMethod(options: {
  color: GraduatedColor;
  method: string;
  classCount: number;
  manualBreaks: readonly number[];
  onLayerChange: LayerChangeHandler;
}): void {
  const { color, method, classCount, manualBreaks, onLayerChange } = options;
  if (method === "manual") {
    onLayerChange((current) => {
      return MapLayerUpdates.withLayerColor({
        layer: current,
        color: {
          ...color,
          classification: { method, breaks: manualBreaks },
        },
      });
    });
    return;
  }
  if (!isAutomaticClassificationMethod(method)) {
    return;
  }
  onLayerChange((current) => {
    return MapLayerUpdates.withLayerColor({
      layer: current,
      color: {
        ...color,
        classification: { method, classCount },
      },
    });
  });
}

/** Edits the classification method and class count or manual breaks. */
export function GraduatedMethodControls({
  layer,
  color,
  classCount,
  manualBreaks,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <Select
        label={t`Method`}
        data={[
          { value: "quantile", label: t`Quantile` },
          { value: "equalInterval", label: t`Equal interval` },
          { value: "jenks", label: t`Natural breaks` },
          { value: "standardDeviation", label: t`Standard deviation` },
          { value: "manual", label: t`Manual` },
        ]}
        value={color.classification.method}
        allowDeselect={false}
        onChange={(method) => {
          if (method) {
            _applyClassificationMethod({
              color,
              method,
              classCount,
              manualBreaks,
              onLayerChange,
            });
          }
        }}
      />
      <GraduatedClassCountControl
        layer={layer}
        color={color}
        onLayerChange={onLayerChange}
      />
    </>
  );
}
