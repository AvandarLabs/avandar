import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";

type Props = {
  referral: Input["referrals"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};
/**
 * Each lane keeps its person, outward referral slip and possible return
 * receipt.
 */
export function ReferralLane({
  referral,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const travel = referral.attended
    ? ramp(frame, 41 + index * 2, 36, EASE.inOut)
    : 0;
  const x = mix(travel, 180, 650);
  const y = 162 + index * (input.showLedger ? 58 : 72);
  const returned = referral.acknowledged && frame >= 82 + index * 2;
  const receiptX = mix(ramp(frame, 82 + index * 2, 23, EASE.inOut), 616, 228);
  const state =
    returned && frame >= 105 + index * 2
      ? "closed"
      : travel === 1
        ? "attendedOpen"
        : "waiting";
  return (
    <g opacity={ramp(frame, 12 + index * 2, 14)}>
      <path
        d={`M90 ${y + (input.showLedger ? 30 : 44)} H880`}
        stroke={STOCK.line}
      />
      <g data-person-id={referral.id} data-x={x} data-state={state}>
        <PersonGlyph
          x={x}
          y={y}
          size={32}
          color={input.emphasis === "person-journey" ? accent : STOCK.cyan}
          posture={travel > 0 && travel < 1 ? "walking" : "standing"}
        />
        <FitText
          text={referral.personLabel}
          x={x + 22}
          y={y - 5}
          width={145}
          fontSize={12}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <rect
        data-referral-slip={referral.id}
        x={x - 32}
        y={y - 13}
        width={17}
        height={24}
        rx={2}
        fill={STOCK.surface}
        stroke={STOCK.cyan}
      />
      {returned ? (
        <rect
          data-return-id={referral.id}
          x={receiptX}
          y={y + 4}
          width={25}
          height={16}
          rx={2}
          fill={input.emphasis === "return-message" ? accent : STOCK.cyan}
        />
      ) : undefined}
      {input.showLedger ? (
        <circle
          cx={355}
          cy={y}
          r={5}
          fill={
            state === "closed"
              ? accent
              : state === "attendedOpen"
                ? STOCK.orange
                : STOCK.muted
          }
        />
      ) : (
        <FitText
          text={input.copy[state]}
          x={370}
          y={y - 12}
          width={220}
          fontSize={12}
          maxLines={4}
          breakLongWords
          normalizeWhitespace
          color={state === "closed" ? accent : STOCK.muted}
        />
      )}
    </g>
  );
}
