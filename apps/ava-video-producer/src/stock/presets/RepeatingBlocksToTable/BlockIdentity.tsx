import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BlockCaption } from "./BlockCaption";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./RepeatingBlocksToTable.schema";
import type { ReactNode } from "react";

type CreateIdentityPosesOptions = {
  input: Input;
  index: number;
  frame: number;
  motion: VideoMotion;
};
type Props = {
  input: Input;
  frame: number;
  accent: string;
  index: number;
};
/** Source block headings retain their identities beside the resulting rows. */
export function BlockIdentity({
  input,
  frame,
  accent,
  index,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const color = [accent, tokens.color.accentAlt, tokens.color.highlight][index];
  const poses = _createIdentityPoses({ input, index, frame, motion });
  return (
    <g data-output-block={input.blocks[index].id}>
      {poses.map((pose, poseIndex) => {
        return (
          <BlockCaption
            key={poseIndex}
            {...pose}
            heading={input.blocks[index].heading}
            index={index}
            showBlockNumbers={input.showBlockNumbers}
            accent={color}
          />
        );
      })}
    </g>
  );
}
/**
 * The heading over its source block, fading out, and beside its result row,
 * arriving last block first.
 */
function _createIdentityPoses({
  input,
  index,
  frame,
  motion,
}: Readonly<CreateIdentityPosesOptions>) {
  const duration = 9 / input.blocks.length,
    departure = 96 + (input.blocks.length - 1 - index) * duration;
  return [
    {
      x: 52 + index * 294,
      y: 135,
      width: 268,
      opacity: 1 - motion.ramp(frame, 96, motion.panel),
    },
    {
      x: 52,
      y: Motion.mix({
        t: motion.ramp(frame, departure, duration - 0.5, motion.travel.easing),
        from: 210,
        to: 280 + index * 112,
      }),
      width: 224,
      opacity: motion.ramp(frame, departure, motion.scale(0.5)),
    },
  ];
}
