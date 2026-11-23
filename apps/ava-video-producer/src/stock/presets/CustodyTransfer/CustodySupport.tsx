import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SUPPORT_STROKE, WITHDRAW_CUE } from "./custodyShape";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { ReactNode } from "react";

type CreateSupportLineOptions = {
  frame: number;
  recipient: boolean;
  accepted: boolean;
  motion: VideoMotion;
};
type Props = {
  frame: number;
  recipient: boolean;
  accepted: boolean;
  accent: string;
};
/** Frames the recipient's support takes to reach the object. */
const CONTACT_FRAMES = 24;
/** Frames the sender's support takes to withdraw. */
const WITHDRAW_FRAMES = 20;
/** The bracket's line weight before the line weight scales it. */
const BRACKET_STROKE = 6;
/** A bracket touches the object until its responsibility can safely release. */
export function CustodySupport({
  frame,
  recipient,
  accepted,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const color = recipient ? accent : tokens.color.accentAlt;
  const line = _createSupportLine({ frame, recipient, accepted, motion });
  return (
    <g opacity={motion.reveal(frame, recipient ? 16 : 12)}>
      <SketchedShape
        shape={{
          kind: "path",
          d: recipient ? "M880 260 V376 H720" : "M180 260 V376 H288",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeWidth={scales.stroke(BRACKET_STROKE)}
      />
      <g
        data-sender-support={recipient ? undefined : "sender"}
        data-recipient-support={recipient ? "recipient" : undefined}
      >
        <SketchedShape
          shape={line}
          profile={tokens.sketch.shape}
          stroke={color}
          strokeWidth={scales.stroke(SUPPORT_STROKE)}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
/**
 * The support under the object: the recipient's reaches in to make contact,
 * the sender's withdraws once the transfer is accepted.
 */
function _createSupportLine({
  frame,
  recipient,
  accepted,
  motion,
}: Readonly<CreateSupportLineOptions>) {
  const contact = Motion.ramp({
    frame,
    at: 36,
    dur: motion.scale(CONTACT_FRAMES),
    easing: motion.travel.easing,
  });
  const withdraw = accepted
    ? Motion.ramp({
        frame,
        at: WITHDRAW_CUE,
        dur: motion.scale(WITHDRAW_FRAMES),
        easing: motion.travel.easing,
      })
    : 0;
  return {
    kind: "line",
    x1: recipient
      ? Motion.mix({
          t: contact,
          from: 720,
          to: 480,
        })
      : 240,
    x2: recipient
      ? 720
      : Motion.mix({
          t: withdraw,
          from: 480,
          to: 240,
        }),
    y1: 376,
    y2: 376,
  } as const;
}
