import { describe, expect, it } from "vitest";
import { annotationTextOverlayTarget } from "@/views/GisApp/shell/AnnotationTextOverlay/annotationTextOverlayTarget";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

const textFeature = {
  id: "text-1" as AvaMapConfig.AnnotationFeatureId,
  kind: "text",
  geometry: { type: "Point", coordinates: [1, 2] },
  text: "Camp",
  sizePx: 16,
  color: "#111111",
} satisfies AvaMapConfig.AnnotationFeature;

const arrowFeature = {
  id: "arrow-1" as AvaMapConfig.AnnotationFeatureId,
  kind: "arrow",
  geometry: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [1, 1],
    ],
  },
  color: "#111111",
  strokeWidthPx: 2,
} satisfies AvaMapConfig.AnnotationFeature;

describe("annotationTextOverlayTarget", () => {
  it("targets the text being edited", () => {
    expect(
      annotationTextOverlayTarget({
        annotationFeatures: [textFeature],
        editingTextFeatureId: textFeature.id,
        mapToolMode: { type: "annotate", kind: "text" },
        selectedAnnotationFeature: undefined,
      }),
    ).toEqual({ mode: "edit", feature: textFeature });
  });

  it("targets the selected text in Select so the map hides its copy", () => {
    expect(
      annotationTextOverlayTarget({
        annotationFeatures: [textFeature],
        editingTextFeatureId: undefined,
        mapToolMode: { type: "pan" },
        selectedAnnotationFeature: textFeature,
      }),
    ).toEqual({ mode: "select", feature: textFeature });
  });

  it("targets nothing for a drawing tool or a non-text selection", () => {
    expect(
      annotationTextOverlayTarget({
        annotationFeatures: [textFeature],
        editingTextFeatureId: undefined,
        mapToolMode: { type: "annotate", kind: "area" },
        selectedAnnotationFeature: textFeature,
      }),
    ).toBeUndefined();
    expect(
      annotationTextOverlayTarget({
        annotationFeatures: [arrowFeature],
        editingTextFeatureId: undefined,
        mapToolMode: { type: "pan" },
        selectedAnnotationFeature: arrowFeature,
      }),
    ).toBeUndefined();
  });
});
