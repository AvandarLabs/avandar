import { FitText } from "../../primitives/FitText/FitText";
import { getRoutePointFromProgress } from "../../primitives/RoutePath/getRoutePointFromProgress";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeCorridorRouteFromInputAndFrame } from "./makeCorridorRouteFromInputAndFrame";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";
/** Inputs for HabitatPlan. */
type Props = {
  frame: number;
  accent: string;
  background?: string;
  input: Input;
};
const ROAD_LINE_DASH = "7 5";
const PATCH_RADIUS_X = 100;
const PATCH_RADIUS_Y = 62;

/**
 * The complete outline or solid route crosses the road before optional
 * illustrative travel.
 */
export function HabitatPlan({
  frame,
  accent,
  background: backgroundColor,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const background = backgroundColor ?? tokens.color.ground;
  const { points, path } = makeCorridorRouteFromInputAndFrame({
    motion,
    input,
    frame,
  });
  const laid = motion.ramp(frame, 36, motion.scale(22), motion.travel.easing),
    crossing = motion.ramp(frame, 58, motion.scale(20), motion.travel.easing);
  const marker = getRoutePointFromProgress({
    points: points.map((point) => {
      return { x: point.x / 960, y: point.y / 960 };
    }),
    progress: motion.ramp(frame, 82, motion.scale(26), motion.travel.easing),
  });
  return (
    <g>
      <rect x={462} y={225} width={36} height={145} fill={tokens.color.line} />
      <SketchedShape
        shape={{ kind: "path", d: "M 480 225 V 370" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeDasharray={ROAD_LINE_DASH}
        fill="none"
      />
      {input.patches.map((patch, index) => {
        return (
          <g key={patch.id}>
            <SketchedShape
              shape={{
                kind: "ellipse",
                cx: 155 + index * 650,
                cy: 300,
                rx: PATCH_RADIUS_X,
                ry: PATCH_RADIUS_Y,
              }}
              profile={tokens.sketch.shape}
              data-habitat-patch={patch.id}
              fill={accent}
              fillOpacity={scales.wash(atomic.opacity["22"])}
              stroke={accent}
            />
            <FitText
              text={patch.label}
              x={32 + index * 684}
              y={200}
              width={212}
              fontSize={12}
              maxLines={3}
              breakLongWords
              normalizeWhitespace
            />
            <FitText
              text={String(patch.areaHa)}
              x={72 + index * 650}
              y={382}
              width={180}
              fontSize={12}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        stroke={background}
        strokeWidth={scales.stroke(36)}
        strokeLinejoin="round"
        fill="none"
        opacity={crossing}
      />
      <g opacity={laid}>
        <SketchedShape
          shape={{ kind: "path", d: path }}
          profile={tokens.sketch.shape}
          data-corridor-route="true"
          stroke={accent}
          strokeWidth={scales.stroke(26)}
          strokeLinejoin="round"
          fill="none"
        />
        {input.decision.stage === "proposal" ? (
          <SketchedShape
            shape={{ kind: "path", d: path }}
            profile={tokens.sketch.shape}
            data-proposal-interior="true"
            stroke={background}
            strokeWidth={scales.stroke(22)}
            strokeLinejoin="round"
            fill="none"
          />
        ) : undefined}
        <SketchedShape
          shape={{
            kind: "path",
            d: `M 440 ${300 - 50 * crossing + 18} V 325 M 520 ${300 - 50 * crossing + 18} V 325`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          fill="none"
        />
      </g>
      {input.showIllustrativeTraversal && frame >= 82 ? (
        <SketchedShape
          shape={{
            kind: "circle",
            cx: marker.x * 960,
            cy: marker.y * 960,
            r: 6,
          }}
          profile={tokens.sketch.shape}
          data-illustrative-traversal="true"
          fill={tokens.color.highlight}
          stroke={background}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : undefined}
    </g>
  );
}
