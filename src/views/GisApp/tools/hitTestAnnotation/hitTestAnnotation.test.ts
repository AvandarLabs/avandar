import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

import { describe, expect, it } from "vitest";

import { uuid } from "$/lib/uuid";
import { hitTestAnnotation } from "@/views/GisApp/tools/hitTestAnnotation/hitTestAnnotation";

function _identityProject(vertex: readonly [number, number]): {
  x: number;
  y: number;
} {
  return { x: vertex[0], y: vertex[1] };
}

describe("hitTestAnnotation", () => {
  it("hits a text annotation near its anchor", () => {
    const feature: AvaMapConfig.AnnotationFeature = {
      id: uuid<AvaMapConfig.AnnotationFeatureId>(),
      kind: "text",
      geometry: { type: "Point", coordinates: [10, 10] },
      text: "Note",
      sizePx: 16,
      color: "#000000",
    };
    expect(
      hitTestAnnotation({
        feature,
        eraser: { x: 12, y: 10 },
        radiusPx: 4,
        project: _identityProject,
      }),
    ).toBe(true);
  });

  it("misses a text annotation far from its anchor", () => {
    const feature: AvaMapConfig.AnnotationFeature = {
      id: uuid<AvaMapConfig.AnnotationFeatureId>(),
      kind: "text",
      geometry: { type: "Point", coordinates: [10, 10] },
      text: "Note",
      sizePx: 16,
      color: "#000000",
    };
    expect(
      hitTestAnnotation({
        feature,
        eraser: { x: 80, y: 10 },
        radiusPx: 4,
        project: _identityProject,
      }),
    ).toBe(false);
  });

  it("hits an arrow when the brush touches the segment", () => {
    const feature: AvaMapConfig.AnnotationFeature = {
      id: uuid<AvaMapConfig.AnnotationFeatureId>(),
      kind: "arrow",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [20, 0],
        ],
      },
      color: "#000000",
      strokeWidthPx: 2,
    };
    expect(
      hitTestAnnotation({
        feature,
        eraser: { x: 10, y: 1 },
        radiusPx: 2,
        project: _identityProject,
      }),
    ).toBe(true);
  });
});
