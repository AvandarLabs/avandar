import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CustodyAcceptance } from "./CustodyAcceptance";
import { CustodyCaptions } from "./CustodyCaptions";
import { CustodyObject } from "./CustodyObject";
import { CustodySupport } from "./CustodySupport";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Overlapping support transfers responsibility only after acceptance. */
export function CustodyTransfer({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const accepted = input.outcome === "accepted";
  const transfer = accepted ? ramp(frame, 80, 20, EASE.inOut) : 0;
  const marker = {
    cx: mix(transfer, 240, 720),
    cy: 415,
    r: 9,
    fill: STOCK.orange,
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
