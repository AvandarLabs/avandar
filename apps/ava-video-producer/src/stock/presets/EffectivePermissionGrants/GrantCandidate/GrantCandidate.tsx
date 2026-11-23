import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PermissionRoles } from "../PermissionRoles";
import { GrantCandidateGrantId } from "./GrantCandidateGrantId";
import type { VideoMotion } from "../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "../EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type GetGrantProgressOptions = {
  frame: number;
  index: number;
  isExcluded: boolean;
  motion: VideoMotion;
};

type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
};

/** Frames a grant takes to climb to its rank. */
const CLIMB_FRAMES = 31;

/** Frames an excluded grant's gate takes to close. */
const CLOSE_FRAMES = 39;

/** A grant's climb to its rank, then its gate closing if it is excluded. */
function _getGrantProgress({
  frame,
  index,
  isExcluded,
  motion,
}: Readonly<GetGrantProgressOptions>) {
  const stagger = index * motion.stagger.list;
  return {
    placement: Motion.ramp({
      frame,
      at: 13 + stagger,
      dur: motion.scale(CLIMB_FRAMES),
      easing: motion.travel.easing,
    }),
    closure: isExcluded
      ? Motion.ramp({
          frame,
          at: 53 + stagger,
          dur: motion.scale(CLOSE_FRAMES),
          easing: motion.travel.easing,
        })
      : 0,
  };
}

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
  const y = Motion.mix({
    t: placement,
    from: 440,
    to: 440 - PermissionRoles.rank[grant.role] * 90,
  });
  const visibility = input.showExcludedGrants ? 1 : 1 - closure;
  return (
    <GrantCandidateGrantId
      frame={frame}
      accent={accent}
      tokens={tokens}
      grant={grant}
      isExcluded={isExcluded}
      closure={closure}
      x={x}
      y={y}
      visibility={visibility}
    />
  );
}
