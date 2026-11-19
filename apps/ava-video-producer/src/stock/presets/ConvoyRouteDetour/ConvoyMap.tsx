import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ConvoyLandmarks } from "./ConvoyLandmarks";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The width the detour swells to once it is chosen. */
const DETOUR_WIDTH = 5;
/** Authored roads retain the closure even after the receiving gate opens. */
export function ConvoyMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const points = input.routes.find(({ role }) => {
    return role === "blocked";
  })!.points;
  const start = points[input.obstruction.segmentIndex];
  const end = points[input.obstruction.segmentIndex + 1];
  return (
    <g>
      {input.routes.map((route, index) => {
        return (
          <SketchedShape
            key={route.role}
            shape={{
              kind: "path",
              d: route.points
                .map((point, pointIndex) => {
                  return `${pointIndex ? "L" : "M"}${80 + point.x * 800} ${180 + point.y * 280}`;
                })
                .join(" "),
            }}
            profile={tokens.sketch.shape}
            data-road={route.role}
            data-route-id={route.id}
            fill="none"
            stroke={route.role === "detour" ? accent : tokens.color.inactive}
            strokeWidth={scales.stroke(
              route.role === "detour"
                ? mix(
                    motion.ramp(frame, 60, motion.hero),
                    tokens.stroke.emphasis,
                    DETOUR_WIDTH,
                  )
                : tokens.stroke.heavy,
            )}
            strokeOpacity={motion.ramp(
              frame,
              10 + index * motion.scaleStagger(3),
              motion.word,
            )}
            strokeLinejoin="round"
          />
        );
      })}
      <g
        data-obstruction={input.obstruction.kind}
        transform={`translate(${80 + (start.x + end.x) * 400} ${180 + (start.y + end.y) * 140})`}
      >
        <SketchedShape
          shape={{ kind: "path", d: "M-20 -17 L20 17 M-20 17 L20 -17" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          strokeWidth={scales.stroke(5)}
        />
        {input.obstruction.kind === "bridge-closure" ? (
          <SketchedShape
            shape={{ kind: "path", d: "M-28 -24 V24 M28 -24 V24" }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
        ) : undefined}
      </g>
      <ConvoyLandmarks input={input} frame={frame} accent={accent} />
    </g>
  );
}
