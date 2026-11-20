import { mix, ramp } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CustodyAcceptance } from "./CustodyAcceptance";
import { CustodyCaptions } from "./CustodyCaptions";
import { CustodyObject } from "./CustodyObject";
import { TRANSFER_CUE, WITHDRAW_CUE } from "./custodyShape";
import { CustodySupport } from "./CustodySupport";
import { ResponsibilityMarker } from "./ResponsibilityMarker";
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
  const accepted = input.outcome === "accepted";
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
        <ResponsibilityMarker frame={frame} accepted={accepted} />
      ) : undefined}
      {input.showLabels ? (
        <CustodyCaptions input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
