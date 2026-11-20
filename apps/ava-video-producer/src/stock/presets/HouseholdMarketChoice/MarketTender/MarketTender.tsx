import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getShopperPoseFromInputAndFrame } from "../getShopperPoseFromInputAndFrame";
import { TenderTotal } from "./TenderTotal";
import type { Input } from "../HouseholdMarketChoice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; total: number };
/**
 * Authored tender stays in the shopper's free hand, then crosses below the
 * basket.
 */
export function MarketTender({
  input,
  frame,
  accent,
  total,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const shopper = getShopperPoseFromInputAndFrame({
    motion,
    input,
    frame: Math.min(frame, 108),
  });
  const payment = motion.ramp(frame, 108, motion.hero, motion.travel.easing);
  const x = mix(Math.max(0, payment * 2 - 1), shopper.x + 45, 790);
  const y = mix(Math.min(1, payment * 2), shopper.y + 10, 484);
  return (
    <g
      data-tender={input.tender}
      data-x={x}
      data-owner={frame >= 126 ? "retailer" : "shopper"}
      transform={`translate(${x} ${y})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: _buildTenderPath(input.tender) }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <TenderTotal total={total} accent={accent} />
    </g>
  );
}
/** A banknote for cash, a ticket with notched sides otherwise. */
function _buildTenderPath(tender: Input["tender"]): string {
  return tender === "cash"
    ? "M-33 -15 H33 V15 H-33 Z M-27 -10 H27 V10 H-27 Z"
    : "M-33 -15 H33 V-5 Q22 0 33 5 V15 H-33 V5 Q-22 0 -33 -5 Z";
}
