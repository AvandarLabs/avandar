import { useId } from "react";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LayerDefinitions } from "./LayerDefinitions";
import { LayerGeometryResultGeometry } from "./LayerGeometryResultGeometry/LayerGeometryResultGeometry";
import { MapSheets } from "./MapSheets";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
function _buildPath(polygon: ReadonlyArray<readonly [number, number]>): string {
  return `${polygon
    .map(([x, y], index) => {
      return `${index ? "L" : "M"}${110 + x * 3.8} ${180 + y * 2.7}`;
    })
    .join(" ")} Z`;
}
/**
 * Native SVG clips retain concave set geometry and its inward result boundary.
 */
export function LayerGeometry({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const identity = useId().replaceAll(":", "");
  const first = _buildPath(input.layers[0].polygon);
  const second = _buildPath(input.layers[1].polygon);
  const registration = motion.ramp(
    frame,
    36,
    motion.scale(36),
    motion.travel.easing,
  );
  const isIntersection = input.operation === "intersection";
  return (
    <g>
      <LayerDefinitions {...{ identity, first, second, accent }} />
      <MapSheets {...{ input, first, second, registration, frame }} />
      <LayerGeometryResultGeometry
        {...{ input, motion, frame, identity, isIntersection, first }}
        {...{ accent, scales, tokens, second }}
      />
    </g>
  );
}

/** The type of `_buildPath` used by LayerGeometry. */
export type LayerGeometryBuildPathCallable = typeof _buildPath;
