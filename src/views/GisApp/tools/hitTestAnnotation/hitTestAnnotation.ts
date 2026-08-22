import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

import { match } from "ts-pattern";

type Point = { x: number; y: number };
type Vertex = readonly [number, number];

type Options = {
  feature: AvaMapConfig.AnnotationFeature;
  eraser: Point;
  radiusPx: number;
  project: (vertex: Vertex) => Point;
};

function _distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function _distanceToSegment(point: Point, start: Point, end: Point): number {
  const spanX = end.x - start.x;
  const spanY = end.y - start.y;
  const lengthSq = spanX * spanX + spanY * spanY;
  if (lengthSq === 0) {
    return _distance(point, start);
  }
  const t = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * spanX + (point.y - start.y) * spanY) / lengthSq,
    ),
  );
  return _distance(point, { x: start.x + spanX * t, y: start.y + spanY * t });
}

function _hitsPolyline(
  coordinates: readonly Vertex[],
  options: Options,
): boolean {
  return coordinates.some((vertex, index) => {
    const nextVertex = coordinates[index + 1];
    if (!nextVertex) {
      return false;
    }
    return (
      _distanceToSegment(
        options.eraser,
        options.project(vertex),
        options.project(nextVertex),
      ) <= options.radiusPx
    );
  });
}

function _hitsText(
  feature: Extract<AvaMapConfig.AnnotationFeature, { kind: "text" }>,
  options: Options,
): boolean {
  const anchor = options.project(feature.geometry.coordinates);
  return (
    _distance(options.eraser, anchor) <= options.radiusPx + feature.sizePx / 2
  );
}

function _hitsArea(
  feature: Extract<AvaMapConfig.AnnotationFeature, { kind: "area" }>,
  options: Options,
): boolean {
  const ring = feature.geometry.coordinates[0];
  if (!ring) {
    return false;
  }
  return _hitsPolyline(ring, options);
}

/** Whether a screen-space eraser dab touches an annotation. */
export function hitTestAnnotation(options: Options): boolean {
  return match(options.feature)
    .with({ kind: "text" }, (feature) => {
      return _hitsText(feature, options);
    })
    .with({ kind: "arrow" }, { kind: "freehand" }, (feature) => {
      return _hitsPolyline(feature.geometry.coordinates, options);
    })
    .with({ kind: "area" }, (feature) => {
      return _hitsArea(feature, options);
    })
    .exhaustive();
}
