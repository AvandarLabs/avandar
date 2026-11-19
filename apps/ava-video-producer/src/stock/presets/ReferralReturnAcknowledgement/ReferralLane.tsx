import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const travel = referral.attended
    ? motion.ramp(
        frame,
        41 + index * motion.stagger.list,
        motion.scale(36),
        motion.travel.easing,
      )
    : 0;
  const x = mix(travel, 180, 650);
  const y = 162 + index * (input.showLedger ? 58 : 72);
  const returned = referral.acknowledged && frame >= 82 + index * 2;
  const receiptX = mix(
    motion.ramp(
      frame,
      82 + index * motion.stagger.list,
      motion.scale(23),
      motion.travel.easing,
    ),
    616,
    228,
  );
  const state =
    returned && frame >= 105 + index * 2
      ? "closed"
      : travel === 1
        ? "attendedOpen"
        : "waiting";
  return (
    <g
      opacity={motion.ramp(
        frame,
        12 + index * motion.stagger.list,
        motion.scale(14),
        motion.reveal.easing,
      )}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M90 ${y + (input.showLedger ? 30 : 44)} H880`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
      />
      <g data-person-id={referral.id} data-x={x} data-state={state}>
        <PersonGlyph
          x={x}
          y={y}
          size={32}
          color={
            input.emphasis === "person-journey"
              ? accent
              : tokens.color.accentAlt
          }
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
      <StockRect
        data-referral-slip={referral.id}
        x={x - 32}
        y={y - 13}
        width={17}
        height={24}
        rx={scales.corner(2)}
        fill={tokens.color.surface}
        stroke={tokens.color.accentAlt}
      />
      {returned ? (
        <rect
          data-return-id={referral.id}
          x={receiptX}
          y={y + 4}
          width={25}
          height={16}
          rx={scales.corner(2)}
          fill={
            input.emphasis === "return-message"
              ? accent
              : tokens.color.accentAlt
          }
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
                ? tokens.color.highlight
                : tokens.color.inactive
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
          color={state === "closed" ? accent : tokens.color.textMuted}
        />
      )}
    </g>
  );
}
