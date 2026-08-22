import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { TextFeature } from "@/views/GisApp/shell/AnnotationTextOverlay/useProjectedOverlayPoint";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";

import { propEq } from "@avandar/utils";

type Options = {
  annotationFeatures: readonly AvaMapConfig.AnnotationFeature[];
  editingTextFeatureId: AvaMapConfig.AnnotationFeatureId | undefined;
  mapToolMode: MapToolMode;
  selectedAnnotationFeature: AvaMapConfig.AnnotationFeature | undefined;
};

/** The text annotation the HTML overlay draws, and how it draws it. */
export type AnnotationTextOverlayTarget =
  | { mode: "edit"; feature: TextFeature }
  | { mode: "select"; feature: TextFeature }
  | undefined;

/**
 * Picks the text annotation the overlay owns: the one being edited, else the
 * one selected in Select mode. The map layer must hide whichever this returns,
 * because the overlay draws its own copy of the text.
 */
export function annotationTextOverlayTarget(
  options: Options,
): AnnotationTextOverlayTarget {
  const editingFeature =
    options.editingTextFeatureId === undefined
      ? undefined
      : options.annotationFeatures.find(
          propEq("id", options.editingTextFeatureId),
        );
  if (editingFeature?.kind === "text") {
    return { mode: "edit", feature: editingFeature };
  }
  const selectedFeature = options.selectedAnnotationFeature;
  if (options.mapToolMode.type !== "pan" || selectedFeature?.kind !== "text") {
    return undefined;
  }
  return { mode: "select", feature: selectedFeature };
}
