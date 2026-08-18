import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

type Vertex = readonly [number, number];

function _copyVertex(vertex: Vertex): [number, number] {
  return [vertex[0], vertex[1]];
}

function _paintDefaults(): {
  color: string;
  sizePx: number;
  strokeWidthPx: number;
  opacity: number;
} {
  const defaults = AvaMapConfig.GisWaveDDefaults;
  return {
    color: defaults.annotationColor,
    sizePx: defaults.annotationTextSizePx,
    strokeWidthPx: defaults.annotationStrokeWidthPx,
    opacity: defaults.annotationAreaOpacity,
  };
}

/** Builds a text annotation at `coordinates` with empty text. */
export function makeTextAnnotationFeature(
  coordinates: Vertex,
): AvaMapConfig.AnnotationFeature {
  const paint = _paintDefaults();
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "text",
    geometry: { type: "Point", coordinates: _copyVertex(coordinates) },
    text: "",
    sizePx: paint.sizePx,
    color: paint.color,
  };
}

/** Builds an arrow annotation from start and end vertices. */
export function makeArrowAnnotationFeature(
  start: Vertex,
  end: Vertex,
): AvaMapConfig.AnnotationFeature {
  const paint = _paintDefaults();
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "arrow",
    geometry: {
      type: "LineString",
      coordinates: [_copyVertex(start), _copyVertex(end)],
    },
    color: paint.color,
    strokeWidthPx: paint.strokeWidthPx,
  };
}

/** Builds a freehand stroke from two or more vertices. */
export function makeFreehandAnnotationFeature(
  vertices: readonly Vertex[],
): AvaMapConfig.AnnotationFeature {
  const paint = _paintDefaults();
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "freehand",
    geometry: {
      type: "LineString",
      coordinates: vertices.map(_copyVertex),
    },
    color: paint.color,
    strokeWidthPx: paint.strokeWidthPx,
  };
}

/** Builds an area annotation from a closed ring. */
export function makeAreaAnnotationFeature(
  ring: readonly Vertex[],
): AvaMapConfig.AnnotationFeature {
  const paint = _paintDefaults();
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "area",
    geometry: { type: "Polygon", coordinates: [ring.map(_copyVertex)] },
    color: paint.color,
    opacity: paint.opacity,
    stroke: { color: paint.color, widthPx: paint.strokeWidthPx },
  };
}
