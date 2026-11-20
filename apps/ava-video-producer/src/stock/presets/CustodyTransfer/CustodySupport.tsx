import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SUPPORT_STROKE, WITHDRAW_CUE } from "./custodyShape";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { ReactNode } from "react";

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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const color = recipient ? accent : tokens.color.accentAlt;
  const line = _createSupportLine(frame, recipient, accepted, motion);
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
function _createSupportLine(
  frame: number,
  recipient: boolean,
  accepted: boolean,
  motion: VideoMotion,
) {
  const contact = ramp(
    frame,
    36,
    motion.scale(CONTACT_FRAMES),
    motion.travel.easing,
  );
  const withdraw = accepted
    ? ramp(
        frame,
        WITHDRAW_CUE,
        motion.scale(WITHDRAW_FRAMES),
        motion.travel.easing,
      )
    : 0;
  return {
    kind: "line",
    x1: recipient ? mix(contact, 720, 480) : 240,
    x2: recipient ? 720 : mix(withdraw, 480, 240),
    y1: 376,
    y2: 376,
  } as const;
}
