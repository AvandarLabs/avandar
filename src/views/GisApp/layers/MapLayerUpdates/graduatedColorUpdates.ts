import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import { layerMetaUpdates } from "./layerMetaUpdates";
import type { GraduatedRampPresetKey } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

/** Applies `update` to a graduated color, or returns any other layer as is. */
function _withGraduatedColor(
  options: Readonly<{
    layer: MapLayer.T;
    update: (color: GraduatedColor) => GraduatedColor;
  }>,
): MapLayer.T {
  const { layer, update } = options;
  if (
    layer.symbology.type === "heatmap" ||
    layer.symbology.color.type !== "graduated"
  ) {
    return layer;
  }
  return layerMetaUpdates.withLayerColor({
    layer,
    color: update(layer.symbology.color),
  });
}

/** Sets one class's color, leaving the other classes as they are. */
function withClassColor(
  options: Readonly<{ layer: MapLayer.T; classIndex: number; color: string }>,
): MapLayer.T {
  const { layer, classIndex, color } = options;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        ramp: current.ramp.map((rampColor, index) => {
          return index === classIndex ? color : rampColor;
        }),
      };
    },
  });
}

/** Sets one class's legend label. A blank label restores the generated one. */
function withClassLabel(
  options: Readonly<{ layer: MapLayer.T; classIndex: number; label: string }>,
): MapLayer.T {
  const { layer, classIndex } = options;
  const label = options.label.trim() === "" ? undefined : options.label;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        classLabels: current.classLabels.map((classLabel, index) => {
          return index === classIndex ? label : classLabel;
        }),
      };
    },
  });
}

/** Recolors every class from a preset, read light to dark. */
function withRampPreset(
  options: Readonly<{ layer: MapLayer.T; presetKey: GraduatedRampPresetKey }>,
): MapLayer.T {
  const { layer, presetKey } = options;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        ramp: GraduatedRamps.createPresetRamp({
          key: presetKey,
          isReversed: false,
          classCount: MapLayer.getGraduatedClassCount(current.classification),
        }),
      };
    },
  });
}

/** Reverses the class colors, so the first class takes the last color. */
function withReversedRamp(layer: MapLayer.T): MapLayer.T {
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return { ...current, ramp: current.ramp.toReversed() };
    },
  });
}

/**
 * Flags values below one number: a manual classification with that single
 * break, the threshold preset, and the two given legend labels. The labels
 * arrive already localized.
 */
function withHighlightBelow(
  options: Readonly<{
    layer: MapLayer.T;
    breakValue: number;
    belowLabel: string;
    aboveLabel: string;
  }>,
): MapLayer.T {
  const { layer, breakValue, belowLabel, aboveLabel } = options;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        classification: { method: "manual", breaks: [breakValue] },
        ramp: GraduatedRamps.createPresetRamp({
          key: "threshold",
          isReversed: false,
          classCount: 2,
        }),
        classLabels: [belowLabel, aboveLabel],
      };
    },
  });
}

/** Per-class colors and labels, ramp presets, and the highlight shortcut. */
export const graduatedColorUpdates = {
  withClassColor,
  withClassLabel,
  withRampPreset,
  withReversedRamp,
  withHighlightBelow,
};
