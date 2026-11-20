import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ROLE_RANK } from "./getEffectiveRoleFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  const motion = useGraphicMotion();
  const grant = input.grants[index];
  const isExcluded =
    !grant.eligible || (input.restricted && grant.kind === "app-default");
  const { placement, closure } = _getGrantProgress(
    frame,
    index,
    isExcluded,
    motion,
  );
  const x = 255 + index * 90;
  const y = mix(placement, 440, 440 - ROLE_RANK[grant.role] * 90);
  const visibility = input.showExcludedGrants ? 1 : 1 - closure;
  return (
    <g data-grant-id={grant.id} data-grant-excluded={isExcluded}>
      <GrantRail x={x} />
      <g opacity={visibility}>
        <GrantToken
          grant={grant}
          x={x}
          y={y}
          closure={closure}
          color={isExcluded ? tokens.color.highlight : accent}
        />
      </g>
      {isExcluded ? (
        <GrantGate
          grantId={grant.id}
          x={x}
          y={y}
          closure={closure}
          frame={frame}
        />
      ) : undefined}
    </g>
  );
}

/** A grant's climb to its rank, then its gate closing if it is excluded. */
function _getGrantProgress(
  frame: number,
  index: number,
  isExcluded: boolean,
  motion: VideoMotion,
) {
  const stagger = index * motion.stagger.list;
  return {
    placement: ramp(
      frame,
      13 + stagger,
      motion.scale(CLIMB_FRAMES),
      motion.travel.easing,
    ),
    closure: isExcluded
      ? ramp(
          frame,
          53 + stagger,
          motion.scale(CLOSE_FRAMES),
          motion.travel.easing,
        )
      : 0,
  };
}

/** The eligibility gate that closes across an excluded grant. */
function GrantGate({
  grantId,
  x,
  y,
  closure,
  frame,
}: Readonly<{
  grantId: string;
  x: number;
  y: number;
  closure: number;
  frame: number;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g data-grant-gate={grantId}>
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
  );
}

/** The grant's token at its rank, pushed aside as its gate closes. */
function GrantToken({
  grant,
  x,
  y,
  closure,
  color,
}: Readonly<{
  grant: Input["grants"][number];
  x: number;
  y: number;
  closure: number;
  color: string;
}>): ReactNode {
  return (
    <>
      <circle
        data-grant-token={grant.id}
        cx={x + closure * 23}
        cy={y}
        r={11}
        fill={color}
      />
      <LabelSlots labels={[[grant.label, x - 40, 486, 80, 12, 5]]} />
    </>
  );
}

/** The dashed rail a grant climbs. */
function GrantRail({ x }: Readonly<{ x: number }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} 440 V170` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.line}
      strokeDasharray={RAIL_DASH}
    />
  );
}
