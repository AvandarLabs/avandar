import { mix, ramp } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ROLE_RANK } from "../getEffectiveRoleFromInput";
import { GrantGate } from "./GrantGate";
import { GrantRail } from "./GrantRail";
import { GrantToken } from "./GrantToken";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "../EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type GetGrantProgressOptions = {
  frame: number;
  index: number;
  isExcluded: boolean;
  motion: VideoMotion;
};
type Props = { input: Input; index: number; frame: number; accent: string };
/** Frames a grant takes to climb to its rank. */
const CLIMB_FRAMES = 31;
/** Frames an excluded grant's gate takes to close. */
const CLOSE_FRAMES = 39;
/** Each candidate climbs to its own rank before its eligibility gate closes. */
export function GrantCandidate({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const grant = input.grants[index];
  const isExcluded =
    !grant.eligible || (input.restricted && grant.kind === "app-default");
  const { placement, closure } = _getGrantProgress({
    frame,
    index,
    isExcluded,
    motion,
  });
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
function _getGrantProgress({
  frame,
  index,
  isExcluded,
  motion,
}: Readonly<GetGrantProgressOptions>) {
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
