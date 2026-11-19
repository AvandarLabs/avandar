import { mix, ramp } from "../../../motion";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CustodyAcceptance } from "./CustodyAcceptance";
import { CustodyCaptions } from "./CustodyCaptions";
import { CustodyObject } from "./CustodyObject";
import { TRANSFER_CUE, WITHDRAW_CUE } from "./custodyShape";
import { CustodySupport } from "./CustodySupport";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Overlapping support transfers responsibility only after acceptance. */
export function CustodyTransfer({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const accepted = input.outcome === "accepted";
  // Responsibility crosses from the acknowledgement until the sender's
  // support withdraws, so this move keeps its cue span.
  const transfer = accepted
    ? ramp(
        frame,
        TRANSFER_CUE,
        WITHDRAW_CUE - TRANSFER_CUE,
        motion.travel.easing,
      )
    : 0;
  const marker = {
    cx: mix(transfer, 240, 720),
    cy: 415,
    r: 9,
    fill: tokens.color.highlight,
  };
  return (
    <g>
      <CustodySupport
        frame={frame}
        recipient={false}
        accepted={accepted}
        accent={accent}
      />
      <CustodyObject input={input} frame={frame} accent={accent} />
      <CustodySupport
        frame={frame}
        recipient
        accepted={accepted}
        accent={accent}
      />
      <CustodyAcceptance frame={frame} accepted={accepted} accent={accent} />
      {input.showResponsibilityMarker ? (
        <circle data-responsibility="single" {...marker} />
      ) : undefined}
      {input.showLabels ? (
        <CustodyCaptions input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
