import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getSocketPointFromIndex } from "./getSocketPointFromIndex";
import { LeaseCaptions } from "./LeaseCaptions";
import { LeasePoolDock } from "./LeasePoolDock/LeasePoolDock";
import { EXPIRY_CUE } from "./leaseShape";
import { LeaseSocket } from "./LeaseSocket/LeaseSocket";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ExpiringLease.schema";
import type { ReactNode } from "react";

type LeaseToken = {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  opacity: number;
};
type LeaseTokenState = {
  holder: ReturnType<typeof getSocketPointFromIndex>;
  token: LeaseToken;
  socketProps: Pick<Props, "input" | "frame" | "accent">;
};

type Props = GraphicProps & {
  input: Input;
};
/** Frames the token takes to return to the dock. */
const RETURN_FRAMES = 28;

type GetLeaseTokenStateOptions = {
  frame: number;
  accent: string;
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored lease token state. */
function _getLeaseTokenState({
  frame,
  accent,
  input,
  motion,
}: Readonly<GetLeaseTokenStateOptions>): LeaseTokenState {
  const holderIndex = input.participants.findIndex(
    propEq("id", input.holderId),
  );
  const holder = getSocketPointFromIndex({
    index: holderIndex,
    numParticipants: input.participants.length,
  });
  const returning = Motion.ramp({
    frame,
    at: EXPIRY_CUE,
    dur: motion.scale(RETURN_FRAMES),
    easing: motion.travel.easing,
  });
  const token = {
    cx: Motion.mix({ t: returning, from: holder.x, to: 480 }),
    cy: Motion.mix({ t: returning, from: holder.y, to: 430 }),
    r: 12,
    fill: accent,
    opacity: motion.reveal(frame, 18),
  };
  const socketProps = { input, frame, accent };
  return { holder, token, socketProps };
}

/** One token expires into neutral custody without inferring a successor. */
export function ExpiringLease({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { holder, token, socketProps } = _getLeaseTokenState({
    frame,
    accent,
    input,
    motion,
  });
  return (
    <g>
      <LeasePoolDock {...{ frame, tokens, scales, motion }} />
      <SketchedShape
        shape={{ kind: "path", d: `M${holder.x} ${holder.y} L480 430` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray={atomic.dash.airy.join(" ")}
        opacity={motion.reveal(frame, 24)}
      />
      {input.participants.map((participant, index) => {
        return (
          <LeaseSocket
            key={participant.id}
            participant={participant}
            index={index}
            {...socketProps}
          />
        );
      })}
      <circle data-permission-token="single" {...token} />
      {input.showLabels ? (
        <LeaseCaptions input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
