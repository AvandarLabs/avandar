import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";

import { isAutomaticClassificationMethod } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { ClassificationBreakList } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationBreakList";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

type Props = {
  layer: MapLayer.T;
  color: GraduatedColor;
  onLayerChange: LayerChangeHandler;
};

function _applyClassCount(options: {
  color: GraduatedColor;
  classCount: number;
  onLayerChange: LayerChangeHandler;
}): void {
  const { color, classCount, onLayerChange } = options;
  const { method } = color.classification;
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

/** Edits class count for automatic methods, or the manual break list. */
export function GraduatedClassCountControl({
  layer,
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  if (color.classification.method === "manual") {
    return (
      <ClassificationBreakList
        layer={layer}
        breaks={color.classification.breaks}
        onLayerChange={onLayerChange}
      />
    );
  }
  return (
    <NumberInput
      label={t`Classes`}
      min={2}
      max={7}
      value={color.classification.classCount}
      onChange={(value) => {
        if (typeof value === "number") {
          _applyClassCount({ color, classCount: value, onLayerChange });
        }
      }}
    />
  );
}
