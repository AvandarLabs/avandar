import { useId } from "react";
import { EASE, ramp } from "../../../motion";
import { LayerDefinitions } from "./LayerDefinitions";
import { MapSheets } from "./MapSheets";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
function _buildPath(polygon: ReadonlyArray<readonly [number, number]>): string {
  return `${polygon
    .map(
      ([x, y], index) =>
        `${index ? "L" : "M"}${110 + x * 3.8} ${180 + y * 2.7}`,
    )
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
  const identity = useId().replaceAll(":", "");
  const first = _buildPath(input.layers[0].polygon);
  const second = _buildPath(input.layers[1].polygon);
  const registration = ramp(frame, 36, 36, EASE.inOut);
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
        opacity={ramp(frame, 72, 12)}
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
            strokeWidth={4}
          >
            <path d={first} />
            <path d={second} />
          </g>
        </g>
      </g>
    </g>
  );
}
