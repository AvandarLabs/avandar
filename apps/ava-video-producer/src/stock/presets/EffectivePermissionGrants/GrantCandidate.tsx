import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ROLE_RANK } from "./getEffectiveRoleFromInput";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };

/** Frames a grant takes to climb to its rank. */
const CLIMB_FRAMES = 31;
/** Frames an excluded grant's gate takes to close. */
const CLOSE_FRAMES = 39;
/** The dash of a grant's rail. */
const RAIL_DASH = "2 8";
/** Each candidate climbs to its own rank before its eligibility gate closes. */
export function GrantCandidate({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const grant = input.grants[index];
  const isExcluded =
    !grant.eligible || (input.restricted && grant.kind === "app-default");
  const stagger = index * motion.stagger.list;
  const placement = ramp(
    frame,
    13 + stagger,
    motion.scale(CLIMB_FRAMES),
    motion.travel.easing,
  );
  const closure = isExcluded
    ? ramp(
        frame,
        53 + stagger,
        motion.scale(CLOSE_FRAMES),
        motion.travel.easing,
      )
    : 0;
  const x = 255 + index * 90;
  const y = mix(placement, 440, 440 - ROLE_RANK[grant.role] * 90);
  const visibility = input.showExcludedGrants ? 1 : 1 - closure;
  return (
    <g data-grant-id={grant.id} data-grant-excluded={isExcluded}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x} 440 V170` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeDasharray={RAIL_DASH}
      />
      <g opacity={visibility}>
        <circle
          data-grant-token={grant.id}
          cx={x + closure * 23}
          cy={y}
          r={11}
          fill={isExcluded ? tokens.color.highlight : accent}
        />
        <LabelSlots labels={[[grant.label, x - 40, 486, 80, 12, 5]]} />
      </g>
      {isExcluded ? (
        <g data-grant-gate={grant.id}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${x - 20} ${y - 21} v42 M${x - 20} ${y} h${40 * closure}`,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
            fill="none"
            opacity={ramp(frame, 53, motion.whip, motion.reveal.easing)}
          />
        </g>
      ) : undefined}
    </g>
  );
}
