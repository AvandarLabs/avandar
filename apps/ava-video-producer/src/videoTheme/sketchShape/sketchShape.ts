import rough from "roughjs";
import { buildCanonicalJsonFromValue } from "../hashVideoTheme/hashVideoTheme";
import type { ResolvedSketchProfile } from "../videoTheme.types";

/** A shape to sketch, in the SVG coordinates of the graphic that draws it. */
export type SketchShape =
  | Readonly<{
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  | Readonly<{ kind: "circle"; cx: number; cy: number; r: number }>
  | Readonly<{
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
    }>
  | Readonly<{ kind: "line"; x1: number; y1: number; x2: number; y2: number }>
  | Readonly<{ kind: "path"; d: string }>;

/** The stroke and fill a sketched shape is drawn with. */
export type SketchPaint = Readonly<{
  stroke: string;
  strokeWidth: number;
  fill?: string;
}>;

/** One roughjs output path. */
export type SketchPath = Readonly<{
  d: string;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}>;

const CACHE_LIMIT = 4000;
const CACHE = new Map<string, readonly SketchPath[]>();

type Generator = ReturnType<typeof rough.generator>;
type Options = Parameters<Generator["rectangle"]>[4];

function _drawable(generator: Generator, shape: SketchShape, options: Options) {
  switch (shape.kind) {
    case "rect":
      return generator.rectangle(
        shape.x,
        shape.y,
        shape.width,
        shape.height,
        options,
      );
    case "circle":
      return generator.circle(shape.cx, shape.cy, shape.r * 2, options);
    case "ellipse":
      return generator.ellipse(
        shape.cx,
        shape.cy,
        shape.rx * 2,
        shape.ry * 2,
        options,
      );
    case "line":
      return generator.line(shape.x1, shape.y1, shape.x2, shape.y2, options);
    case "path":
      return generator.path(shape.d, options);
  }
}

function _remember(key: string, paths: readonly SketchPath[]): void {
  const oldest = CACHE.keys().next();
  if (CACHE.size >= CACHE_LIMIT && !oldest.done) {
    CACHE.delete(oldest.value);
  }
  CACHE.set(key, paths);
}

/**
 * Seeded hand-drawn outlines for a shape, memoized on the shape, profile,
 * and paint so every frame and every motion-blur sample reuse one
 * computation. Returns no paths for a smooth profile; callers then draw the
 * plain shape. Used by boxes, nodes, edges, and guides.
 */
export function getSketchPathsFromShape(
  shape: SketchShape,
  profile: ResolvedSketchProfile,
  paint: SketchPaint,
): readonly SketchPath[] {
  if (profile.roughness === 0) {
    return [];
  }
  const key = buildCanonicalJsonFromValue({ shape, profile, paint });
  const cached = CACHE.get(key);
  if (cached) {
    return cached;
  }
  const generator = rough.generator();
  const paths = generator.toPaths(
    _drawable(generator, shape, {
      roughness: profile.roughness,
      bowing: profile.bowing,
      seed: profile.seed,
      maxRandomnessOffset: profile.randomness,
      stroke: paint.stroke,
      strokeWidth: paint.strokeWidth,
      fill: paint.fill,
      fillStyle: "solid",
    }),
  );
  _remember(key, paths);
  return paths;
}
