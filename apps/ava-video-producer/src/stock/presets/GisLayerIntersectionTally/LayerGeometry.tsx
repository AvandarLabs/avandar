import { useId } from "react";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LayerDefinitions } from "./LayerDefinitions";
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
      <LayerDefinitions
        identity={identity}
        first={first}
        second={second}
        accent={accent}
      />
      <MapSheets
        input={input}
        first={first}
        second={second}
        registration={registration}
        frame={frame}
      />
      <g
        data-result-geometry={input.operation}
        opacity={motion.reveal(frame, 72)}
        clipPath={`url(#${identity}-a)`}
      >
        <g
          clipPath={isIntersection ? `url(#${identity}-b)` : undefined}
          mask={isIntersection ? undefined : `url(#${identity}-outside)`}
        >
          <path d={first} fill={`url(#${identity}-hatch)`} />
          <g
            data-result-boundary={input.operation}
            fill="none"
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.heavy)}
          >
            <path d={first} />
            <path d={second} />
          </g>
        </g>
      </g>
    </g>
  );
}
