import { Motion } from "../../../../motion";
import { GrantGate } from "./GrantGate";
import { GrantRail } from "./GrantRail";
import { GrantToken } from "./GrantToken";
import type { VideoMotion } from "../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
};

type GetGrantProgressOptions = {
  frame: number;
  index: number;
  isExcluded: boolean;
  motion: VideoMotion;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  grant: Readonly<ParentProps>["input"]["grants"][number];
  isExcluded: boolean | Readonly<ParentProps>["input"]["restricted"] | boolean;
  closure: ReturnType<typeof _getGrantProgress>["closure"];
  x: number;
  y: number;
  visibility: number;
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

/** Renders the grant candidate grant id in authored paint order. */
export function GrantCandidateGrantId(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-grant-id={options.grant.id}
      data-grant-excluded={options.isExcluded}
    >
      <GrantRail x={options.x} />
      <g opacity={options.visibility}>
        <GrantToken
          grant={options.grant}
          x={options.x}
          y={options.y}
          closure={options.closure}
          color={
            options.isExcluded ? options.tokens.color.highlight : options.accent
          }
        />
      </g>
      {options.isExcluded ? (
        <GrantGate
          grantId={options.grant.id}
          x={options.x}
          y={options.y}
          closure={options.closure}
          frame={options.frame}
        />
      ) : undefined}
    </g>
  );
}
