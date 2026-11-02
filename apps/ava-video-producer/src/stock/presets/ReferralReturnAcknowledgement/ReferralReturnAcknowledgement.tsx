import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { ReferralLane } from "./ReferralLane";
import { ReferralLedger } from "./ReferralLedger";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";
/** Explicit referral facts and local frame. */
export type Props = GraphicProps & { input: Input };
/** Attendance travels outward while independent communication returns. */
export function ReferralReturnAcknowledgement({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 18)}>
      <FitText
        text={input.sceneLabel}
        x={50}
        y={38}
        width={850}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <path
        d="M70 138 V74 H325 V138 M570 138 V74 H890 V138"
        stroke={STOCK.line}
        fill="none"
      />
      <FitText
        text={input.services.referring}
        x={85}
        y={95}
        width={230}
        fontSize={16}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.services.receiving}
        x={600}
        y={95}
        width={275}
        fontSize={16}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      {input.referrals.map((referral, index) => (
        <ReferralLane
          key={referral.id}
          referral={referral}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
      {input.showLedger ? (
        <ReferralLedger input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
